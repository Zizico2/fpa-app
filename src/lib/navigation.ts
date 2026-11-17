import { assign, setup } from 'xstate';
import { emptySelection, type Selection } from './results';
export const navigationMachine = setup({
  types: {
    context: {} as { selection: Selection; tab: 'results' | 'standings' },
    input: {} as Selection,
    events: {} as
      | {
          type: 'SEASON' | 'GENDER' | 'COMPETITION' | 'PHASE' | 'OPEN';
          value: string;
        }
      | { type: 'CLOSE' }
      | { type: 'TAB'; value: 'results' | 'standings' },
  },
}).createMachine({
  id: 'results-navigation',
  context: ({ input }) => ({
    selection: { ...emptySelection, ...input },
    tab: 'results',
  }),
  initial: 'route',
  on: {
    SEASON: {
      target: '.browsing',
      actions: assign({
        selection: ({ context, event }) => ({
          ...context.selection,
          season: event.value,
          competition: '',
          phase: '',
          match: '',
        }),
      }),
    },
    GENDER: {
      target: '.browsing',
      actions: assign({
        selection: ({ context, event }) => ({
          ...context.selection,
          gender: event.value,
          competition: '',
          phase: '',
          match: '',
        }),
      }),
    },
    COMPETITION: {
      target: '.browsing',
      actions: assign({
        selection: ({ context, event }) => ({
          ...context.selection,
          competition: event.value,
          phase: '',
          match: '',
        }),
      }),
    },
    PHASE: {
      target: '.browsing',
      actions: assign({
        selection: ({ context, event }) => ({
          ...context.selection,
          phase: event.value,
          match: '',
        }),
      }),
    },
    TAB: { actions: assign({ tab: ({ event }) => event.value }) },
    OPEN: {
      target: '.match',
      actions: assign({
        selection: ({ context, event }) => ({
          ...context.selection,
          match: event.value,
        }),
      }),
    },
    CLOSE: {
      target: '.browsing',
      actions: assign({
        selection: ({ context }) => ({ ...context.selection, match: '' }),
      }),
    },
  },
  states: {
    route: {
      always: [
        {
          guard: ({ context }) => Boolean(context.selection.match),
          target: 'match',
        },
        { target: 'browsing' },
      ],
    },
    browsing: {},
    match: {},
  },
});
