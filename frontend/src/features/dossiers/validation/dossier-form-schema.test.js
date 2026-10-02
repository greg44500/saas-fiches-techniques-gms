import { describe, expect, it } from 'vitest';

import {
  buildDossierFormDefaults,
  buildDossierFormPayload,
  dossierFormSchema,
} from '@/features/dossiers/validation/dossier-form-schema';

const emptyOptionalFields = {
  brand: '',
  locationAddress: '',
  locationPostalCode: '',
  locationCity: '',
  documentEmail: '',
  phone: '',
  contactName: '',
};

describe('dossier form contract', () => {
  it('normalise les champs optionnels vides en null et conserve le nom', () => {
    expect(buildDossierFormPayload({
      name: '  Nantes Centre  ',
      ...emptyOptionalFields,
      defaultTargetMargin: '',
    })).toEqual({
      name: 'Nantes Centre',
      brand: null,
      location: null,
      documentEmail: null,
      phone: null,
      contactName: null,
    });
  });

  it('ajoute la marge cible en points de base lors de la création', () => {
    expect(buildDossierFormPayload({
      name: 'Nantes Centre',
      ...emptyOptionalFields,
      defaultTargetMargin: '30,5',
    }, {
      includeDefaultTargetMargin: true,
    })).toEqual({
      name: 'Nantes Centre',
      brand: null,
      location: null,
      documentEmail: null,
      phone: null,
      contactName: null,
      defaultTargetMarginBasisPoints: 3050,
    });
  });

  it('construit une localisation partielle compatible avec le backend', () => {
    expect(buildDossierFormPayload({
      name: 'Nantes',
      ...emptyOptionalFields,
      locationAddress: '1 rue Exemple',
      locationCity: 'Nantes',
      defaultTargetMargin: '',
    }).location).toEqual({
      address: '1 rue Exemple',
      postalCode: null,
      city: 'Nantes',
    });
  });

  it('reconstruit les valeurs d’édition depuis un dossier existant', () => {
    expect(buildDossierFormDefaults({
      name: 'Saint-Nazaire',
      brand: 'Leclerc',
      location: {
        address: null,
        postalCode: '44600',
        city: 'Saint-Nazaire',
      },
      documentEmail: null,
      phone: '0200000000',
      contactName: null,
      technicalSheetSettings: {
        defaultTargetMarginBasisPoints: 3000,
      },
    })).toEqual({
      name: 'Saint-Nazaire',
      brand: 'Leclerc',
      locationAddress: '',
      locationPostalCode: '44600',
      locationCity: 'Saint-Nazaire',
      documentEmail: '',
      phone: '0200000000',
      contactName: '',
      defaultTargetMargin: '30',
    });
  });

  it('refuse un nom vide, un email invalide ou une marge hors bornes', () => {
    const invalidIdentity = dossierFormSchema.safeParse({
      name: '',
      ...emptyOptionalFields,
      documentEmail: 'incorrect',
      defaultTargetMargin: '100',
    });

    expect(invalidIdentity.success).toBe(false);

    expect(dossierFormSchema.safeParse({
      name: 'Nantes',
      ...emptyOptionalFields,
      defaultTargetMargin: '30',
    }).success).toBe(true);
  });
});
