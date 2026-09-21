import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    can: mocks.can,
  }),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useUpdateDossierStatusMutation: () => [
    mocks.updateStatus,
    { isLoading: false },
  ],
}));

import { DossierLifecycleSection } from '@/features/dossiers/components/dossier-lifecycle-section';

const metadata = {
  dossierStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'PAUSED', label: 'En pause' },
    { value: 'DELETED', label: 'Supprimé' },
  ],
  statusTransitions: {
    ACTIVE: ['PAUSED', 'DELETED'],
    DELETED: ['PAUSED'],
  },
};

function renderLifecycle(dossier) {
  return render(
    <ToastProvider>
      <DossierLifecycleSection
        dossier={dossier}
        metadata={metadata}
        workspaceId="workspace-1"
      />
    </ToastProvider>,
  );
}

describe('DossierLifecycleSection', () => {
  beforeEach(() => {
    mocks.can.mockReset();
    mocks.updateStatus.mockReset();
    mocks.can.mockReturnValue(true);
    mocks.updateStatus.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ status: 'DELETED' }),
    }));
  });

  it('utilise les transitions et labels fournis par les metadata', () => {
    renderLifecycle({ id: 'dossier-1', status: 'ACTIVE' });

    expect(screen.getByRole('button', { name: 'En pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimé' })).toBeInTheDocument();
  });

  it('exige une raison avant une suppression puis envoie la transition', async () => {
    const user = userEvent.setup();

    renderLifecycle({ id: 'dossier-1', status: 'ACTIVE' });

    await user.click(screen.getByRole('button', { name: 'Supprimé' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirmer le changement' }),
    );

    expect(mocks.updateStatus).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Une raison est obligatoire',
    );

    await user.type(
      screen.getByLabelText('Raison'),
      'Fermeture définitive du magasin',
    );
    await user.click(
      screen.getByRole('button', { name: 'Confirmer le changement' }),
    );

    expect(mocks.updateStatus).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      status: 'DELETED',
      reason: 'Fermeture définitive du magasin',
    });
  });

  it('ne propose aucune action sans permission lifecycle', () => {
    mocks.can.mockReturnValue(false);

    const { container } = renderLifecycle({
      id: 'dossier-1',
      status: 'ACTIVE',
    });

    expect(container).toBeEmptyDOMElement();
  });
});
