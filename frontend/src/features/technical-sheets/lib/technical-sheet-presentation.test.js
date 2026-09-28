import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  basisPointsToInput,
  formatBasisPoints,
  formatMinorCurrency,
  getLineValuationPresentation,
  getTechnicalSheetStatusPresentation,
  percentInputToBasisPoints,
  priceInputToMinor,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

describe('technical sheet presentation', () => {
  it('traduit les statuts techniques sans exposer leur valeur brute', () => {
    expect(
      getTechnicalSheetStatusPresentation('ARCHIVED'),
    ).toMatchObject({
      label: 'Archivée',
      tone: 'neutral',
    });

    expect(
      getLineValuationPresentation('NO_PRICE'),
    ).toMatchObject({
      label: 'Prix indisponible',
      tone: 'destructive',
    });
  });

  it('convertit les basis points pour les formulaires', () => {
    expect(basisPointsToInput(7250)).toBe('72.5');
    expect(percentInputToBasisPoints('72,5')).toBe(7250);
    expect(formatBasisPoints(7250)).toBe('72,5 %');
  });

  it('convertit le Prix utilisateur en unité monétaire mineure', () => {
    expect(priceInputToMinor('12,50')).toBe(1250);
    expect(formatMinorCurrency(1250)).toMatch(/12,50/);
  });
});
