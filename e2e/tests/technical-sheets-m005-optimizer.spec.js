import {
  expect,
  test,
} from '@playwright/test';

import {
  loginWithIdentity,
} from '../support/auth.js';
import {
  provisionTechnicalSheetWorkspace,
} from '../support/technical-sheet-fixtures.js';

async function createTechnicalSheet(page, {
  name,
  technicalSheetsUrl,
}) {
  await page.goto(technicalSheetsUrl);

  await page
    .getByRole('button', {
      name: 'Créer',
      exact: true,
    })
    .click();

  const dialog =
    page.getByRole('dialog');

  await dialog
    .getByLabel('Nom')
    .fill(name);
  await dialog
    .getByLabel(
      'Quantité produite',
    )
    .fill('10');
  await dialog
    .getByRole('button', {
      name: '10 %',
    })
    .click();
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
}

async function composeTechnicalSheet(
  page,
  productReferenceName,
) {
  const search =
    page.getByRole('combobox', {
      name:
        'Ajouter un produit aux Ingrédients',
    });

  await search.fill(
    productReferenceName,
  );

  await page
    .getByRole('option')
    .filter({
      hasText:
        productReferenceName,
    })
    .first()
    .click();

  const saveResponse =
    page.waitForResponse((response) => {
      const request =
        response.request();
      const pathname =
        new URL(
          response.url(),
        ).pathname;

      if (
        request.method() !== 'PUT'
        || !pathname
          .endsWith('/draft')
      ) {
        return false;
      }

      try {
        return request
          .postDataJSON()
          ?.lines
          ?.some(
            (line) =>
              line.netQuantity
              === '2',
          );
      } catch {
        return false;
      }
    });

  await page
    .getByLabel(
      'Quantité nette ligne 1',
    )
    .fill('2');

  expect(
    (await saveResponse).ok(),
  ).toBeTruthy();

  await expect(
    page.getByRole(
      'status',
      {
        name:
          'État d’enregistrement du brouillon',
      },
    ),
  ).toContainText(
    'Enregistré',
  );
}

async function configureReduction(page) {
  const minimum =
    page.getByLabel(
      'Minimum',
    ).first();

  await minimum.fill('1');

  const highPressure =
    page.getByRole(
      'slider',
      {
        name:
          'Pression Très forte',
      },
    ).first();

  await highPressure.focus();
  await highPressure.press('Home');

  await expect(
    page.getByRole('button', {
      name:
        'Appliquer au brouillon',
    }),
  ).toBeEnabled();
}

test('M-005 simule sans écrire puis applique explicitement au brouillon', async ({ page }) => {
  const context =
    await provisionTechnicalSheetWorkspace({
      optimizerEnabled: true,
    });

  await loginWithIdentity(
    page,
    context.identity,
  );

  await createTechnicalSheet(
    page,
    {
      name:
        'Fiche M005 Optimiseur',
      technicalSheetsUrl:
        context
          .dossierATechnicalSheetsUrl,
    },
  );

  await composeTechnicalSheet(
    page,
    context.productReferenceName,
  );

  await expect(
    page.getByRole(
      'button',
      {
        name: 'Optimiser',
      },
    ),
  ).toBeVisible();

  await page
    .getByRole(
      'button',
      {
        name: 'Optimiser',
      },
    )
    .click();

  await expect(
    page.getByText(
      'Atelier d’optimisation',
      { exact: true },
    ),
  ).toBeVisible();

  await configureReduction(
    page,
  );

  const ingredientRow =
    page.getByRole('row')
      .filter({
        hasText:
          context
            .productReferenceName,
      });

  await expect(
    ingredientRow,
  ).toContainText('2 → 1');

  await page.reload();

  await expect(
    page.getByText(
      'Atelier d’optimisation',
      { exact: true },
    ),
  ).toBeVisible();

  const reloadedRow =
    page.getByRole('row')
      .filter({
        hasText:
          context
            .productReferenceName,
      });

  await expect(
    reloadedRow,
  ).toContainText('2 → 2');

  await configureReduction(
    page,
  );

  await page
    .getByRole('button', {
      name:
        'Appliquer au brouillon',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name:
        'Fiche M005 Optimiseur',
    }),
  ).toBeVisible();

  await expect(
    page.getByLabel(
      'Quantité nette ligne 1',
    ),
  ).toHaveValue('1');
});
