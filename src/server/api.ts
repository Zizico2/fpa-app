import { Hono } from 'hono';
import { isFpaId, readSelection } from '../lib/results';
import { getBoard, getMatch } from './results';
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
  .get('/match/:id', async (c) => {
    const id = c.req.param('id');
    c.header('Cache-Control', 'no-store');
    if (!isFpaId(id)) return c.json({ error: 'Identificador inválido' }, 400);
    const match = await getMatch(id, c.req.raw.signal);
    if (match.status === 'not-found') return c.json(match, 404);
    return c.json(match);
  })
  .onError((error, c) => {
    if (!c.req.raw.signal.aborted)
      console.error('FPA results unavailable', error);
    return c.json(
      { error: 'Não foi possível consultar a FPA. Tente atualizar novamente.' },
      503,
    );
  });
export type FpaApi = typeof api;
