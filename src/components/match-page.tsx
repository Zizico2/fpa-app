'use client';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Suspense, use, useEffect, useState } from 'react';
import {
  competitionLabel,
  consultationTime,
  type Detail,
  type Game,
  gameDate,
  type MatchContext,
  type MatchRecord,
  matchStatus,
  type Person,
  resultsPath,
  type Selection,
  score,
} from '../lib/results';
import { MatchScope, useMatch } from './data-scope';
import { SiteHeader } from './site-header';

export function MatchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div {...stylex.props(styles.app)}>
      <SiteHeader />
      <main {...stylex.props(styles.main)}>{children}</main>
    </div>
  );
}

export function MatchPending() {
  return <p role="status">A consultar o jogo…</p>;
}

export function InvalidMatch() {
  return (
    <>
      <Heading level={1}>Jogo não encontrado.</Heading>
      <Text color="secondary">Este endereço não corresponde a um jogo.</Text>
    </>
  );
}

export function MatchPage({
  initial,
  id,
  context,
}: {
  initial: MatchRecord | null;
  id: string;
  context: Promise<MatchContext | null> | null;
}) {
  return (
    <MatchScope key={id} id={id}>
      <MatchView
        initial={initial?.id === id ? initial : null}
        context={context}
      />
    </MatchScope>
  );
}

function MatchView({
  initial,
  context,
}: {
  initial: MatchRecord | null;
  context: Promise<MatchContext | null> | null;
}) {
  const { value: match, error, refreshing, refresh } = useMatch(initial);
  const detail = match?.status === 'found' ? match.detail : null;
  const [tab, setTab] = useState('boletim');
  useEffect(() => {
    if (!detail) return;
    const previous = document.title;
    document.title = `${detail.game.home} — ${detail.game.away} — Sete`;
    return () => {
      document.title = previous;
    };
  }, [detail]);
  return (
    <>
      {error && detail && (
        <div
          role="alert"
          aria-label="Atualização indisponível"
          {...stylex.props(styles.warning)}
        >
          {error}
        </div>
      )}
      {!detail ? (
        <div role="status" {...stylex.props(styles.pending)}>
          <Heading level={1}>
            {match?.status === 'not-found'
              ? 'Jogo não encontrado.'
              : error
                ? 'Jogo indisponível'
                : 'A consultar o jogo…'}
          </Heading>
          {error && (
            <Button
              label="Tentar novamente"
              onClick={refresh}
              isDisabled={refreshing}
            />
          )}
        </div>
      ) : (
        <MatchBody
          detail={detail}
          context={context}
          tab={tab}
          onTab={setTab}
          refreshing={refreshing}
          refresh={refresh}
        />
      )}
    </>
  );
}

function MatchBody({
  detail,
  context,
  tab,
  onTab,
  refreshing,
  refresh,
}: {
  detail: Detail;
  context: Promise<MatchContext | null> | null;
  tab: string;
  onTab: (value: string) => void;
  refreshing: boolean;
  refresh: () => void;
}) {
  const g = detail.game;
  const checked = consultationTime(detail.fetchedAt);
  return (
    <>
      <section aria-labelledby="marcador" {...stylex.props(styles.hero)}>
        <div {...stylex.props(styles.accent)} aria-hidden="true" />
        {context && (
          <Suspense fallback={null}>
            <CompetitionLabel context={context} />
          </Suspense>
        )}
        <p {...stylex.props(styles.when)}>{whenLine(g)}</p>
        <h1 id="marcador" {...stylex.props(styles.matchup)}>
          <span {...stylex.props(styles.side, styles.home)}>
            <span {...stylex.props(styles.team)}>{g.home}</span>
            <span {...stylex.props(styles.sideLabel)} aria-hidden="true">
              Casa
            </span>
          </span>
          <span {...stylex.props(styles.bigScore)}>
            {g.homeGoals == null && g.awayGoals == null ? (
              '—'
            ) : (
              <>
                {score(g.homeGoals)}
                <span {...stylex.props(styles.colon)}>:</span>
                {score(g.awayGoals)}
              </>
            )}
          </span>
          <span {...stylex.props(styles.side, styles.away)}>
            <span {...stylex.props(styles.team)}>{g.away}</span>
            <span {...stylex.props(styles.sideLabel)} aria-hidden="true">
              Fora
            </span>
          </span>
        </h1>
        <p {...stylex.props(styles.status)}>{matchStatus(g)}</p>
        <p {...stylex.props(styles.venue)}>
          {g.venue || 'Recinto por definir'}
        </p>
        {detail.periods.length > 0 && (
          <ul
            aria-label="Resultados por período"
            {...stylex.props(styles.periods)}
          >
            {detail.periods.map((p, i) => (
              <li key={p.name + i} {...stylex.props(styles.period)}>
                <span {...stylex.props(styles.periodName)}>{p.name}</span>
                <span {...stylex.props(styles.periodScore)}>
                  {score(p.home)} – {score(p.away)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div {...stylex.props(styles.live)}>
        <span {...stylex.props(styles.liveDot)} />
        <Text type="supporting">Atualização automática · 15 s</Text>
        <Text type="supporting" color="secondary">
          Consultado às {checked}
        </Text>
        <span {...stylex.props(styles.liveAction)}>
          <Button
            label={refreshing ? 'A atualizar…' : 'Atualizar'}
            icon={<Icon icon={RefreshCw} />}
            variant="secondary"
            size="sm"
            onClick={refresh}
            isDisabled={refreshing}
          />
        </span>
      </div>
      <div {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.tabBar)}>
          <TabList
            value={tab}
            onChange={onTab}
            role="tablist"
            aria-label="Secções do jogo"
            hasDivider
          >
            <Tab
              value="boletim"
              label="Boletim"
              id="separador-boletim"
              panelId="painel-boletim"
            />
            <Tab
              value="ficha"
              label="Ficha"
              id="separador-ficha"
              panelId="painel-ficha"
            />
          </TabList>
        </div>
        <div
          role="tabpanel"
          id="painel-boletim"
          aria-labelledby="separador-boletim"
          hidden={tab !== 'boletim'}
          {...stylex.props(
            styles.panel,
            tab !== 'boletim' && styles.hiddenPanel,
          )}
        >
          <div {...stylex.props(styles.squads)}>
            <Squad
              name={g.home}
              players={detail.homePlayers}
              headingId="equipa-casa"
            />
            <Squad
              name={g.away}
              players={detail.awayPlayers}
              headingId="equipa-fora"
            />
          </div>
        </div>
        <div
          role="tabpanel"
          id="painel-ficha"
          aria-labelledby="separador-ficha"
          hidden={tab !== 'ficha'}
          {...stylex.props(styles.panel, tab !== 'ficha' && styles.hiddenPanel)}
        >
          <dl {...stylex.props(styles.facts)}>
            <div {...stylex.props(styles.fact)}>
              <dt {...stylex.props(styles.factLabel)}>Jornada</dt>
              <dd {...stylex.props(styles.factValue)}>{g.round || '—'}</dd>
            </div>
            {g.number ? (
              <div {...stylex.props(styles.fact)}>
                <dt {...stylex.props(styles.factLabel)}>Jogo n.º</dt>
                <dd {...stylex.props(styles.factValue)}>{g.number}</dd>
              </div>
            ) : null}
            <div {...stylex.props(styles.fact)}>
              <dt {...stylex.props(styles.factLabel)}>Recinto</dt>
              <dd {...stylex.props(styles.factValue)}>
                {g.venue || 'Recinto por definir'}
              </dd>
            </div>
          </dl>
          <Heading level={2}>Oficiais de jogo</Heading>
          {detail.officials.length ? (
            <ul {...stylex.props(styles.officials)}>
              {detail.officials.map((name, i) => (
                <li key={name + i}>{name}</li>
              ))}
            </ul>
          ) : (
            <Text color="secondary">Ainda não há oficiais publicados.</Text>
          )}
          {context && (
            <Suspense fallback={null}>
              <MatchStandings context={context} />
            </Suspense>
          )}
          <p {...stylex.props(styles.sourceRow)}>
            <a
              href={`https://portal.fpa.pt/jogo/${g.id}/`}
              target="_blank"
              rel="noreferrer"
              {...stylex.props(styles.source)}
            >
              Ver boletim na FPA ↗
            </a>
          </p>
        </div>
      </div>
      <footer {...stylex.props(styles.footer)}>
        <Text type="supporting" color="secondary">
          Fonte: Federação de Andebol de Portugal. — indica informação por
          publicar. A atualização durante o jogo depende da fonte.
        </Text>
      </footer>
    </>
  );
}

function CompetitionLabel({
  context,
}: {
  context: Promise<MatchContext | null>;
}) {
  const info = use(context);
  if (!info) return null;
  return (
    <p {...stylex.props(styles.context)}>
      {[competitionLabel(info.competitionName), info.phaseName, info.seasonName]
        .filter(Boolean)
        .join(' · ')}
    </p>
  );
}

function MatchStandings({
  context,
}: {
  context: Promise<MatchContext | null>;
}) {
  const info = use(context);
  if (!info?.standings.length) return null;
  return (
    <div {...stylex.props(styles.standings)}>
      <Heading level={2} id="classificacao-jogo">
        Na classificação
      </Heading>
      <Text color="secondary">
        As duas equipas nesta fase, com os números já publicados.
      </Text>
      <div {...stylex.props(styles.tableScroll)}>
        <table
          {...stylex.props(styles.table)}
          aria-labelledby="classificacao-jogo"
        >
          <thead>
            <tr>
              {['#', 'Equipa', 'J', 'Pts'].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {info.standings.map((r) => (
              <tr key={r.teamId}>
                <td>{score(r.position)}</td>
                <th scope="row">{r.name}</th>
                <td>{score(r.played)}</td>
                <td>{score(r.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Squad({
  name,
  players,
  headingId,
}: {
  name: string;
  players: Person[];
  headingId: string;
}) {
  return (
    <section {...stylex.props(styles.squad)} aria-labelledby={headingId}>
      <Heading level={2} id={headingId}>
        {name}
      </Heading>
      {!players.length ? (
        <Text color="secondary">Boletim ainda não publicado.</Text>
      ) : (
        <div {...stylex.props(styles.tableScroll)}>
          <table {...stylex.props(styles.table)} aria-labelledby={headingId}>
            <thead>
              <tr>
                {['N.º', 'Jogador', 'Golos', '2 min'].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.name + i}>
                  <td>{p.shirt || '—'}</td>
                  <th scope="row">
                    <span {...stylex.props(styles.player)}>
                      <span>
                        {p.name}
                        {p.role ? (
                          <span {...stylex.props(styles.role)}>
                            {' '}
                            · {p.role}
                          </span>
                        ) : null}
                      </span>
                      {p.yellow === 'S' && (
                        <span {...stylex.props(styles.chip, styles.yellow)}>
                          Amarelo
                        </span>
                      )}
                      {p.disqualified === 'S' && (
                        <span {...stylex.props(styles.chip, styles.red)}>
                          Exclusão
                        </span>
                      )}
                    </span>
                  </th>
                  <td {...stylex.props(styles.goals)}>{score(p.goals)}</td>
                  <td>{p.exclusions || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function BackLink({ selection }: { selection: Selection }) {
  return (
    <Link href={resultsPath(selection)} {...stylex.props(styles.back)}>
      <ArrowLeft size={16} aria-hidden="true" />
      Voltar aos resultados
    </Link>
  );
}

function whenLine(g: Game) {
  const bits = [gameDate(g.date), g.time || 'Hora por definir'];
  if (g.round) bits.push(`Jornada ${g.round}`);
  if (g.number) bits.push(`Jogo ${g.number}`);
  return bits.join(' · ');
}

const styles = stylex.create({
  app: { minHeight: '100dvh', backgroundColor: '#f4f5f5', color: '#152327' },
  main: {
    maxWidth: 1040,
    marginInline: 'auto',
    padding: {
      default: '28px 24px 48px',
      '@media (max-width: 767px)': '20px 16px 36px',
    },
  },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    color: '#152327',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
    outline: { default: 'none', ':focus-visible': '2px solid #b33126' },
    outlineOffset: 3,
    borderRadius: 6,
  },
  hero: {
    position: 'relative',
    backgroundColor: '#152327',
    color: '#f4f7f5',
    borderRadius: 16,
    padding: {
      default: '28px 32px 24px',
      '@media (max-width: 767px)': '22px 16px 18px',
    },
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#b33126',
  },
  context: {
    margin: 0,
    marginBottom: 8,
    fontSize: 13,
    color: '#d5deda',
  },
  when: {
    margin: 0,
    marginBottom: 18,
    fontSize: 13,
    color: '#c5d1cc',
  },
  matchup: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) auto minmax(0, 1fr)',
      '@media (max-width: 640px)': 'minmax(0, 1fr)',
    },
    alignItems: 'center',
    gap: { default: 28, '@media (max-width: 640px)': 10 },
    margin: 0,
    color: '#f7f4f2',
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  side: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 0,
  },
  home: {
    textAlign: { default: 'right', '@media (max-width: 640px)': 'center' },
    alignItems: {
      default: 'flex-end',
      '@media (max-width: 640px)': 'center',
    },
  },
  away: {
    textAlign: { default: 'left', '@media (max-width: 640px)': 'center' },
    alignItems: {
      default: 'flex-start',
      '@media (max-width: 640px)': 'center',
    },
  },
  team: {
    color: '#f7f4f2',
    fontSize: { default: 26, '@media (max-width: 640px)': 20 },
    lineHeight: 1.15,
    overflowWrap: 'anywhere',
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#9aada6',
  },
  bigScore: {
    color: '#ffffff',
    fontSize: { default: 64, '@media (max-width: 640px)': 48 },
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.04em',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  colon: { color: '#f0b4ae', marginInline: 8 },
  status: {
    margin: 0,
    marginTop: 18,
    fontSize: 14,
    color: '#f4f7f5',
  },
  venue: {
    margin: 0,
    marginTop: 4,
    fontSize: 13,
    color: '#c5d1cc',
  },
  periods: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    margin: 0,
    marginTop: 20,
    padding: 0,
    listStyle: 'none',
  },
  period: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 108,
    padding: '10px 14px',
    borderRadius: 10,
    backgroundColor: '#ffffff14',
  },
  periodName: {
    fontSize: 11,
    letterSpacing: '0.04em',
    color: '#c9d4cf',
  },
  periodScore: {
    fontSize: 18,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  live: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBlock: 18,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: '#32805c',
  },
  liveAction: {
    marginLeft: { default: 'auto', '@media (max-width: 767px)': 0 },
  },
  warning: {
    padding: 14,
    backgroundColor: '#fff2d5',
    color: '#6d4c11',
    marginBottom: 16,
    borderRadius: 8,
  },
  pending: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingBlock: 12,
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e1e5e4',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabBar: { padding: '8px 16px 0' },
  panel: {
    padding: {
      default: '8px 20px 24px',
      '@media (max-width: 767px)': '8px 12px 20px',
    },
  },
  hiddenPanel: { display: 'none' },
  squads: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) minmax(0, 1fr)',
      '@media (max-width: 767px)': 'minmax(0, 1fr)',
    },
    gap: 20,
    alignItems: 'start',
  },
  squad: { minWidth: 0 },
  tableScroll: { overflowX: 'auto' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
    lineHeight: 1.45,
  },
  player: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  role: { color: '#60736c', fontWeight: 500 },
  goals: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  chip: {
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1.4,
    padding: '2px 7px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
  },
  yellow: { backgroundColor: '#fff2d5', color: '#6d4c11' },
  red: { backgroundColor: '#f9ebe8', color: '#8d2b22' },
  facts: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      '@media (max-width: 767px)': 'minmax(0, 1fr)',
    },
    gap: 16,
    margin: '8px 0 24px',
  },
  fact: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  factLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#718078',
  },
  factValue: {
    margin: 0,
    fontSize: 16,
    overflowWrap: 'anywhere',
  },
  officials: {
    margin: '8px 0 0',
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  standings: { marginTop: 28 },
  sourceRow: { marginTop: 28, marginBottom: 0 },
  source: { fontSize: 13, color: '#60736c', textDecoration: 'none' },
  footer: { paddingBlock: 24 },
});
