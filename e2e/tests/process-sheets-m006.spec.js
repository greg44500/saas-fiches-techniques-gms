import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { loginWithIdentity } from '../support/auth.js';
import {
  provisionDossierMember, provisionDossierOwnerWorkspace, withE2eDatabase,
} from '../support/dossier-fixtures.js';
import { provisionValidatedProcessParent } from '../support/process-sheet-fixtures.js';
import { grantDossierAccess } from '../../backend/modules/dossier/dossierAccess.service.js';
import { Workspace } from '../../backend/modules/workspace/workspace.model.js';

const bearer = (token) => ({ Authorization: 'Bearer ' + token });
const processApiBase = (context) => '/api' + context.processSheetsUrl;

async function getProcess(page, context, token, id) {
  const response = await page.request.get(processApiBase(context) + '/' + id, {
    headers: bearer(token),
  });
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

async function createProcessFromUi(page, context, title) {
  await page.goto(context.processSheetsUrl);
  await page.getByRole('button', { name: 'Créer une Fiche process' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre de la Fiche process').fill(title);
  await dialog.getByRole('combobox', { name: 'Fiche technique associée' }).click();
  await page.getByRole('option', { name: context.technicalSheetName }).click();
  await dialog.getByRole('button', { name: 'Créer et ouvrir' }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/process-sheets\/[0-9a-f]{24}$/);
  return new URL(page.url()).pathname.split('/').at(-1);
}

async function expectDownloadedPdf(page) {
  const downloadPromise = page.waitForEvent('download');
  const exportButton = page.getByRole('button', { name: 'Exporter', exact: true });
  await expect(exportButton).not.toHaveAttribute('aria-disabled', 'true');
  await exportButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^fiche-process-.*\.pdf$/i);
  const content = await readFile(await download.path());
  expect(content.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(content.length).toBeGreaterThan(1000);
}

test('M-006 propriétaire : brouillon, validation, PDF, suppression et recréation sans perte M-004', async ({ page }) => {
  // Parcours long : création, deux téléchargements PDF, suppression et recréation.
  test.slow();
  const context = await provisionValidatedProcessParent();
  const token = await loginWithIdentity(page, context.identity);
  const title = 'Process recette E2E ' + randomUUID().slice(0, 8);
  const id = await createProcessFromUi(page, context, title);
  const initial = await getProcess(page, context, token, id);
  expect(initial.process.editorialState).toBe('DRAFT');

  // Première phase et première étape : vraie interaction avec l'atelier M-006.
  await page.getByRole('button', { name: 'Ajouter une phase' }).click();
  await page.getByRole('button', { name: 'Autre phase…' }).click();
  const phaseDialog = page.getByRole('dialog');
  await phaseDialog.getByLabel('Intitulé').fill('Préparation E2E');
  await phaseDialog.getByRole('button', { name: 'Ajouter la phase' }).click();
  await page.getByRole('button', { name: 'Ajouter une étape à la phase 1' }).click();
  const stepEditor = page.getByRole('region', { name: 'Éditeur de l’étape' });
  await stepEditor.getByLabel('Titre de l’étape').fill('Préparer le produit');
  await stepEditor.getByLabel('Instructions').fill('Préparer et contrôler les ingrédients.');

  const saveResponse = page.waitForResponse((response) => (
    response.request().method() === 'PUT'
    && new URL(response.url()).pathname.endsWith('/process-sheets/' + id + '/draft')
  ));
  await page.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
  expect((await saveResponse).status()).toBe(200);
  await expect(page.getByText('Enregistré', { exact: true })).toBeVisible();

  const saved = await getProcess(page, context, token, id);
  expect(saved.draft.phases).toHaveLength(1);
  expect(saved.draft.phases[0].steps).toHaveLength(1);
  expect(saved.draft.phases[0].steps[0].instructions)
    .toBe('Préparer et contrôler les ingrédients.');

  // Le brouillon produit lui aussi un PDF imprimable.
  await expectDownloadedPdf(page);

  const validateButton = page.getByRole('button', { name: 'Valider la Fiche process' });
  await expect(validateButton).not.toHaveAttribute('aria-disabled', 'true');
  await validateButton.click();
  const confirm = page.getByRole('dialog', {
    name: 'Valider avec des ingrédients non affectés ?',
  });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Valider quand même' }).click();
  await expect(page.getByText('Validée', { exact: true })).toBeVisible();

  const validated = await getProcess(page, context, token, id);
  expect(validated.process.editorialState).toBe('VALIDATED');
  expect(validated.process.revision).toBeGreaterThan(initial.process.revision);
  await expectDownloadedPdf(page);

  // Un jeton de concurrence ancien ne doit jamais supprimer le contenu courant.
  const staleDelete = await page.request.delete(processApiBase(context) + '/' + id, {
    headers: bearer(token),
    data: { expectedRevision: initial.process.revision },
  });
  expect(staleDelete.status()).toBe(409);
  expect((await getProcess(page, context, token, id)).process.id).toBe(id);

  await page.goto(context.processSheetsUrl);
  await page.getByRole('button', { name: 'Actions de la Fiche process ' + title }).click();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  const deleteDialog = page.getByRole('dialog', {
    name: 'Supprimer définitivement cette Fiche process ?',
  });
  await expect(deleteDialog).toContainText('La Fiche technique associée sera conservée.');
  await deleteDialog.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);

  const source = await page.request.get(
    '/api/workspaces/' + context.workspaceId
      + '/dossiers/' + context.dossierA.id
      + '/technical-sheets/' + context.technicalSheetId,
    { headers: bearer(token) },
  );
  expect(source.status()).toBe(200);
  const eligibility = await page.request.get(
    processApiBase(context) + '/eligible-technical-sheets',
    { headers: bearer(token) },
  );
  expect(eligibility.status()).toBe(200);
  expect((await eligibility.json()).data.technicalSheets.map((sheet) => sheet.id))
    .toContain(context.technicalSheetId);

  // L'unicité 1:1 a été libérée : la même M-004 redevient éligible.
  const recreated = await createProcessFromUi(page, context, title + ' recréé');
  expect(recreated).not.toBe(id);
});

test('M-006 droits : lecture seule autorisée, export/suppression refusés, Workspace étranger interdit', async ({ page }) => {
  const context = await provisionValidatedProcessParent();
  const ownerToken = await loginWithIdentity(page, context.identity);
  const createdResponse = await page.request.post(processApiBase(context), {
    headers: bearer(ownerToken),
    data: { title: 'Process accès réservé E2E', technicalSheetId: context.technicalSheetId },
  });
  expect(createdResponse.status()).toBe(201);
  const id = (await createdResponse.json()).data.process.id;

  const member = await provisionDossierMember({
    workspaceId: context.workspaceId,
    permissions: ['workspace:read', 'dossier:read', 'process-sheet:read'],
  });
  await withE2eDatabase(async () => {
    const workspace = await Workspace.findById(context.workspaceId);
    await grantDossierAccess({
      workspaceId: context.workspaceId,
      dossierId: context.dossierA.id,
      membershipId: member.membershipId,
      actorId: workspace.createdBy,
    });
  });

  const memberToken = await loginWithIdentity(page, member.identity);
  expect((await page.request.get(processApiBase(context) + '/' + id, {
    headers: bearer(memberToken),
  })).status()).toBe(200);
  await page.goto(context.processSheetsUrl + '/' + id);
  await expect(page.getByRole('button', { name: 'Exporter', exact: true }))
    .toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: 'Valider la Fiche process' }))
    .toHaveAttribute('aria-disabled', 'true');

  expect((await page.request.get(processApiBase(context) + '/' + id + '/export/pdf', {
    headers: bearer(memberToken),
  })).status()).toBe(403);
  expect((await page.request.delete(processApiBase(context) + '/' + id, {
    headers: bearer(memberToken),
    data: { expectedRevision: 0 },
  })).status()).toBe(403);

  const outsider = await provisionDossierOwnerWorkspace();
  const outsiderToken = await loginWithIdentity(page, outsider.identity);
  expect((await page.request.get(processApiBase(context) + '/' + id, {
    headers: bearer(outsiderToken),
  })).status()).toBe(403);

  const remaining = await getProcess(page, context, ownerToken, id);
  expect(remaining.process.id).toBe(id);
});
