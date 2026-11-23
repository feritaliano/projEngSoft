import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

// Demo user of the seed (database/sql/inserts.sql). Each test signs in on its own (rotating refresh, D39).
const DEMO = { email: 'demo@carteirab3.dev', password: 'demo-carteira-2026' };

export const signIn = async (page: Page, { email, password } = DEMO) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/carteiras');
};

export const openLongoPrazo = async (page: Page) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Longo prazo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Longo prazo', level: 1 })).toBeVisible();
};

export const tabs = (page: Page) => page.getByRole('navigation', { name: 'Seções da carteira' });

/** WCAG 2.1 AA violations of serious or critical impact (handoff U5). */
export const seriousViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
};

/** Value of an indicator: the dd after its visible label (the dt of the hidden mobile cards are not visible). */
export const kpi = (page: Page, label: string) =>
  page
    .getByRole('term')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=following-sibling::dd[1]');

export const summary = (page: Page) => page.getByRole('region', { name: 'Resumo da operação' });

export interface Operation {
  type?: 'Compra' | 'Venda';
  asset?: string;
  broker?: string;
  date?: string;
  quantity: string;
  price: string;
  fees: string;
}

/** Fills the operation form as a user does: the asset through the search, the rest field by field. */
export const fill = async (page: Page, operation: Operation) => {
  if (operation.type) {
    await page
      .getByRole('group', { name: 'Tipo de operação' })
      .getByText(operation.type, { exact: true })
      .click();
  }
  if (operation.asset) {
    await page.getByRole('combobox', { name: 'Ativo' }).fill(operation.asset);
    await page.getByRole('option', { name: new RegExp(`^${operation.asset} `) }).click();
  }
  if (operation.broker)
    await page.getByLabel('Corretora').selectOption({ label: operation.broker });
  if (operation.date) await page.getByLabel('Data do pregão').fill(operation.date);
  await page.getByLabel('Quantidade', { exact: true }).fill(operation.quantity);
  await page.getByLabel('Preço unitário (R$)').fill(operation.price);
  await page.getByLabel('Custos (R$)').fill(operation.fees);
};
