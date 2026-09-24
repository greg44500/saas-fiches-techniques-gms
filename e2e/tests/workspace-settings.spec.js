import { expect, test } from '@playwright/test';

import { loginWithIdentity } from '../support/auth.js';
import { provisionDossierOwnerWorkspace } from '../support/dossier-fixtures.js';

test('owner renomme son workspace et la modification persiste après rechargement', async ({ page }) => {
  /*
   * Ce scénario teste les paramètres Workspace, pas l'inscription publique.
   * Le provisioning direct évite de consommer le rate limit /auth/register,
   * déjà couvert par les scénarios d'authentification et d'onboarding.
   */
  const context = await provisionDossierOwnerWorkspace();

  await loginWithIdentity(page, context.identity);

  const settingsUrl = `/workspaces/${context.workspaceId}/settings`;
  const updatedWorkspaceName = `${context.workspaceName} Renommé`;

  await page.goto(settingsUrl);

  await expect(
    page.getByRole('heading', { name: 'Paramètres du workspace' }),
  ).toBeVisible();

  await page.getByLabel('Nom du workspace').fill(updatedWorkspaceName);
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(
    page.getByText('Nom du workspace mis à jour', { exact: true }),
  ).toBeVisible();

  // Le reload garantit que le nom relu vient du backend et non du seul état UI.
  await page.reload();
  await expect(page.getByLabel('Nom du workspace')).toHaveValue(updatedWorkspaceName);
});
