import { randomUUID } from 'node:crypto';

import { expect } from '@playwright/test';

const E2E_PASSWORD = 'Cobalt river quartz 2026 # Session';

function createRegistrationIdentity() {
  const suffix = randomUUID();

  return {
    firstName: 'Alice',
    lastName: 'E2E',
    email: `alice.e2e.${suffix}@example.test`,
    password: E2E_PASSWORD,
  };
}

async function loginWithIdentity(page, identity) {
  await page.context().clearCookies();

  const response = await page.request.post('/api/auth/login', {
    data: {
      email: identity.email,
      password: identity.password,
    },
  });

  expect(
    response.ok(),
    `E2E session login failed with status ${response.status()}`,
  ).toBe(true);
}

async function registerAndLogin(page) {
  const identity = createRegistrationIdentity();

  await page.goto('/register');

  await page.getByLabel('Prénom').fill(identity.firstName);
  await page.getByLabel('Nom', { exact: true }).fill(identity.lastName);
  await page.getByLabel('Email').fill(identity.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(identity.password);
  await page.getByLabel('Confirmer le mot de passe').fill(identity.password);
  await page.getByRole('checkbox', { name: /J’accepte les/i }).click();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toContainText(
    'Compte créé. Vous pouvez maintenant vous connecter.',
  );

  await page.getByLabel('Email').fill(identity.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(identity.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/onboarding\/workspace$/);
  await expect(
    page.getByRole('heading', { name: 'Créez votre workspace' }),
  ).toBeVisible();

  return identity;
}

export { E2E_PASSWORD, loginWithIdentity, registerAndLogin };
