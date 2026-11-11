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
