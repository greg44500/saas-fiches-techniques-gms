import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom n'implémente pas ResizeObserver alors que certains primitives Radix
 * l'utilisent pour mesurer leur géométrie. Ce stub reproduit uniquement le
 * contrat navigateur nécessaire aux tests de composants, sans simuler de
 * dimensions arbitraires.
 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}

/**
 * jsdom ne calcule aucun layout et retourne donc une géométrie 0 × 0 pour
 * les éléments interactifs. Base UI utilise cette mesure pour décider si
 * l'ancre d'un Select est visible ; avec un rectangle nul, le popup peut se
 * refermer immédiatement et rendre les tests aléatoires.
 *
 * Le fallback reste volontairement limité aux combobox visibles et ne
 * remplace une vraie géométrie que lorsque jsdom retourne 0 × 0.
 */
const nativeGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
  const rect = nativeGetBoundingClientRect.call(this);

  if (
    this.getAttribute('role') === 'combobox'
    && rect.width === 0
    && rect.height === 0
  ) {
    return DOMRect.fromRect({
      x: 24,
      y: 24,
      width: 240,
      height: 40,
    });
  }

  return rect;
};

afterEach(() => {
  cleanup();
});
