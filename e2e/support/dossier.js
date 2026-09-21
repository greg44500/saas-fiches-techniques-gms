import { expect } from '@playwright/test';

function getWorkspaceIdFromDashboardUrl(dashboardUrl) {
  const match = dashboardUrl.match(/\/workspaces\/([^/]+)\/dashboard$/);

  if (!match) {
    throw new Error(`Unexpected workspace dashboard URL: ${dashboardUrl}`);
  }

  return match[1];
}

function getDossiersUrl(dashboardUrl) {
  return dashboardUrl.replace(/\/dashboard$/, '/dossiers');
}

async function createDossierFromUi(page, {
  dashboardUrl,
  name,
}) {
  await page.goto(getDossiersUrl(dashboardUrl));
  await expect(
    page.getByRole('heading', { name: 'Dossiers' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Créer un dossier' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom', { exact: true }).fill(name);
  await dialog.getByRole('button', { name: 'Créer le dossier' }).click();

  await expect(page.getByText('Dossier créé', { exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();

  const openLink = page.getByRole('link', { name: 'Ouvrir' }).first();
  const dossierUrl = await openLink.getAttribute('href');

  if (!dossierUrl) {
    throw new Error('Created dossier has no work-page link');
  }

  const dossierId = dossierUrl.split('/').at(-1);

  return {
    dossierId,
    dossierUrl,
    dossiersUrl: getDossiersUrl(dashboardUrl),
  };
}

async function openDossierDrawer(page, dossierName) {
  await page
    .getByRole('button', { name: `Voir ${dossierName}` })
    .click();

  await expect(page.getByText('Informations', { exact: true })).toBeVisible();
  await expect(page.getByText('Accès', { exact: true })).toBeVisible();
  await expect(page.getByText('Activité', { exact: true })).toBeVisible();
}

async function closeDossierDrawer(page) {
  await page.getByRole('button', { name: 'Fermer' }).click();
}

export {
  closeDossierDrawer,
  createDossierFromUi,
  getDossiersUrl,
  getWorkspaceIdFromDashboardUrl,
  openDossierDrawer,
};
