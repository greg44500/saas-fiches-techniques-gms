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

function getDashboardUrlFromDossiersUrl(dossiersUrl) {
  return dossiersUrl.replace(/\/dossiers$/, '/dashboard');
}

const DOSSIERS_ROUTE_READY_TIMEOUT_MS = 15_000;

async function openDossiersPage(page, dossiersUrl) {
  const dashboardUrl = getDashboardUrlFromDossiersUrl(dossiersUrl);
  const currentPathname = new URL(page.url()).pathname;

  if (currentPathname !== dashboardUrl) {
    await page.goto(dashboardUrl);
  }

  await expect(page).toHaveURL(
    /\/workspaces\/[^/]+\/dashboard$/,
    { timeout: DOSSIERS_ROUTE_READY_TIMEOUT_MS },
  );

  const dossiersLink = page.getByRole('link', {
    name: 'Dossiers',
    exact: true,
  });

  await expect(dossiersLink).toBeVisible({
    timeout: DOSSIERS_ROUTE_READY_TIMEOUT_MS,
  });
  await dossiersLink.click();

  await expect(page).toHaveURL(
    /\/workspaces\/[^/]+\/dossiers$/,
    { timeout: DOSSIERS_ROUTE_READY_TIMEOUT_MS },
  );

  await expect(
    page.getByRole('heading', { name: 'Dossiers' }),
  ).toBeVisible({ timeout: DOSSIERS_ROUTE_READY_TIMEOUT_MS });
}

async function createDossierFromUi(page, {
  dashboardUrl,
  name,
}) {
  await openDossiersPage(page, getDossiersUrl(dashboardUrl));

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

  const tabNames = [
    'Infos',
    'Accès',
    'Activités',
    'Administration',
  ];

  for (const tabName of tabNames) {
    await expect(
      page.getByRole('tab', { name: tabName }),
    ).toBeVisible();
  }
}

async function selectDossierDrawerTab(page, tabName) {
  const tab = page.getByRole('tab', { name: tabName });

  await expect(tab).toBeVisible();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
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
  openDossiersPage,
  selectDossierDrawerTab,
};
