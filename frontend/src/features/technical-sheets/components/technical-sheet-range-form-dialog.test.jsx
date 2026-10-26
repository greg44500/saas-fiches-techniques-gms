import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  suggest: vi.fn(),
}));
vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useCreateTechnicalSheetRangeMutation: () => [mocks.create, { isLoading: false }],
  useUpdateTechnicalSheetRangeMutation: () => [mocks.update, { isLoading: false }],
  useGetTechnicalSheetRangeSuggestionsQuery: (args, options) => (
    options.skip
      ? { currentData: null, isFetching: false, isError: false }
      : mocks.suggest(args)
  ),
}));

import {
  TechnicalSheetRangeFormDialog,
} from '@/features/technical-sheets/components/technical-sheet-range-form-dialog';

const existing = { id: 'range-1', name: 'Snacking', status: 'ACTIVE', revision: 2 };
function renderDialog(props = {}) {
  return render(
    <TechnicalSheetRangeFormDialog
      workspaceId="workspace-1"
      onClose={vi.fn()}
      onSaved={vi.fn()}
      {...props}
    />,
  );
}

describe('M-004 — modale Gamme, anti-doublon et confirmation humaine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'new', name: 'Traiteur' }),
    });
    mocks.update.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'range-1', name: 'Snackin' }),
    });
    mocks.suggest.mockImplementation(({ name }) => ({
      currentData: {
        exactMatch: name === 'SNACKING' ? existing : null,
        candidates: name === 'Snackin' ? [existing] : [],
      },
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    }));
  });

  it('ouvre un dialogue accessible, plutôt que d’insérer un champ dans la page', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Créer une gamme' }))
      .toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nom de la gamme' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À propos de la création d’une gamme' }))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Nom de la gamme').closest('[data-slot="field"]'))
      .toHaveAttribute('data-label-state', 'empty');
  });

  it('affiche les explications uniquement au survol de l’icône (i)', async () => {
    const user = userEvent.setup();
    renderDialog();
    const info = screen.getByRole('button', {
      name: 'À propos de la création d’une gamme',
    });
    expect(screen.queryByText(/La gamme sera disponible dans tous vos magasins/))
      .not.toBeInTheDocument();
    await user.hover(info);
    expect(await screen.findByText(/La gamme sera disponible dans tous vos magasins/))
      .toBeInTheDocument();
  });

  it('interdit la création lorsqu’une Gamme de même nom existe déjà', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole('textbox', { name: 'Nom de la gamme' }), 'SNACKING');
    expect(await screen.findByText('Cette gamme existe déjà :')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la gamme' })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('exige la confirmation humaine lorsqu’un nom est proche', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderDialog({ onSaved });
    await user.type(screen.getByRole('textbox', { name: 'Nom de la gamme' }), 'Snackin');
    expect(await screen.findByText('Gammes proches existantes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la gamme' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', {
      name: /ma gamme est différente/i,
    }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Créer la gamme' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Créer la gamme' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      name: 'Snackin',
      reviewedCandidateIds: ['range-1'],
    }));
    expect(onSaved).toHaveBeenCalled();
  });

  it('ne propose pas sa propre identité lors du renommage', async () => {
    const user = userEvent.setup();
    renderDialog({ range: existing });
    await user.clear(screen.getByRole('textbox', { name: 'Nom de la gamme' }));
    await user.type(screen.getByRole('textbox', { name: 'Nom de la gamme' }), 'Traiteur');
    await waitFor(() => {
      expect(mocks.suggest).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        name: 'Traiteur',
        excludeRangeId: existing.id,
      });
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(mocks.update).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      rangeId: existing.id,
      expectedRevision: 2,
      name: 'Traiteur',
      reviewedCandidateIds: [],
    });
  });

  it('bloque l’enregistrement si les suggestions ne sont pas vérifiables', async () => {
    mocks.suggest.mockReturnValue({
      currentData: null, isFetching: false, isError: true, refetch: vi.fn(),
    });
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByRole('textbox', { name: 'Nom de la gamme' }), 'Traiteur');
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de vérifier');
    expect(screen.getByRole('button', { name: 'Créer la gamme' })).toBeDisabled();
  });
});
