'use client';
import { DbProvider, useLiveQuery } from '@tanstack/react-db';
import { createContext, useContext, useEffect, useState } from 'react';
import { createResourceScope } from '../lib/collections';
import type { Board, MatchRecord, Selection } from '../lib/results';
import { loadBoard, loadMatch } from '../sdk/results';

type Scope<T extends { id: string }> = ReturnType<
  typeof createResourceScope<T>
>;
const BoardScopeContext = createContext<Scope<Board> | null>(null);
const MatchScopeContext = createContext<Scope<MatchRecord> | null>(null);

export function DataScope({
  selection,
  children,
}: {
  selection: Selection;
  children: React.ReactNode;
}) {
  const [scope] = useState(() =>
    createResourceScope((signal) => loadBoard(selection, signal)),
  );
  // Next can hide this route and clean up its effects without unmounting it.
  // Let TanStack unsubscribe and collect unused queries without disposing the
  // DbClient that the preserved page needs when it becomes visible again.
  return (
    <DbProvider client={scope.db}>
      <BoardScopeContext.Provider value={scope}>
        {children}
      </BoardScopeContext.Provider>
    </DbProvider>
  );
}

export function useBoard(initial: Board | null) {
  const { value, ...state } = useResource(
    useContext(BoardScopeContext),
    initial,
  );
  return { board: value, ...state };
}

export function MatchScope({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const [scope] = useState(() =>
    createResourceScope((signal) => loadMatch(id, signal)),
  );
  return (
    <DbProvider client={scope.db}>
      <MatchScopeContext.Provider value={scope}>
        {children}
      </MatchScopeContext.Provider>
    </DbProvider>
  );
}

export function useMatch(initial: MatchRecord | null) {
  return useResource(useContext(MatchScopeContext), initial);
}

function useResource<T extends { id: string }>(
  resource: Scope<T> | null,
  initial: T | null,
) {
  if (!resource) throw new Error('Os dados não estão disponíveis');
  const scope = resource;
  const { db, queryClient, queryKey, collection } = scope;
  const source = db.collection(collection);
  // Direct subscriptions start sync immediately. The server already supplies
  // the initial value; only the browser should start the HTTP loader.
  const { data } = useLiveQuery(() =>
    typeof window === 'undefined' ? undefined : source,
  );
  const value = data?.[0] ?? initial;
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    queryClient.mount();
    const update = () =>
      setError(
        queryClient.getQueryState(queryKey)?.status === 'error'
          ? 'A atualização falhou. A última informação disponível foi mantida.'
          : '',
      );
    update();
    const unsubscribe = queryClient.getQueryCache().subscribe(update);

    return () => {
      unsubscribe();
      queryClient.unmount();
    };
  }, [queryClient, queryKey]);
  async function refresh() {
    setRefreshing(true);
    try {
      // A failed first load must not prevent an explicit retry.
      await source.preload().catch(() => undefined);
      await source.utils.refetch({ throwOnError: true });
    } catch {
      setError('Não foi possível atualizar. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  }
  return { value, error, refreshing, refresh };
}
