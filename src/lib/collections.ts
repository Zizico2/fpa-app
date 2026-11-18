import { collectionOptions, DbClient, Query } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';

type Row = { id: string };
type Loader<T extends Row> = (signal?: AbortSignal) => Promise<T[]>;
export const RESOURCE_STALE_MS = 10_000;
export const RESOURCE_POLL_MS = 15_000;

export function createResourceScope<T extends Row>(loader: Loader<T>) {
  const id = `fpa-${crypto.randomUUID()}`;
  const queryClient = new QueryClient();
  const db = new DbClient({ queryClient, loader });
  const collection = collectionOptions(id, (client) =>
    queryCollectionOptions({
      id,
      queryClient: client.requireDependency<QueryClient>('queryClient'),
      queryKey: [id],
      queryFn: ({ signal }) =>
        client.requireDependency<Loader<T>>('loader')(signal),
      getKey: (r: T) => r.id,
      staleTime: RESOURCE_STALE_MS,
      refetchOnWindowFocus: false,
      retry: false,
    }),
  );
  return {
    db,
    queryClient,
    collection,
    query: new Query().from({ row: collection }),
    queryKey: [id],
  };
}
