import { describe, expect, it, vi } from 'vitest';

import {
  GEOPLATEFORME_MAX_RESPONSES,
  normalizeGeoplateformeSuggestion,
  searchGeoplateformeAddresses,
  stripLocalitySuffix,
} from '@/features/dossiers/services/geoplateforme-address-provider';

describe('Géoplateforme address provider', () => {
  it('construit une requête StreetAddress limitée à huit réponses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            fulltext: '10 rue de la Paix, 75002 Paris',
            city: 'Paris',
            zipcode: '75002',
            street: 'rue de la Paix',
            country: 'StreetAddress',
            x: 2.33,
            y: 48.87,
          },
        ],
      }),
    });

    const result = await searchGeoplateformeAddresses(
      '10 rue de la Paix',
      { fetchImpl },
    );

    const [url, options] = fetchImpl.mock.calls[0];

    expect(url).toContain('text=10+rue+de+la+Paix');
    expect(url).toContain('type=StreetAddress');
    expect(url).toContain(
      `maximumResponses=${GEOPLATEFORME_MAX_RESPONSES}`,
    );
    expect(options.method).toBe('GET');
    expect(result[0]).toEqual(expect.objectContaining({
      label: '10 rue de la Paix, 75002 Paris',
      address: '10 rue de la Paix',
      postalCode: '75002',
      city: 'Paris',
    }));
  });

  it('ignore une réponse qui ne représente pas une adresse', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            fulltext: 'Paris',
            country: 'PositionOfInterest',
          },
        ],
      }),
    });

    await expect(
      searchGeoplateformeAddresses('Paris', { fetchImpl }),
    ).resolves.toEqual([]);
  });

  it('normalise sans dépendre de coordonnées persistées', () => {
    expect(stripLocalitySuffix(
      '1 avenue Exemple, 44000 Nantes',
      '44000',
      'Nantes',
    )).toBe('1 avenue Exemple');

    expect(normalizeGeoplateformeSuggestion({
      fulltext: 'Rue Exemple, 44000 Nantes',
      street: 'Rue Exemple',
      zipcode: '44000',
      city: 'Nantes',
    }, 0)).toEqual(expect.objectContaining({
      address: 'Rue Exemple',
      postalCode: '44000',
      city: 'Nantes',
    }));
  });
});
