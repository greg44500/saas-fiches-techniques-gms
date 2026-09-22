import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  onClose: vi.fn(),
  toast: vi.fn(),
  useListPlatformRolesQuery: vi.fn(),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? <aside aria-label={title}>{children}</aside> : null
  ),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/features/platform/api/platform-invitations-api', () => ({
  useCreatePlatformTeamInvitationMutation: () => [
    mocks.createInvitation,
    { isLoading: false },
  ],
}));

vi.mock('@/features/platform/api/platform-roles-api', () => ({
  useListPlatformRolesQuery: mocks.useListPlatformRolesQuery,
}));

import { PlatformInvitationFormDrawer } from '@/features/platform/components/platform-invitation-form-drawer';

const role = {
  id: '507f1f77bcf86cd799439011',
  key: 'technical_support',
  name: 'Support technique',
  status: 'active',
  permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
};

const platformAccess = {
  role: {
    key: 'super_admin',
    name: 'Super administrateur',
  },
  permissions: [
    PLATFORM_PERMISSION.OVERVIEW_READ,
    PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
  ],
};

describe('PlatformInvitationFormDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useListPlatformRolesQuery.mockReturnValue({
      data: { roles: [role] },
      isError: false,
      isLoading: false,
    });
    mocks.createInvitation.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({ id: 'invitation-id' }),
    }));
  });

  afterEach(() => cleanup());

  it('ne charge les rôles que lorsque le Drawer est ouvert', () => {
    render(
      <PlatformInvitationFormDrawer
        onClose={mocks.onClose}
        open={false}
        platformAccess={platformAccess}
      />,
    );

    expect(mocks.useListPlatformRolesQuery).toHaveBeenCalledWith(
      { page: 1, limit: 100, status: 'active' },
      { skip: true },
    );
  });

  it('valide les champs avant tout appel serveur', async () => {
    const user = userEvent.setup();

    render(
      <PlatformInvitationFormDrawer
        onClose={mocks.onClose}
        open
        platformAccess={platformAccess}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));

    expect(screen.getByText('Le prénom est requis.')).toBeInTheDocument();
    expect(screen.getByText('Le nom est requis.')).toBeInTheDocument();
    expect(screen.getByText('Saisissez une adresse email valide.')).toBeInTheDocument();
    expect(screen.getByText('Choisissez un rôle valide.')).toBeInTheDocument();
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it('envoie uniquement l’identité validée et le roleId', async () => {
    const user = userEvent.setup();

    render(
      <PlatformInvitationFormDrawer
        onClose={mocks.onClose}
        open
        platformAccess={platformAccess}
      />,
    );

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Martin');
    await user.type(screen.getByLabelText('Adresse email'), 'marie@example.com');

    const roleTrigger = screen.getByRole('combobox', { name: 'Rôle prévu' });
    vi.spyOn(roleTrigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );

    await user.click(roleTrigger);
    await user.click(
      await screen.findByRole('option', { name: 'Support technique' }),
    );
    await user.click(screen.getByRole('button', { name: 'Envoyer l’invitation' }));

    expect(mocks.createInvitation).toHaveBeenCalledWith({
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@example.com',
      roleId: role.id,
    });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Invitation envoyée',
      variant: 'success',
    }));
    expect(mocks.onClose).toHaveBeenCalled();
  });
});
