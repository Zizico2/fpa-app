import { collectionOptions, DbClient, Query } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { Board } from './results';
export type Loader = (signal?: AbortSignal) => Promise<Board[]>;

export function createBoardScope(loader: Loader) {
  const id = `fpa-${crypto.randomUUID()}`;
  const queryClient = new QueryClient();
  const db = new DbClient({ queryClient, loader });
  const collection = collectionOptions(id, (client) =>
    queryCollectionOptions({
      id,
      queryClient: client.requireDependency<QueryClient>('queryClient'),
      queryKey: [id],
      queryFn: ({ signal }) =>
        client.requireDependency<Loader>('loader')(signal),
      getKey: (r: Board) => r.id,
      staleTime: 10_000,
      refetchInterval: 15_000,
      refetchOnWindowFocus: true,
      retry: false,
    }),
  );
  return {
    db,
    queryClient,
    collection,
    query: new Query().from({ board: collection }),
    queryKey: [id],
  };
}
