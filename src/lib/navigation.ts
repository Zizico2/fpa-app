import { assign, setup } from 'xstate';
import { emptySelection, type Selection } from './results';
export const navigationMachine = setup({
  types: {
    context: {} as { selection: Selection; tab: 'results' | 'standings' },
    input: {} as Selection,
    events: {} as
      | {
          type: 'SEASON' | 'GENDER' | 'COMPETITION' | 'PHASE';
          value: string;
        }
      | { type: 'TAB'; value: 'results' | 'standings' },
  },
}).createMachine({
  id: 'results-navigation',
  context: ({ input }) => ({
    selection: { ...emptySelection, ...input },
    tab: 'results',
  }),
  initial: 'browsing',
  on: {
    SEASON: {
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
      actions: assign({
        selection: ({ context, event }) => ({
          ...context.selection,
          phase: event.value,
          match: '',
        }),
      }),
    },
    TAB: { actions: assign({ tab: ({ event }) => event.value }) },
  },
  states: {
    browsing: {},
  },
});
