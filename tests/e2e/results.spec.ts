import { expect, test } from '@playwright/test';

test('results, standings, match sheets and narrow-screen layout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Campeonato Betclic Masculino',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'CC LOULÉ — C VELA TAVIRA, ver jogo' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Classificação', exact: true })
    .click();
  await expect(
    page.getByRole('rowheader', { name: 'IFC TORRENSE', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resultados', exact: true }).click();
  await page
    .getByRole('link', { name: 'CC LOULÉ — C VELA TAVIRA, ver jogo' })
    .click();
  await expect(page).toHaveURL(/\/jogo\/329208/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { level: 1, name: /CC LOULÉ/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 1, name: /C VELA TAVIRA/ }),
  ).toBeVisible();
  await expect(page.getByText('Resultado registado')).toBeVisible();
  await expect(page.getByText('1.ª parte')).toBeVisible();
  await expect(
    page.getByText('Lucas Gonçalves', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Ficha' }).click();
  await expect(page.getByText('Gonçalo Santos · Árbitro 1')).toBeVisible();
  await expect(page.getByText('Na classificação')).toBeVisible();
  await page.getByRole('tab', { name: 'Boletim' }).click();
  await expect(
    page.getByText('Lucas Gonçalves', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Voltar aos resultados' }).click();
  await expect(page).not.toHaveURL(/\/jogo\//);
  await expect(
    page.getByRole('heading', {
      name: 'Campeonato Betclic Masculino',
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('an old match query opens the match page, and an unpublished game stays unpublished', async ({
  page,
}) => {
  await page.goto(
    '/?match=329252&season=374&gender=M&competition=10016&phase=27903',
  );
  await expect(page).toHaveURL(/\/jogo\/329252\?/);
  await expect(page).not.toHaveURL(/[?&]match=/);
  await expect(page.getByText('Resultado por publicar')).toBeVisible();
  await expect(page.getByText('Boletim ainda não publicado.')).toHaveCount(2);
  await expect(page.getByText(/ao vivo|fim do jogo/i)).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('—');
});
test('season resets competition, zones work and searching tolerates accents', async ({
  page,
}) => {
  await page.goto('/?season=374&gender=M&competition=10019&phase=28412');
  await page.getByRole('searchbox', { name: 'Pesquisar jogos' }).fill('loule');
  await expect(
    page.getByRole('link', { name: 'CC LOULÉ — C VELA TAVIRA, ver jogo' }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Fase / zona' }).click();
  await page
    .getByRole('option', { name: '1a Fase - Zona 1', exact: true })
    .click();
  await page.getByRole('searchbox', { name: 'Pesquisar jogos' }).fill('baltar');
  await expect(
    page.getByRole('link', { name: 'CA BALTAR — C VELA TAVIRA, ver jogo' }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Época', exact: true }).click();
  await page.getByRole('option', { name: '2025/26', exact: true }).click();
  await expect(page).toHaveURL(/season=373/);
  await expect(
    page.getByRole('combobox', { name: 'Competição', exact: true }),
  ).toContainText('PO03');
});
test('failed refresh retains the current results and a retry recovers', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: 'CC LOULÉ — C VELA TAVIRA, ver jogo' }),
  ).toBeVisible();
  await page.route('**/api/board**', (route) =>
    route.fulfill({ status: 503, body: '{}' }),
  );
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(
    page.getByRole('alert', { name: 'Atualização indisponível' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'CC LOULÉ — C VELA TAVIRA, ver jogo' }),
  ).toBeVisible();
  await page.unroute('**/api/board**');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(
    page.getByRole('alert', { name: 'Atualização indisponível' }),
  ).toHaveCount(0);
});
test('background polling fetches changed scores without reloading', async ({
  page,
}) => {
  let calls = 0;
  page.on('response', (r) => {
    if (r.url().includes('/api/board') && r.ok()) calls++;
  });
  await page.goto('/');
  const row = page.getByRole('link', {
    name: 'CC LOULÉ — C VELA TAVIRA, ver jogo',
  });
  await expect(row).toBeVisible();
  const scoreBefore = await row.textContent();
  const before = calls;
  await expect.poll(() => calls, { timeout: 22000 }).toBeGreaterThan(before);
  await expect(row).not.toHaveText(scoreBefore ?? '');
});

test('upcoming fixtures preserve unpublished scores and women catalog works', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Mostrar', exact: true }).click();
  await page.getByRole('option', { name: 'Por disputar', exact: true }).click();
  const future = page.getByRole('link', {
    name: 'IFC TORRENSE — C VELA TAVIRA, ver jogo',
  });
  await expect(future).toBeVisible();
  await expect(future).toContainText('—');
  await page.getByRole('combobox', { name: 'Género', exact: true }).click();
  await page.getByRole('option', { name: 'Feminino', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Competição', exact: true }),
  ).toContainText('Feminino');
});
