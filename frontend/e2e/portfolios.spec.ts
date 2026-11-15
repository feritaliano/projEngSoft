import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';

// Against the real API and the seed (job e2e). Each test signs in on its own (rotating refresh, D39).
// Seed: the demo user has 3 portfolios, "Testes FII" without operations (database/sql/inserts.sql).
const DEMO = { email: 'demo@carteirab3.dev', password: 'demo-carteira-2026' };
const PORTFOLIOS_API = '**/api/v1/portfolios';

const signIn = async (page: Page) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(DEMO.email);
  await page.getByLabel('Senha').fill(DEMO.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL('/carteiras');
};

const card = (page: Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('link', { name, exact: true }) });

const seriousViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
};

test('lists the portfolios of the demo user and opens one from its card', async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole('heading', { name: 'Suas carteiras', level: 1 })).toBeVisible();
  await expect(card(page, 'Longo prazo')).toContainText(/\d+ ativos? · \d+ operaç(ão|ões)/);
  await expect(card(page, 'Dividendos')).toBeVisible();
  await expect(card(page, 'Testes FII')).toContainText('Sem operações ainda');
  await expect(page.getByText('Patrimônio')).toHaveCount(0);

  await card(page, 'Dividendos').getByRole('link', { name: 'Dividendos' }).click();
  await expect(page).toHaveURL(/\/carteiras\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Dividendos', level: 1 })).toBeVisible();
});

test('creates a portfolio, refuses a repeated name and deletes it after typing the name (RN02)', async ({
  page,
}) => {
  const name = `E2E ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  await signIn(page);

  await page.getByRole('button', { name: 'Nova carteira' }).click();
  const field = page.getByLabel('Nome da carteira');
  await expect(field).toBeFocused();

  // 409 ALREADY_EXISTS, shown in the field (D56).
  await field.fill('Longo prazo');
  await page.getByRole('button', { name: 'Criar carteira' }).click();
  await expect(field).toHaveAccessibleDescription(
    'Você já tem uma carteira com este nome. Escolha outro.',
  );
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(field).toBeFocused();

  await field.fill(name);
  await page.getByRole('button', { name: 'Criar carteira' }).click();
  await expect(card(page, name)).toContainText('Sem operações ainda');
  await expect(page.getByLabel('Nome da carteira')).toHaveCount(0);

  // Hover on the trash shows its tooltip (D51); the click opens the confirmation.
  const trash = page.getByRole('button', { name: `Excluir carteira ${name}` });
  await trash.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Excluir carteira');
  await trash.click();

  const dialog = page.getByRole('alertdialog', { name: `Excluir a carteira “${name}”?` });
  await expect(dialog).toContainText('Isto apaga a carteira e as 0 operações lançadas nela.');
  const typed = dialog.getByLabel('Para confirmar, digite o nome da carteira');
  await expect(typed).toBeFocused();
  const confirm = dialog.getByRole('button', { name: 'Excluir carteira' });
  await expect(confirm).toBeDisabled();

  // Esc cancels and the focus goes back to the trash.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trash).toBeFocused();

  await trash.click();
  await typed.fill('nome errado');
  await expect(confirm).toBeDisabled();
  await typed.fill(name);
  await typed.press('Enter'); // Enter never confirms a deletion (handoff U5).
  await expect(dialog).toBeVisible();
  await confirm.click();

  await expect(dialog).toBeHidden();
  await expect(card(page, name)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Suas carteiras', level: 1 })).toBeFocused();

  await page.reload();
  await expect(card(page, 'Longo prazo')).toBeVisible();
  await expect(card(page, name)).toHaveCount(0);
});

test('a new account sees the empty state and creates its first portfolio there', async ({
  page,
}) => {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa de Teste');
  await page
    .getByLabel('E-mail')
    .fill(`e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@carteirab3.dev`);
  await page.getByLabel('Senha').fill('senha-de-teste-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL('/carteiras');

  await expect(page.getByRole('heading', { name: 'Você ainda não tem carteiras' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova carteira' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Criar carteira' }).click();
  await expect(page.getByLabel('Nome da carteira')).toHaveAccessibleDescription(
    'Dê um nome à carteira.',
  );

  await page.getByLabel('Nome da carteira').fill('Longo prazo');
  await page.getByRole('button', { name: 'Criar carteira' }).click();
  await expect(card(page, 'Longo prazo')).toContainText('Sem operações ainda');
  await expect(page.getByRole('button', { name: 'Nova carteira' })).toBeEnabled();
});

test('shows the skeleton while the list is slow and the error card when it fails (U7a)', async ({
  page,
}) => {
  await signIn(page);

  // Slow answer: the real response, held for 1 s.
  await page.route(PORTFOLIOS_API, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.reload();
  await expect(page.getByText('Carregando suas carteiras…')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova carteira' })).toBeDisabled();
  await expect(card(page, 'Longo prazo')).toBeVisible();
  await page.unroute(PORTFOLIOS_API);

  // The API has no way to fail on demand: this is the only stubbed answer of the suite.
  await page.route(PORTFOLIOS_API, (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/problem+json',
      body: JSON.stringify({ type: 'about:blank', title: 'Internal Server Error', status: 500 }),
    }),
  );
  await page.reload();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Não conseguimos carregar suas carteiras');
  await expect(alert).toContainText(
    'O servidor teve um problema. Suas carteiras e operações continuam salvas.',
  );

  await page.unroute(PORTFOLIOS_API);
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(card(page, 'Longo prazo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suas carteiras', level: 1 })).toBeFocused();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`portfolio list and delete dialog have no serious or critical WCAG 2.1 AA violation (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await signIn(page);
    await expect(card(page, 'Testes FII')).toBeVisible();

    // Field error on screen too, so axe also measures the error colors.
    await page.getByRole('button', { name: 'Nova carteira' }).click();
    await page.getByRole('button', { name: 'Criar carteira' }).click();
    await expect(page.getByLabel('Nome da carteira')).toHaveAttribute('aria-invalid', 'true');
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Excluir carteira Testes FII' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
  });
}
