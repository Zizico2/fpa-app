import { Hono } from 'hono';
import { readSelection } from '../lib/results';
import { getBoard } from './results';
export const api = new Hono()
  .basePath('/api')
  .get('/board', async (c) => {
    let input;
    try {
      input = readSelection(new URL(c.req.url).searchParams);
    } catch {
      return c.json({ error: 'Parâmetros inválidos' }, 400);
    }
    c.header('Cache-Control', 'no-store');
    return c.json(await getBoard(input, c.req.raw.signal));
  })
  .onError((error, c) => {
    console.error('FPA results unavailable', error);
    return c.json(
      { error: 'Não foi possível consultar a FPA. Tente atualizar novamente.' },
      503,
    );
  });
export type FpaApi = typeof api;
