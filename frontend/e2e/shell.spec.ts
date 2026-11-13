import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// --color-bg-canvas of src/styles.css in each theme.
const LIGHT_CANVAS = 'rgb(245, 247, 249)';
const DARK_CANVAS = 'rgb(15, 20, 25)';

test('opens the shell with the 404 page for an unknown address', async ({ page }) => {
  // The session restore at boot reaches the real API: no session yet, so 401 (not a network or CORS failure).
  const refresh = page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/refresh'));
  await page.goto('/endereco-que-nao-existe');
  expect((await refresh).status()).toBe(401);

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await expect(page.getByText('Sem conexão com o servidor.')).toBeHidden();
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
    // The theme really switched (body background is the canvas token), so axe measures its colors.
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      colorScheme === 'dark' ? DARK_CANVAS : LIGHT_CANVAS,
    );

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
}
