import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  dossierQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, title }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  ),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierByIdQuery: mocks.dossierQuery,
}));

vi.mock('@/features/dossiers/components/dossier-access-section', () => ({
  DossierAccessSection: () => <div>Contenu accès</div>,
}));

vi.mock('@/features/dossiers/components/dossier-activity-section', () => ({
  DossierActivitySection: () => <div>Contenu activités</div>,
}));

vi.mock('@/features/dossiers/components/dossier-lifecycle-section', () => ({
  DossierLifecycleSection: () => <div>Contenu administration</div>,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import { DossierDetailsDrawer } from '@/features/dossiers/components/dossier-details-drawer';

const dossier = {
  id: 'dossier-1',
  name: 'Nantes Centre',
  brand: 'Leclerc',
  location: {
    address: '1 rue du Port',
    postalCode: '44000',
    city: 'Nantes',
  },
  documentEmail: 'docs@example.com',
  phone: '0102030405',
  contactName: 'Alice Martin',
  status: 'ACTIVE',
};

const metadata = {
  dossierStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
  ],
};

describe('DossierDetailsDrawer', () => {
  beforeEach(() => {
    mocks.dossierQuery.mockReset();
    mocks.workspaceContext.mockReset();

    mocks.dossierQuery.mockReturnValue({
      data: dossier,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.workspaceContext.mockReturnValue({
      can: () => false,
    });
  });

  it('organise le détail dans les quatre onglets métier validés', async () => {
    const user = userEvent.setup();

    render(
      <DossierDetailsDrawer
        dossierId="dossier-1"
        metadata={metadata}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: 'Infos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Accès' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activités' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Administration' })).toBeInTheDocument();

    expect(screen.getByText('Email documents')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Accès' }));
    expect(screen.getByText('Contenu accès')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Activités' }));
    expect(screen.getByText('Contenu activités')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Administration' }));
    expect(screen.getByText('Cycle de vie')).toBeVisible();
    expect(screen.getByText('Contenu administration')).toBeVisible();
  });
});
