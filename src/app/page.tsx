import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ResultsApp } from '../components/results-app';
import { emptySelection, matchPath, readSelection } from '../lib/results';
import { documentSnapshot } from '../server/document-snapshot';
import { getBoard } from '../server/results';

async function Current({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  let selection = { ...emptySelection };
  try {
    selection = readSelection(
      new URLSearchParams(
        Object.entries(raw).flatMap(([k, v]) =>
          typeof v === 'string' ? [[k, v]] : [],
        ),
      ),
    );
  } catch {
    return <ResultsApp initial={null} input={selection} />;
  }
  if (selection.match) redirect(matchPath(selection));
  return (
    <ResultsApp
      initial={documentSnapshot((signal) => getBoard(selection, signal))}
      input={selection}
    />
  );
}
export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 40 }}>
          <h1>sete.</h1>
          <p>A consultar os resultados da FPA…</p>
        </main>
      }
    >
      <Current searchParams={searchParams} />
    </Suspense>
  );
}
