import { Locator, Page, expect, test } from '@playwright/test';
import { DEMO, kpi, positionRow, summary, tabs } from './support';

// R1, handoff U5: the main flow of the S1 with the keyboard only (Tab, Shift+Tab, Enter, Space, arrows and Escape; no
// click and no fill). Against the real API and the seed; the operation goes to a portfolio of its own and is deleted
// at the end, so "Longo prazo" stays as the other files check it (the empty "Teclado …" portfolio stays, like the
// portfolios of operations.spec.ts).

/** The element has the keyboard focus and its ring shows: a solid, non-transparent outline (handoff U5, 2.4.7). */
const expectRing = async (target: Locator) => {
  await expect(target).toBeFocused();
  const ring = await target.evaluate((element) => {
    if (!element.matches(':focus-visible')) return 'no :focus-visible';
    // The ring of a visually hidden radio is on its label and the one of a card link on the card (D51).
    let owner: Element | null = element;
    if (element.matches('input[type=radio]')) owner = element.closest('label');
    else if (element.matches('a') && getComputedStyle(element).outlineStyle === 'none') {
      owner = element.closest('li');
    }
    if (!owner) return 'no ring owner';
    const { outlineStyle, outlineWidth, outlineColor } = getComputedStyle(owner);
    const transparent = outlineColor === 'transparent' || /, 0\)$/.test(outlineColor);
    return `${outlineStyle} ${parseFloat(outlineWidth) > 0 ? 'wide' : 'none'} ${transparent ? 'transparent' : 'colored'}`;
  });
  expect(ring).toBe('solid wide colored');
};

/** Presses Tab until `target` has the focus (at most 60 times), then checks its ring. */
const tabTo = async (page: Page, target: Locator) => {
  await expect(target).toBeVisible();
  for (let i = 0; i < 60; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expectRing(target);
};

test('the main flow works with the keyboard only, with visible focus and the focus back after each dialog (U5)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const name = `Teclado ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Sign in: Tab to each field, Enter sends.
  await page.goto('/entrar');
  await tabTo(page, page.getByLabel('E-mail'));
  await page.keyboard.type(DEMO.email);
  await tabTo(page, page.getByLabel('Senha'));
  await page.keyboard.type(DEMO.password);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/carteiras');

  // A portfolio of its own, opened from its card link.
  await tabTo(page, page.getByRole('button', { name: 'Nova carteira' }));
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nome da carteira')).toBeFocused();
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  const link = page.getByRole('link', { name, exact: true });
  await tabTo(page, link);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

  // The form: the type with the arrows (and back to Compra), the asset through the combobox (type, ArrowDown, Enter),
  // the broker with the arrows.
  await tabTo(page, page.getByRole('link', { name: 'Lançar operação' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Lançar operação', level: 1 })).toBeVisible();
  const buy = page.getByRole('radio', { name: 'Compra' });
  await tabTo(page, buy);
  await page.keyboard.press('ArrowRight');
  await expectRing(page.getByRole('radio', { name: 'Venda' }));
  await expect(page.getByRole('button', { name: 'Lançar venda' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expectRing(buy);
  await expect(buy).toBeChecked();
  const asset = page.getByRole('combobox', { name: 'Ativo' });
  await tabTo(page, asset);
  await page.keyboard.type('PETR4');
  const option = page.getByRole('option', { name: /^PETR4 / });
  await expect(option).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await expect(asset).toHaveAttribute('aria-activedescendant', /^operation-asset-/);
  await page.keyboard.press('Enter');
  await expect(asset).toHaveValue(/^PETR4 · /);
  await expect(page.getByRole('listbox')).toHaveCount(0);

  const broker = page.getByLabel('Corretora');
  await tabTo(page, broker);
  await page.keyboard.press('ArrowDown');
  await expect(broker).not.toHaveValue('');

  const quantity = page.getByLabel('Quantidade', { exact: true });
  await tabTo(page, quantity);
  await page.keyboard.type('10');
  await page.keyboard.press('Tab');
  await expectRing(page.getByLabel('Preço unitário (R$)'));
  await page.keyboard.type('30,00');
  // Shift+Tab goes back to the quantity, as typed.
  await page.keyboard.press('Shift+Tab');
  await expectRing(quantity);
  await expect(quantity).toHaveValue('10');
  await expect(summary(page)).toContainText(/Total com custos\s*R\$\s300,00/);

  // Space presses the button; the notice takes the focus and "Ver carteira" comes next.
  await tabTo(page, page.getByRole('button', { name: 'Lançar compra' }));
  await page.keyboard.press(' ');
  const saved = page.getByRole('status').filter({ hasText: 'Compra de 10 PETR4' });
  await expect(saved).toBeFocused();
  await tabTo(page, page.getByRole('link', { name: 'Ver carteira' }));
  await page.keyboard.press('Enter');

  await expect(kpi(page, 'Custo total')).toHaveText('R$ 300,00');
  await expect(positionRow(page, 'Posições abertas, agrupadas por classe', 'PETR4')).toContainText(
    /10\s*R\$\s30,00\s*ⓘ\s*R\$\s300,00/,
  );

  // "Como foi calculado": Enter opens, the focus goes to the title, Tab goes to "Fechar" in the panel (a modal
  // <dialog>: the page behind is inert), Esc closes and the focus goes back to the trigger.
  const info = page.getByRole('button', { name: 'Como foi calculado: Custo total da carteira' });
  await tabTo(page, info);
  await page.keyboard.press('Enter');
  const panel = page.getByRole('dialog', { name: 'Como foi calculado' });
  await expect(panel.getByRole('heading', { name: 'Como foi calculado' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expectRing(panel.getByRole('button', { name: 'Fechar' }));
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expectRing(info);

  // Delete the operation with the ConfirmDialog: the first focus is "Cancelar", Esc cancels back to the trash, and
  // Tab + Enter on "Excluir compra" confirms.
  await tabTo(page, tabs(page).getByRole('link', { name: 'Histórico' }));
  await page.keyboard.press('Enter');
  const trash = page.getByRole('button', { name: /^Excluir operação de .+, PETR4$/ });
  await tabTo(page, trash);
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('alertdialog', { name: /^Excluir a compra de / });
  await expectRing(dialog.getByRole('button', { name: 'Cancelar' }));
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expectRing(trash);

  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expectRing(dialog.getByRole('button', { name: 'Excluir compra' }));
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Nenhuma operação nesta carteira' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeFocused();
});
