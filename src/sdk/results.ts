import { hc } from 'hono/client';
import type { Board, Selection } from '../lib/results';
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
