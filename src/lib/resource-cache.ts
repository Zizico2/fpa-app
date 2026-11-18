import { createCollection } from '@tanstack/db';
import { QueryClient, type QueryKey } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { Board, Selection } from './results';

type Row = { id: string };
type Loader<T extends Row> = (signal?: AbortSignal) => Promise<T[]>;
export type Snapshot<T> = { value: T; updatedAt: number };

const staleTime = 10_000;
const retainTime = 5 * 60_000;

export function usableSeed<T>(seed: Snapshot<T> | null) {
  return seed &&
    (typeof window === 'undefined' || Date.now() - seed.updatedAt < retainTime)
    ? seed
    : null;
}
export const boardKey = (input: Selection) =>
  [
    'board',
    input.season,
    input.gender,
    input.competition,
    input.phase,
  ] as const;
export const matchKey = (id: string) => ['match', id] as const;

export function boardMatches(input: Selection, board: Board) {
  const selection = board.selection;
  return (
    input.gender === selection.gender &&
    (input.season || board.seasons[0]?.id || '') === selection.season &&
    (input.competition || board.competitions[0]?.id || '') ===
      selection.competition &&
    (input.phase || board.phases[0]?.id || '') === selection.phase
  );
}

function createSource<T extends Row>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  loader: Loader<T>,
) {
  return createCollection({
    ...queryCollectionOptions({
      queryClient,
      queryKey,
      queryFn: ({ signal }) => loader(signal),
      getKey: (row: T) => row.id,
      staleTime,
      gcTime: retainTime,
      refetchInterval: 15_000,
      refetchOnWindowFocus: true,
      retry: false,
    }),
    // Eager collection cleanup can remove its Query. Keep their lifetimes aligned.
    gcTime: retainTime,
  });
}

export function createResources() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: retainTime } },
  });
  // A preserved route and a newly mounted route can read the same query. Share its
  // collection too, so one reader cannot dispose another's query. Expired Query
  // entries release their collection handles without a second eviction policy.
  const sources = new WeakMap<object, unknown>();

  function snapshot<T>(key: QueryKey): Snapshot<T> | null {
    const state = queryClient.getQueryState<T[]>(key);
    const value = state?.data?.[0];
    return state && value ? { value, updatedAt: state.dataUpdatedAt } : null;
  }

  function boardSnapshot(input: Selection) {
    const exact = snapshot<Board>(boardKey(input));
    let latest = exact && boardMatches(input, exact.value) ? exact : null;
    // A request with omitted defaults may have resolved to this same board.
    // Only reuse a candidate whose catalog resolves every omitted field to it.
    for (const [key] of queryClient.getQueriesData<Board[]>({
      queryKey: ['board'],
    })) {
      const candidate = snapshot<Board>(key);
      if (
        candidate &&
        (!latest || candidate.updatedAt > latest.updatedAt) &&
        boardMatches(input, candidate.value)
      ) {
        latest = candidate;
      }
    }
    return latest;
  }

  function source<T extends Row>(
    key: QueryKey,
    loader: Loader<T>,
    initial: Snapshot<T> | null,
  ) {
    // Query's initializer applies only when the entry is created. A streamed or
    // replayed server snapshot never overwrites a newer browser result.
    const query = queryClient.getQueryCache().build(queryClient, {
      queryKey: key,
      gcTime: retainTime,
      ...(initial && {
        initialData: [initial.value],
        initialDataUpdatedAt: initial.updatedAt,
      }),
    });
    const existing = sources.get(query) as
      | ReturnType<typeof createSource<T>>
      | undefined;
    if (existing) return existing;
    const collection = createSource(queryClient, key, loader);
    sources.set(query, collection);
    return collection;
  }

  return { queryClient, snapshot, boardSnapshot, source };
}
