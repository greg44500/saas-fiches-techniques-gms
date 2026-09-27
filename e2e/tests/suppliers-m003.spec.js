import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import {
  loginWithIdentity,
} from '../support/auth.js';
import {
  provisionGlobalCatalogAcrossWorkspaces,
  provisionSupplierOwnerWorkspace,
  provisionSupplierPricingWorkspace,
} from '../support/supplier-fixtures.js';

async function createSupplierFromUi(page, supplierName) {
  await page.getByRole('button', {
    name: 'Créer un Fournisseur',
  }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(supplierName);
  await dialog.getByRole('button', {
    name: 'Enregistrer',
  }).click();

  await expect(
    page.getByText('Fournisseur enregistré', {
      exact: true,
    }),
  ).toBeVisible();
}

async function importCatalogFromUi(page, {
  csv,
  editionName,
  expectedPreview,
  supplierName,
}) {
  await page.getByRole('tab', {
    name: 'Catalogues',
  }).click();
  await page.getByRole('button', {
    name: 'Importer un catalogue',
  }).click();

  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('Fichier').setInputFiles({
    name: 'catalogue.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  await dialog.getByRole('button', {
    name: 'Inspecter le fichier',
  }).click();

  await dialog.getByRole('combobox', {
    name: 'Fournisseur du catalogue',
  }).click();
  await page.getByRole('option', {
    name: supplierName,
  }).click();

  await dialog.getByLabel('Édition').fill(editionName);
  await dialog.getByRole('button', {
    name: 'Prévisualiser',
  }).click();

  await expect(
    dialog.getByText(expectedPreview, {
      exact: true,
    }),
  ).toBeVisible();

  await dialog.getByRole('button', {
    name: 'Confirmer l’import',
  }).click();

  await expect(
    page.getByText('Import catalogue terminé', {
      exact: true,
    }).last(),
  ).toBeVisible();
}

async function createNegotiatedPriceFromUi(page, {
  amount,
  articleLabel,
}) {
  await page.getByRole('tab', {
    name: 'Tarifs négociés',
  }).click();
  await page.getByRole('button', {
    name: 'Ajouter un Tarif négocié',
  }).click();

  const dialog = page.getByRole('dialog');

  await dialog.getByRole('combobox', {
    name: 'Article fournisseur',
  }).click();
  await page.getByRole('option', {
    name: articleLabel,
  }).click();

  await dialog.getByLabel('Montant HT').fill(amount);
  await dialog.getByLabel('Valide à partir du')
    .fill('2026-01-01');
  await dialog.getByRole('button', {
    name: 'Enregistrer',
  }).click();

  await expect(
    page.getByText('Prix enregistré', {
      exact: true,
    }).last(),
  ).toBeVisible();
}

async function resolveArticlePrice(page, {
  articleLabel,
  expectedPrice,
}) {
  await page.getByRole('combobox', {
    name: 'Article pour le Prix applicable',
  }).click();
  await page.getByRole('option', {
    name: articleLabel,
  }).click();

  await expect(
    page.getByText(expectedPrice, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Source : NEGOTIATED_PRICE/),
  ).toBeVisible();
}

test('M-003 owner importe un catalogue privé, le réimporte sans doublon et un autre Workspace ne le voit pas', async ({ page }) => {
  const workspaceA = await provisionSupplierOwnerWorkspace();
  const workspaceB = await provisionSupplierOwnerWorkspace({
    enableImport: false,
    withProductReference: false,
  });
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const supplierName = 'Fournisseur Import E2E ' + suffix;
  const editionName = 'Edition Import E2E ' + suffix;
  const csv = [
    'Reference;Designation;Unites;Quantite;Unite;Prix;Base',
    'E2E-'
      + suffix
      + ';'
      + workspaceA.productReferenceName
      + ';1;25;kg;40,625;kg',
  ].join('\n');

  await loginWithIdentity(page, workspaceA.identity);
  await page.goto(workspaceA.suppliersUrl);

  await expect(
    page.getByRole('heading', {
      name: 'Fournisseurs',
    }),
  ).toBeVisible();

  await createSupplierFromUi(
    page,
    supplierName,
  );

  await importCatalogFromUi(page, {
    csv,
    editionName,
    expectedPreview: 'Nouvel Article : 1',
    supplierName,
  });

  await expect(
    page.getByText(editionName, {
      exact: true,
    }),
  ).toHaveCount(1);

  await importCatalogFromUi(page, {
    csv,
    editionName,
    expectedPreview: 'Article existant : 1',
    supplierName,
  });

  await expect(
    page.getByText(editionName, {
      exact: true,
    }),
  ).toHaveCount(1);

  await loginWithIdentity(page, workspaceB.identity);
  await page.goto(workspaceB.suppliersUrl);
  await page.getByRole('tab', {
    name: 'Catalogues',
  }).click();

  await expect(
    page.getByText(editionName, {
      exact: true,
    }),
  ).toHaveCount(0);
});

test('M-003 deux Dossiers utilisent le même Article avec des Tarifs négociés et Prix applicables distincts', async ({ page }) => {
  const context =
    await provisionSupplierPricingWorkspace();
  const articleLabel =
    context.supplierName
    + ' · '
    + context.articleReference;

  await loginWithIdentity(
    page,
    context.identity,
  );

  await page.goto(
    context.dossierAPricingUrl,
  );
  await expect(
    page.getByRole('heading', {
      name: /Fournisseurs et prix/,
    }),
  ).toBeVisible();

  await createNegotiatedPriceFromUi(page, {
    amount: '10',
    articleLabel,
  });
  await resolveArticlePrice(page, {
    articleLabel,
    expectedPrice: '10,000 EUR / KG',
  });

  await page.goto(
    context.dossierBPricingUrl,
  );

  await createNegotiatedPriceFromUi(page, {
    amount: '20',
    articleLabel,
  });
  await resolveArticlePrice(page, {
    articleLabel,
    expectedPrice: '20,000 EUR / KG',
  });

  await page.goto(
    context.dossierAPricingUrl,
  );
  await resolveArticlePrice(page, {
    articleLabel,
    expectedPrice: '10,000 EUR / KG',
  });
});

test('M-003 un catalogue global est réutilisable depuis plusieurs Workspaces', async ({ page }) => {
  const context =
    await provisionGlobalCatalogAcrossWorkspaces();

  await loginWithIdentity(
    page,
    context.workspaceA.identity,
  );
  await page.goto(
    context.workspaceA.suppliersUrl,
  );
  await page.getByRole('tab', {
    name: 'Catalogues',
  }).click();

  await expect(
    page.getByText(context.catalogName, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Partagé', {
      exact: true,
    }),
  ).toBeVisible();

  await loginWithIdentity(
    page,
    context.workspaceB.identity,
  );
  await page.goto(
    context.workspaceB.suppliersUrl,
  );
  await page.getByRole('tab', {
    name: 'Catalogues',
  }).click();

  await expect(
    page.getByText(context.catalogName, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Partagé', {
      exact: true,
    }),
  ).toBeVisible();
});
