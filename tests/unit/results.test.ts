import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { navigationMachine } from '../../src/lib/navigation';
import {
  readSelection,
  emptySelection,
  searchGames,
  score,
  type Game,
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
    actor.send({ type: 'SEASON', value: '373' });
    expect(actor.getSnapshot().context.selection).toEqual({
      ...emptySelection,
      season: '373',
    });
    actor.send({ type: 'OPEN', value: '329252' });
    expect(actor.getSnapshot().matches('match')).toBe(true);
    actor.send({ type: 'CLOSE' });
    expect(actor.getSnapshot().context.selection.match).toBe('');
    actor.stop();
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
