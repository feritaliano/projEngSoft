import { Page, expect, test } from '@playwright/test';
import { fill, kpi, openLongoPrazo, signIn, summary, tabs } from './support';

// R1: the S1 from end to end against the real API and the seed (job e2e), no mock. The first test starts from a new
// account, so it depends on nothing of the seed but the catalog and the brokers.

/** Saves the form and waits for its reset: both buys show the same notice, so the notice alone could be the old one. */
const launch = async (page: Page, button: 'Lançar compra' | 'Lançar venda', notice: string) => {
  await page.getByRole('button', { name: button }).click();
  await expect(page.getByRole('status').filter({ hasText: notice })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Ativo' })).toHaveValue('');
};

const positionRow = (page: Page, table: string, asset: string) =>
  page.getByRole('table', { name: table }).getByRole('row').filter({ hasText: asset });

const openTab = async (page: Page, name: 'Resumo' | 'Histórico') => {
  await tabs(page).getByRole('link', { name }).click();
  await expect(tabs(page).getByRole('link', { name })).toHaveAttribute('aria-current', 'page');
};

test('a new user registers, trades PETR4, edits and deletes an operation, closes the position and finds it all after signing in again', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const user = {
    email: `e2e-journey-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@carteirab3.dev`,
    password: 'senha-da-jornada-123',
  };

  // Registration enters signed in (RN01) and a new account starts without portfolios.
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa da Jornada');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha').fill(user.password);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL('/carteiras');
  await expect(page.getByRole('heading', { name: 'Você ainda não tem carteiras' })).toBeVisible();
  await page.getByLabel('Nome da carteira').fill('Jornada');
  await page.getByRole('button', { name: 'Criar carteira' }).click();
  await page.getByRole('link', { name: 'Jornada', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jornada', level: 1 })).toBeVisible();

  // First buy: 100 × 30,00 + 5,00 = 3.005,00; PM 30,05.
  await page.getByRole('link', { name: 'Lançar operação' }).click();
  await fill(page, {
    asset: 'PETR4',
    broker: 'XP Investimentos',
    date: '2026-10-01',
    quantity: '100',
    price: '30,00',
    fees: '5,00',
  });
  await expect(summary(page)).toContainText(/Total com custos\s*R\$\s3\.005,00/);
  await expect(summary(page)).toContainText(/Posição de PETR4\s*0 → 100/);
  await expect(summary(page)).toContainText(/Preço médio\s*—\s*→\s*R\$\s30,05/);
  await launch(page, 'Lançar compra', 'Compra de 100 PETR4');

  // Second buy: 100 × 34,00 + 5,00 = 3.405,00; PM (3.005,00 + 3.405,00) / 200 = 32,05.
  await fill(page, {
    asset: 'PETR4',
    date: '2026-10-05',
    quantity: '100',
    price: '34,00',
    fees: '5,00',
  });
  await expect(summary(page)).toContainText(/Total com custos\s*R\$\s3\.405,00/);
  await expect(summary(page)).toContainText(/Posição de PETR4\s*100 → 200/);
  await expect(summary(page)).toContainText(/Preço médio\s*R\$\s30,05\s*→\s*R\$\s32,05/);
  await launch(page, 'Lançar compra', 'Compra de 100 PETR4');

  // Partial sale with profit (RN06): 50 × 40,00 − 5,00 − 50 × 32,05 = 392,50.
  await fill(page, {
    type: 'Venda',
    asset: 'PETR4',
    date: '2026-10-10',
    quantity: '50',
    price: '40,00',
    fees: '5,00',
  });
  await expect(summary(page)).toContainText(/Posição de PETR4\s*200 → 150/);
  await expect(summary(page)).toContainText(/Preço médio\s*R\$\s32,05 \(venda não muda\)/);
  await expect(summary(page)).toContainText(/Lucro realizado estimado\s*\+ R\$\s392,50/);
  await launch(page, 'Lançar venda', 'Venda de 50 PETR4');

  // The Detail shows the values the preview showed: 150 at PM 32,05, cost 150 × 32,05 = 4.807,50.
  await page.getByRole('link', { name: 'Ver carteira' }).click();
  await expect(page.getByText('3 operações · 1 ativo')).toBeVisible();
  await expect(kpi(page, 'Custo total')).toHaveText('R$ 4.807,50');
  await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 392,50');
  await expect(positionRow(page, 'Posições abertas, agrupadas por classe', 'PETR4')).toContainText(
    /150\s*R\$\s32,05\s*ⓘ\s*R\$\s4\.807,50\s*ⓘ\s*\+ R\$\s392,50/,
  );

  // Edit the second buy to 36,00 (RN09): PM (3.005,00 + 3.605,00) / 200 = 33,05;
  // profit 2.000,00 − 5,00 − 1.652,50 = 342,50; cost 150 × 33,05 = 4.957,50.
  await openTab(page, 'Histórico');
  await page.getByRole('button', { name: 'Editar operação de 05/10/2026, PETR4' }).click();
  await expect(page.getByRole('heading', { name: 'Editar operação', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Preço unitário (R$)')).toHaveValue('34,00');
  await page.getByLabel('Preço unitário (R$)').fill('36,00');
  await expect(summary(page)).toContainText(/Preço médio\s*R\$\s30,05\s*→\s*R\$\s33,05/);
  await page.getByRole('button', { name: 'Salvar alteração' }).click();
  const editDialog = page.getByRole('alertdialog', {
    name: 'Salvar a alteração na compra de 05/10/2026?',
  });
  await expect(editDialog).toContainText(
    'A posição, o preço médio e o lucro realizado de PETR4 nesta carteira serão recalculados a partir de 05/10/2026.',
  );
  await editDialog.getByRole('button', { name: 'Salvar alteração' }).click();
  await expect(page).toHaveURL(/\/historico$/);
  await expect(page.getByRole('row').filter({ hasText: '05/10/2026' })).toContainText(/R\$\s36,00/);
  await openTab(page, 'Resumo');
  await expect(kpi(page, 'Custo total')).toHaveText('R$ 4.957,50');
  await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 342,50');

  // Delete that buy after the confirmation (C3): 50 left at PM 30,05; profit 2.000,00 − 5,00 − 1.502,50 = 492,50.
  await openTab(page, 'Histórico');
  await page.getByRole('button', { name: 'Excluir operação de 05/10/2026, PETR4' }).click();
  const deleteDialog = page.getByRole('alertdialog', { name: 'Excluir a compra de 05/10/2026?' });
  await expect(deleteDialog).toContainText('A compra de 100 PETR4 será apagada.');
  await deleteDialog.getByRole('button', { name: 'Excluir compra' }).click();
  await expect(page.getByText('2 operações · última em 10/10/2026')).toBeVisible();
  await openTab(page, 'Resumo');
  await expect(kpi(page, 'Custo total')).toHaveText('R$ 1.502,50');
  await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 492,50');

  // Total sale: 50 × 42,00 − 5,00 − 50 × 30,05 = 592,50, and PETR4 becomes a closed position.
  await page.getByRole('link', { name: 'Lançar operação' }).click();
  await fill(page, {
    type: 'Venda',
    asset: 'PETR4',
    broker: 'XP Investimentos',
    date: '2026-10-15',
    quantity: '50',
    price: '42,00',
    fees: '5,00',
  });
  await expect(summary(page)).toContainText(/Posição de PETR4\s*50 → 0/);
  await expect(summary(page)).toContainText(/Lucro realizado estimado\s*\+ R\$\s592,50/);
  await launch(page, 'Lançar venda', 'Venda de 50 PETR4');

  const closedState = async () => {
    await expect(page.getByText('3 operações · nenhuma posição aberta')).toBeVisible();
    await expect(kpi(page, 'Custo total')).toHaveText('R$ 0,00');
    await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 1.085,00');
    await expect(
      page.getByRole('table', { name: 'Posições abertas, agrupadas por classe' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Mostrar' }).click();
    await expect(positionRow(page, 'Posições encerradas', 'PETR4')).toContainText(
      /0\s*—\s*—\s*\+ R\$\s1\.085,00/,
    );
  };
  await page.getByRole('link', { name: 'Ver carteira' }).click();
  await closedState();

  // Sign out and in again: the data stays (it lives in the database, not in the tab).
  await page.getByRole('button', { name: 'Pessoa da Jornada' }).click();
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/entrar');
  await signIn(page, user);
  await expect(
    page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Jornada' }) }),
  ).toContainText('nenhuma posição aberta · 3 operações');
  await page.getByRole('link', { name: 'Jornada', exact: true }).click();
  await closedState();
});

test('the demo user sees "Longo prazo" with its totals and how the open total was calculated', async ({
  page,
}) => {
  await openLongoPrazo(page);

  await expect(kpi(page, 'Custo total')).toHaveText('R$ 16.151,27');
  await expect(kpi(page, 'Lucro realizado')).toHaveText('+ R$ 693,87');
  await expect(kpi(page, 'Ativos em carteira')).toHaveText(/^6\s*1 posição encerrada$/);
  // Header + 5 class groups + 6 assets + Total.
  await expect(
    page.getByRole('table', { name: 'Posições abertas, agrupadas por classe' }).getByRole('row'),
  ).toHaveCount(13);
  await page.getByRole('button', { name: 'Mostrar' }).click();
  await expect(
    page.getByRole('table', { name: 'Posições encerradas' }).getByRole('row'),
  ).toHaveCount(2);
  await expect(positionRow(page, 'Posições encerradas', 'WEGE3')).toContainText(/\+ R\$\s412,80/);

  // "Como foi calculado" of the total cost (C1): the sum of the open positions only, WEGE3 out.
  const info = page.getByRole('button', { name: 'Como foi calculado: Custo total da carteira' });
  await info.click();
  const panel = page.getByRole('dialog', { name: 'Como foi calculado' });
  await expect(panel).toContainText(
    'Custo total da carteira = soma do custo total de cada posição aberta',
  );
  await expect(panel).toContainText('R$ 16.151,27');
  await expect(panel).toContainText('PETR4');
  await expect(panel).not.toContainText('WEGE3');
  await panel.getByRole('button', { name: 'Fechar' }).click();
  await expect(panel).toBeHidden();
  await expect(info).toBeFocused();
});
