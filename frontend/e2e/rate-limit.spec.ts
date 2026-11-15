import { expect, test } from '@playwright/test';

/*
 * Needs the API with the default limit (AUTH_RATE_LIMIT_MAX=5 logins per minute, per IP and route, BK-1):
 * `npm run e2e:rate-limit`. The main suite (`npm run e2e`) runs without it, against a high limit, because
 * each test signs in (D39); in CI the job e2e restarts the API with the limit of 5 for this file only.
 */
const DEMO_EMAIL = 'demo@carteirab3.dev';

test(
  'the 6th wrong login in a minute shows the too-many-attempts notice',
  { tag: '@rate-limit' },
  async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(DEMO_EMAIL);

    for (let attempt = 1; attempt <= 5; attempt++) {
      await page.getByLabel('Senha').fill(`senha-errada-${attempt}`);
      const answer = page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/login'));
      await page.getByRole('button', { name: 'Entrar' }).click();
      expect((await answer).status()).toBe(401);
      await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos.');
    }

    await page.getByLabel('Senha').fill('senha-errada-6');
    const answer = page.waitForResponse((r) => r.url().endsWith('/api/v1/auth/login'));
    await page.getByRole('button', { name: 'Entrar' }).click();
    expect((await answer).status()).toBe(429);

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Muitas tentativas seguidas.');
    await expect(alert).toContainText('Aguarde 1 minuto e tente de novo.');
    await expect(page.getByLabel('E-mail')).toHaveValue(DEMO_EMAIL);
    await expect(page.getByLabel('Senha')).toHaveValue('senha-errada-6');
    await expect(page).toHaveURL('/entrar');
  },
);
