import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  policyQuery: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useGetPricingPolicyQuery: mocks.policyQuery,
  useUpdatePricingPolicyMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierSettingsPage,
} from '@/features/dossiers/pages/dossier-settings-page';

function renderPage() {
  return render(
    <TooltipProvider>
      <DossierSettingsPage />
    </TooltipProvider>,
  );
}

describe('DossierSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workspaceContext.mockReturnValue({
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.PRICE_POLICY_MANAGE
      ),
      workspace: {
        id: 'workspace-1',
      },
    });
    mocks.policyQuery.mockReturnValue({
      data: {
        mode: 'NEGOTIATED_PRICE',
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('présente la politique des prix comme réglage Workspace des Dossiers', () => {
    renderPage();

    expect(mocks.policyQuery).toHaveBeenCalledWith('workspace-1');
    expect(screen.getByRole('heading', {
      name: 'Paramètres des Dossiers',
    })).toBeInTheDocument();
    expect(screen.getByText('Politique des prix')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'À propos de la politique des prix',
    })).toBeInTheDocument();
    expect(screen.getByRole('combobox', {
      name: 'Source de prix prioritaire',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Enregistrer',
    })).toBeDisabled();
  });

  it('reste consultable sans autoriser la modification sans permission dédiée', () => {
    mocks.workspaceContext.mockReturnValue({
      can: () => false,
      workspace: {
        id: 'workspace-1',
      },
    });

    renderPage();

    expect(screen.getByRole('combobox', {
      name: 'Source de prix prioritaire',
    })).toBeDisabled();
    expect(screen.queryByRole('button', {
      name: 'Enregistrer',
    })).not.toBeInTheDocument();
  });
});
