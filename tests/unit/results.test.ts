import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { navigationMachine } from '../../src/lib/navigation';
import {
  consultationTime,
  emptySelection,
  type Game,
  matchPath,
  matchStatus,
  readSelection,
  resultsPath,
  score,
  searchGames,
} from '../../src/lib/results';

describe('selection and scores', () => {
  it('resets dependent IDs on season and competition changes', () => {
    const actor = createActor(navigationMachine, {
      input: {
        ...emptySelection,
        season: '374',
        competition: '10019',
        phase: '28412',
        match: '329208',
      },
    }).start();
    expect(actor.getSnapshot().context.selection.match).toBe('329208');
    expect(actor.getSnapshot().matches('browsing')).toBe(true);
    actor.send({ type: 'SEASON', value: '373' });
    expect(actor.getSnapshot().context.selection).toEqual({
      ...emptySelection,
      season: '373',
    });
    actor.stop();
  });
  it('keeps a match on its own path and does not treat code 50 as a result', () => {
    const selection = {
      season: '374',
      gender: 'M',
      competition: '10019',
      phase: '28412',
      match: '329208',
    };
    expect(matchPath(selection)).toBe(
      '/jogo/329208?season=374&gender=M&competition=10019&phase=28412',
    );
    expect(resultsPath(selection)).toBe(
      '/?season=374&gender=M&competition=10019&phase=28412',
    );
    expect(matchPath({ ...emptySelection, match: '12' })).toBe(
      '/jogo/12?gender=M',
    );
    expect(matchStatus({ sourceState: '60', homeGoals: 0 })).toBe(
      'Resultado registado',
    );
    expect(matchStatus({ sourceState: '50', homeGoals: 0 })).toBe(
      'Marcador publicado · atualização automática',
    );
    expect(matchStatus({ sourceState: '50', homeGoals: null })).toBe(
      'Resultado por publicar',
    );
    expect(consultationTime('2026-11-14T17:30:00.000Z')).toBe('17:30:00');
  });
  it('validates URL identifiers and preserves missing versus zero', () => {
    expect(() => readSelection(new URLSearchParams('phase=../1'))).toThrow();
    expect(score(null)).toBe('—');
    expect(score(0)).toBe(0);
  });
  it('searches accented teams and distinguishes fixtures from a 0–0 result', () => {
    const rows = [
      {
        id: '1',
        home: 'CC LOULÉ',
        away: 'TAVIRA',
        date: '2026-11-14',
        time: '17:00',
        round: '1',
        homeGoals: 0,
        awayGoals: 0,
      },
      {
        id: '2',
        home: 'TORRENSE',
        away: 'TAVIRA',
        date: '2027-01-30',
        time: '18:30',
        homeGoals: null,
        awayGoals: null,
      },
    ] as Game[];
    expect(searchGames(rows, 'loule', 'results')).toHaveLength(1);
    expect(searchGames(rows, '', 'fixtures').map((x) => x.id)).toEqual(['2']);
  });
});
