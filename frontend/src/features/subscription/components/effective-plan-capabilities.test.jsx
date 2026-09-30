import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EffectivePlanCapabilities } from '@/features/subscription/components/effective-plan-capabilities';

const NOW = new Date('2026-09-14T00:00:00.000Z');

describe('EffectivePlanCapabilities', () => {
  afterEach(() => {
    cleanup();
  });

  it('affiche uniquement les capabilities effectives et leur horizon fourni par le backend', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: [
            'file_upload',
            'team_management',
          ],
          featureAvailability: {
            file_upload: {
              mode: 'open_ended',
              endsAt: null,
            },
            team_management: {
              mode: 'bounded',
              endsAt: '2026-09-20T00:00:00.000Z',
            },
          },
          limits: {
            members: 12,
            storage_bytes: null,
          },
        }}
        now={NOW}
      />,
    );

    expect(screen.getByText('Droits effectifs')).toBeInTheDocument();
    expect(screen.getByText('Téléversement de fichiers')).toBeInTheDocument();
    expect(screen.getByText('Gestion d’équipe')).toBeInTheDocument();
    expect(screen.queryByText('Journal d’activité')).not.toBeInTheDocument();
    expect(screen.getByText('Sans échéance')).toBeInTheDocument();
    expect(screen.getByText(/6 jours restants/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Illimité')).toBeInTheDocument();
  });

  it('affiche les libellés métier projetés sans exposer les clés techniques', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: ['product_reference_access'],
          featureAvailability: {
            product_reference_access: {
              mode: 'open_ended',
              endsAt: null,
            },
          },
          featurePresentations: {
            product_reference_access: {
              label: 'Accès au référentiel Produits',
            },
          },
          limits: {
            technical_sheets: 10,
          },
          limitPresentations: {
            technical_sheets: {
              label: 'Fiches techniques',
            },
          },
        }}
        now={NOW}
      />,
    );

    expect(screen.getByText('Accès au référentiel Produits')).toBeInTheDocument();
    expect(screen.getByText('Fiches techniques')).toBeInTheDocument();
    expect(screen.queryByText('product_reference_access')).not.toBeInTheDocument();
    expect(screen.queryByText('technical_sheets')).not.toBeInTheDocument();
  });

  it('n’invente pas de durée lorsque le backend ne fournit pas la projection', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: ['file_upload'],
          limits: {},
        }}
        now={NOW}
      />,
    );

    expect(screen.getByText('Disponibilité à vérifier')).toBeInTheDocument();
  });

  it('présente les limites fichiers comme non applicables sans file_upload', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: ['team_management'],
          featureAvailability: {
            team_management: { mode: 'open_ended', endsAt: null },
          },
          limits: {
            members: 5,
            storage_bytes: 104857600,
            file_uploads_monthly: 10,
          },
        }}
        now={NOW}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText('100 Mo')).not.toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });

  it('reste stable lorsque le backend ne fournit aucune capability', () => {
    render(
      <EffectivePlanCapabilities
        entitlement={{
          features: [],
          featureAvailability: {},
          limits: {},
        }}
        now={NOW}
      />,
    );

    expect(
      screen.getByText('Aucune fonctionnalité spécifique n’est actuellement disponible.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aucune limite chiffrée n’est actuellement déclarée.'),
    ).toBeInTheDocument();
  });
});
