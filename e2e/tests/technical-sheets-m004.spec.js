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
    .getByLabel('Quantité')
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
    .getByLabel('Portions')
    .fill('20');
  await page
    .getByLabel('TVA (%)')
    .fill('10');
  await page
    .getByLabel('Marge cible (%)')
    .fill('50');

  const productSearch =
    page.getByRole('combobox', {
      name: 'Rechercher un Produit',
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

  await page
    .getByRole('button', {
      name: 'Enregistrer le brouillon',
    })
    .click();

  await expectVisibleToast(
    page,
    'Brouillon enregistré',
  );
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
    await page
      .getByLabel(
        'Commentaire de validation',
      )
      .fill(comment);
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

  const articleSelect =
    page.getByRole('combobox', {
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

  await page
    .getByLabel(
      'Commentaire de validation',
    )
    .fill(
      'Validation après revalorisation',
    );

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

  await page.goto(
    context.dossierATechnicalSheetsUrl,
  );

  await expect(
    page.getByText(
      '1 / 1',
      { exact: true },
    ),
  ).toBeVisible();

  await expect(
    page.getByRole('button', {
      name: 'Créer',
      exact: true,
    }),
  ).toBeDisabled();

  await page.goto(detailUrl);

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
        'Mettre dans la corbeille',
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

  await page
    .getByRole('link', {
      name: 'Corbeille',
    })
    .click();

  await expect(
    page.getByText(
      '1 / 10',
      { exact: true },
    ),
  ).toBeVisible();

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

  await page.goto(detailUrl);

  await page
    .getByRole('button', {
      name:
        'Mettre dans la corbeille',
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

  await page
    .getByRole('link', {
      name: 'Corbeille',
    })
    .click();

  await expect(
    page.getByText(
      '1 / 10',
      { exact: true },
    ),
  ).toBeVisible();

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

  await expect(
    page.getByText(
      '0 / 10',
      { exact: true },
    ),
  ).toBeVisible();
});
