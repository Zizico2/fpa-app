import { expect, test } from '@playwright/test';

test('real gateway results and standings are usable', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Atualizar', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('combobox', { name: 'Época', exact: true }),
  ).not.toBeEmpty();
  await page
    .getByRole('button', { name: 'Classificação', exact: true })
    .click();
  await expect(page.getByRole('table')).toBeVisible();
});
