import {
  expect,
  test,
} from '@playwright/test';

import {
  loginWithIdentity,
} from '../support/auth.js';
import {
  provisionTechnicalSheetWorkspace,
  replaceDossierNegotiatedPrice,
} from '../support/technical-sheet-fixtures.js';
import {
  expectVisibleToast,
} from '../support/toast.js';

async function createTechnicalSheet(page, {
  name,
  technicalSheetsUrl,
}) {
  await page.goto(technicalSheetsUrl);

  await expect(
    page.getByRole('heading', {
      name: 'Fiches techniques',
    }),
  ).toBeVisible();

  const createButton =
    page.getByRole('button', {
      name: 'Créer',
      exact: true,
    });

  await expect(createButton).toBeEnabled();
  await createButton.click();

  const dialog =
    page.getByRole('dialog');

  await dialog
    .getByLabel('Nom')
    .fill(name);
  await dialog
    .getByRole('button', {
      name: 'Créer',
      exact: true,
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name,
    }),
  ).toBeVisible();

  return {
    detailUrl:
      new URL(page.url()).pathname,
  };
}

async function composeTechnicalSheet(page, {
  productReferenceName,
}) {
  await page
    .getByRole('textbox', {
      name: 'Quantité',
      exact: true,
    })
    .fill('10');

  await page
    .getByRole('combobox', {
      name: 'Unité de production',
    })
    .click();
  await page
    .getByRole('option', {
      name: 'kg',
      exact: true,
    })
    .click();

  await page
    .getByLabel('Portion(s)')
    .fill('20');
  await page
    .getByLabel('TVA (%)')
    .fill('10');
  await page
    .getByLabel('Marge cible (%)')
    .fill('50');

  const productSearch =
    page.getByRole('combobox', {
      name: 'Ajouter un produit aux Ingrédients',
    });

  await productSearch.fill(
    productReferenceName,
  );

  const result =
    page.getByRole('option')
      .filter({
        hasText:
          productReferenceName,
      })
      .first();

  await expect(result).toBeVisible();
  await result.click();

  await page
    .getByLabel(
      'Quantité nette ligne 1',
    )
    .fill('2');

  const autosaveStatus = page.getByRole('status', {
    name: 'État d’enregistrement du brouillon',
  });

  await expect(autosaveStatus).toContainText('Enregistrement…');
  await expect(autosaveStatus).toContainText('Enregistré');
}

async function expectTechnicalSheetCapacity(page, {
  dashboardUrl,
  expected,
  inDossiers,
  inTrash,
}) {
  await page.goto(dashboardUrl);

  const capacityRegion = page.getByRole('region', {
    name: 'Capacité des Fiches techniques',
  });

  await expect(capacityRegion).toBeVisible();
  await expect(
    capacityRegion.getByText(expected, { exact: true }),
  ).toBeVisible();

  if (Number.isInteger(inDossiers)) {
    const dossierMetric = capacityRegion
      .getByText('Dans les Dossiers', { exact: true })
      .locator('..');
    await expect(
      dossierMetric.getByText(String(inDossiers), { exact: true }),
    ).toBeVisible();
  }

  if (Number.isInteger(inTrash)) {
    const trashMetric = capacityRegion
      .getByText('Dans la Corbeille', { exact: true })
      .locator('..');
    await expect(
      trashMetric.getByText(String(inTrash), { exact: true }),
    ).toBeVisible();
  }

  return capacityRegion;
}

async function openInformationDrawer(page) {
  const openButton = page.getByRole('button', {
    name: 'Ouvrir les informations de la Fiche',
  });

  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click();
  }

  await expect(
    page.getByRole('heading', {
      name: 'Informations de la Fiche',
    }),
  ).toBeVisible();
}

async function valuateAndValidate(page, {
  comment = null,
}) {
  const valuateButton =
    page.getByRole('button', {
      name: /^(Valoriser|Revaloriser)$/,
    });

  await valuateButton.click();

  await expectVisibleToast(
    page,
    'Fiche technique valorisée',
  );

  if (comment) {
    await openInformationDrawer(page);

    await page
      .getByLabel(
        'Commentaire de validation',
      )
      .fill(comment);

    await page.getByRole('button', {
      name: 'Fermer',
    }).click();
  }

  await page
    .getByRole('button', {
      name:
        'Valider la Fiche technique',
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique validée',
  );

  await expect(
    page.getByText(
      'Aucun brouillon n’est ouvert.',
      { exact: false },
    ),
  ).toBeVisible();
}

test('M-004 une Référence Produit globale non favorite reste composable et valorisable', async ({ page }) => {
  const context =
    await provisionTechnicalSheetWorkspace({
      favoriteProduct: false,
    });

  await loginWithIdentity(
    page,
    context.identity,
  );

  await createTechnicalSheet(page, {
    name:
      'Fiche M004 Produit global',
    technicalSheetsUrl:
      context.dossierATechnicalSheetsUrl,
  });

  await expect(
    page.getByRole('button', {
      name: 'Tous les produits',
    }),
  ).toHaveAttribute('aria-pressed', 'true');

  await composeTechnicalSheet(page, {
    productReferenceName:
      context.productReferenceName,
  });

  await expect(
    page.getByText(
      context.productReferenceName,
      { exact: true },
    ).first(),
  ).toBeVisible();

  await valuateAndValidate(page, {
    comment:
      'Référence globale non favorite',
  });
});

test('M-004 ambiguïté Article, changement de prix, revalorisation puis validation', async ({ page }) => {
  const context =
    await provisionTechnicalSheetWorkspace({
      ambiguous: true,
    });

  await loginWithIdentity(
    page,
    context.identity,
  );

  await createTechnicalSheet(page, {
    name:
      'Fiche M004 Ambiguïté',
    technicalSheetsUrl:
      context.dossierATechnicalSheetsUrl,
  });

  await composeTechnicalSheet(page, {
    productReferenceName:
      context.productReferenceName,
  });

  await page
    .getByRole('button', {
      name: 'Valoriser',
      exact: true,
    })
    .click();

  await expectVisibleToast(
    page,
    'Valorisation incomplète',
  );

  await page
    .getByRole('button', {
      name:
        'Actions pour '
        + context.productReferenceName,
    })
    .click();

  await page
    .getByRole('button', {
      name: 'Choisir un Article fournisseur',
    })
    .click();

  const articleSelect =
    page.getByRole('dialog')
      .getByRole('combobox', {
        name:
          'Article fournisseur pour '
          + context.productReferenceName,
      });

  await articleSelect.click();

  await page
    .getByRole('option')
    .filter({
      hasText:
        context.articleReference,
    })
    .first()
    .click();

  await page
    .getByRole('button', {
      name: 'Revaloriser',
      exact: true,
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique valorisée',
  );

  await replaceDossierNegotiatedPrice({
    workspaceId:
      context.workspaceId,
    dossierId:
      context.dossierA.id,
    articleId:
      context.articleId,
    sourceAmount:
      '12',
  });

  await page
    .getByRole('button', {
      name:
        'Valider la Fiche technique',
    })
    .click();

  await expectVisibleToast(
    page,
    'Les données économiques ont changé. Une revalorisation est obligatoire.',
  );

  await page.reload();

  await expect(
    page.getByText(
      'À revaloriser',
      { exact: true },
    ).first(),
  ).toBeVisible();

  await page
    .getByRole('button', {
      name: 'Revaloriser',
      exact: true,
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique valorisée',
  );

  await openInformationDrawer(page);

  await page
    .getByLabel(
      'Commentaire de validation',
    )
    .fill(
      'Validation après revalorisation',
    );

  await page.getByRole('button', {
    name: 'Fermer',
  }).click();

  await page
    .getByRole('button', {
      name:
        'Valider la Fiche technique',
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique validée',
  );

  await openInformationDrawer(page);

  await page.getByRole('tab', {
    name: 'Historique',
  }).click();

  await expect(
    page.getByText(
      'Validation après revalorisation',
      { exact: true },
    ),
  ).toBeVisible();
});

test('M-004 copie A vers B sans finance source et valorise avec le prix du Dossier cible', async ({ page }) => {
  const context =
    await provisionTechnicalSheetWorkspace({
      targetMarginBasisPoints: 6000,
    });

  await loginWithIdentity(
    page,
    context.identity,
  );

  await createTechnicalSheet(page, {
    name:
      'Fiche M004 Copie',
    technicalSheetsUrl:
      context.dossierATechnicalSheetsUrl,
  });

  await composeTechnicalSheet(page, {
    productReferenceName:
      context.productReferenceName,
  });

  await valuateAndValidate(page, {
    comment:
      'Source validée avant copie',
  });

  await page
    .getByRole('button', {
      name:
        'Copier vers un autre Dossier',
    })
    .click();

  const dialog =
    page.getByRole('dialog');

  await dialog
    .getByRole('combobox', {
      name: 'Dossier cible',
    })
    .click();

  await page
    .getByRole('option', {
      name:
        context.dossierB.name,
      exact: true,
    })
    .click();

  await dialog
    .getByRole('button', {
      name: 'Copier',
      exact: true,
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name:
        'Fiche M004 Copie',
    }),
  ).toBeVisible();

  await expect(
    page.getByLabel(
      'Marge cible (%)',
    ),
  ).toHaveValue('60');

  await page
    .getByRole('button', {
      name: 'Valoriser',
      exact: true,
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique valorisée',
  );

  await expect(
    page.getByText(/40,00/).first(),
  ).toBeVisible();
});

test('M-004 quota atteint bloque création et copie mais autorise la modification', async ({ page }) => {
  const context =
    await provisionTechnicalSheetWorkspace({
      technicalSheetLimit: 1,
    });

  await loginWithIdentity(
    page,
    context.identity,
  );

  const { detailUrl } =
    await createTechnicalSheet(page, {
      name:
        'Fiche M004 Quota',
      technicalSheetsUrl:
        context.dossierATechnicalSheetsUrl,
    });

  await composeTechnicalSheet(page, {
    productReferenceName:
      context.productReferenceName,
  });

  await valuateAndValidate(page, {
    comment:
      'Validation avant contrôle du quota',
  });

  await openInformationDrawer(page);

  await page
    .getByLabel(
      'Description',
    )
    .fill(
      'Modification autorisée à la limite',
    );

  await page
    .getByRole('button', {
      name:
        'Enregistrer les informations',
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique mise à jour',
  );

  await expectTechnicalSheetCapacity(page, {
    dashboardUrl: context.dashboardUrl,
    expected: '1 / 1',
    inDossiers: 1,
    inTrash: 0,
  });

  await page.goto(
    context.dossierATechnicalSheetsUrl,
  );

  await expect(
    page.getByRole('button', {
      name: 'Créer',
      exact: true,
    }),
  ).toBeDisabled();

  await page.goto(detailUrl);

  const copyButton = page.getByRole('button', {
    name:
      'Copier vers un autre Dossier',
  });
  await expect(copyButton).toBeEnabled();
  await copyButton.click();

  const dialog =
    page.getByRole('dialog');

  await dialog
    .getByRole('combobox', {
      name: 'Dossier cible',
    })
    .click();
  await page
    .getByRole('option', {
      name:
        context.dossierB.name,
      exact: true,
    })
    .click();
  await dialog
    .getByRole('button', {
      name: 'Copier',
      exact: true,
    })
    .click();

  await expect(
    dialog.getByRole('alert'),
  ).toContainText(
    /limite technical_sheets.*atteinte/i,
  );
});

test('M-004 corbeille conserve le quota, restauration le conserve et purge le libère', async ({ page }) => {
  const context =
    await provisionTechnicalSheetWorkspace();

  await loginWithIdentity(
    page,
    context.identity,
  );

  const { detailUrl } =
    await createTechnicalSheet(page, {
      name:
        'Fiche M004 Corbeille',
      technicalSheetsUrl:
        context.dossierATechnicalSheetsUrl,
    });

  await page
    .getByRole('button', {
      name:
        'Mettre la Fiche dans la Corbeille',
      exact: true,
    })
    .click();

  let confirmation =
    page.getByRole('dialog');

  await confirmation
    .getByRole('button', {
      name:
        'Mettre dans la corbeille',
      exact: true,
    })
    .click();

  await expect(page).toHaveURL(
    context.dossierATechnicalSheetsUrl,
  );

  let capacityRegion =
    await expectTechnicalSheetCapacity(page, {
      dashboardUrl: context.dashboardUrl,
      expected: '1 / 10',
      inDossiers: 0,
      inTrash: 1,
    });

  await capacityRegion
    .getByRole('link', {
      name: 'Voir la Corbeille',
    })
    .click();

  await page
    .getByRole('button', {
      name: 'Restaurer',
      exact: true,
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique restaurée',
  );

  await expectTechnicalSheetCapacity(page, {
    dashboardUrl: context.dashboardUrl,
    expected: '1 / 10',
    inDossiers: 1,
    inTrash: 0,
  });

  await page.goto(detailUrl);

  await page
    .getByRole('button', {
      name:
        'Mettre la Fiche dans la Corbeille',
      exact: true,
    })
    .click();

  confirmation =
    page.getByRole('dialog');

  await confirmation
    .getByRole('button', {
      name:
        'Mettre dans la corbeille',
      exact: true,
    })
    .click();

  await expect(page).toHaveURL(
    context.dossierATechnicalSheetsUrl,
  );

  capacityRegion =
    await expectTechnicalSheetCapacity(page, {
      dashboardUrl: context.dashboardUrl,
      expected: '1 / 10',
      inDossiers: 0,
      inTrash: 1,
    });

  await capacityRegion
    .getByRole('link', {
      name: 'Voir la Corbeille',
    })
    .click();

  await page
    .getByRole('button', {
      name: 'Supprimer définitivement',
      exact: true,
    })
    .click();

  confirmation =
    page.getByRole('dialog');

  await confirmation
    .getByRole('button', {
      name: 'Supprimer définitivement',
      exact: true,
    })
    .click();

  await expectVisibleToast(
    page,
    'Fiche technique supprimée définitivement',
  );

  await expectTechnicalSheetCapacity(page, {
    dashboardUrl: context.dashboardUrl,
    expected: '0 / 10',
    inDossiers: 0,
    inTrash: 0,
  });
});
