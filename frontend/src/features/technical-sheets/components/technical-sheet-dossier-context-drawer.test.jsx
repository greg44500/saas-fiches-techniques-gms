import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dossier: vi.fn(),
  dossierMetadata: vi.fn(),
  settings: vi.fn(),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? (
      <aside>
        <h2>{title}</h2>
        {children}
      </aside>
    ) : null
  ),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierByIdQuery: mocks.dossier,
  useGetDossierMetadataQuery: mocks.dossierMetadata,
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetDossierTechnicalSheetSettingsQuery: mocks.settings,
}));

vi.mock('@/features/suppliers/components/dossier-applicable-price-card', () => ({
  DossierApplicablePriceCard: () => (
    <section aria-label="Prix applicable test">
      Vérification prix
    </section>
  ),
}));

import {
  TechnicalSheetDossierContextDrawer,
} from '@/features/technical-sheets/components/technical-sheet-dossier-context-drawer';

function queryResult(data) {
  return {
    data,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

describe('TechnicalSheetDossierContextDrawer', () => {
  it('sépare identité du Dossier et vérification du prix applicable', async () => {
    const user = userEvent.setup();

    mocks.dossier.mockReturnValue(queryResult({
      id: 'dossier-1',
      name: 'Nantes Centre',
      brand: 'Enseigne',
      location: {
        postalCode: '44000',
        city: 'Nantes',
      },
      contactName: 'Responsable',
      documentEmail: 'docs@example.test',
      phone: '0200000000',
      status: 'ACTIVE',
    }));
    mocks.dossierMetadata.mockReturnValue(queryResult({
      dossierStatuses: [
        { value: 'ACTIVE', label: 'Actif' },
      ],
    }));
    mocks.settings.mockReturnValue(queryResult({
      defaultTargetMarginBasisPoints: 3000,
    }));

    render(
      <TechnicalSheetDossierContextDrawer
        dossierId="dossier-1"
        onClose={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByRole('heading', {
      name: 'Infos dossier',
    })).toBeInTheDocument();
    expect(screen.getByText('Nantes Centre')).toBeInTheDocument();
    expect(screen.getByText('30 %')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', {
      name: 'Prix applicable',
    }));

    expect(screen.getByRole('region', {
      name: 'Prix applicable test',
    })).toBeInTheDocument();
  });
});
