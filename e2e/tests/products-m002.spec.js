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

test('M-002 owner crée un Produit actif et le retrouve dans Mon référentiel', async ({ page }) => {
  const context = await provisionProductOwnerWorkspace();

  await loginWithIdentity(page, context.identity);
  await page.goto(context.productsUrl);

  await expect(
    page.getByRole('heading', { name: 'Produits' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Créer un Produit' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du Produit').fill(context.productName);
  await dialog
    .getByRole('button', { name: 'Rechercher l’existant' })
    .click();

  await dialog.getByLabel('Catégorie principale *').click();
  await page.getByRole('option', { name: context.categoryName }).click();

  await dialog
    .getByRole('button', { name: 'Créer et ajouter à mon référentiel' })
    .click();

  await expect(
    page.getByText('Produit créé et ajouté à mon référentiel', { exact: true }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Mon référentiel' }).click();

  await expect(
    page.getByText(context.productName, { exact: true }).first(),
  ).toBeVisible();

  await expect(
    page.getByText('En validation', { exact: true }),
  ).toHaveCount(0);
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

  await dialog.getByLabel('Catégorie principale *').click();
  await page.getByRole('option', { name: categoryName }).click();

  await dialog
    .getByRole('button', { name: 'Créer dans le référentiel global' })
    .click();

  await expect(
    page.getByText('Produit créé dans le référentiel', { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(productName, { exact: true }).first(),
  ).toBeVisible();

  await expect(
    page.getByRole('tab', { name: 'À valider' }),
  ).toHaveCount(0);
});
