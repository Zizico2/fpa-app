'use client';
import type { QueryKey } from '@tanstack/query-core';
import { useLiveQuery } from '@tanstack/react-db';
import {
  createContext,
  type ReactNode,
  use,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  boardKey,
  boardMatches,
  createResources,
  matchKey,
  type Snapshot,
  usableSeed,
} from '../lib/resource-cache';
import type { Board, MatchRecord, Selection } from '../lib/results';
import { loadBoard, loadMatch } from '../sdk/results';

const ResourceContext = createContext<ReturnType<
  typeof createResources
> | null>(null);

export function ResourceProvider({ children }: { children: ReactNode }) {
  const [resources] = useState(createResources);
  useEffect(() => {
    resources.queryClient.mount();
    return () => resources.queryClient.unmount();
  }, [resources]);
  return <ResourceContext value={resources}>{children}</ResourceContext>;
}

function useResources() {
  const resources = useContext(ResourceContext);
  if (!resources) throw new Error('Os dados não estão disponíveis');
  return resources;
}

export function useBoardSnapshot(input: Selection) {
  return useResources().boardSnapshot(input);
}

export function useBoardInitial(
  input: Selection,
  initial: Promise<Snapshot<Board> | null> | null,
) {
  const cached = useBoardSnapshot(input);
  if (cached) return cached;
  const seed = usableSeed(initial ? use(initial) : null);
  return seed && boardMatches(input, seed.value) ? seed : null;
}

export function useBoard(input: Selection, initial: Snapshot<Board> | null) {
  const cached = useBoardSnapshot(input);
  const seed =
    cached ??
    (initial && boardMatches(input, initial.value)
      ? usableSeed(initial)
      : null);
  const selection = seed?.value.selection ?? input;
  const { value, ...state } = useResource(
    boardKey(selection),
    (signal) => loadBoard(selection, signal),
    seed,
  );
  return { board: value, ...state };
}

export function useMatch(
  id: string,
  initial: Promise<Snapshot<MatchRecord> | null> | null,
) {
  const key = matchKey(id);
  const cached = useResources().snapshot<MatchRecord>(key);
  const seed = cached ?? usableSeed(initial ? use(initial) : null);
  return useResource(
    key,
    (signal) => loadMatch(id, signal),
    seed?.value.id === id ? seed : null,
  );
}

function useResource<T extends { id: string }>(
  key: QueryKey,
  load: (signal?: AbortSignal) => Promise<T[]>,
  initial: Snapshot<T> | null,
) {
  const resources = useResources();
  // Direct collection reads start sync immediately. Only the browser should
  // start the HTTP loader; server rendering already has the initial snapshot.
  const source =
    typeof window === 'undefined'
      ? undefined
      : resources.source(key, load, initial);
  const { data, isLoadingError, isSyncError } = useLiveQuery(() => source);
  const value =
    data?.[0] ?? resources.snapshot<T>(key)?.value ?? initial?.value ?? null;
  const error =
    isLoadingError || isSyncError
      ? value
        ? 'A atualização falhou. A última informação disponível foi mantida.'
        : 'Não foi possível atualizar. Tente novamente.'
      : '';
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    if (!source) return;
    setRefreshing(true);
    try {
      if (isLoadingError) await source.reload();
      else await source.utils.refetch();
    } catch {
      // The live query reports failures; navigation can cancel the request.
    } finally {
      setRefreshing(false);
    }
  }
  return { value, error, refreshing, refresh };
}
