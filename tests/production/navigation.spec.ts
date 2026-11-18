import { instant } from '@next/playwright';
import { expect, type Page, test } from '@playwright/test';

const resultsUrl = '/?season=374&gender=M&competition=10019&phase=28412';
const matchPath = '/jogo/329208';
const matchName = 'CC LOULÉ — C VELA TAVIRA, ver jogo';

function waitForMatchPrefetch(page: Page, tier: '1' | '2') {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === matchPath &&
      response.request().headers()['next-router-prefetch'] === tier &&
      response.ok(),
    { timeout: 15_000 },
  );
}

async function openResultsWithShell(page: Page) {
  const match = page.getByRole('link', { name: matchName });
  const [prefetch] = await Promise.all([
    waitForMatchPrefetch(page, '1'),
    (async () => {
      await page.goto(resultsUrl);
      await match.scrollIntoViewIfNeeded();
    })(),
  ]);
  await prefetch.finished();
  return match;
}

test('prefetches the match shell and preserves context on client navigation', async ({
  page,
}) => {
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documents.push(request.url());
    }
  });

  const match = await openResultsWithShell(page);
  const sheet = page.getByRole('heading', { level: 1, name: /CC LOULÉ/ });
  await instant(page, async () => {
    // Activate the link without hovering or focusing it to exercise a cold click.
    await match.dispatchEvent('click');
    await expect(page).toHaveURL((url) => url.pathname === matchPath);
    await expect(page.getByRole('status')).toHaveText('A consultar o jogo…');
    await expect(sheet).toHaveCount(0);
    expect(documents).toHaveLength(1);
  });

  await expect(sheet).toBeVisible();
  const back = page.getByRole('link', { name: 'Voltar aos resultados' });
  await expect(back).toHaveAttribute('href', resultsUrl);
  await back.click();
  await expect(page).toHaveURL(resultsUrl);
  await expect(
    page.getByRole('combobox', { name: 'Fase / zona' }),
  ).toContainText('1a Fase - Zona 4');
  await expect(match).toBeVisible();

  await page.goBack();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(resultsUrl);
  await expect(match).toBeVisible();
  const home = page.getByRole('link', { name: 'sete.' });
  const defaultCompetition = page.getByRole('heading', {
    name: 'Campeonato Betclic Masculino',
    exact: true,
  });
  await home.click();
  await expect(defaultCompetition).toBeVisible();
  await page.getByRole('combobox', { name: 'Género' }).click();
  await page.getByRole('option', { name: 'Feminino', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Campeonato Betclic Feminino' }),
  ).toBeVisible();
  await home.click();
  await expect(defaultCompetition).toBeVisible();
  expect(documents).toHaveLength(1);
});

test('modified clicks open a game in a new tab', async ({ page, context }) => {
  await page.goto(resultsUrl);
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: matchName }).click({
      modifiers: ['ControlOrMeta'],
    }),
  ]);
  await expect(tab).toHaveURL((url) => url.pathname === matchPath);
  await expect(page).toHaveURL(resultsUrl);
  await expect(
    tab.getByRole('heading', { level: 1, name: /CC LOULÉ/ }),
  ).toBeVisible();
});

for (const intent of ['hover', 'focus'] as const) {
  test(`${intent} prefetches the match sheet before activation`, async ({
    page,
  }) => {
    const match = await openResultsWithShell(page);
    const [prefetch] = await Promise.all([
      waitForMatchPrefetch(page, '2'),
      intent === 'hover' ? match.hover() : match.focus(),
    ]);
    await prefetch.finished();

    // Keep the client refresh from filling in a missing prefetched sheet.
    await page.route(
      (url) =>
        url.pathname === '/api/board' &&
        url.searchParams.get('match') === '329208',
      (route) => route.abort(),
    );
    await instant(page, async () => {
      if (intent === 'hover') await match.click();
      else await match.press('Enter');
      await expect(page).toHaveURL((url) => url.pathname === matchPath);
      await expect(
        page.getByRole('heading', { level: 1, name: /CC LOULÉ/ }),
      ).toBeVisible();
      await expect(
        page.getByText('Lucas Gonçalves', { exact: true }),
      ).toBeVisible();
      await expect(page.getByText('A consultar o jogo…')).toHaveCount(0);
    });
  });
}
