import { connection } from 'next/server';
import { cacheSignal, Suspense } from 'react';
import {
  BackLink,
  InvalidMatch,
  MatchPage,
  MatchPending,
} from '../../../components/match-page';
import {
  emptySelection,
  isFpaId,
  type MatchContext,
  type MatchRecord,
  readSelection,
} from '../../../lib/results';
import { getMatch, getMatchContext } from '../../../server/results';

async function Sheet({
  id,
  match,
  context,
}: {
  id: string;
  match: Promise<MatchRecord | null>;
  context: Promise<MatchContext | null> | null;
}) {
  return <MatchPage id={id} initial={await match} context={context} />;
}

async function Current({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isFpaId(id)) {
    return (
      <>
        <BackLink selection={emptySelection} />
        <InvalidMatch />
      </>
    );
  }
  const renderSignal = cacheSignal();
  const signal = renderSignal instanceof AbortSignal ? renderSignal : undefined;
  const connected = connection();
  const match = connected.then(() => getMatch(id, signal).catch(() => null));
  const raw = await searchParams;
  let selection = { ...emptySelection, match: id };
  try {
    const requested = readSelection(
      new URLSearchParams(
        Object.entries(raw).flatMap(([k, v]) =>
          typeof v === 'string' ? [[k, v]] : [],
        ),
      ),
    );
    selection = { ...requested, match: id };
  } catch {
    // The URL still names a valid match. Ignore malformed optional context.
  }
  const context = selection.competition
    ? connected.then(() => getMatchContext(selection, signal).catch(() => null))
    : null;
  return (
    <>
      <BackLink selection={selection} />
      <Suspense fallback={<MatchPending />}>
        <Sheet id={id} match={match} context={context} />
      </Suspense>
    </>
  );
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <Current params={params} searchParams={searchParams} />;
}
