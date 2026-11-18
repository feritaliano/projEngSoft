import { expect, test } from '@playwright/test';
import { seriousViolations, signIn } from './support';

// Against the real API and the catalog of the seed (job e2e).

test('searches the catalog by issuer or ticker and clears the search (C1)', async ({ page }) => {
  await signIn(page);
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Ativos' })
    .click();
  await expect(page).toHaveURL('/ativos');
  await expect(page.getByRole('heading', { name: 'Ativos', level: 1 })).toBeVisible();

  const table = page.getByRole('table', { name: /Ativos do catálogo/ });
  await expect(table.getByRole('row').nth(1)).toBeVisible();

  // Issuer name without accents or case (the API ignores both).
  const search = page.getByLabel('Buscar ativo');
  await search.fill('itausa');
  await expect(page.getByText(/ativos? encontrados? para “itausa”/)).toBeVisible();
  await expect(table.getByRole('row').filter({ hasText: 'ITSA4' })).toContainText(
    /ITAUSA S\.A\..*Ação/,
  );

  // Fixed income has no ticker: the code is its display name (D50).
  await search.fill('tesouro');
  await expect(
    table.getByRole('row').filter({ hasText: 'Tesouro IPCA+ 2035' }).first(),
  ).toContainText('Renda fixa');

  await search.fill('PETRX');
  await expect(
    page.getByRole('heading', { name: 'Nenhum ativo encontrado para “PETRX”' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
  await expect(table.getByRole('row').nth(1)).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`catalog has no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signIn(page);
    await page.goto('/ativos');
    await expect(page.getByRole('table', { name: /Ativos do catálogo/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel('Buscar ativo').fill('PETRX');
    await expect(page.getByRole('heading', { name: /Nenhum ativo encontrado/ })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
}
