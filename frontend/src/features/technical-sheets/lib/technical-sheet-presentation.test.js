import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  basisPointsToInput,
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
  formatSignedBasisPointDelta,
  getLineValuationPresentation,
  getTechnicalSheetActionAvailability,
  getTechnicalSheetStatusPresentation,
  getTechnicalSheetValuationAttentionPresentation,
  getTechnicalSheetValuationPresentation,
  percentInputToBasisPoints,
  priceInputToMinor,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

describe('technical sheet presentation', () => {
  it('traduit les statuts techniques depuis les définitions backend', () => {
    const statusDefinitions = [
      { value: 'ARCHIVED', label: 'Archivée', tone: 'archived' },
    ];
    const valuationDefinitions = [
      { value: 'NOT_VALUED', label: 'Non valorisée', tone: 'alert' },
      { value: 'STALE', label: 'Calcul à actualiser', tone: 'warning' },
    ];
    const lineDefinitions = [
      { value: 'NO_PRICE', label: 'Prix indisponible', tone: 'destructive' },
    ];

    expect(
      getTechnicalSheetStatusPresentation('ARCHIVED', statusDefinitions),
    ).toMatchObject({
      label: 'Archivée',
      tone: 'archived',
    });

    expect(
      getTechnicalSheetValuationPresentation('NOT_VALUED', valuationDefinitions),
    ).toMatchObject({
      label: 'Non valorisée',
      tone: 'alert',
    });

    expect(
      getLineValuationPresentation('NO_PRICE', lineDefinitions),
    ).toMatchObject({
      label: 'Prix indisponible',
      tone: 'destructive',
    });

    expect(
      getTechnicalSheetValuationPresentation('STALE', valuationDefinitions),
    ).toMatchObject({
      label: 'Calcul à actualiser',
      tone: 'warning',
    });
  });

  it('masque la valorisation complète et conserve uniquement les états nécessitant une attention', () => {
    const definitions = [
      {
        value: 'COMPLETE',
        label: 'Valorisée',
        tone: 'success',
        validationEligible: true,
      },
      {
        value: 'PARTIAL',
        label: 'Valorisation incomplète',
        tone: 'warning',
        validationEligible: false,
      },
      {
        value: 'STALE',
        label: 'Calcul à actualiser',
        tone: 'warning',
        validationEligible: false,
      },
    ];

    expect(
      getTechnicalSheetValuationAttentionPresentation(
        'COMPLETE',
        definitions,
      ),
    ).toBeNull();

    expect(
      getTechnicalSheetValuationAttentionPresentation(
        'PARTIAL',
        definitions,
      ),
    ).toMatchObject({
      label: 'Valorisation incomplète',
      tone: 'warning',
    });

    expect(
      getTechnicalSheetValuationAttentionPresentation(
        'STALE',
        definitions,
      ),
    ).toMatchObject({
      label: 'Calcul à actualiser',
      tone: 'warning',
    });
  });

  it('retombe sur la valeur technique si une définition backend manque', () => {
    expect(
      getTechnicalSheetStatusPresentation('UNKNOWN', []),
    ).toMatchObject({
      label: 'UNKNOWN',
      tone: 'neutral',
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

  it('formate les écarts de marge en points avec un sens visuel', () => {
    expect(formatSignedBasisPointDelta(1045)).toBe('↑ 10,45 points');
    expect(formatSignedBasisPointDelta(-420)).toBe('↓ 4,2 points');
    expect(formatSignedBasisPointDelta(0)).toBe('— 0 point');
    expect(formatSignedBasisPointDelta(null)).toBe('NC');
  });

  it('distingue les montants non calculables d’un vrai zéro', () => {
    expect(formatDecimalCurrency(null)).toBe('NC');
    expect(formatMinorCurrency(null)).toBe('NC');
    expect(formatDecimalCurrency('0')).toMatch(/0,00/);
    expect(formatMinorCurrency(0)).toMatch(/0,00/);
  });

  it('convertit le Prix utilisateur en unité monétaire mineure', () => {
    expect(priceInputToMinor('12,50')).toBe(1250);
    expect(formatMinorCurrency(1250)).toMatch(/12,50/);
  });
});
