import { collectionOptions, DbClient, Query } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { Board } from './results';
export type Loader = (signal?: AbortSignal) => Promise<Board[]>;
export const boardCollection = collectionOptions('fpa-board', (db) =>
  queryCollectionOptions({
    id: 'fpa-board',
    queryClient: db.requireDependency<QueryClient>('queryClient'),
    queryKey: ['fpa-board'],
    queryFn: ({ signal }) => db.requireDependency<Loader>('loader')(signal),
    getKey: (r: Board) => r.id,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: false,
  }),
);
export const boardQuery = () => new Query().from({ board: boardCollection });
export function createFpaDb(loader: Loader) {
  const queryClient = new QueryClient();
  return { db: new DbClient({ queryClient, loader }), queryClient };
}
