import { connect } from 'node:http2';
import { test as base, expect } from '@playwright/test';

type Mode = 'pass' | 'hold' | 'fail' | 'delay' | 'not-found';
type Stats = { calls: number; cancelled: number };

async function fixture(
  key: string,
  mode?: Mode | 'reset',
  ms = 0,
): Promise<Stats> {
  const client = connect('http://127.0.0.1:50212');
  const query = new URLSearchParams({
    key,
    ...(mode && { mode, ms: String(ms) }),
  });
  const request = client.request({
    ':method': mode ? 'PUT' : 'GET',
    ':path': `/fixture?${query}`,
  });
  request.end();
  try {
    let body = '';
    for await (const chunk of request.setEncoding('utf8')) body += chunk;
    return JSON.parse(body);
  } finally {
    client.close();
  }
}

const test = base.extend<{
  control: (key: string, mode?: Mode, ms?: number) => Promise<Stats>;
}>({
  control: async ({}, use) => {
    const keys = new Set<string>();
    try {
      await use((key, mode, ms) => {
        if (mode) keys.add(key);
        return fixture(key, mode, ms);
      });
    } finally {
      await Promise.all([...keys].map((key) => fixture(key, 'reset')));
    }
  },
});

const withContext = (id: string, competition: string, gender = 'M') =>
  `/jogo/${id}?season=374&gender=${gender}&competition=${competition}&phase=27903`;
const player = 'Lucas Gonçalves';

test('shows the score and sheet while the phase is held, then polls the sheet independently', async ({
  page,
  control,
}) => {
  const phase = 'getPhase:10020:27903';
  const resultsUrl = '/?season=374&gender=M&competition=10020&phase=27903';
  const boardResponse = () =>
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/board' && response.ok(),
    );
  await page.clock.install();
  await page.goto(resultsUrl);
  await control(phase, 'hold');
  const requested: string[] = [];
  page.on('request', (request) =>
    requested.push(new URL(request.url()).pathname),
  );
  const matchResponse = () =>
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/match/329209' &&
        response.ok(),
    );
  const initialMatch = matchResponse();
  const matchLink = page.getByRole('link', {
    name: 'CC LOULÉ — C VELA TAVIRA, ver jogo',
  });
  await matchLink.click();
  await expect(page).toHaveURL(withContext('329209', '10020'));
  await expect.poll(async () => (await control(phase)).calls).toBe(1);
  const competition = page
    .getByRole('region', { name: /22.*21/ })
    .getByText(/fase lenta/);
  await expect(
    page.getByRole('heading', { level: 1, name: /22.*21/ }),
  ).toBeVisible();
  await expect(page.getByText(player, { exact: true })).toBeVisible();
  expect(await control(phase)).toEqual({ calls: 1, cancelled: 0 });
  await expect(competition).toHaveCount(0);

  await control(phase, 'pass');
  await expect(competition).toBeVisible();
  await page.getByRole('tab', { name: 'Ficha' }).click();
  await expect(
    page.getByRole('table', { name: 'Na classificação' }),
  ).toBeVisible();
  const back = page.getByRole('link', { name: 'Voltar aos resultados' });
  await expect(back).toHaveAttribute('href', resultsUrl);

  await initialMatch;
  const poll = matchResponse();
  // Let the hidden Results view run its pending subscription cleanup before
  // the polling interval fires, as it would with real time.
  await page.clock.runFor(16_000);
  await poll;
  expect(requested).not.toContain('/api/board');
  expect((await control(phase)).calls).toBe(1);

  const beforeReturn = await control(phase, 'hold');
  const afterReturn = requested.length;
  const boardPoll = boardResponse();
  await back.click();
  await expect(page).toHaveURL(resultsUrl);
  await expect
    .poll(async () => (await control(phase)).calls)
    .toBe(beforeReturn.calls + 1);
  await expect(matchLink).toBeVisible();
  expect((await control(phase)).cancelled).toBe(0);
  await control(phase, 'pass');
  await boardPoll;
  expect(requested.slice(afterReturn)).not.toContain('/api/match/329209');
});

test('seeds a Results document once and reuses the board on browser Back', async ({
  page,
  control,
}) => {
  const phase = 'getPhase:10020:27903';
  const resultsUrl = '/?season=374&gender=M&competition=10020&phase=27903';
  await control(phase, 'pass');
  const boardRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/board')
      boardRequests.push(request.url());
  });
  await page.clock.install();
  await page.goto(resultsUrl);
  const row = page.getByRole('link', {
    name: 'CC LOULÉ — C VELA TAVIRA, ver jogo',
  });
  await page
    .getByRole('button', { name: 'Classificação', exact: true })
    .click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('button', { name: 'Resultados', exact: true }).click();
  const cachedScore = await row.textContent();
  expect(boardRequests).toHaveLength(0);
  expect((await control(phase)).calls).toBe(1);

  await row.click();
  await expect(page.getByText(player, { exact: true })).toBeVisible();
  await expect(
    page.getByText(/fase lenta/).filter({ visible: true }),
  ).toBeVisible();
  const beforeFreshReturn = await control(phase);
  await page.goBack();
  await expect(row).toHaveText(cachedScore ?? '');
  expect(boardRequests).toHaveLength(0);
  expect(await control(phase)).toEqual(beforeFreshReturn);
  await page.goForward();
  await expect(page.getByText(player, { exact: true })).toBeVisible();
  await expect(
    page.getByText(/fase lenta/).filter({ visible: true }),
  ).toBeVisible();
  await page.clock.runFor(11_000);
  const before = await control(phase, 'hold');
  await page.goBack();
  await expect(page).toHaveURL(resultsUrl);
  await expect
    .poll(async () => (await control(phase)).calls)
    .toBe(before.calls + 1);
  await expect(row).toHaveText(cachedScore ?? '');
  expect((await control(phase)).cancelled).toBe(0);
  await control(phase, 'pass');
});

test('reopens a cached match during a refresh and expires an inactive match', async ({
  page,
  control,
}) => {
  const key = 'getMatch:329209';
  const resultsUrl = '/?season=374&gender=M&competition=10020&phase=27903';
  await page.clock.install();
  await page.goto(resultsUrl);
  const link = page.getByRole('link', {
    name: 'CC LOULÉ — C VELA TAVIRA, ver jogo',
  });
  await link.click();
  const sheet = page.getByText(player, { exact: true });
  await expect(sheet).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos resultados' }).click();
  await expect(link).toBeVisible();
  await page.clock.runFor(11_000);
  await control(key, 'hold');
  await link.click();
  await expect.poll(async () => (await control(key)).calls).toBe(1);
  await expect(sheet).toBeVisible();
  await expect(
    page
      .getByText('A consultar o jogo…', { exact: true })
      .filter({ visible: true }),
  ).toHaveCount(0);
  expect((await control(key)).cancelled).toBe(0);
  const refreshed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/match/329209' && response.ok(),
  );
  await control(key, 'pass');
  await refreshed;
  await page.getByRole('link', { name: 'Voltar aos resultados' }).click();
  await expect(link).toBeVisible();
  await page.clock.fastForward(301_000);

  const afterExpiry = await control(key, 'hold');
  await link.click();
  await expect
    .poll(async () => (await control(key)).calls)
    .toBe(afterExpiry.calls + 1);
  await expect(sheet).toHaveCount(0);
  await expect(
    page
      .getByText('A consultar o jogo…', { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await control(key, 'pass');
  await expect(sheet).toBeVisible();
});

test('switching filters reuses only the exact stale board and keeps it on failure', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/?season=374&gender=M&competition=10019&phase=28412');
  const loule = page.getByRole('link', {
    name: 'CC LOULÉ — C VELA TAVIRA, ver jogo',
  });
  const baltar = page.getByRole('link', {
    name: 'CA BALTAR — C VELA TAVIRA, ver jogo',
  });
  const choosePhase = async (name: string) => {
    await page.getByRole('combobox', { name: 'Fase / zona' }).click();
    await page.getByRole('option', { name, exact: true }).click();
  };
  await expect(loule).toBeVisible();
  const cachedScore = await loule.textContent();
  await choosePhase('1a Fase - Zona 1');
  await expect(baltar).toBeVisible();
  await expect(loule).toHaveCount(0);
  await page.clock.runFor(11_000);

  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  await page.route(
    (url) =>
      url.pathname === '/api/board' &&
      url.searchParams.get('phase') === '28412',
    async (route) => {
      started.resolve();
      await release.promise;
      await route.fulfill({ status: 503, body: '{}' });
    },
  );
  try {
    await choosePhase('1a Fase - Zona 4');
    await expect(loule).toHaveText(cachedScore ?? '');
    await started.promise;
    await expect(baltar).toHaveCount(0);
  } finally {
    release.resolve();
  }
  await expect(
    page.getByRole('alert', { name: 'Atualização indisponível' }),
  ).toBeVisible();
  await expect(loule).toHaveText(cachedScore ?? '');
});

test('failed or unrelated competition context cannot hide or label a healthy sheet', async ({
  page,
  control,
}) => {
  const phase = 'getPhase:10021:27903';
  await control(phase, 'fail');
  await page.goto(withContext('329210', '10021'));
  expect((await control(phase)).calls).toBe(1);
  await expect(page.getByText(player, { exact: true })).toBeVisible();
  await expect(page.getByText(/fase indisponível/)).toHaveCount(0);

  await page.goto(withContext('329210', '10023', 'F'));
  await expect(page.getByText(player, { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Ficha' }).click();
  await expect(
    page.getByText(/Campeonato Betclic Feminino|Na classificação/),
  ).toHaveCount(0);
});

test('returning to the tab refreshes a stale match but leaves a fresh one alone', async ({
  page,
}) => {
  const path = '/api/match/329210';
  const isMatchRequest = (url: string) => new URL(url).pathname === path;
  let requests = 0;
  page.on('request', (request) => {
    if (isMatchRequest(request.url())) requests++;
  });
  const matchResponse = () =>
    page.waitForResponse(
      (response) => isMatchRequest(response.url()) && response.ok(),
    );
  const setVisibility = (value: 'visible' | 'hidden') =>
    page.evaluate((state) => {
      Object.defineProperty(document, 'visibilityState', {
        value: state,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    }, value);

  await page.clock.install();
  await page.goto('/jogo/329210');
  await page.getByRole('tab', { name: 'Ficha' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Ficha' })).toBeVisible();
  await setVisibility('hidden');
  await setVisibility('visible');
  await page.clock.runFor(1_000);
  expect(requests).toBe(0);

  await setVisibility('hidden');
  // The match goes stale after 10s. Stay below the 15s polling interval.
  await page.clock.runFor(10_100);
  expect(requests).toBe(0);
  await Promise.all([matchResponse(), setVisibility('visible')]);
  expect(requests).toBe(1);
});

test('an already stale server snapshot revalidates on hydration', async ({
  page,
}) => {
  const path = '/api/match/329214';
  // Age the SSR stamp from the browser's perspective before it hydrates.
  await page.clock.install({ time: new Date(Date.now() + 12_000) });
  await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === path && response.ok(),
    ),
    page.goto('/jogo/329214'),
  ]);
  await expect(page.getByText(player, { exact: true })).toBeVisible();
});

test('keeps the last sheet on a gRPC refresh failure and cancels a pending refresh on navigation', async ({
  page,
  control,
}) => {
  const id = '329211';
  const key = `getMatch:${id}`;
  await control(key, 'pass');
  await page.goto(`/jogo/${id}`);
  const sheet = page.getByText(player, { exact: true });
  const refresh = page.getByRole('button', { name: 'Atualizar', exact: true });
  const warning = page.getByRole('alert', { name: 'Atualização indisponível' });
  await expect(sheet).toBeVisible();

  await control(key, 'fail');
  await refresh.click();
  await expect(warning).toBeVisible();
  await expect(sheet).toBeVisible();
  await control(key, 'pass');
  await refresh.click();
  await expect(warning).toHaveCount(0);

  await expect(refresh).toBeEnabled();
  const before = await control(key, 'hold');
  await refresh.click();
  await expect
    .poll(async () => (await control(key)).calls)
    .toBeGreaterThan(before.calls);
  const failed = page.waitForEvent(
    'requestfailed',
    (request) => new URL(request.url()).pathname === `/api/match/${id}`,
  );
  await page.getByRole('link', { name: 'Voltar aos resultados' }).click();
  expect((await failed).failure()?.errorText).toBe('net::ERR_ABORTED');
  await expect
    .poll(async () => (await control(key)).cancelled)
    .toBeGreaterThan(before.cancelled);
});

test('retries a failed first match load with one request', async ({
  page,
  control,
}) => {
  const id = '329213';
  const key = `getMatch:${id}`;
  await control(key, 'fail');
  await page.goto(`/jogo/${id}`);
  await expect(
    page.getByRole('heading', { name: 'Jogo indisponível' }),
  ).toBeVisible();
  const retry = page.getByRole('button', { name: 'Tentar novamente' });
  await expect(retry).toBeEnabled();

  const before = await control(key, 'pass');
  await retry.click();
  await expect(page.getByText(player, { exact: true })).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect(
    page.getByRole('alert', { name: 'Atualização indisponível' }),
  ).toHaveCount(0);
  expect((await control(key)).calls).toBe(before.calls + 1);
});

test('represents a genuine missing match as not found', async ({
  page,
  request,
  control,
}) => {
  const id = '329212';
  await control(`getMatch:${id}`, 'not-found');
  const response = await request.get(`/api/match/${id}`);
  expect(response.status()).toBe(404);
  expect(await response.json()).toEqual({ id, status: 'not-found' });
  await page.goto(`/jogo/${id}`);
  await expect(
    page.getByRole('heading', { name: 'Jogo não encontrado.' }),
  ).toBeVisible();
});

test('applies one deadline to the full RPC sequence', async ({
  request,
  control,
}) => {
  const phase = 'getPhase:10017:27903';
  // Both calls would succeed with their own 3s timeouts. Together they exceed
  // the fixture build's 3s resource budget.
  await control('listPhases:10017', 'delay', 2000);
  await control(phase, 'delay', 2000);
  const response = await request.get(
    '/api/board?season=374&gender=M&competition=10017&phase=27903',
  );
  expect(response.status()).toBe(503);
  await expect.poll(() => control(phase)).toEqual({ calls: 1, cancelled: 1 });
});
