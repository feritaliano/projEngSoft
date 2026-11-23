import { expect, test } from '@playwright/test';
import { fill, openLongoPrazo, seriousViolations, signIn, summary, tabs } from './support';

// R1: axe in light and dark on the states of the S1 the other files do not reach (Detail and History with data,
// Catalog, create form with errors and RN07, the explainer of the Detail and the portfolio dialogs are in their own
// files). Against the real API and the seed; every dialog here is cancelled, so nothing is saved.

for (const colorScheme of ['light', 'dark'] as const) {
  test(`empty Resumo and History have no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signIn(page);
    await page.getByRole('link', { name: 'Testes FII', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Esta carteira ainda não tem operações' }),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await tabs(page).getByRole('link', { name: 'Histórico' }).click();
    await expect(
      page.getByRole('heading', { name: 'Nenhuma operação nesta carteira' }),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test(`form with Resumo, edit mode with RN10 and the confirmation dialogs have no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme });
    await openLongoPrazo(page);

    // Create mode with the Resumo filled by the preview, and its explainer open.
    await page.getByRole('link', { name: 'Lançar operação' }).click();
    await fill(page, {
      asset: 'PETR4',
      broker: 'XP Investimentos',
      quantity: '10',
      price: '30,00',
      fees: '0',
    });
    await expect(summary(page)).toContainText(/Total com custos\s*R\$\s300,00/);
    expect(await seriousViolations(page)).toEqual([]);
    await summary(page)
      .getByRole('button', { name: /^Como foi calculado/ })
      .first()
      .click();
    // The panel fades in (200 ms): axe would measure the contrast of a half-transparent text.
    await expect(page.getByRole('dialog', { name: 'Como foi calculado' })).toHaveCSS(
      'opacity',
      '1',
    );
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');

    // ConfirmDialog of an operation deletion.
    await page
      .getByRole('navigation', { name: 'Trilha de navegação' })
      .getByRole('link', { name: 'Longo prazo' })
      .click();
    await tabs(page).getByRole('link', { name: 'Histórico' }).click();
    await page.getByRole('button', { name: 'Excluir operação de 08/01/2026, MXRF11' }).click();
    await expect(
      page.getByRole('alertdialog', { name: 'Excluir a compra de 08/01/2026?' }),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');

    // Edit mode with the Resumo, then with the RN10 BusinessRuleError.
    await page.getByRole('button', { name: 'Editar operação de 08/01/2026, MXRF11' }).click();
    const quantity = page.getByLabel('Quantidade', { exact: true });
    await expect(quantity).toHaveValue('200');
    await expect(summary(page)).toContainText(/Posição de MXRF11\s*\d/);
    expect(await seriousViolations(page)).toEqual([]);

    await quantity.fill('40');
    await expect(
      page.getByRole('heading', { name: 'Esta alteração deixaria uma venda maior que a posição' }),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    // ConfirmDialog of an edit, cancelled.
    await quantity.fill('200');
    await page.getByRole('button', { name: 'Salvar alteração' }).click();
    await expect(
      page.getByRole('alertdialog', { name: 'Salvar a alteração na compra de 08/01/2026?' }),
    ).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Editar operação', level: 1 })).toBeVisible();
  });
}
