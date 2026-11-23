import { Locator, Page, expect, test } from '@playwright/test';
import { DEMO, kpi, summary, tabs } from './support';

// R1, handoff U5: the main flow of the S1 with the keyboard only (Tab, Shift+Tab, Enter, Space, arrows and Escape; no
// click and no fill). Against the real API and the seed; the operation goes to a portfolio of its own and is deleted
// at the end, so "Longo prazo" stays as the other files check it.

/** The element has the keyboard focus and its ring shows (handoff U5, 2.4.7). */
const expectRing = async (target: Locator) => {
  await expect(target).toBeFocused();
  const outline = await target.evaluate((element) => {
    if (!element.matches(':focus-visible')) return 'no :focus-visible';
    // The ring of a visually hidden radio is on its label and the one of a card link on the card (D51).
    for (let node: Element | null = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const visible = node.getBoundingClientRect().width > 1;
      if (visible && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) {
        return style.outlineStyle;
      }
    }
    return 'none';
  });
  expect(outline).toBe('solid');
};

/** Presses `key` until `target` has the focus, then checks its ring. */
const pressUntil = async (page: Page, target: Locator, key = 'Tab', max = 60) => {
  await expect(target).toBeVisible();
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press(key);
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
  await pressUntil(page, page.getByLabel('E-mail'));
  await page.keyboard.type(DEMO.email);
  await pressUntil(page, page.getByLabel('Senha'));
  await page.keyboard.type(DEMO.password);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/carteiras');

  // A portfolio of its own, opened from its card link.
  await pressUntil(page, page.getByRole('button', { name: 'Nova carteira' }));
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nome da carteira')).toBeFocused();
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  const link = page.getByRole('link', { name, exact: true });
  await pressUntil(page, link);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

  // The form: the asset through the combobox (type, ArrowDown, Enter), the broker with the arrows.
  await pressUntil(page, page.getByRole('link', { name: 'Lançar operação' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Lançar operação', level: 1 })).toBeVisible();
  const asset = page.getByRole('combobox', { name: 'Ativo' });
  await pressUntil(page, asset);
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
  await pressUntil(page, broker);
  await page.keyboard.press('ArrowDown');
  await expect(broker).not.toHaveValue('');

  const quantity = page.getByLabel('Quantidade', { exact: true });
  await pressUntil(page, quantity);
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
  await pressUntil(page, page.getByRole('button', { name: 'Lançar compra' }));
  await page.keyboard.press(' ');
  const saved = page.getByRole('status').filter({ hasText: 'Compra de 10 PETR4' });
  await expect(saved).toBeFocused();
  await pressUntil(page, page.getByRole('link', { name: 'Ver carteira' }));
  await page.keyboard.press('Enter');

  await expect(kpi(page, 'Custo total')).toHaveText('R$ 300,00');
  await expect(
    page
      .getByRole('table', { name: 'Posições abertas, agrupadas por classe' })
      .getByRole('row')
      .filter({ hasText: 'PETR4' }),
  ).toContainText(/10\s*R\$\s30,00\s*ⓘ\s*R\$\s300,00/);

  // "Como foi calculado": Enter opens, the focus goes to the title, Tab stays in the panel, Esc closes and the focus
  // goes back to the trigger.
  const info = page.getByRole('button', { name: 'Como foi calculado: Custo total da carteira' });
  await pressUntil(page, info);
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
  await pressUntil(page, tabs(page).getByRole('link', { name: 'Histórico' }));
  await page.keyboard.press('Enter');
  const trash = page.getByRole('button', { name: /^Excluir operação de .+, PETR4$/ });
  await pressUntil(page, trash);
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
