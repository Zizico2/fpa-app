import 'server-only';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import { timestampDate } from '@bufbuild/protobuf/wkt';
import { Code, ConnectError, createClient } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import type { Board, Game, Person, Selection } from '../lib/results';
import type { Match, Participant } from './gen/fpa/v1/results_pb';
import { ResultsService } from './gen/fpa/v1/results_pb';

const iso = (t?: Timestamp) => (t ? timestampDate(t).toISOString() : null);
const game = (r: Match): Game => ({
  id: r.id,
  number: r.number,
  date: r.date,
  time: r.time,
  home: r.home,
  away: r.away,
  homeGoals: r.homeGoals ?? null,
  awayGoals: r.awayGoals ?? null,
  venue: r.venue,
  round: r.round,
  sourceState: r.sourceState,
});
const person = (r: Participant): Person => ({
  name: r.name,
  shirt: r.shirt,
  goals: r.goals ?? null,
  role: r.role,
  yellow: r.yellow,
  exclusions: r.exclusions,
  disqualified: r.disqualified,
});
const client = createClient(
  ResultsService,
  createGrpcTransport({
    baseUrl: process.env.FPA_GRPC_URL ?? 'http://127.0.0.1:50202',
  }),
);
export async function getBoard(
  input: Selection,
  signal?: AbortSignal,
): Promise<Board> {
  const opts = { timeoutMs: 25_000, signal };
  const catalog = await client.listSeasons({}, opts);
  const season = input.season || catalog.seasons[0]?.id || '';
  if (!catalog.seasons.some((s) => s.id === season))
    throw new Error('Época não encontrada');
  const comps = await client.listCompetitions(
    { seasonId: season, associationId: '8', gender: input.gender },
    opts,
  );
  const competitions = comps.competitions.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
  }));
  const competition = input.competition || competitions[0]?.id || '';
  if (input.competition && !competitions.some((c) => c.id === competition))
    throw new Error('Prova não encontrada nesta época');
  const phases = competition
    ? (
        await client.listPhases({ competitionId: competition }, opts)
      ).phases.map((r) => ({ id: r.id, name: r.name }))
    : [];
  const phase = input.phase || phases[0]?.id || '';
  if (input.phase && !phases.some((p) => p.id === phase))
    throw new Error('Fase não encontrada nesta prova');
  const data = phase
    ? await client.getPhase(
        { competitionId: competition, phaseId: phase },
        opts,
      )
    : null;
  let detail: Board['detail'] = null;
  let detailError: string | null = null;
  if (input.match) {
    try {
      const m = await client.getMatch({ matchId: input.match }, opts);
      if (!m.match) throw new Error('Jogo não encontrado');
      detail = {
        game: game(m.match),
        periods: m.periods.map((r) => ({
          name: r.name,
          home: r.home ?? null,
          away: r.away ?? null,
        })),
        homePlayers: m.homePlayers.map(person),
        awayPlayers: m.awayPlayers.map(person),
        officials: m.officials,
        fetchedAt: iso(m.fetchedAt),
      };
    } catch (e) {
      detailError =
        e instanceof ConnectError && e.code === Code.NotFound
          ? 'Jogo não encontrado.'
          : 'Não foi possível atualizar este jogo.';
    }
  }
  return {
    id: 'current',
    selection: {
      season,
      gender: input.gender,
      competition,
      phase,
      match: input.match,
    },
    seasons: catalog.seasons.map((r) => ({ id: r.id, name: r.name })),
    competitions,
    phases,
    games: data?.matches.map(game) ?? [],
    standings:
      data?.standings.map((r) => ({
        teamId: r.teamId,
        name: r.name,
        position: r.position ?? null,
        points: r.points ?? null,
        played: r.played ?? null,
        wins: r.wins ?? null,
        draws: r.draws ?? null,
        losses: r.losses ?? null,
        goalsFor: r.goalsFor ?? null,
        goalsAgainst: r.goalsAgainst ?? null,
        difference: r.difference ?? null,
      })) ?? [],
    detail,
    detailError,
    fetchedAt: iso(data?.fetchedAt ?? comps.fetchedAt),
  };
}
