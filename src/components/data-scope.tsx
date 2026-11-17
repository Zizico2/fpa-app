'use client';
import type { QueryClient } from '@tanstack/query-core';
import { DbProvider, useDbClient, useLiveQuery } from '@tanstack/react-db';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createBoardScope } from '../lib/collections';
import type { Board, Selection } from '../lib/results';
import { loadBoard } from '../sdk/results';

const ScopeContext = createContext<ReturnType<typeof createBoardScope> | null>(
  null,
);

export function DataScope({
  selection,
  children,
}: {
  selection: Selection;
  children: React.ReactNode;
}) {
  const [scope] = useState(() =>
    createBoardScope((signal) => loadBoard(selection, signal)),
  );
  const teardown = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (teardown.current) clearTimeout(teardown.current);
    return () => {
      teardown.current = setTimeout(() => {
        void scope.db.cleanup();
        scope.queryClient.clear();
      }, 0);
    };
  }, [scope]);
  return (
    <DbProvider client={scope.db}>
      <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>
    </DbProvider>
  );
}

export function useBoard(initial: Board | null) {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error('O quadro não está disponível');
  const boardScope = scope;
  const db = useDbClient();
  const { data } = useLiveQuery({ query: boardScope.query });
  const board = data[0] ?? initial;
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    const q = db.requireDependency<QueryClient>('queryClient');
    const update = () =>
      setError(
        q.getQueryState(boardScope.queryKey)?.status === 'error'
          ? 'A atualização falhou. A última informação disponível foi mantida.'
          : '',
      );
    update();
    return q.getQueryCache().subscribe(update);
  }, [db, boardScope]);
  async function refresh() {
    setRefreshing(true);
    try {
      const c = db.collection(boardScope.collection);
      // A failed first load must not prevent an explicit retry.
      await c.preload().catch(() => undefined);
      await c.utils.refetch({ throwOnError: true });
    } catch {
      setError('Não foi possível atualizar. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  }
  return { board, error, refreshing, refresh };
}
