import { Page, expect, test } from '@playwright/test';
import { fill, kpi, openLongoPrazo, seriousViolations, signIn, summary } from './support';

// Against the real API and the seed (job e2e). A test that saves works on a portfolio of its own, so the totals of
// "Longo prazo" stay as the other files check them; the rule violations of "Longo prazo" are refused, nothing saved.

const newPortfolio = async (page: Page) => {
  const name = `E2E ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await signIn(page);
  await page.getByRole('button', { name: 'Nova carteira' }).click();
  await page.getByLabel('Nome da carteira').fill(name);
  await page.getByRole('button', { name: 'Criar carteira' }).click();
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  return name;
};

test('launches a buy and a sell with profit through the form and sees the position (RN05, RN06, D42)', async ({
  page,
}) => {
  await newPortfolio(page);
  await page.getByRole('link', { name: 'Lançar operação' }).click();
  await expect(page.getByRole('heading', { name: 'Lançar operação', level: 1 })).toBeVisible();
  await expect(summary(page)).toContainText('Preencha ativo, corretora, data, quantidade e preço');

  await fill(page, {
    asset: 'PETR4',
    broker: 'XP Investimentos',
    date: '2026-10-01',
    quantity: '100',
    price: '30,00',
    fees: '5,00',
  });
  // The Resumo comes from the preview of the backend, nothing saved yet.
  await expect(summary(page)).toContainText(/Total com custos\s*R\$\s3\.005,00/);
  await expect(summary(page)).toContainText(/Posição de PETR4\s*0 → 100/);
  await page.getByRole('button', { name: 'Lançar compra' }).click();
  const saved = page.getByRole('status').filter({ hasText: 'Compra de 100 PETR4' });
  await expect(saved).toContainText('lançada na carteira');
  await expect(page.getByRole('combobox', { name: 'Ativo' })).toHaveValue('');

  // The new form keeps type and broker (frame "sucesso").
  await expect(page.getByLabel('Corretora')).toHaveValue(/.+/);
  await fill(page, {
    type: 'Venda',
    asset: 'PETR4',
    date: '2026-10-02',
    quantity: '50',
    price: '40,00',
    fees: '5,00',
  });
  // RN06: 50 × 40,00 − 5,00 − 50 × 30,05 = 492,50, from the API.
  await expect(summary(page)).toContainText(/Lucro realizado estimado\s*\+ R\$\s492,50/);
  await expect(summary(page)).toContainText(/Preço médio\s*R\$\s30,05 \(venda não muda\)/);

  // "Como foi calculado" of the estimated profit (C1): a dialog that Esc closes, back to its ⓘ.
  const info = summary(page).getByRole('button', {
    name: 'Como foi calculado: Lucro realizado estimado',
  });
  await info.click();
  const panel = page.getByRole('dialog', { name: 'Como foi calculado' });
  await expect(panel).toContainText('Lucro realizado estimado · PETR4');
  await expect(panel).toContainText('50 × 40,00 − 5,00 − 50 × 30,05 = 492,50');
  await expect(panel).toContainText('Do formulário, ainda não salvo');
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(info).toBeFocused();

  await page.getByRole('button', { name: 'Lançar venda' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Venda de 50 PETR4' })).toBeVisible();

  await page.getByRole('link', { name: 'Ver carteira' }).click();
  await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 492,50');
  const petr4 = page
    .getByRole('table', { name: 'Posições abertas, agrupadas por classe' })
    .getByRole('row')
    .filter({ hasText: 'PETR4' });
  await expect(petr4).toContainText(/50\s*R\$\s30,05\s*ⓘ\s*R\$\s1\.502,50/);
});

test('refuses to delete a buy a later sell needs (RN10) and deletes after the confirmation (C3)', async ({
  page,
}) => {
  const name = await newPortfolio(page);
  await page.getByRole('link', { name: 'Lançar operação' }).click();
  await fill(page, {
    asset: 'ITSA4',
    broker: 'Rico',
    date: '2026-09-01',
    quantity: '10',
    price: '9,85',
    fees: '0',
  });
  await expect(summary(page)).toContainText(/Total com custos\s*R\$\s98,50/);
  await page.getByRole('button', { name: 'Lançar compra' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Compra de 10 ITSA4' })).toBeVisible();
  await fill(page, {
    type: 'Venda',
    asset: 'ITSA4',
    date: '2026-09-02',
    quantity: '10',
    price: '10,00',
    fees: '0',
  });
  await expect(summary(page)).toContainText(/Posição de ITSA4\s*10 → 0/);
  await page.getByRole('button', { name: 'Lançar venda' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Venda de 10 ITSA4' })).toBeVisible();

  await page.getByRole('link', { name, exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Seções da carteira' })
    .getByRole('link', { name: 'Histórico' })
    .click();
  const deleteBuy = page.getByRole('button', { name: 'Excluir operação de 01/09/2026, ITSA4' });
  await deleteBuy.click();
  const buyDialog = page.getByRole('alertdialog', { name: 'Excluir a compra de 01/09/2026?' });
  await expect(buyDialog).toContainText('A compra de 10 ITSA4 será apagada.');
  await expect(buyDialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await buyDialog.getByRole('button', { name: 'Excluir compra' }).click();

  // RN10: the sale of 02/09 would pass the position; nothing deleted.
  const alert = page
    .getByRole('alert')
    .filter({ hasText: 'Esta exclusão deixaria uma venda maior' });
  await expect(alert).toContainText('Excluir a compra de 01/09/2026 faz a venda de 02/09/2026');
  await expect(alert).toContainText('Nada foi apagado.');
  await expect(page.getByText('2 operações · última em 02/09/2026')).toBeVisible();

  await page.getByRole('button', { name: 'Excluir operação de 02/09/2026, ITSA4' }).click();
  await page
    .getByRole('alertdialog', { name: 'Excluir a venda de 02/09/2026?' })
    .getByRole('button', { name: 'Excluir venda' })
    .click();
  await expect(page.getByText('1 operação · última em 01/09/2026')).toBeVisible();
  await deleteBuy.click();
  await buyDialog.getByRole('button', { name: 'Excluir compra' }).click();

  await expect(
    page.getByRole('heading', { name: 'Nenhuma operação nesta carteira' }),
  ).toBeVisible();
  await expect(page.getByText('Nenhuma operação ainda')).toBeVisible();
});

test('the preview of a sell above the position blocks the button (RN07, D42)', async ({ page }) => {
  await openLongoPrazo(page);
  await page.getByRole('link', { name: 'Lançar operação' }).click();
  await fill(page, {
    type: 'Venda',
    asset: 'PETR4',
    broker: 'XP Investimentos',
    quantity: '150',
    price: '38,50',
    fees: '4,90',
  });

  await expect(
    page.getByRole('heading', { name: 'A venda é maior que a sua posição' }),
  ).toBeVisible();
  await expect(summary(page)).toContainText(/Posição de PETR4\s*100 → —/);
  await expect(summary(page)).toContainText('100 disponíveis, 150 na venda.');
  await expect(page.getByLabel('Quantidade', { exact: true })).toHaveAccessibleDescription(
    'Máximo de 100 nesta data.',
  );
  await expect(page.getByRole('button', { name: 'Lançar venda' })).toBeDisabled();
});

test('editing the MXRF11 buy of 08/01 to 40 units shows the RN10 and saves nothing', async ({
  page,
}) => {
  await openLongoPrazo(page);
  await page
    .getByRole('navigation', { name: 'Seções da carteira' })
    .getByRole('link', { name: 'Histórico' })
    .click();
  await page.getByRole('button', { name: 'Editar operação de 08/01/2026, MXRF11' }).click();

  await expect(page.getByRole('heading', { name: 'Editar operação', level: 1 })).toBeVisible();
  const quantity = page.getByLabel('Quantidade', { exact: true });
  await expect(quantity).toHaveValue('200');
  await expect(page.getByLabel('Preço unitário (R$)')).toHaveValue('10,10');
  await quantity.fill('40');

  await expect(
    page.getByRole('heading', { name: 'Esta alteração deixaria uma venda maior que a posição' }),
  ).toBeVisible();
  await expect(
    page.getByText('Com esta alteração na compra de 08/01/2026, a venda de 22/05/2026'),
  ).toBeVisible();
  await expect(summary(page)).toContainText(
    'Deixa a venda de 22/05/2026 maior que a posição: 40 disponíveis, 50 vendidas.',
  );
  await expect(page.getByRole('button', { name: 'Salvar alteração' })).toBeDisabled();

  // The link goes to the History with that sale in evidence; nothing was saved.
  await page.getByRole('link', { name: 'Ver venda de 22/05/2026' }).click();
  await expect(page).toHaveURL(/\/historico\?operacao=/);
  await expect(page.getByText('11 operações · última em')).toBeVisible();
});

test('the catalog opens the form with the asset, asking the portfolio (frame 7, D51)', async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Ativos' }).click();
  await page.getByLabel('Buscar ativo').fill('ITSA4');
  await expect(page.getByText(/ativos? encontrados? para “ITSA4”/)).toBeVisible();

  const add = page.getByRole('button', { name: 'Lançar operação de ITSA4' });
  await add.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Lançar operação');
  await add.click();
  const dialog = page.getByRole('dialog', { name: 'Em qual carteira lançar ITSA4?' });
  await expect(dialog).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await dialog.getByLabel(/^Dividendos/).check();
  await dialog.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Lançar operação', level: 1 })).toBeVisible();
  await expect(page.getByText('Carteira Dividendos')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Ativo' })).toHaveValue(/^ITSA4 · /);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`form, Resumo and "como foi calculado" have no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await openLongoPrazo(page);
    await page
      .getByRole('button', { name: 'Como foi calculado: Lucro realizado da carteira' })
      .click();
    const panel = page.getByRole('dialog', { name: 'Como foi calculado' });
    await expect(panel).toContainText('WEGE3');
    // After the 200 ms fade-in: mid-fade, axe measures blended colors (4.4:1 seen in CI on #52).
    await expect(panel).toHaveCSS('opacity', '1');
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');

    await page.getByRole('link', { name: 'Lançar operação' }).click();
    await page.getByLabel('Quantidade', { exact: true }).focus();
    await page.getByRole('button', { name: 'Lançar compra' }).click(); // field errors shown
    await expect(page.getByText('Escolha um ativo da lista.')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await fill(page, {
      type: 'Venda',
      asset: 'PETR4',
      broker: 'XP Investimentos',
      quantity: '150',
      price: '38,50',
      fees: '4,90',
    });
    await expect(
      page.getByRole('heading', { name: 'A venda é maior que a sua posição' }),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
}
