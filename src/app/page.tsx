import { Suspense } from 'react';
import { connection } from 'next/server';
import { ResultsApp } from '../components/results-app';
import { getBoard } from '../server/results';
import { readSelection, emptySelection } from '../lib/results';
async function Current({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
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
    const data = await getBoard(selection);
    return <ResultsApp initial={data} input={data.selection} />;
  } catch {
    return <ResultsApp initial={null} input={selection} />;
  }
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
