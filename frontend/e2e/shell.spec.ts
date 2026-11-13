import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('opens the shell with the 404 page for an unknown address', async ({ page }) => {
  await page.goto('/endereco-que-nao-existe');

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir para Carteiras' })).toHaveAttribute(
    'href',
    '/carteiras',
  );
  await expect(page).toHaveTitle('Página não encontrada · Carteira B3');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`404 page has no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/endereco-que-nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}
