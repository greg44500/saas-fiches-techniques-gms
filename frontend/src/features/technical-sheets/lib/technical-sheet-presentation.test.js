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
  getTechnicalSheetActionAvailability,
  getTechnicalSheetStatusPresentation,
  getTechnicalSheetValuationPresentation,
  percentInputToBasisPoints,
  priceInputToMinor,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

describe('technical sheet presentation', () => {
  it('traduit les statuts techniques sans exposer leur valeur brute', () => {
    expect(
      getTechnicalSheetStatusPresentation('ARCHIVED'),
    ).toMatchObject({
      label: 'Archivée',
      tone: 'archived',
    });

    expect(
      getTechnicalSheetValuationPresentation('NOT_VALUED'),
    ).toMatchObject({
      label: 'Non valorisée',
      tone: 'alert',
    });

    expect(
      getLineValuationPresentation('NO_PRICE'),
    ).toMatchObject({
      label: 'Prix indisponible',
      tone: 'destructive',
    });

    expect(
      getTechnicalSheetValuationPresentation('STALE'),
    ).toMatchObject({
      label: 'Calcul à actualiser',
      tone: 'warning',
    });
  });

  it('désactive la copie tant qu’un brouillon est ouvert', () => {
    expect(getTechnicalSheetActionAvailability({
      status: 'ACTIVE',
      hasDraft: true,
    })).toEqual({
      update: true,
      copy: false,
      archive: true,
      reactivate: false,
      delete: true,
    });

    expect(getTechnicalSheetActionAvailability({
      status: 'ARCHIVED',
      hasDraft: false,
    })).toEqual({
      update: false,
      copy: true,
      archive: false,
      reactivate: true,
      delete: true,
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
