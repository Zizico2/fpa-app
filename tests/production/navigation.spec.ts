import { instant } from '@next/playwright';
import { expect, test } from '@playwright/test';

const resultsUrl = '/?season=374&gender=M&competition=10019&phase=28412';
const matchPath = '/jogo/329208';
const matchName = 'CC LOULÉ — C VELA TAVIRA, ver jogo';

test('prefetches the match shell and preserves context on client navigation', async ({
  page,
}) => {
  const documents: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documents.push(request.url());
    }
  });

  // Observe the source link's automatic prefetch before activating it.
  const match = page.getByRole('link', { name: matchName });
  const [prefetch] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === matchPath &&
        response.request().headers()['next-router-prefetch'] === '1' &&
        response.ok(),
      { timeout: 15_000 },
    ),
    (async () => {
      await page.goto(resultsUrl);
      await match.scrollIntoViewIfNeeded();
    })(),
  ]);
  await prefetch.finished();

  const sheet = page.getByRole('heading', { level: 1, name: /CC LOULÉ/ });
  await instant(page, async () => {
    await match.press('Enter');
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
