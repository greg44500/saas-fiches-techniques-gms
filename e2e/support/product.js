import { expect } from '@playwright/test';

async function selectProductAutocompleteResult(
  page,
  {
    inputName,
    query,
    expectedText = query,
  },
) {
  const search = page.getByRole('combobox', {
    name: inputName,
  });

  await expect(search).toBeVisible();
  await search.fill(query);

  const option = page.getByRole('option')
    .filter({
      hasText: expectedText,
    })
    .first();

  await expect(option).toBeVisible();
  await option.click();

  await expect(search).toHaveValue(expectedText);

  return option;
}

async function selectGlobalProductReference(
  page,
  productName,
) {
  return selectProductAutocompleteResult(
    page,
    {
      inputName:
        'Rechercher un Produit global',
      query: productName,
      expectedText: productName,
    },
  );
}

async function selectWorkspaceProductReference(
  page,
  productName,
) {
  return selectProductAutocompleteResult(
    page,
    {
      inputName:
        'Rechercher un Produit',
      query: productName,
      expectedText: productName,
    },
  );
}

export {
  selectGlobalProductReference,
  selectProductAutocompleteResult,
  selectWorkspaceProductReference,
};
