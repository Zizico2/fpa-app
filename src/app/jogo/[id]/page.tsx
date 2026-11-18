import { connection } from 'next/server';
import { cacheSignal, Suspense } from 'react';
import {
  BackLink,
  InvalidMatch,
  MatchPage,
  MatchPending,
} from '../../../components/match-page';
import { emptySelection, isFpaId, readSelection } from '../../../lib/results';
import { documentSnapshot } from '../../../server/document-snapshot';
import { getMatch, getMatchContext } from '../../../server/results';

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
  const match = documentSnapshot((signal) => getMatch(id, signal));
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
        <MatchPage key={id} id={id} initial={match} context={context} />
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
