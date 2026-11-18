import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import { setTimeout as delay } from 'node:timers/promises';
import { Code, ConnectError } from '@connectrpc/connect';

type Mode = 'pass' | 'hold' | 'fail' | 'delay' | 'not-found';
type Control = {
  mode: Mode;
  ms: number;
  release: AbortController;
  calls: number;
  cancelled: number;
};

const controls = new Map<string, Control>();

export function handleFixtureControl(
  req: Http2ServerRequest,
  res: Http2ServerResponse,
) {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname !== '/fixture') return false;

  const key = url.searchParams.get('key') ?? '';
  let control = controls.get(key);
  if (req.method === 'PUT') {
    const mode = url.searchParams.get('mode') as Mode | 'reset';
    control?.release.abort();
    if (mode === 'reset') {
      controls.delete(key);
      control = undefined;
    } else {
      control ??= {
        mode,
        ms: 0,
        release: new AbortController(),
        calls: 0,
        cancelled: 0,
      };
      control.mode = mode;
      control.ms = Number(url.searchParams.get('ms'));
      control.release = new AbortController();
      controls.set(key, control);
    }
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      calls: control?.calls ?? 0,
      cancelled: control?.cancelled ?? 0,
    }),
  );
  return true;
}

export async function beforeRpc(key: string, signal: AbortSignal) {
  const control = controls.get(key);
  if (!control) return;
  control.calls++;
  if (control.mode === 'fail')
    throw new ConnectError('Fixture unavailable', Code.Unavailable);
  if (control.mode === 'not-found')
    throw new ConnectError('Fixture match not found', Code.NotFound);
  if (control.mode === 'hold') {
    const until = AbortSignal.any([signal, control.release.signal]);
    if (!until.aborted) {
      await new Promise<void>((resolve) =>
        until.addEventListener('abort', () => resolve(), { once: true }),
      );
    }
  }
  if (control.mode === 'delay')
    await delay(control.ms, undefined, { signal }).catch(() => undefined);
  if (signal.aborted) {
    control.cancelled++;
    throw signal.reason;
  }
}
