import 'server-only';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import { cacheSignal } from 'react';
import type { Snapshot } from '../lib/resource-cache';

export async function documentSnapshot<T>(
  load: (signal?: AbortSignal) => Promise<T>,
): Promise<Snapshot<T> | null> {
  const signal = cacheSignal();
  await connection();
  // A browser fetch is a client navigation here. Let its tab cache own the
  // load instead of making a second upstream request from the route render.
  // Requests without Fetch Metadata still get server-rendered data.
  if ((await headers()).get('sec-fetch-dest') === 'empty') return null;
  const updatedAt = Date.now();
  try {
    return {
      value: await load(signal instanceof AbortSignal ? signal : undefined),
      updatedAt,
    };
  } catch {
    return null;
  }
}
