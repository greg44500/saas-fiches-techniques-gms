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
import {
  selectGlobalProductReference,
  selectWorkspaceProductReference,
} from '../support/product.js';
import {
  expectVisibleToast,
} from '../support/toast.js';

async function createGlobalProductForMerge(page, productName) {
  await page.getByRole('button', { name: 'Créer un Produit' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom du Produit').fill(productName);
  await dialog
    .getByRole('button', { name: 'Rechercher l’existant' })
    .click();
  await dialog
    .getByRole('button', { name: 'Créer dans le référentiel global' })
    .click();

  await expectVisibleToast(
    page,
    'Produit créé dans le référentiel',
  );
  await expect(
    page.getByRole('heading', { name: productName, exact: true }),
  ).toBeVisible();
}

async function createGlobalReferenceForMerge(
  page,
  referenceName,
  { yieldPercent = null } = {},
) {
  await page.getByRole('button', { name: 'Créer une référence' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Créer une référence Produit',
  });
  await dialog.getByLabel('Nom de la référence *').fill(referenceName);

  if (yieldPercent !== null) {
    await dialog.getByLabel('Rendement (%)').fill(String(yieldPercent));
  }

  await dialog.getByRole('button', { name: 'Créer la référence' }).click();
  await expectVisibleToast(page, 'Référence créée');
}

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

  await expectVisibleToast(
    page,
    'Produit créé · À valider',
  );

  await expect(
    page.getByRole('heading', {
      name: context.productName,
      exact: true,
    }),
  ).toBeVisible();

  const closeProductDrawer = page.getByRole('button', {
    name: 'Fermer',
    exact: true,
  });
  await closeProductDrawer.click();
  await expect(closeProductDrawer).toBeHidden();

  await page.getByRole('tab', { name: 'Favoris' }).click();
  await expect(
    page.getByText(context.productName, { exact: true }),
  ).toHaveCount(0);

  await loginWithIdentity(page, E2E_FOUNDER);
  await page.goto('/product-reference');
  await page.getByRole('tab', { name: /À contrôler \(\d+\)/ }).click();

  const contributionRow = page.getByRole('row').filter({
    hasText: context.productName,
  });
  await expect(contributionRow).toBeVisible();
  await contributionRow.getByRole('button', {
    name: `Examiner ${context.productName}`,
  }).click();

  await expect(
    page.getByRole('heading', {
      name: context.productName,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('À contrôler', { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Valider', exact: true }).click();

  await expectVisibleToast(
    page,
    'Produit validé',
  );

  const closeGlobalProductDrawer = page.getByRole('button', {
    name: 'Fermer',
    exact: true,
  });
  await closeGlobalProductDrawer.click();
  await expect(closeGlobalProductDrawer).toBeHidden();
  await expect(contributionRow).toBeHidden();

  await expect(
    page.getByRole('tab', { name: 'Historique' }),
  ).toHaveCount(0);

  await page.getByRole('tab', { name: 'Référentiel' }).click();
  await selectGlobalProductReference(
    page,
    context.productName,
  );
  await expect(
    page.getByText(context.productName, { exact: true }).first(),
  ).toBeVisible();

  await loginWithIdentity(page, context.identity);
  await page.goto(context.productsUrl);

  await selectWorkspaceProductReference(
    page,
    context.productName,
  );

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

  await expectVisibleToast(
    page,
    'Catégorie enregistrée',
  );

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

  await expectVisibleToast(
    page,
    'Produit créé dans le référentiel',
  );

  await expect(
    page.getByText(productName, { exact: true }).first(),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Fermer' }).click();

  await expect(
    page.getByRole('tab', { name: /À contrôler \(\d+\)/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('tab', { name: 'Historique' }),
  ).toHaveCount(0);
});

test('M-002 gestionnaire Application Global fusionne deux Références compatibles', async ({ page }) => {
  await loginWithIdentity(page, E2E_FOUNDER);
  await page.goto('/product-reference');

  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const productName = `Produit fusion E2E ${suffix}`;
  const secondReferenceName = `Référence fusion source ${suffix}`;
  const mergedReferenceName = `Référence fusionnée E2E ${suffix}`;

  await createGlobalProductForMerge(page, productName);

  await page.getByRole('tab', { name: 'Références (1)' }).click();
  await createGlobalReferenceForMerge(page, secondReferenceName);

  await expect(
    page.getByRole('tab', { name: 'Références (2)' }),
  ).toBeVisible();

  await page.getByRole('button', {
    name: `Fusionner la référence ${productName}`,
  }).click();

  await expect(
    page.getByRole('heading', {
      name: 'Fusionner des Références Produit',
    }),
  ).toBeVisible();

  await page.getByRole('textbox', {
    name: 'Rechercher la seconde Référence',
  }).fill(secondReferenceName);

  const candidateRow = page.locator('li').filter({
    hasText: secondReferenceName,
    has: page.getByRole('button', { name: 'Comparer', exact: true }),
  });
  await expect(candidateRow).toBeVisible();
  await candidateRow.getByRole('button', { name: 'Comparer' }).click();

  const targetName = page.getByRole('textbox', {
    name: 'Nom après fusion',
  });
  await expect(targetName).toHaveValue(productName);
  await targetName.fill(mergedReferenceName);

  await page.getByRole('button', {
    name: 'Vérifier la fusion',
  }).click();

  await expect(
    page.getByText('Dépendances concernées', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Le serveur a vérifié les dépendances actuelles. '
      + 'Elles seront vérifiées une nouvelle fois au moment de la confirmation.',
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole('button', {
    name: 'Confirmer la fusion',
  }).click();

  const confirmation = page.getByRole('dialog', {
    name: 'Confirmer la fusion des Références ?',
  });
  await confirmation.getByRole('button', { name: 'Fusionner' }).click();

  await expectVisibleToast(page, 'Références fusionnées');

  await expect(
    page.getByRole('tab', { name: 'Références (1)' }),
  ).toBeVisible();
  await expect(
    page.getByText(mergedReferenceName, { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(secondReferenceName, { exact: true }),
  ).toHaveCount(0);
});

test('M-002 fusion exclut une Référence incompatible avec les calculs', async ({ page }) => {
  await loginWithIdentity(page, E2E_FOUNDER);
  await page.goto('/product-reference');

  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const productName = `Produit refus fusion E2E ${suffix}`;
  const incompatibleReferenceName =
    `Référence rendement incompatible ${suffix}`;

  await createGlobalProductForMerge(page, productName);

  await page.getByRole('tab', { name: 'Références (1)' }).click();
  await createGlobalReferenceForMerge(
    page,
    incompatibleReferenceName,
    { yieldPercent: 80 },
  );

  await expect(
    page.getByRole('tab', { name: 'Références (2)' }),
  ).toBeVisible();

  await page.getByRole('button', {
    name: `Fusionner la référence ${productName}`,
  }).click();

  await page.getByRole('textbox', {
    name: 'Rechercher la seconde Référence',
  }).fill(incompatibleReferenceName);

  await expect(
    page.getByText('Aucune autre Référence admissible.', {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Comparer' }),
  ).toHaveCount(0);
});

