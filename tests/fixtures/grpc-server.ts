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
          ],
          fetchedAt: time(),
        }),
        getMatch: (r) => ({
          match: {
            id: r.matchId,
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
          periods: [{ name: '1.ª parte', home: 15, away: 12 }],
          homePlayers: [{ name: 'Lucas Gonçalves', shirt: '1', goals: 0 }],
          awayPlayers: [],
          officials: ['Gonçalo Santos · Árbitro 1'],
          fetchedAt: time(),
        }),
      });
    },
  }),
);
server.listen(50211, '127.0.0.1');
for (const sig of ['SIGTERM', 'SIGINT'])
  process.on(sig, () => server.close(() => process.exit(0)));
