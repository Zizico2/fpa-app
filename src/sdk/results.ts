import { hc } from 'hono/client';
import type { Board, MatchRecord, Selection } from '../lib/results';
import type { FpaApi } from '../server/api';

const client = hc<FpaApi>('/');
export async function loadBoard(
  input: Selection,
  signal?: AbortSignal,
): Promise<Board[]> {
  const response = await client.api.board.$get(
    { query: input },
    { init: { signal } },
  );
  if (!response.ok) throw new Error('Resultados indisponíveis');
  return [(await response.json()) as Board];
}

export async function loadMatch(
  id: string,
  signal?: AbortSignal,
): Promise<MatchRecord[]> {
  const response = await client.api.match[':id'].$get(
    { param: { id } },
    { init: { signal } },
  );
  if (response.status === 404) return [{ id, status: 'not-found' }];
  if (response.status !== 200) throw new Error('Jogo indisponível');
  return [await response.json()];
}
