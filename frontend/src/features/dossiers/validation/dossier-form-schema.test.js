import { describe, expect, it } from 'vitest';

import {
  buildDossierFormDefaults,
  buildDossierFormPayload,
  dossierFormSchema,
} from '@/features/dossiers/validation/dossier-form-schema';

describe('dossier form contract', () => {
  it('normalise les champs optionnels vides en null et conserve le nom', () => {
    expect(buildDossierFormPayload({
      name: '  Nantes Centre  ',
      brand: ' ',
      locationAddress: '',
      locationPostalCode: '',
      locationCity: '',
      documentEmail: '',
      phone: '',
      contactName: '',
    })).toEqual({
      name: 'Nantes Centre',
      brand: null,
      location: null,
      documentEmail: null,
      phone: null,
      contactName: null,
    });
  });

  it('construit une localisation partielle compatible avec le backend', () => {
    expect(buildDossierFormPayload({
      name: 'Nantes',
      brand: '',
      locationAddress: '1 rue Exemple',
      locationPostalCode: '',
      locationCity: 'Nantes',
      documentEmail: '',
      phone: '',
      contactName: '',
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
    })).toEqual({
      name: 'Saint-Nazaire',
      brand: 'Leclerc',
      locationAddress: '',
      locationPostalCode: '44600',
      locationCity: 'Saint-Nazaire',
      documentEmail: '',
      phone: '0200000000',
      contactName: '',
    });
  });

  it('refuse un nom vide et un email invalide', () => {
    const result = dossierFormSchema.safeParse({
      name: '',
      brand: '',
      locationAddress: '',
      locationPostalCode: '',
      locationCity: '',
      documentEmail: 'incorrect',
      phone: '',
      contactName: '',
    });

    expect(result.success).toBe(false);
  });
});
