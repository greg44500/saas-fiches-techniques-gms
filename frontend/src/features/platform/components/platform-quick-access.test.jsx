import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

import {
  PlatformQuickAccess,
  searchPlatformQuickAccessItems,
} from '@/features/platform/components/platform-quick-access';

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Route courante">{location.pathname}</output>;
}

function renderQuickAccess() {
  return render(
    <MemoryRouter initialEntries={['/platform/overview']}>
      <PlatformQuickAccess />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('PlatformQuickAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        status: 'active',
        permissions: [
          PLATFORM_PERMISSION.USERS_READ,
          PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
        ],
        applicationGlobalPermissions: [],
      },
    });
  });

  it('recherche les destinations sans dépendre des accents', () => {
    const items = [
      {
        id: 'subscriptions',
        label: 'Abonnements',
        groupLabel: 'Offre commerciale',
        to: '/platform/subscriptions',
      },
      {
        id: 'retention',
        label: 'Rétention & purge',
        groupLabel: 'Sécurité & données',
        to: '/platform/retention',
      },
    ];

    expect(
      searchPlatformQuickAccessItems(items, 'retention')
        .map(({ id }) => id),
    ).toEqual(['retention']);
  });

  it('navigue vers une vue autorisée depuis la topbar', async () => {
    const user = userEvent.setup();
    renderQuickAccess();

    const input = screen.getByRole('combobox', {
      name: 'Accès rapide Platform',
    });

    await user.click(input);
    await user.type(input, 'abonn');

    const suggestion = await screen.findByText('Abonnements');
    await user.click(suggestion);

    expect(screen.getByLabelText('Route courante'))
      .toHaveTextContent('/platform/subscriptions');
  });

  it('ne propose pas une destination sans permission', async () => {
    const user = userEvent.setup();
    renderQuickAccess();

    const input = screen.getByRole('combobox', {
      name: 'Accès rapide Platform',
    });

    await user.click(input);
    await user.type(input, 'rétention');

    expect(
      screen.queryByText('Rétention & purge'),
    ).not.toBeInTheDocument();
  });
});
