import { describe, expect, it, vi } from 'vitest';
import { createResources, matchKey } from '../../src/lib/resource-cache';
import type { MatchRecord } from '../../src/lib/results';

describe('the tab resource cache', () => {
  it('does not replace a newer successful result with a replayed server snapshot', () => {
    const cache = createResources();
    const oldRecord = { id: '12', status: 'not-found' } satisfies MatchRecord;
    const key = matchKey(oldRecord.id);
    const load = async () => [oldRecord];
    const updatedAt = Date.now();
    try {
      cache.source(key, load, {
        value: oldRecord,
        updatedAt: updatedAt - 20_000,
      });
      expect(cache.snapshot(key)).toEqual({
        value: oldRecord,
        updatedAt: updatedAt - 20_000,
      });
      cache.queryClient.setQueryData(key, [{ ...oldRecord }], { updatedAt });

      cache.source(key, load, {
        value: oldRecord,
        updatedAt: updatedAt - 20_000,
      });
      expect(cache.snapshot(key)?.updatedAt).toBe(updatedAt);
    } finally {
      cache.queryClient.clear();
    }
  });

  it('evicts a query and does not reuse its old collection handle', () => {
    vi.useFakeTimers();
    const cache = createResources();
    const value = { id: '12' };
    const key = matchKey(value.id);
    const load = async () => [value];
    try {
      const source = cache.source(key, load, { value, updatedAt: Date.now() });
      vi.advanceTimersByTime(5 * 60_000 + 1);
      expect(cache.snapshot(key)).toBeNull();
      expect(cache.source(key, load, null)).not.toBe(source);
    } finally {
      cache.queryClient.clear();
      vi.useRealTimers();
    }
  });
});
