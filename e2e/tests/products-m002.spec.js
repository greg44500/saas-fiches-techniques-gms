import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import {
  loginWithIdentity,
} from '../support/auth.js';
import {
  E2E_FOUNDER,
} from '../support/environment.js';
import {
  provisionProductOwnerWorkspace,
} from '../support/product-fixtures.js';

test('M-002 contribution Workspace est revue puis publiée globalement', async ({ page }) => {
  const context = await provisionProductOwnerWorkspace();

  await loginWithIdentity(page, context.identity);
  await page.goto(context.productsUrl);

  await expect(
    page.getByRole('heading', { name: 'Produits' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Créer un Produit' }).click();

  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du Produit').fill(context.productName);
  await dialog
    .getByRole('button', { name: 'Rechercher l’existant' })
    .click();

  await dialog
    .getByRole('button', { name: 'Soumettre la proposition' })
    .click();

  await expect(
    page.getByText('Proposition envoyée en revue', { exact: true }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Favoris' }).click();
  await expect(
    page.getByText(context.productName, { exact: true }),
  ).toHaveCount(0);

  await loginWithIdentity(page, E2E_FOUNDER);
  await page.goto('/product-reference');
  await page.getByRole('tab', { name: 'Contributions' }).click();

  const contributionRow = page.getByRole('row').filter({
    hasText: context.productName,
  });
  await expect(contributionRow).toBeVisible();
  await contributionRow.getByRole('button', { name: 'Approuver' }).click();

  await expect(
    page.getByText('Contribution approuvée', { exact: true }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Référentiel' }).click();
  const globalSearch = page.getByRole('textbox', {
    name: 'Rechercher un Produit global',
  });
  await globalSearch.fill(context.productName);
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(
    page.getByText(context.productName, { exact: true }).first(),
  ).toBeVisible();

  await loginWithIdentity(page, context.identity);
  await page.goto(context.productsUrl);

  await page.getByRole('combobox', { name: 'Rechercher un Produit' })
    .fill(context.productName);

  const predictiveResult = page.getByRole('option').filter({
    hasText: context.productName,
  }).first();
  await expect(predictiveResult).toBeVisible();
  await predictiveResult.click();

  await page.getByRole('button', {
    name: `Ajouter ${context.productName} aux favoris`,
  }).click();

  await page.getByRole('tab', { name: 'Favoris' }).click();
  await expect(
    page.getByText(context.productName, { exact: true }).first(),
  ).toBeVisible();
});

test('M-002 autorité Application Global alimente directement le référentiel', async ({ page }) => {
  await loginWithIdentity(page, E2E_FOUNDER);
  await page.goto('/product-reference');

  await expect(
    page.getByRole('heading', { name: 'Référentiel Produits' }),
  ).toBeVisible();

  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const categoryName = `Catégorie globale E2E ${suffix}`;
  const productName = `Produit global E2E ${suffix}`;

  await page.getByRole('tab', { name: 'Catégories' }).click();
  await page.getByRole('button', { name: 'Créer une catégorie' }).click();

  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(categoryName);
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(
    page.getByText('Catégorie enregistrée', { exact: true }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Référentiel' }).click();
  await page.getByRole('button', { name: 'Créer un Produit' }).click();

  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du Produit').fill(productName);
  await dialog
    .getByRole('button', { name: 'Rechercher l’existant' })
    .click();

  await dialog
    .getByRole('button', { name: 'Créer dans le référentiel global' })
    .click();

  await expect(
    page.getByText('Produit créé dans le référentiel', { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(productName, { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Fermer' }).click();

  await expect(
    page.getByRole('tab', { name: 'Contributions' }),
  ).toBeVisible();
});
