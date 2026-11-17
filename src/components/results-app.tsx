'use client';
import { Button } from '@astryxdesign/core/Button';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { Icon } from '@astryxdesign/core/Icon';
import {
  RefreshCw,
  ArrowUpRight,
  ArrowLeft,
  Search,
  Activity,
} from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { DbProvider, useDbClient, useLiveQuery } from '@tanstack/react-db';
import { useMachine } from '@xstate/react';
import { useEffect, useState, useRef } from 'react';
import type { QueryClient } from '@tanstack/query-core';
import { createFpaDb, boardCollection, boardQuery } from '../lib/collections';
import { navigationMachine } from '../lib/navigation';
import {
  type Board,
  type Selection,
  type Detail,
  selectionKey,
  searchGames,
  gameDate,
  score,
  readSelection,
} from '../lib/results';
import { loadBoard } from '../sdk/results';
export function ResultsApp({
  initial,
  input,
}: {
  initial: Board | null;
  input: Selection;
}) {
  const [state, send] = useMachine(navigationMachine, { input });
  const selection = state.context.selection;
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('results');
  useEffect(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(selection)) if (v) p.set(k, v);
    window.history.replaceState(null, '', '?' + p.toString());
  }, [selection]);
  const key = selectionKey(selection);
  const initialForScope =
    initial && selectionKey(initial.selection) === key ? initial : null;
  return (
    <DataScope key={key} selection={selection}>
      <BoardPanel
        initial={initialForScope}
        selection={selection}
        tab={state.context.tab}
        send={send}
        search={search}
        setSearch={setSearch}
        mode={mode}
        setMode={setMode}
      />
    </DataScope>
  );
}
function DataScope({
  selection,
  children,
}: {
  selection: Selection;
  children: React.ReactNode;
}) {
  const [scope] = useState(() =>
    createFpaDb((signal) => loadBoard(selection, signal)),
  );
  const teardown = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (teardown.current) clearTimeout(teardown.current);
    return () => {
      teardown.current = setTimeout(() => {
        void scope.db.cleanup();
        scope.queryClient.clear();
      }, 0);
    };
  }, [scope]);
  return <DbProvider client={scope.db}>{children}</DbProvider>;
}
type Send = (
  e:
    | {
        type: 'SEASON' | 'GENDER' | 'COMPETITION' | 'PHASE' | 'OPEN';
        value: string;
      }
    | { type: 'CLOSE' }
    | { type: 'TAB'; value: 'results' | 'standings' },
) => void;
function BoardPanel({
  initial,
  selection,
  tab,
  send,
  search,
  setSearch,
  mode,
  setMode,
}: {
  initial: Board | null;
  selection: Selection;
  tab: string;
  send: Send;
  search: string;
  setSearch: (s: string) => void;
  mode: string;
  setMode: (s: string) => void;
}) {
  const db = useDbClient();
  const { data } = useLiveQuery({ query: boardQuery() });
  const board = data[0] ?? initial;
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(80);
  useEffect(() => {
    const q = db.requireDependency<QueryClient>('queryClient');
    const update = () =>
      setError(
        q.getQueryState(['fpa-board'])?.status === 'error'
          ? 'A atualização falhou. A última informação disponível foi mantida.'
          : '',
      );
    update();
    return q.getQueryCache().subscribe(update);
  }, [db]);
  async function refresh() {
    setRefreshing(true);
    try {
      const c = db.collection(boardCollection);
      // A failed first load must not prevent an explicit retry.
      await c.preload().catch(() => undefined);
      await c.utils.refetch({ throwOnError: true });
    } catch {
      setError('Não foi possível atualizar. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  }
  const rows = searchGames(board?.games ?? [], search, mode);
  const comp = board?.competitions.find(
    (c) => c.id === board.selection.competition,
  );
  const phase = board?.phases.find((p) => p.id === board.selection.phase);
  const checked = board?.fetchedAt
    ? new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Lisbon',
      }).format(new Date(board.fetchedAt))
    : '—';
  return (
    <div {...stylex.props(styles.app)}>
      <header {...stylex.props(styles.header)}>
        <a href="/" {...stylex.props(styles.brand)}>
          sete<span {...stylex.props(styles.dot)}>.</span>
        </a>
        <Text color="secondary">Andebol português</Text>
        <a
          href="https://portal.fpa.pt/"
          target="_blank"
          rel="noreferrer"
          {...stylex.props(styles.source)}
        >
          Fonte FPA ↗
        </a>
      </header>
      <main {...stylex.props(styles.layout)}>
        <aside {...stylex.props(styles.sidebar)}>
          <Text type="supporting">COMPETIÇÕES NACIONAIS</Text>
          <Selector
            label="Época"
            value={board?.selection.season ?? selection.season}
            options={
              board?.seasons.map((s) => ({ value: s.id, label: s.name })) ?? []
            }
            onChange={(value) => send({ type: 'SEASON', value })}
            width="100%"
          />
          <Selector
            label="Género"
            value={selection.gender}
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
            ]}
            onChange={(value) => send({ type: 'GENDER', value })}
            width="100%"
          />
          <Selector
            label="Competição"
            value={board?.selection.competition ?? selection.competition}
            options={
              board?.competitions.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []
            }
            onChange={(value) => send({ type: 'COMPETITION', value })}
            width="100%"
          />
          <Selector
            label="Fase / zona"
            value={board?.selection.phase ?? selection.phase}
            options={
              board?.phases.map((p) => ({ value: p.id, label: p.name })) ?? []
            }
            onChange={(value) => send({ type: 'PHASE', value })}
            width="100%"
          />
          <div {...stylex.props(styles.sidebarNote)}>
            <Activity size={17} />
            <Text type="supporting" color="secondary">
              Cada divisão, cada época. Todo o andebol, num só lugar.
            </Text>
          </div>
        </aside>
        <section {...stylex.props(styles.content)}>
          <div {...stylex.props(styles.eyebrow)}>
            PORTUGAL / ANDEBOL /{' '}
            {board?.seasons.find((s) => s.id === board.selection.season)
              ?.name ?? 'RESULTADOS'}
          </div>
          <div {...stylex.props(styles.titleRow)}>
            <div>
              <Heading level={1} xstyle={styles.title}>
                {comp?.name.replace(/^PO0?(\d+A?)\s*-\s*/, '') ??
                  'O jogo, em números.'}
              </Heading>
              <Text color="secondary">
                {phase?.name ?? 'Calendário, resultados e classificação'}
              </Text>
            </div>
            <Button
              label={refreshing ? 'A atualizar…' : 'Atualizar'}
              icon={<Icon icon={RefreshCw} />}
              variant="secondary"
              size="sm"
              onClick={refresh}
              isDisabled={refreshing}
            />
          </div>
          <div {...stylex.props(styles.live)}>
            <span {...stylex.props(styles.liveDot)} />
            <Text type="supporting">Atualização automática · 15 s</Text>
            <Text type="supporting" color="secondary">
              Consultado às {checked}
            </Text>
          </div>
          {error && (
            <div
              role="alert"
              aria-label="Atualização indisponível"
              {...stylex.props(styles.warning)}
            >
              {error}
            </div>
          )}
          <div {...stylex.props(styles.card)}>
            <nav
              aria-label="Vista da competição"
              {...stylex.props(styles.tabs)}
            >
              <Button
                label="Resultados"
                aria-pressed={tab === 'results'}
                variant={tab === 'results' ? 'primary' : 'ghost'}
                onClick={() => send({ type: 'TAB', value: 'results' })}
              />
              <Button
                label="Classificação"
                aria-pressed={tab === 'standings'}
                variant={tab === 'standings' ? 'primary' : 'ghost'}
                onClick={() => send({ type: 'TAB', value: 'standings' })}
              />
              <span {...stylex.props(styles.count)}>
                {board?.games.length ?? '—'} jogos
              </span>
            </nav>
            {!board ? (
              <div role="status" {...stylex.props(styles.empty)}>
                <Heading level={2}>
                  {error ? 'Resultados indisponíveis' : 'A consultar a FPA…'}
                </Heading>
                <Text color="secondary">
                  {error
                    ? 'Use Atualizar para voltar a tentar.'
                    : 'A preparar a sua competição.'}
                </Text>
              </div>
            ) : tab === 'standings' ? (
              <div {...stylex.props(styles.tableScroll)}>
                <table {...stylex.props(styles.table)}>
                  <caption {...stylex.props(styles.caption)}>
                    Classificação · {phase?.name}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        '#',
                        'Equipa',
                        'J',
                        'V',
                        'E',
                        'D',
                        'GM',
                        'GS',
                        'DG',
                        'Pts',
                      ].map((h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {board.standings.map((r) => (
                      <tr key={r.teamId}>
                        <td>{score(r.position)}</td>
                        <th scope="row">{r.name}</th>
                        {[
                          r.played,
                          r.wins,
                          r.draws,
                          r.losses,
                          r.goalsFor,
                          r.goalsAgainst,
                          r.difference,
                          r.points,
                        ].map((v, i) => (
                          <td key={i}>{score(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!board.standings.length && (
                  <p {...stylex.props(styles.empty)}>
                    Ainda não há classificação publicada para esta fase.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div {...stylex.props(styles.tools)}>
                  <TextInput
                    label="Pesquisar jogos"
                    type="search"
                    placeholder="Equipa, data ou jornada…"
                    value={search}
                    onChange={(value) => {
                      setSearch(value);
                      setLimit(80);
                    }}
                    startIcon={Search}
                    hasClear
                  />
                  <Selector
                    label="Mostrar"
                    value={mode}
                    onChange={(value) => {
                      setMode(value);
                      setLimit(80);
                    }}
                    options={[
                      { value: 'all', label: 'Todos os jogos' },
                      { value: 'results', label: 'Com resultado' },
                      { value: 'fixtures', label: 'Por disputar' },
                    ]}
                  />
                </div>
                {!rows.length && (
                  <div {...stylex.props(styles.empty)}>
                    <Heading level={2}>Sem jogos nesta vista</Heading>
                    <Text color="secondary">
                      Escolha outra fase ou ajuste os filtros.
                    </Text>
                  </div>
                )}
                <div>
                  {rows.slice(0, limit).map((g, i) => (
                    <div key={g.id}>
                      {(i === 0 || g.date !== rows[i - 1].date) && (
                        <div {...stylex.props(styles.dateHeader)}>
                          {gameDate(g.date)}
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label={`${g.home} — ${g.away}, ver jogo`}
                        onClick={() => send({ type: 'OPEN', value: g.id })}
                        {...stylex.props(styles.gameRow)}
                      >
                        <span {...stylex.props(styles.gameMeta)}>
                          <span>{g.time || '—'}</span>
                          <span {...stylex.props(styles.round)}>
                            J{g.round || '—'}
                          </span>
                        </span>
                        <span {...stylex.props(styles.teams)}>
                          <span>{g.home}</span>
                          <span>{g.away}</span>
                        </span>
                        <span {...stylex.props(styles.scores)}>
                          <span>{score(g.homeGoals)}</span>
                          <span>{score(g.awayGoals)}</span>
                        </span>
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                {rows.length > limit && (
                  <div {...stylex.props(styles.more)}>
                    <Button
                      label={`Mostrar mais (${rows.length - limit})`}
                      variant="secondary"
                      onClick={() => setLimit(limit + 80)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <footer {...stylex.props(styles.footer)}>
            <Text type="supporting" color="secondary">
              Fonte: Federação de Andebol de Portugal. Os resultados acompanham
              a informação publicada pela FPA; a atualização durante o jogo
              depende da fonte. — indica informação por publicar.
            </Text>
            <a
              href="https://github.com/Zizico2/fpa-app"
              {...stylex.props(styles.source)}
            >
              Projeto independente ↗
            </a>
          </footer>
        </section>
      </main>
      <BottomSheet
        label="Boletim de jogo"
        isOpen={Boolean(selection.match)}
        onOpenChange={(open) => {
          if (!open) send({ type: 'CLOSE' });
        }}
        height="full"
      >
        <Stack gap={5} padding={5}>
          <Button
            label="Voltar aos resultados"
            icon={<Icon icon={ArrowLeft} />}
            variant="ghost"
            onClick={() => send({ type: 'CLOSE' })}
          />
          {board?.detail ? (
            <MatchSheet detail={board.detail} />
          ) : (
            <>
              <Heading level={2}>
                {board?.detailError ?? 'A consultar o jogo…'}
              </Heading>
              {board?.detailError && (
                <Button label="Tentar novamente" onClick={refresh} />
              )}
            </>
          )}
        </Stack>
      </BottomSheet>
    </div>
  );
}
function MatchSheet({ detail }: { detail: Detail }) {
  const g = detail.game;
  return (
    <Stack gap={5}>
      <Text color="secondary">
        {gameDate(g.date)} · {g.time || 'Hora por definir'} · Jornada {g.round}
      </Text>
      <Heading level={2}>
        {g.home} — {g.away}
      </Heading>
      <div {...stylex.props(styles.bigScore)}>
        {score(g.homeGoals)} <span {...stylex.props(styles.scoreDash)}>:</span>{' '}
        {score(g.awayGoals)}
      </div>
      <Text color="secondary">
        {g.sourceState === '60'
          ? 'Resultado registado'
          : g.homeGoals != null
            ? 'Marcador publicado · atualização automática'
            : 'Resultado por publicar'}{' '}
        · {g.venue || 'Recinto por definir'}
      </Text>
      {detail.periods.length > 0 && (
        <table {...stylex.props(styles.table)}>
          <caption>Resultados por período</caption>
          <tbody>
            {detail.periods.map((p) => (
              <tr key={p.name}>
                <th scope="row">{p.name}</th>
                <td>
                  {score(p.home)} — {score(p.away)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {[
        { name: g.home, players: detail.homePlayers },
        { name: g.away, players: detail.awayPlayers },
      ].map((team) => (
        <div key={team.name}>
          <Heading level={3}>{team.name}</Heading>
          {!team.players.length ? (
            <Text color="secondary">Boletim ainda não publicado.</Text>
          ) : (
            <div {...stylex.props(styles.tableScroll)}>
              <table {...stylex.props(styles.table)}>
                <thead>
                  <tr>
                    {['N.º', 'Jogador / equipa técnica', 'Golos', '2 min'].map(
                      (h) => (
                        <th key={h}>{h}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((p, i) => (
                    <tr key={p.name + i}>
                      <td>{p.shirt || '—'}</td>
                      <th scope="row">
                        {p.name}
                        {p.role && <small> · {p.role}</small>}
                        {p.yellow === 'S' && ' 🟨'}
                        {p.disqualified === 'S' && ' 🟥'}
                      </th>
                      <td>{score(p.goals)}</td>
                      <td>{p.exclusions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
      {!!detail.officials.length && (
        <Stack gap={2}>
          <Heading level={3}>Oficiais de jogo</Heading>
          {detail.officials.map((name, i) => (
            <Text key={name + i}>{name}</Text>
          ))}
        </Stack>
      )}
      <a
        href={`https://portal.fpa.pt/jogo/${g.id}/`}
        target="_blank"
        rel="noreferrer"
        {...stylex.props(styles.source)}
      >
        Ver boletim na FPA ↗
      </a>
    </Stack>
  );
}
const styles = stylex.create({
  app: { minHeight: '100dvh', backgroundColor: '#f4f5f5', color: '#152327' },
  header: {
    height: 76,
    paddingInline: {
      default: 'max(24px, calc((100vw - 1320px) / 2))',
      '@media(max-width:767px)': 16,
    },
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e6e5',
  },
  brand: {
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: '-0.08em',
    textDecoration: 'none',
    color: '#152327',
  },
  dot: { color: '#b33126' },
  source: {
    fontSize: 12,
    color: '#60736c',
    textDecoration: 'none',
    marginLeft: 'auto',
  },
  layout: {
    maxWidth: 1320,
    marginInline: 'auto',
    display: 'grid',
    gridTemplateColumns: {
      default: '246px minmax(0, 1fr)',
      '@media(max-width:767px)': 'minmax(0,1fr)',
    },
    gap: { default: 36, '@media(max-width:767px)': 20 },
    padding: { default: '32px 24px', '@media(max-width:767px)': '20px 16px' },
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    paddingTop: 12,
    minWidth: 0,
  },
  sidebarNote: {
    display: { default: 'flex', '@media(max-width:767px)': 'none' },
    gap: 12,
    borderTop: '1px solid #dce3df',
    paddingTop: 24,
    marginTop: 20,
  },
  content: { minWidth: 0 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: '0.12em',
    color: '#718078',
    marginBottom: 16,
    fontWeight: 700,
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  title: {
    fontSize: { default: 28, '@media(max-width:767px)': 22 },
    lineHeight: 1.2,
    marginBottom: 8,
  },
  live: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBlock: 22,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#32805c',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e1e5e4',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabs: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottom: '1px solid #e9eceb',
  },
  count: { marginLeft: 'auto', fontSize: 12, color: '#718078' },
  tools: {
    display: 'flex',
    gap: 14,
    padding: 16,
    alignItems: 'end',
    flexWrap: 'wrap',
  },
  dateHeader: {
    backgroundColor: '#f2f4f3',
    padding: '10px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: '#52625b',
    textTransform: 'capitalize',
  },
  gameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    padding: { default: '15px 20px', '@media(max-width:767px)': '15px 12px' },
    backgroundColor: { default: '#fff', ':hover': '#fcf6f4' },
    borderWidth: 0,
    borderBottom: '1px solid #eef0ef',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#152327',
    outline: { default: 'none', ':focus-visible': '2px solid #b33126' },
    outlineOffset: -2,
  },
  gameMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    minWidth: 40,
    color: '#65746d',
  },
  round: { fontSize: 10, color: '#91a099' },
  teams: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    flex: 1,
    fontSize: 13,
    fontWeight: 500,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  scores: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
    fontWeight: 700,
    fontSize: 14,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 25,
    textAlign: 'center',
  },
  empty: { padding: '48px 24px', textAlign: 'center' },
  tableScroll: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12,
    lineHeight: 1.6,
  },
  caption: { textAlign: 'left', padding: 16, color: '#64776d' },
  more: { display: 'flex', justifyContent: 'center', padding: 20 },
  footer: { display: 'flex', gap: 24, alignItems: 'start', paddingBlock: 24 },
  warning: {
    padding: 14,
    backgroundColor: '#fff2d5',
    color: '#6d4c11',
    marginBottom: 16,
    borderRadius: 8,
  },
  bigScore: {
    fontSize: 56,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  scoreDash: { color: '#a0aaa5' },
});
