import 'server-only';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import { timestampDate } from '@bufbuild/protobuf/wkt';
import { Code, ConnectError, createClient } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import type {
  Board,
  Game,
  MatchContext,
  MatchRecord,
  Person,
  Selection,
} from '../lib/results';
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
const defaultBudgetMs = 25_000;
const budgetMs = Number(process.env.FPA_RPC_BUDGET_MS ?? defaultBudgetMs);
if (
  !Number.isSafeInteger(budgetMs) ||
  budgetMs < 1 ||
  budgetMs > defaultBudgetMs
) {
  throw new Error('FPA_RPC_BUDGET_MS must be an integer between 1 and 25000');
}

function rpcOptions(signal?: AbortSignal) {
  // One timer for the resource, including every sequential RPC it needs.
  const budget = AbortSignal.timeout(budgetMs);
  return {
    signal: signal ? AbortSignal.any([signal, budget]) : budget,
    timeoutMs: budgetMs,
  };
}

async function getPhaseSelection(input: Selection, signal?: AbortSignal) {
  const opts = rpcOptions(signal);
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
  return {
    selection: {
      season,
      gender: input.gender,
      competition,
      phase,
      match: '',
    },
    seasons: catalog.seasons.map((r) => ({ id: r.id, name: r.name })),
    competitions,
    phases,
    data,
    fetchedAt: iso(data?.fetchedAt ?? comps.fetchedAt),
  };
}

export async function getBoard(
  input: Selection,
  signal?: AbortSignal,
): Promise<Board> {
  const { data, ...phase } = await getPhaseSelection(input, signal);
  return {
    id: 'current',
    ...phase,
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
  };
}

export async function getMatch(
  id: string,
  signal?: AbortSignal,
): Promise<MatchRecord> {
  try {
    const m = await client.getMatch({ matchId: id }, rpcOptions(signal));
    if (m.match?.id !== id) throw new Error('Unexpected match in FPA response');
    return {
      id,
      status: 'found',
      detail: {
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
      },
    };
  } catch (error) {
    if (ConnectError.from(error).code === Code.NotFound) {
      return { id, status: 'not-found' };
    }
    throw error;
  }
}

export async function getMatchContext(
  input: Selection,
  signal?: AbortSignal,
): Promise<MatchContext | null> {
  if (!input.competition) return null;
  const { selection, seasons, competitions, phases, data } =
    await getPhaseSelection(input, signal);
  const match = data?.matches.find((row) => row.id === input.match);
  if (!data || !match) return null;

  // The federation's club IDs and standings team IDs are different identifiers.
  // Use an unambiguous team name from the verified phase, or omit that row.
  const related = [...new Set([match.home, match.away])].flatMap((name) => {
    const rows = data.standings.filter((row) => name && row.name === name);
    return rows.length === 1 ? rows : [];
  });
  return {
    seasonName: seasons.find((row) => row.id === selection.season)?.name ?? '',
    competitionName:
      competitions.find((row) => row.id === selection.competition)?.name ?? '',
    phaseName: phases.find((row) => row.id === selection.phase)?.name ?? '',
    standings: related.map((row) => ({
      teamId: row.teamId,
      name: row.name,
      position: row.position ?? null,
      played: row.played ?? null,
      points: row.points ?? null,
    })),
  };
}
