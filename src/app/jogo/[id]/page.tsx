import { connection } from 'next/server';
import { Suspense } from 'react';
import { MatchPage, MatchPending } from '../../../components/match-page';
import { emptySelection, readSelection } from '../../../lib/results';
import { getBoard } from '../../../server/results';

async function Current({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { id } = await params;
  if (!/^[1-9][0-9]{0,11}$/.test(id)) {
    return (
      <MatchPage initial={null} input={emptySelection} named={false} invalid />
    );
  }
  const raw = await searchParams;
  let selection = { ...emptySelection, match: id };
  let named = false;
  try {
    const requested = readSelection(
      new URLSearchParams(
        Object.entries(raw).flatMap(([k, v]) =>
          typeof v === 'string' ? [[k, v]] : [],
        ),
      ),
    );
    named = Boolean(requested.competition);
    selection = { ...requested, match: id };
  } catch {
    selection = { ...emptySelection, match: id };
  }
  try {
    const data = await getBoard(selection);
    return <MatchPage initial={data} input={data.selection} named={named} />;
  } catch {
    return <MatchPage initial={null} input={selection} named={named} />;
  }
}

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<MatchPending />}>
      <Current params={params} searchParams={searchParams} />
    </Suspense>
  );
}
