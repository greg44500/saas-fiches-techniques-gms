import {
  expect,
} from '@playwright/test';

/**
 * Vérifie une notification applicative réellement rendue dans le viewport.
 *
 * Base UI duplique le contenu des toasts dans des live regions ARIA pour les
 * technologies d’assistance. Les E2E métier doivent donc cibler la surface
 * applicative explicite plutôt que le texte global du document.
 */
async function expectVisibleToast(
  page,
  text,
) {
  const toast =
    page.locator('[data-slot="toast"]')
      .filter({
        hasText: text,
      });

  await expect(toast).toHaveCount(1);
  await expect(toast).toBeVisible();
  await expect(
    toast.getByText(
      text,
      { exact: true },
    ),
  ).toBeVisible();

  return toast;
}

export {
  expectVisibleToast,
};
