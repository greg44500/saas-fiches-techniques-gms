import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listRanges: vi.fn(),
  onSearchChange: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useListTechnicalSheetRangesQuery: mocks.listRanges,
}));

import {
  TechnicalSheetRangeSearch,
} from '@/features/technical-sheets/components/technical-sheet-range-search';

describe('M-004 — recherche prédictive et compacte des gammes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRanges.mockImplementation((args, options) => ({
      data: options?.skip ? undefined : {
        ranges: args.search === 'sna'
          ? [{ id: 'range-1', name: 'Snacking', status: 'ACTIVE' }]
          : [],
        pagination: { page: 1, limit: 8, total: 1, totalPages: 1 },
      },
      isFetching: false,
      isError: false,
    }));
  });

  it('commence par une loupe et déploie un champ automatiquement focalisé', async () => {
    const user = userEvent.setup();
    render(
      <TechnicalSheetRangeSearch
        onSearchChange={mocks.onSearchChange}
        workspaceId="workspace-1"
        status=""
      />,
    );

    expect(screen.queryByRole('combobox', { name: 'Rechercher une gamme' }))
      .not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'Ouvrir la recherche de gammes',
    }));
    expect(screen.getByRole('combobox', { name: 'Rechercher une gamme' }))
      .toHaveFocus();
  });

  it('interroge les gammes avec une saisie temporisée et propose des suggestions', async () => {
    const user = userEvent.setup();
    render(
      <TechnicalSheetRangeSearch
        onSearchChange={mocks.onSearchChange}
        workspaceId="workspace-1"
        status="ACTIVE"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ouvrir la recherche de gammes' }));
    await user.type(screen.getByRole('combobox', { name: 'Rechercher une gamme' }), 'sna');

    await waitFor(() => {
      expect(mocks.listRanges).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          search: 'sna',
          status: 'ACTIVE',
          page: 1,
          limit: 8,
        }),
        { skip: false },
      );
    });
    expect(mocks.onSearchChange).toHaveBeenCalledWith('sna');
    await user.click(await screen.findByRole('option', { name: /Snacking/i }));
    expect(mocks.onSearchChange).toHaveBeenCalledWith('Snacking');
  });

  it('rétracte la recherche et réinitialise le filtre au bouton de fermeture', async () => {
    const user = userEvent.setup();
    render(
      <TechnicalSheetRangeSearch
        onSearchChange={mocks.onSearchChange}
        workspaceId="workspace-1"
        status=""
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ouvrir la recherche de gammes' }));
    await user.click(screen.getByRole('button', { name: 'Fermer la recherche de gammes' }));
    expect(screen.queryByRole('combobox', { name: 'Rechercher une gamme' }))
      .not.toBeInTheDocument();
    expect(mocks.onSearchChange).toHaveBeenLastCalledWith('');
  });
});
