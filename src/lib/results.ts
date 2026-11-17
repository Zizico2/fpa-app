export type Selection = {
  season: string;
  gender: string;
  competition: string;
  phase: string;
  match: string;
};
export const emptySelection: Selection = {
  season: '',
  gender: 'M',
  competition: '',
  phase: '',
  match: '',
};
export type Game = {
  id: string;
  number: string;
  date: string;
  time: string;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  venue: string;
  round: string;
  sourceState: string;
};
export type Standing = {
  teamId: string;
  name: string;
  position: number | null;
  points: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  difference: number | null;
};
export type Person = {
  name: string;
  shirt: string;
  goals: number | null;
  role: string;
  yellow: string;
  exclusions: number;
  disqualified: string;
};
export type Detail = {
  game: Game;
  periods: { name: string; home: number | null; away: number | null }[];
  homePlayers: Person[];
  awayPlayers: Person[];
  officials: string[];
  fetchedAt: string | null;
};
export type Board = {
  id: string;
  selection: Selection;
  seasons: { id: string; name: string }[];
  competitions: { id: string; name: string; code: string }[];
  phases: { id: string; name: string }[];
  games: Game[];
  standings: Standing[];
  detail: Detail | null;
  detailError: string | null;
  fetchedAt: string | null;
};
export function selectionKey(s: Selection) {
  return [s.season, s.gender, s.competition, s.phase, s.match].join(':');
}
export function readSelection(p: URLSearchParams): Selection {
  const s = { ...emptySelection };
  for (const k of ['season', 'competition', 'phase', 'match'] as const) {
    const v = p.get(k) ?? '';
    if (v && !/^[1-9][0-9]{0,11}$/.test(v))
      throw new Error('Identificador inválido');
    s[k] = v;
  }
  s.gender = p.get('gender') ?? 'M';
  if (!['M', 'F'].includes(s.gender)) throw new Error('Género inválido');
  return s;
}
export function searchGames(rows: Game[], query: string, mode: string) {
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  return rows
    .filter(
      (g) =>
        (mode === 'all' ||
          (mode === 'results'
            ? g.homeGoals != null && g.awayGoals != null
            : g.homeGoals == null || g.awayGoals == null)) &&
        normalize(
          g.home + ' ' + g.away + ' ' + g.date + ' ' + g.round,
        ).includes(normalize(query)),
    )
    .sort(
      (a, b) =>
        (mode === 'fixtures'
          ? (a.date + a.time).localeCompare(b.date + b.time)
          : (b.date + b.time).localeCompare(a.date + a.time)) ||
        a.id.localeCompare(b.id),
    );
}
export function gameDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || 'Data por definir';
  return new Intl.DateTimeFormat('pt-PT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'));
}
export const score = (n: number | null | undefined) => n ?? '—';
