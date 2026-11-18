import AxeBuilder from '@axe-core/playwright';
import { Page, expect } from '@playwright/test';

// Demo user of the seed (database/sql/inserts.sql). Each test signs in on its own (rotating refresh, D39).
const DEMO = { email: 'demo@carteirab3.dev', password: 'demo-carteira-2026' };

export const signIn = async (page: Page) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(DEMO.email);
  await page.getByLabel('Senha').fill(DEMO.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/carteiras');
};

/** WCAG 2.1 AA violations of serious or critical impact (handoff U5). */
export const seriousViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
};
