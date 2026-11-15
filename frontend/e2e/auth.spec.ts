import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';

// Against the real API and the seed (job e2e); no mock. Each test signs in on its own (rotating refresh, D39).
const DEMO = { email: 'demo@carteirab3.dev', password: 'demo-carteira-2026' };

const signIn = async (page: Page, email: string, password: string) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
};

const uniqueEmail = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@carteirab3.dev`;

test('signs in the demo user and opens the portfolios', async ({ page }) => {
  await signIn(page, DEMO.email, DEMO.password);

  await expect(page).toHaveURL('/carteiras');
  await expect(page.getByRole('heading', { name: 'Suas carteiras' })).toBeVisible();
});

test('shows the invalid-credentials notice on a wrong password', async ({ page }) => {
  await signIn(page, DEMO.email, 'senha-errada-123');

  await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.');
  await expect(page).toHaveURL('/entrar');
  await expect(page.getByLabel('E-mail')).toHaveValue(DEMO.email);
  await expect(page.getByLabel('Senha')).toHaveValue('');
  await expect(page.getByLabel('Senha')).toBeFocused();
});

test('creates an account and enters signed in (RN01)', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL('/cadastro');

  await page.getByLabel('Nome').fill('Pessoa de Teste');
  await page.getByLabel('E-mail').fill(uniqueEmail());
  await page.getByLabel('Senha').fill('curta');
  await page.getByLabel('Nome').focus();
  await expect(
    page.getByText('A senha precisa de pelo menos 8 caracteres. Faltam 3.'),
  ).toBeVisible();

  await page.getByLabel('Senha').fill('senha-de-teste-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL('/carteiras');
  await expect(page.getByRole('heading', { name: 'Suas carteiras' })).toBeVisible();
});

test('shows the 409 of a registered e-mail under the e-mail field', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa de Teste');
  await page.getByLabel('E-mail').fill(DEMO.email);
  await page.getByLabel('Senha').fill('senha-de-teste-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  const email = page.getByLabel('E-mail');
  await expect(email).toHaveAccessibleDescription(
    'Já existe uma conta com este e-mail. Entre ou use outro e-mail.',
  );
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toBeFocused();
  await expect(page).toHaveURL('/cadastro');
});

for (const colorScheme of ['light', 'dark'] as const) {
  for (const [name, url, heading] of [
    ['Login', '/entrar?sessao=expirada', 'Entrar'],
    ['Sign-up', '/cadastro', 'Criar conta'],
  ] as const) {
    test(`${name} has no serious or critical WCAG 2.1 AA violation, errors shown (${colorScheme})`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(url);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      // Field errors on screen too, so axe also measures the error colors.
      await page.getByRole('button', { name: heading }).click();
      await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true');

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
        [],
      );
    });
  }
}
