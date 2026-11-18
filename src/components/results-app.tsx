'use client';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Selector } from '@astryxdesign/core/Selector';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import * as stylex from '@stylexjs/stylex';
import { useMachine } from '@xstate/react';
import { Activity, ArrowUpRight, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { type ComponentProps, useEffect, useState } from 'react';
import { navigationMachine } from '../lib/navigation';
import {
  type Board,
  competitionLabel,
  consultationTime,
  gameDate,
  matchPath,
  resultsPath,
  type Selection,
  score,
  searchGames,
  selectionKey,
} from '../lib/results';
import { DataScope, useBoard } from './data-scope';
import { SiteHeader } from './site-header';

type ResultsProps = {
  initial: Board | null;
  input: Selection;
};

export function ResultsApp(props: ResultsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === '/' && searchParams.size === 0;
  const [navigation, setNavigation] = useState({ isHome, homeVisits: 0 });
  if (isHome !== navigation.isHome) {
    setNavigation({
      isHome,
      homeVisits: navigation.homeVisits + Number(isHome),
    });
  }
  // A client navigation can reuse the page, and XState only reads its input
  // when the actor starts. Reset on a new server selection or a visit to `/`.
  const key = `${selectionKey(props.input)}:${navigation.homeVisits}`;
  return <ResultsSelection key={key} {...props} />;
}

function ResultsSelection({ initial, input }: ResultsProps) {
  const [state, send] = useMachine(navigationMachine, { input });
  const selection = state.context.selection;
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('results');
  useEffect(() => {
    const path = resultsPath(selection);
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== path) window.history.replaceState(null, '', path);
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

function MatchLink(props: ComponentProps<typeof Link>) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const intent = hovered || focused;
  useEffect(() => {
    if (!intent) return;
    const timeout = setTimeout(() => setReady(true), 150);
    return () => {
      clearTimeout(timeout);
      setReady(false);
    };
  }, [intent]);
  return (
    <Link
      {...props}
      prefetch={intent && ready ? true : 'auto'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

type Send = (
  e:
    | {
        type: 'SEASON' | 'GENDER' | 'COMPETITION' | 'PHASE';
        value: string;
      }
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
  const { board, error, refreshing, refresh } = useBoard(initial);
  const [limit, setLimit] = useState(80);
  const rows = searchGames(board?.games ?? [], search, mode);
  const comp = board?.competitions.find(
    (c) => c.id === board.selection.competition,
  );
  const phase = board?.phases.find((p) => p.id === board.selection.phase);
  const checked = consultationTime(board?.fetchedAt);
  return (
    <div {...stylex.props(styles.app)}>
      <SiteHeader />
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
                {comp ? competitionLabel(comp.name) : 'O jogo, em números.'}
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
                      <MatchLink
                        href={matchPath({
                          ...(board?.selection ?? selection),
                          match: g.id,
                        })}
                        aria-label={`${g.home} — ${g.away}, ver jogo`}
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
                      </MatchLink>
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
    </div>
  );
}
const styles = stylex.create({
  app: { minHeight: '100dvh', backgroundColor: '#f4f5f5', color: '#152327' },
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
    textDecoration: 'none',
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
});
