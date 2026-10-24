import { expect, test } from '@playwright/test';

import { loginWithIdentity } from '../support/auth.js';
import { provisionTechnicalSheetWorkspace } from '../support/technical-sheet-fixtures.js';

test('M-004 Gammes : un référentiel Workspace classe les Fiches du Dossier sans dupliquer les données', async ({ page }) => {
  const context = await provisionTechnicalSheetWorkspace();
  await loginWithIdentity(page, context.identity);

  await page.goto(context.dossierATechnicalSheetsUrl);
  await page.getByRole('button', { name: 'Gérer les gammes' }).click();
  await expect(page.getByRole('heading', { name: 'Gamme de produits finis' }))
    .toBeVisible();

  await page.getByRole('button', { name: 'Créer une gamme' }).click();
  await page.getByRole('dialog', { name: 'Créer une gamme' })
    .getByRole('textbox', { name: 'Nom de la gamme' }).fill('Snacking');
  await page.getByRole('button', { name: 'Créer la gamme' }).click();
  await expect(page.getByText('Snacking', { exact: true })).toBeVisible();

  await page.goto(context.dossierATechnicalSheetsUrl);
  await page.getByRole('button', { name: 'Créer', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Nom').fill('Fiche Gammes E2E');
  await form.getByLabel('Quantité produite').fill('10');
  await form.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fiche Gammes E2E' })).toBeVisible();

  await page.goto(context.dossierATechnicalSheetsUrl);
  await page.getByRole('button', { name: 'Actions de Fiche Gammes E2E' }).click();
  await page.getByRole('button', { name: 'Changer de gamme' }).click();

  const rangeDialog = page.getByRole('dialog');
  await rangeDialog.getByRole('combobox', { name: 'Gamme de la Fiche technique' }).click();
  await page.getByRole('option', { name: 'Snacking', exact: true }).click();
  await rangeDialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByRole('row', { name: /Fiche Gammes E2E/ })).toContainText('Snacking');

  await page.getByRole('button', { name: 'Gérer les gammes' }).click();
  await page.getByRole('button', { name: 'Actions de Snacking' }).click();
  await page.getByRole('button', { name: 'Archiver' }).click();
  await expect(page.getByText('Archivée', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Actions de Snacking' }).click();
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(page.getByText(/encore associée à des Fiches techniques/)).toBeVisible();

  await page.goto(context.dossierATechnicalSheetsUrl);
  await expect(page.getByRole('row', { name: /Fiche Gammes E2E/ }))
    .toContainText('Snacking (archivée)');
});
