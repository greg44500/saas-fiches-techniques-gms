import { describe, expect, it } from 'vitest';

import {
  createDossierMetadataLabelMaps,
  formatDossierLocation,
  getDossierStatusLabel,
  getDossierStatusTone,
  transitionNeedsReason,
} from '@/features/dossiers/lib/dossier-presentation';

const metadata = {
  dossierStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PAUSED', label: 'En pause' },
  ],
  businessActivityActions: [
    { value: 'DOSSIER_CREATED', label: 'Dossier créé' },
  ],
};

describe('dossier presentation', () => {
  it('utilise les labels issus des metadata backend', () => {
    const maps = createDossierMetadataLabelMaps(metadata);

    expect(maps.statuses.get('ACTIVE')).toBe('Actif');
    expect(maps.activities.get('DOSSIER_CREATED')).toBe('Dossier créé');
    expect(getDossierStatusLabel('PAUSED', metadata)).toBe('En pause');
  });

  it('limite le mapping local à la sémantique visuelle des badges', () => {
    expect(getDossierStatusTone('ACTIVE')).toBe('success');
    expect(getDossierStatusTone('PAUSED')).toBe('warning');
    expect(getDossierStatusTone('ARCHIVED')).toBe('neutral');
    expect(getDossierStatusTone('DELETED')).toBe('destructive');
  });

  it('formate la localisation sans inventer de donnée', () => {
    expect(formatDossierLocation({
      location: {
        address: '1 rue Exemple',
        postalCode: '44000',
        city: 'Nantes',
      },
    })).toBe('1 rue Exemple, 44000 Nantes');

    expect(formatDossierLocation({ location: null })).toBe('Non renseignée');
  });

  it('n’exige une raison que pour suppression et restauration depuis supprimé', () => {
    expect(transitionNeedsReason('ACTIVE', 'DELETED')).toBe(true);
    expect(transitionNeedsReason('DELETED', 'PAUSED')).toBe(true);
    expect(transitionNeedsReason('ACTIVE', 'PAUSED')).toBe(false);
  });
});
