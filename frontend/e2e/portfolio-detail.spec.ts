import { Page, expect, test } from '@playwright/test';
import { seriousViolations, signIn } from './support';

// Against the real API and the seed (job e2e). "Longo prazo" of the demo user = handoff, "Massa das telas 3 e 4":
// 11 operations, 6 open positions and WEGE3 closed.

const openLongoPrazo = async (page: Page) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Longo prazo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Longo prazo', level: 1 })).toBeVisible();
};

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Seções da carteira' });

/** Value of an indicator: the dd after its visible label (the dt of the hidden mobile cards are not visible). */
const kpi = (page: Page, label: string) =>
  page
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]');

test('shows the totals and the positions of "Longo prazo" as the API computes them (B6, B7)', async ({
  page,
}) => {
  const summaryResponse = page.waitForResponse((r) => r.url().endsWith('/summary'));
  await openLongoPrazo(page);

  // The API and the screen agree: the API sends full precision (the fixed income cost is 1999.99999…) and the screen
  // only rounds it to 2 places (RN11). Number() here is test code, not src/app.
  const summary = await (await summaryResponse).json();
  expect(Number(summary.totalCost.value).toFixed(2)).toBe('16151.27');
  expect(Number(summary.realizedProfit.value).toFixed(2)).toBe('693.87');
  expect(summary.assetCount).toBe(6);

  await expect(page.getByText('11 operações · 6 ativos')).toBeVisible();
  await expect(tabs(page).getByRole('link', { name: 'Resumo' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(kpi(page, 'Custo total')).toHaveText('R$ 16.151,27');
  await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 693,87');
  await expect(kpi(page, 'Ativos em carteira')).toHaveText(/^6\s*1 posição encerrada$/);

  const open = page.getByRole('table', { name: 'Posições abertas, agrupadas por classe' });
  // Header + 5 class groups + 6 assets + Total: no asset more, none less.
  await expect(open.getByRole('row')).toHaveCount(13);
  const row = (name: string | RegExp) => open.getByRole('row').filter({ hasText: name });
  await expect(row('PETR4')).toContainText(/100\s*R\$\s32,03\s*R\$\s3\.203,27\s*\+ R\$\s293,47/);
  await expect(row('ITSA4')).toContainText(/300\s*R\$\s9,87\s*R\$\s2\.961,00\s*R\$\s0,00/);
  await expect(row('BOVA11')).toContainText(/20\s*R\$\s118,45\s*R\$\s2\.369,00/);
  await expect(row('MXRF11')).toContainText(/150\s*R\$\s10,12\s*R\$\s1\.518,00\s*− R\$\s12,40/);
  await expect(row('Tesouro IPCA+ 2035')).toContainText(/0,52\s*R\$\s3\.846,15\s*R\$\s2\.000,00/);
  await expect(row('BTC')).toContainText(/0,0125\s*R\$\s328\.000,00\s*R\$\s4\.100,00/);
  // /^Total/: a string hasText ignores case and would also match "Custo total" in the header.
  await expect(row(/^Total/)).toContainText('R$ 16.151,27');
  await expect(row('WEGE3')).toHaveCount(0);
  // Groups in the order of frame 4 (ETFs before FIIs); a class without positions (BDRs) does not show.
  await expect(open).toContainText(/Ações[\s\S]*ETFs[\s\S]*FIIs[\s\S]*Renda fixa[\s\S]*Cripto/);
  await expect(open.getByText('BDRs')).toHaveCount(0);
  // Stages after the S1 stay out of the DOM (D48).
  await expect(page.getByText('Valor de mercado')).toHaveCount(0);
  await expect(tabs(page).getByRole('link', { name: 'Proventos' })).toHaveCount(0);

  // Closed positions start collapsed (D41).
  const toggle = page.getByRole('button', { name: 'Mostrar' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const closed = page.getByRole('table', { name: 'Posições encerradas' });
  await expect(closed).toBeHidden();
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Recolher' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(closed.getByRole('row').filter({ hasText: 'WEGE3' })).toContainText(
    /0\s*—\s*—\s*\+ R\$\s412,80/,
  );
});

test('a portfolio without operations shows the empty Resumo and History', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Testes FII', exact: true }).click();

  await expect(page.getByText('Nenhuma operação ainda')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Esta carteira ainda não tem operações' }),
  ).toBeVisible();
  await expect(kpi(page, 'Custo total')).toHaveText('R$ 0,00');

  await tabs(page).getByRole('link', { name: 'Histórico' }).click();
  await expect(
    page.getByRole('heading', { name: 'Nenhuma operação nesta carteira' }),
  ).toBeVisible();
  await expect(page.getByRole('group', { name: 'Tipo de ativo' })).toHaveCount(0);
});

test('the History lists the operations and filters them by class and broker on the backend (B5, D45)', async ({
  page,
}) => {
  await openLongoPrazo(page);
  await tabs(page).getByRole('link', { name: 'Histórico' }).click();
  await expect(page).toHaveURL(/\/carteiras\/[0-9a-f-]{36}\/historico$/);
  await expect(tabs(page).getByRole('link', { name: 'Histórico' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByText('11 operações · última em 28/10/2026')).toBeVisible();

  const table = page.getByRole('table', { name: /Operações da carteira/ });
  const rows = table.getByRole('row');
  // Header + 11 operations, most recent first.
  await expect(rows).toHaveCount(12);
  await expect(rows.nth(1)).toContainText(
    /28\/10\/2026\s*Compra.*BOVA11\s*Rico\s*20\s*R\$\s118,30\s*R\$\s3,00/,
  );
  await expect(rows.filter({ hasText: 'BTC' })).toContainText('0,0125');

  const chips = page.getByRole('group', { name: 'Tipo de ativo' });
  await expect(chips.getByRole('button')).toHaveText([
    'Todos',
    'Ações',
    'FIIs',
    'ETFs',
    'BDRs',
    'Renda fixa',
    'Cripto',
  ]);

  await chips.getByRole('button', { name: 'FIIs' }).click();
  await expect(chips.getByRole('button', { name: 'FIIs' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('2 de 11 operações')).toBeVisible();
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText(/22\/05\/2026\s*Venda.*MXRF11/);

  await chips.getByRole('button', { name: 'BDRs' }).click();
  const noResult = page.getByRole('heading', { name: 'Nenhuma operação de BDRs nesta carteira' });
  await expect(noResult).toBeVisible();
  // The button of the "filtro sem resultado" block (the one next to the count does the same).
  await noResult.locator('..').getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(rows).toHaveCount(12);
  await expect(page.getByText('11 operações', { exact: true })).toBeVisible();

  await page.getByLabel('Corretora').selectOption({ label: 'Rico' });
  await expect(page.getByText('2 de 11 operações')).toBeVisible();
  // Header + the 2 operations at Rico: the list was replaced, not added to.
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: 'ITSA4' })).toHaveCount(1);
  await expect(rows.filter({ hasText: 'BOVA11' })).toHaveCount(1);
});

test("another user's portfolio answers as not found (RN02)", async ({ page }) => {
  await signIn(page);
  // "Ações BR" of another user in the seed.
  await page.goto('/carteiras/00000000-0000-0000-0000-000000001104');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.goto('/carteiras/00000000-0000-0000-0000-000000001104/historico');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('shows the error card when a call of the Detail fails and loads again (U7a)', async ({
  page,
}) => {
  await openLongoPrazo(page);
  // The API has no way to fail on demand: the only stubbed answer of this file.
  await page.route('**/api/v1/portfolios/*/positions', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: JSON.stringify({ type: 'about:blank', title: 'Internal Server Error', status: 500 }),
    }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Não conseguimos carregar esta carteira');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);

  await page.unroute('**/api/v1/portfolios/*/positions');
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.getByRole('heading', { name: 'Longo prazo', level: 1 })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Detail and History have no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await openLongoPrazo(page);
    await page.getByRole('button', { name: 'Mostrar' }).click();
    await expect(page.getByRole('table', { name: 'Posições encerradas' })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await tabs(page).getByRole('link', { name: 'Histórico' }).click();
    await page
      .getByRole('group', { name: 'Tipo de ativo' })
      .getByRole('button', { name: 'FIIs' })
      .click();
    await expect(page.getByText('2 de 11 operações')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
}
