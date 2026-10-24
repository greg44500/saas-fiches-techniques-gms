import {
  E2E_FOUNDER,
} from '../support/environment.js';
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
import {
  expectVisibleToast,
} from '../support/toast.js';

function escapeRegex(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '\\$&');
}

async function chooseArticleByReference(page, input, reference) {
  // Les suggestions sont libellées « désignation · fournisseur · référence ».
  await input.fill(reference);
  const option = page.getByRole('option', {
    name: new RegExp('· ' + escapeRegex(reference) + '$'),
  });
  await expect(option).toBeVisible();
  await option.click();
  await expect(input).toHaveValue(new RegExp('· ' + escapeRegex(reference) + '$'));
}

async function openArticleDetails(page, row, reference) {
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Actions de ' + reference }).click();
  await page.getByRole('button', { name: 'Consulter l’Article', exact: true }).click();
}

async function createSupplierFromUi(page, supplierName) {
  await page.getByRole('button', {
    name: 'Créer un Fournisseur',
  }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nom').fill(supplierName);
  await dialog.getByRole('button', {
    name: 'Enregistrer',
  }).click();

  await expectVisibleToast(
    page,
    'Fournisseur enregistré',
  );
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

  await dialog.getByLabel('Fichier', { exact: true }).setInputFiles({
    name: 'catalogue.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  const inspectResponsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/supplier-catalogs/imports/inspect')
  ));

  await dialog.getByRole('button', {
    name: 'Analyser le fichier',
  }).click();

  const inspectResponse = await inspectResponsePromise;
  const inspectPayload = await inspectResponse.json().catch(() => null);

  expect(
    inspectResponse.status(),
    [
      'L’inspection du catalogue doit réussir avant la sélection du Fournisseur.',
      'HTTP ' + inspectResponse.status() + '.',
      inspectPayload?.message
        ? 'Backend : ' + inspectPayload.message
        : 'Aucun message backend exploitable.',
      inspectResponse.status() === 503
        ? 'Vérifier que ClamAV est exécutable et que CLAMAV_BINARY_PATH pointe vers clamscan (éventuellement chemin absolu sous Windows).'
        : '',
    ].join(' '),
  ).toBe(201);

  await dialog.getByRole('textbox', { name: 'Rechercher un Fournisseur' }).fill(supplierName);
  await dialog.getByRole('button', { name: new RegExp('^' + supplierName + '$', 'i') }).click();

  await dialog.getByRole('textbox', {
    name: 'Édition',
    exact: true,
  }).fill(editionName);
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

  await expectVisibleToast(
    page,
    'Import catalogue terminé',
  );
  await expect(dialog.getByText('Import terminé')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer' }).click();
}

async function createNegotiatedPriceFromUi(page, {
  amount,
  articleReference,
}) {
  await page.getByRole('tab', {
    name: 'Tarifs négociés',
  }).click();
  await page.getByRole('button', {
    name: 'Ajouter un Tarif négocié',
  }).click();

  const dialog = page.getByRole('dialog');

  await chooseArticleByReference(
    page,
    dialog.getByRole('combobox', { name: 'Article fournisseur' }),
    articleReference,
  );

  await dialog.getByLabel('Montant HT').fill(amount);
  await dialog.getByLabel('Valide à partir du')
    .fill('2026-01-01');
  await dialog.getByRole('button', {
    name: 'Enregistrer',
  }).click();

  await expectVisibleToast(
    page,
    'Prix enregistré',
  );
}

async function resolveArticlePrice(page, {
  articleReference,
  expectedPrice,
}) {
  // Le prix applicable est désormais consulté dans le shell Dossier.
  await page.getByRole('button', { name: 'Rechercher un Article fournisseur' }).click();
  await chooseArticleByReference(
    page,
    page.getByRole('combobox', { name: 'Article fournisseur à vérifier' }),
    articleReference,
  );
  const result = page.getByRole('region', { name: 'Résultat du prix applicable' });
  await expect(result).toBeVisible();
  await expect(result.getByText(expectedPrice, { exact: true })).toBeVisible();
  await expect(result.getByText('Source : Tarif négocié', { exact: true }))
    .toBeVisible();
}

// Vérifier la lecture avec la session et la tenancy réelles, puis la projection
// dans le tableau filtré côté serveur : aucune donnée injectée dans le navigateur.
async function expectImportedWorkspaceArticle(page, {
  workspaceId, reference, accessToken,
}) {
  const response = await page.request.get(
    `/api/workspaces/${workspaceId}/supplier-articles`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { search: reference, status: 'ACTIVE', page: 1, limit: 10 },
    },
  );
  expect(response.status(), 'Lecture des Articles après confirmation').toBe(200);
  const { data } = await response.json();
  expect(data.pagination.total).toBe(1);
  expect(data.articles).toHaveLength(1);
  const article = data.articles[0];
  expect(article).toEqual(expect.objectContaining({
    scope: 'WORKSPACE_PRIVATE',
    workspaceId,
    supplierReference: reference,
    status: 'ACTIVE',
  }));

  await page.getByRole('searchbox', { name: 'Rechercher' }).fill(reference);
  const articleRow = page.getByRole('row').filter({
    hasText: `Réf. fournisseur : ${reference}`,
  });
  await expect(articleRow).toBeVisible();

  return { article, articleRow };
}

test('M-003 autorité Application Global ouvre le Référentiel Fournisseurs', async ({ page }) => {
  await loginWithIdentity(page, E2E_FOUNDER);
  await page.goto('/supplier-reference');

  await expect(
    page.getByRole('heading', {
      name: 'Référentiel Fournisseurs',
    }),
  ).toBeVisible();
});

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
  const articleReference = context.articleReference;

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
    articleReference,
  });
  await resolveArticlePrice(page, {
    articleReference,
    expectedPrice: '10,000 / kg',
  });

  await page.goto(
    context.dossierBPricingUrl,
  );

  await createNegotiatedPriceFromUi(page, {
    amount: '20',
    articleReference,
  });
  await resolveArticlePrice(page, {
    articleReference,
    expectedPrice: '20,000 / kg',
  });

  await page.goto(
    context.dossierAPricingUrl,
  );
  await resolveArticlePrice(page, {
    articleReference,
    expectedPrice: '10,000 / kg',
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

  const workspaceACatalogRow = page
    .getByRole('row')
    .filter({ hasText: context.catalogName });

  await expect(workspaceACatalogRow).toHaveCount(1);
  await expect(workspaceACatalogRow).toContainText(context.catalogName);
  await expect(workspaceACatalogRow).toContainText('Référentiel partagé');

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

  const workspaceBCatalogRow = page
    .getByRole('row')
    .filter({ hasText: context.catalogName });

  await expect(workspaceBCatalogRow).toHaveCount(1);
  await expect(workspaceBCatalogRow).toContainText(context.catalogName);
  await expect(workspaceBCatalogRow).toContainText('Référentiel partagé');
});

test('M-003 owner importe une liste d’Articles sans créer de catalogue commercial', async ({ page }) => {
  const workspace = await provisionSupplierOwnerWorkspace();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const supplierName = 'Fournisseur liste E2E ' + suffix;
  const reference = 'LST-' + suffix;

  const accessToken = await loginWithIdentity(page, workspace.identity);
  await page.goto(workspace.suppliersUrl);
  await createSupplierFromUi(page, supplierName);
  await page.getByRole('tab', { name: /^Articles \(/ }).click();
  await page.getByRole('button', { name: 'Importer des Articles' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Fichier', { exact: true }).setInputFiles({
    name: 'articles.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'Reference;Designation;Marque',
      reference + ';Pain test;Bridor',
      ';Sans reference;Bridor',
    ].join('\n'), 'utf8'),
  });
  const inspectPromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/supplier-articles/imports/inspect')
  ));
  await dialog.getByRole('button', { name: 'Analyser le fichier' }).click();
  const inspected = await inspectPromise;
  expect(inspected.status(), 'Inspection Articles : vérifier ClamAV si HTTP 503').toBe(201);

  await dialog.getByRole('textbox', { name: 'Rechercher un Fournisseur' }).fill(supplierName);
  await dialog.getByRole('button', { name: new RegExp('^' + supplierName + '$', 'i') }).click();
  await dialog.getByRole('button', { name: 'Prévisualiser' }).click();
  await expect(dialog.getByText(reference, { exact: true })).toBeVisible();
  await expect(dialog.getByText(/1 ligne\(s\) sans référence ignorée\(s\)/)).toBeVisible();

  const commitPromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && /\/supplier-articles\/imports\/[^/]+\/commit$/.test(
      new URL(response.url()).pathname,
    )
  ));
  await dialog.getByRole('button', { name: 'Confirmer l’import' }).click();
  const committed = await commitPromise;
  expect(committed.status()).toBe(200);
  expect((await committed.json()).data).toEqual(expect.objectContaining({
    created: 1, updated: 0, skipped: 1, priced: 0,
  }));
  await expectVisibleToast(page, 'Import des Articles terminé');
  await expect(dialog.getByText('Import terminé')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  // Les toasts Base UI ont aussi role="dialog" : isoler le contenu modal.
  await expect(page.locator('[data-slot="dialog-content"][role="dialog"]'))
    .toBeHidden();

  const { article, articleRow } = await expectImportedWorkspaceArticle(page, {
    workspaceId: workspace.workspaceId,
    reference,
    accessToken,
  });
  expect(article.associationStatus).toBe('PENDING');
  expect(article.productVariant).toBeNull();
  await expect(articleRow.getByText('Non associé', { exact: true }))
    .toBeVisible();

  const catalogs = await page.request.get(
    `/api/workspaces/${workspace.workspaceId}/supplier-catalogs`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { supplierId: article.supplier.id, status: 'ACTIVE' },
    },
  );
  expect(catalogs.status()).toBe(200);
  expect((await catalogs.json()).data.catalogs).toHaveLength(0);
});


test('M-003 importe des prix Articles sans période saisie et les expose depuis le backend', async ({ page }) => {
  const workspace = await provisionSupplierOwnerWorkspace();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const supplierName = 'Fournisseur prix E2E ' + suffix;
  const reference = 'TAR-' + suffix;

  const accessToken = await loginWithIdentity(page, workspace.identity);
  await page.goto(workspace.suppliersUrl);
  await createSupplierFromUi(page, supplierName);
  await page.getByRole('tab', { name: /^Articles \(/ }).click();
  await page.getByRole('button', { name: 'Importer des Articles' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('Fichier', { exact: true }).setInputFiles({
    name: 'tarifs.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'Reference;Designation;Prix HT;Base;Conditionnement;Unites;Quantite par unite;Unite',
      reference + ';Pâtes alimentaires;25.5;carton;Carton;2;5;kg',
    ].join('\n'), 'utf8'),
  });
  const inspected = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && response.url().includes('/supplier-articles/imports/inspect')
  ));
  await dialog.getByRole('button', { name: 'Analyser le fichier' }).click();
  expect((await inspected).status(), 'Inspection Articles : vérifier ClamAV si HTTP 503').toBe(201);

  await dialog.getByRole('textbox', { name: 'Rechercher un Fournisseur' }).fill(supplierName);
  await dialog.getByRole('button', { name: new RegExp('^' + supplierName + '$', 'i') }).click();
  await expect(dialog.getByLabel('Importer les prix présents dans le fichier')).toBeChecked();
  await expect(dialog.getByLabel('Ces prix ont une période de validité définie')).not.toBeChecked();
  await expect(dialog.getByLabel('Valable à partir du')).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Prévisualiser' }).click();
  await expect(dialog.getByText(reference, { exact: true })).toBeVisible();
  const commitPromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
    && /\/supplier-articles\/imports\/[^/]+\/commit$/.test(
      new URL(response.url()).pathname,
    )
  ));
  await dialog.getByRole('button', { name: 'Confirmer l’import' }).click();
  const committed = await commitPromise;
  expect(committed.status()).toBe(200);
  expect((await committed.json()).data).toEqual(expect.objectContaining({
    created: 1, updated: 0, skipped: 0, priced: 1,
  }));
  await expectVisibleToast(page, 'Import des Articles terminé');
  await expect(dialog.getByText('Import terminé')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  // Les toasts Base UI ont aussi role="dialog" : isoler le contenu modal.
  await expect(page.locator('[data-slot="dialog-content"][role="dialog"]'))
    .toBeHidden();

  const { article, articleRow } = await expectImportedWorkspaceArticle(page, {
    workspaceId: workspace.workspaceId,
    reference,
    accessToken,
  });
  expect(article.supplierTariffStatus).toBe('AVAILABLE');
  expect(article.supplierTariff).toEqual(expect.objectContaining({
    sourceKind: 'PRICE_LIST',
    sourceAmount: '25.5',
    sourceBasis: 'PACKAGE',
    currency: 'EUR',
    normalizedAmount: '2.55',
    normalizedUnit: 'KG',
    validTo: null,
  }));
  expect(Date.parse(article.supplierTariff.validFrom)).not.toBeNaN();

  await expect(articleRow).toContainText('25,500');
  await expect(articleRow).not.toContainText('2,550');
  await articleRow.getByRole('button', {
    name: `Détails des prix de ${reference}`,
  }).click();
  await expect(page.getByText('2,550 € HT / kg', { exact: true }))
    .toBeVisible();
});


test('M-003 crée manuellement un Article et propose sa Référence sans quitter le parcours', async ({ page }) => {
  const workspace = await provisionSupplierOwnerWorkspace({ withProductReference: false });
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const supplierName = 'Fournisseur manuel E2E ' + suffix;
  const productName = 'Œufs blancs pasteurisés E2E ' + suffix;
  const reference = 'OVO-' + suffix;

  const token = await loginWithIdentity(page, workspace.identity);
  await page.goto(workspace.suppliersUrl);
  await createSupplierFromUi(page, supplierName);
  await page.getByRole('tab', { name: /^Articles \(/ }).click();
  await page.getByRole('button', { name: 'Créer un Article' }).click();
  const dialog = page.getByRole('dialog', { name: 'Créer un Article fournisseur' });
  await dialog.getByRole('combobox', { name: 'Sélectionner le Fournisseur' }).click();
  await page.getByRole('option', { name: supplierName }).click();
  const creationSearchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET'
      && url.pathname.endsWith('/supplier-articles/product-contributions/search')
      && url.searchParams.get('q') === productName;
  });
  await dialog.getByRole('combobox', { name: 'Rechercher un Produit' }).fill(productName);
  // La création n'est proposée qu'après une réponse de recherche M-003 autorisée
  // et réellement vide. Un HTTP 403/500 ne doit jamais valoir « aucun Produit ».
  const searched = await creationSearchResponse;
  expect(searched.status(), 'Recherche Produit contextuelle M-003').toBe(200);
  expect((await searched.json()).data.results).toEqual([]);
  await expect(page.getByRole('button', { name: 'Créer cette Référence' })).toBeVisible();
  await page.getByRole('button', { name: 'Créer cette Référence' }).click();
  const pendingReference = dialog.getByRole('status', {
    name: 'Référence Produit à créer',
  });
  await expect(pendingReference).toContainText(productName);
  await expect(dialog.getByRole('button', { name: 'Créer l’Article et la Référence' }))
    .toBeVisible();

  // La sélection est persistante : remplir les champs commerciaux ne doit
  // pas revenir silencieusement au mode « Créer l’Article ».
  await dialog.getByLabel('Référence fournisseur').fill(reference);
  await dialog.getByLabel('Désignation fournisseur').fill(productName);
  await expect(pendingReference).toContainText(productName);
  await expect(dialog.getByRole('button', { name: 'Créer l’Article et la Référence' }))
    .toBeVisible();

  const createdArticleResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'POST'
      && url.pathname.endsWith('/supplier-articles');
  });
  await dialog.getByRole('button', { name: 'Créer l’Article et la Référence' }).click();
  const createdArticle = await createdArticleResponse;
  expect(createdArticle.status(), 'Création de l’Article fournisseur M-003')
    .toBe(201);
  expect((await createdArticle.json()).data.article.productVariant)
    .toBeFalsy();

  const productDialog = page.getByRole('dialog', { name: 'Créer un Produit' });
  await expect(productDialog).toBeVisible();
  await productDialog.getByLabel('Nom du Produit').fill(productName);
  await expect(productDialog.getByText(
    /Aucun Produit existant correspondant|Produits correspondants/,
  )).toBeVisible();
  const confirmDistinct = productDialog.getByRole('checkbox', {
    name: /J’ai examiné ces Produits/,
  });
  if (await confirmDistinct.count()) await confirmDistinct.check();
  await productDialog.getByRole('button', { name: 'Soumettre la proposition' }).click();
  await expectVisibleToast(page, 'Référence Produit créée et associée');

  const response = await page.request.get(
    '/api/workspaces/' + workspace.workspaceId + '/supplier-articles',
    {
      headers: { Authorization: 'Bearer ' + token },
      params: { search: reference },
    },
  );
  expect(response.status()).toBe(200);
  const saved = (await response.json()).data.articles.find(
    (entry) => entry.supplierReference === reference,
  );
  expect(saved?.associationStatus).toBe('ASSOCIATED');
  expect(saved?.productVariant?.name).toBe(productName);
});

test('M-003 associe immédiatement une Référence provisoire créée après un import Article', async ({ page }) => {
  const workspace = await provisionSupplierOwnerWorkspace({ withProductReference: false });
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const supplierName = 'Fournisseur contribution E2E ' + suffix;
  const reference = 'CTR-' + suffix;
  const productName = 'Croissant PAI E2E ' + suffix;

  const token = await loginWithIdentity(page, workspace.identity);
  await page.goto(workspace.suppliersUrl);
  await createSupplierFromUi(page, supplierName);
  await page.getByRole('tab', { name: /^Articles \(/ }).click();
  await page.getByRole('button', { name: 'Importer des Articles' }).click();
  const importDialog = page.getByRole('dialog');
  await importDialog.getByLabel('Fichier', { exact: true }).setInputFiles({
    name: 'articles.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      'Reference;Designation;Marque',
      reference + ';Croissant individuel PAI;BRIDOR',
    ].join('\n'), 'utf8'),
  });
  const inspect = page.waitForResponse((response) => response.request().method() === 'POST'
    && response.url().includes('/supplier-articles/imports/inspect'));
  await importDialog.getByRole('button', { name: 'Analyser le fichier' }).click();
  expect((await inspect).status(), 'Inspection des Articles : vérifier ClamAV').toBe(201);
  await importDialog.getByRole('textbox', { name: 'Rechercher un Fournisseur' }).fill(supplierName);
  await importDialog.getByRole('button', { name: new RegExp('^' + supplierName + '$', 'i') }).click();
  await importDialog.getByRole('button', { name: 'Prévisualiser' }).click();
  await expect(importDialog.getByText(reference, { exact: true })).toBeVisible();
  await importDialog.getByRole('button', { name: 'Confirmer l’import' }).click();
  await expectVisibleToast(page, 'Import des Articles terminé');
  await importDialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.locator('[data-slot="dialog-content"][role="dialog"]')).toBeHidden();

  const { articleRow } = await expectImportedWorkspaceArticle(page, {
    workspaceId: workspace.workspaceId, reference, accessToken: token,
  });
  await openArticleDetails(page, articleRow, reference);
  await page.getByRole('tab', { name: 'Association' }).click();
  await page.getByRole('button', { name: 'Modifier l’association' }).click();
  const associationDialog = page.getByRole('dialog', { name: 'Modifier le Produit associé' });
  await expect(associationDialog.getByRole('button', { name: 'Créer la Référence manquante' }))
    .toHaveCount(0);
  await associationDialog.getByRole('combobox', { name: 'Rechercher un Produit' })
    .fill(productName);
  await expect(associationDialog.getByText(/Aucune Référence Produit trouvée pour/))
    .toBeVisible();
  await associationDialog.getByRole('button', { name: 'Créer la Référence manquante' }).click();
  const productDialog = page.getByRole('dialog', { name: 'Créer un Produit' });
  await productDialog.getByLabel('Nom du Produit').fill(productName);
  await expect(productDialog.getByText(
    /Aucun Produit existant correspondant|Produits correspondants/,
  )).toBeVisible();
  const confirmDistinct = productDialog.getByRole('checkbox', {
    name: /J’ai examiné ces Produits/,
  });
  if (await confirmDistinct.count()) {
    await confirmDistinct.check();
  }
  await expect(productDialog.getByRole('button', { name: 'Soumettre la proposition' })).toBeEnabled();
  await productDialog.getByRole('button', { name: 'Soumettre la proposition' }).click();

  await expectVisibleToast(page, 'Référence Produit créée et associée');
  const articles = await page.request.get(
    '/api/workspaces/' + workspace.workspaceId + '/supplier-articles',
    {
      headers: { Authorization: 'Bearer ' + token },
      params: { search: reference },
    },
  );
  expect(articles.status()).toBe(200);
  const article = (await articles.json()).data.articles.find(
    (entry) => entry.supplierReference === reference,
  );
  expect(article?.associationStatus).toBe('ASSOCIATED');
  expect(article?.productVariant?.name).toBe(productName);

  // La contribution ferme volontairement le drawer précédent. Retrouver
  // l'Article persisté après invalidation RTK Query, puis le rouvrir.
  // Ne pas forcer le drawer à rester ouvert pendant des dialogues distincts.
  await openArticleDetails(page, articleRow, reference);
  await expect(page.getByRole('tab', { name: 'Infos Article' })).toBeVisible();
  // La modification Article expose le libellé métier, sans choix d'unité en Fiche.
  await page.getByRole('tab', { name: 'Infos Article' }).click();
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  const editDialog = page.getByRole('dialog', {
    name: /Modifier les informations de : Croissant individuel PAI/,
  });
  await expect(editDialog.getByText('Nb d’unités par colis')).toBeVisible();
  await expect(editDialog.getByRole('button', { name: 'Enregistrer' })).toBeVisible();
  await expect(editDialog.getByRole('radio')).toHaveCount(0);
  await expect(editDialog.getByRole('button', {
    name: 'Informations sur la correction du conditionnement',
  })).toBeVisible();
  await editDialog.getByRole('button', { name: 'Annuler' }).click();
});
