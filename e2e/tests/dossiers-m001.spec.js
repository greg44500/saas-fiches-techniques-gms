import { expect, test } from '@playwright/test';

import {
  loginWithIdentity,
} from '../support/auth.js';
import {
  closeDossierDrawer,
  createDossierFromUi,
  getDossiersUrl,
  openDossierDrawer,
  selectDossierDrawerTab,
} from '../support/dossier.js';
import {
  provisionDossierMember,
  provisionDossierOwnerWorkspace,
} from '../support/dossier-fixtures.js';

async function createOwnerWorkspaceWithDossier(page, dossierName) {
  const workspace = await provisionDossierOwnerWorkspace();

  await loginWithIdentity(page, workspace.identity);
  await page.goto(workspace.dashboardUrl);

  const dossier = await createDossierFromUi(page, {
    dashboardUrl: workspace.dashboardUrl,
    name: dossierName,
  });

  return {
    ...workspace,
    ...dossier,
  };
}

test('M-001 owner crée, consulte et ouvre un Dossier', async ({ page }) => {
  const context = await createOwnerWorkspaceWithDossier(
    page,
    'Magasin E2E Owner',
  );

  await openDossierDrawer(page, 'Magasin E2E Owner');
  await selectDossierDrawerTab(page, 'Accès');

  await expect(
    page.getByText('Workspace Owner', { exact: true }),
  ).toBeVisible();

  await closeDossierDrawer(page);
  await page.getByRole('link', { name: 'Ouvrir' }).click();

  await expect(page).toHaveURL(context.dossierUrl);
  await expect(
    page.getByRole('heading', { name: 'Magasin E2E Owner' }),
  ).toBeVisible();
  await expect(
    page.getByText('Contexte actif', { exact: true }),
  ).toBeVisible();
});

test('M-001 owner affecte un membre qui voit et ouvre le Dossier', async ({ page }) => {
  const context = await createOwnerWorkspaceWithDossier(
    page,
    'Magasin E2E Affecté',
  );
  const member = await provisionDossierMember({
    workspaceId: context.workspaceId,
  });

  await openDossierDrawer(page, 'Magasin E2E Affecté');
  await selectDossierDrawerTab(page, 'Accès');

  await expect(
    page.getByText(
      `${member.identity.firstName} ${member.identity.lastName}`,
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Affecter' }).click();
  await expect(
    page.getByRole('button', { name: 'Révoquer' }),
  ).toBeVisible();

  await closeDossierDrawer(page);

  await loginWithIdentity(page, member.identity);
  await page.goto(context.dossiersUrl);

  await expect(
    page.getByText('Magasin E2E Affecté', { exact: true }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Ouvrir' }).click();
  await expect(page).toHaveURL(context.dossierUrl);
  await expect(
    page.getByText('Contexte actif', { exact: true }),
  ).toBeVisible();
});

test('M-001 membre sans grant ne voit pas le Dossier et l’URL directe est refusée', async ({ page }) => {
  const context = await createOwnerWorkspaceWithDossier(
    page,
    'Magasin E2E Isolé',
  );
  const member = await provisionDossierMember({
    workspaceId: context.workspaceId,
  });

  await loginWithIdentity(page, member.identity);
  await page.goto(context.dossiersUrl);

  await expect(
    page.getByText('Magasin E2E Isolé', { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText('Aucun dossier à afficher', { exact: true }),
  ).toBeVisible();

  await page.goto(context.dossierUrl);

  await expect(
    page.getByText('Dossier indisponible', { exact: true }),
  ).toBeVisible();
});

test('M-001 suppression révoque les grants et restauration PAUSED ne les restaure pas', async ({ page }) => {
  const context = await createOwnerWorkspaceWithDossier(
    page,
    'Magasin E2E Lifecycle',
  );
  const member = await provisionDossierMember({
    workspaceId: context.workspaceId,
  });

  await openDossierDrawer(page, 'Magasin E2E Lifecycle');
  await selectDossierDrawerTab(page, 'Accès');

  await page.getByRole('button', { name: 'Affecter' }).click();
  await expect(
    page.getByRole('button', { name: 'Révoquer' }),
  ).toBeVisible();

  await selectDossierDrawerTab(page, 'Administration');

  await page.getByRole('button', { name: 'Supprimé' }).click();

  let confirmation = page.getByRole('dialog');
  await confirmation.getByLabel('Raison').fill(
    'Suppression E2E pour vérifier la révocation des accès',
  );
  await confirmation
    .getByRole('button', { name: 'Confirmer le changement' })
    .click();

  await expect(
    page.getByText('Statut du dossier mis à jour', { exact: true }),
  ).toBeVisible();

  await closeDossierDrawer(page);

  await page.getByRole('combobox', { name: 'Filtrer par statut' }).click();
  await page.getByRole('option', { name: 'Supprimé' }).click();

  await expect(
    page.getByText('Magasin E2E Lifecycle', { exact: true }),
  ).toBeVisible();

  await openDossierDrawer(page, 'Magasin E2E Lifecycle');
  await selectDossierDrawerTab(page, 'Administration');

  await page.getByRole('button', { name: 'En pause' }).click();

  confirmation = page.getByRole('dialog');
  await confirmation.getByLabel('Raison').fill(
    'Restauration E2E sans restauration automatique des grants',
  );
  await confirmation
    .getByRole('button', { name: 'Confirmer le changement' })
    .click();

  await expect(
    page.getByText('Statut du dossier mis à jour', { exact: true }),
  ).toBeVisible();

  await loginWithIdentity(page, member.identity);
  await page.goto(getDossiersUrl(context.dashboardUrl));

  await expect(
    page.getByText('Magasin E2E Lifecycle', { exact: true }),
  ).toHaveCount(0);

  await page.goto(context.dossierUrl);

  await expect(
    page.getByText('Dossier indisponible', { exact: true }),
  ).toBeVisible();
});
