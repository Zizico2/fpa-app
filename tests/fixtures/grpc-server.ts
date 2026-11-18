import { createServer } from 'node:http2';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { ResultsService } from '../../src/server/gen/fpa/v1/results_pb';

const time = () => timestampFromDate(new Date());
let score = 0;
const server = createServer(
  connectNodeAdapter({
    routes(router) {
      router.service(ResultsService, {
        ping: () => ({ message: 'fixture ready' }),
        listSeasons: () => ({
          seasons: [
            { id: '374', name: '2026/27' },
            { id: '373', name: '2025/26' },
          ],
          fetchedAt: time(),
        }),
        listCompetitions: (r) => ({
          competitions:
            r.gender === 'F'
              ? [{ id: '10023', name: 'PO09 - Campeonato Betclic Feminino' }]
              : r.seasonId === '373'
                ? [
                    {
                      id: '9549',
                      name: 'PO03 - Campeonato Nacional 3a Divisao Masculina',
                    },
                  ]
                : [
                    {
                      id: '10016',
                      name: 'PO01 - Campeonato Betclic Masculino',
                    },
                    { id: '10017', name: 'PO01A - Divisao de Honra Masculina' },
                    {
                      id: '10018',
                      name: 'PO02 - Campeonato Nacional 2a Divisao Masculina',
                    },
                    {
                      id: '10019',
                      name: 'PO03 - Campeonato Nacional 3a Divisao Masculina',
                    },
                  ],
          fetchedAt: time(),
        }),
        listPhases: (r) => ({
          phases:
            r.competitionId === '10019' || r.competitionId === '9549'
              ? [
                  { id: '28412', name: '1a Fase - Zona 4' },
                  { id: '28413', name: '1a Fase - Zona 1' },
                ]
              : [{ id: '27903', name: '1a Fase' }],
          fetchedAt: time(),
        }),
        getPhase: (r) => ({
          matches: [
            {
              id: '329208',
              home: r.phaseId === '28413' ? 'CA BALTAR' : 'CC LOULÉ',
              away: 'C VELA TAVIRA',
              homeGoals: score++,
              awayGoals: 0,
              date: '2026-11-14',
              time: '17:30',
              round: '1',
            },
            {
              id: '329252',
              home: 'IFC TORRENSE',
              away: 'C VELA TAVIRA',
              date: '2027-01-30',
              time: '18:30',
              round: '12',
            },
          ],
          standings: [
            {
              teamId: '44324',
              name: 'IFC TORRENSE',
              position: 1,
              points: 7,
              played: 3,
              wins: 2,
              draws: 0,
              losses: 1,
              goalsFor: 97,
              goalsAgainst: 86,
              difference: 11,
            },
            {
              teamId: '1',
              name: 'CC LOULÉ',
              position: 2,
              points: 4,
              played: 3,
              wins: 1,
              draws: 1,
              losses: 1,
              goalsFor: 70,
              goalsAgainst: 68,
              difference: 2,
            },
            {
              teamId: '2',
              name: 'C VELA TAVIRA',
              position: 3,
              points: 1,
              played: 3,
              wins: 0,
              draws: 1,
              losses: 2,
              goalsFor: 60,
              goalsAgainst: 71,
              difference: -11,
            },
          ],
          fetchedAt: time(),
        }),
        getMatch: (r) =>
          r.matchId === '329252'
            ? {
                match: {
                  id: r.matchId,
                  home: 'IFC TORRENSE',
                  away: 'C VELA TAVIRA',
                  date: '2027-01-30',
                  time: '18:30',
                  round: '12',
                  venue: 'PAVILHÃO MUNICIPAL',
                },
                periods: [],
                homePlayers: [],
                awayPlayers: [],
                officials: [],
                fetchedAt: time(),
              }
            : {
                match: {
                  id: r.matchId,
                  number: '1527',
                  home: 'CC LOULÉ',
                  away: 'C VELA TAVIRA',
                  date: '2026-11-14',
                  time: '17:30',
                  homeGoals: 22,
                  awayGoals: 21,
                  sourceState: '60',
                  venue: 'MULTIUSOS 25 DE ABRIL',
                  round: '1',
                },
                periods: [
                  { name: '1.ª parte', home: 15, away: 12 },
                  { name: '2.ª parte', home: 7, away: 9 },
                ],
                homePlayers: [
                  { name: 'Lucas Gonçalves', shirt: '1', goals: 0 },
                  {
                    name: 'Diogo Fernandes',
                    shirt: '9',
                    goals: 6,
                    yellow: 'S',
                  },
                  {
                    name: 'Nuno Teixeira',
                    shirt: '7',
                    goals: 2,
                    disqualified: 'S',
                  },
                  {
                    name: 'Rui Pacheco',
                    shirt: '10',
                    goals: 4,
                    exclusions: 1,
                  },
                  { name: 'Helena Costa', role: 'Treinadora' },
                ],
                awayPlayers: [],
                officials: [
                  'Gonçalo Santos · Árbitro 1',
                  'Eduardo Domingos · Árbitro 2',
                ],
                fetchedAt: time(),
              },
      });
    },
  }),
);
server.listen(Number(process.env.FPA_FIXTURE_PORT ?? '50211'), '127.0.0.1');
for (const sig of ['SIGTERM', 'SIGINT'])
  process.on(sig, () => server.close(() => process.exit(0)));
