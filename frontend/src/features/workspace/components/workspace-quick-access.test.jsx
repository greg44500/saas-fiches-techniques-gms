import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';

import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/workspace-navigation', () => ({
  workspaceNavigation: [
    {
      id: 'test-allowed',
      type: 'item',
      label: 'Vue test',
      path: 'test-view',
    },
    {
      id: 'test-forbidden',
      type: 'item',
      label: 'Vue restreinte',
      path: 'restricted-view',
      permission: '__test_forbidden__',
    },
  ],
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));

import { WorkspaceQuickAccess } from '@/features/workspace/components/workspace-quick-access';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Route courante">{location.pathname}</output>;
}

function renderQuickAccess() {
  return render(
    <MemoryRouter initialEntries={['/workspaces/workspace-1/dashboard']}>
      <WorkspaceQuickAccess
        workspace={{ id: 'workspace-1', name: 'Acme', status: 'active' }}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('WorkspaceQuickAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceContextMock.mockReturnValue({
      can: (permission) => [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.FILE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
      ].includes(permission),
      hasFeature: (feature) => feature === WORKSPACE_FEATURE.TEAM_MANAGEMENT,
    });
  });

  it('navigue vers une vue Workspace autorisée depuis la topbar', async () => {
    const user = userEvent.setup();
    renderQuickAccess();

    const input = screen.getByRole('combobox', {
      name: 'Accès rapide Workspace',
    });

    await user.click(input);
    await user.type(input, 'vue test');

    const suggestion = await screen.findByText('Vue test');
    await user.click(suggestion);

    expect(screen.getByLabelText('Route courante'))
      .toHaveTextContent('/workspaces/workspace-1/test-view');
  });

  it('ne propose pas une destination sans permission effective', async () => {
    const user = userEvent.setup();
    renderQuickAccess();

    const input = screen.getByRole('combobox', {
      name: 'Accès rapide Workspace',
    });

    await user.click(input);
    await user.type(input, 'restreinte');

    expect(screen.queryByText('Vue restreinte')).not.toBeInTheDocument();
  });
});
