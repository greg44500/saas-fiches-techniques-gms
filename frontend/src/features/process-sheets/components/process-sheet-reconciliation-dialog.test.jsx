import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  review: vi.fn(), reconcile: vi.fn(),
  updated: vi.fn(), close: vi.fn(),
}));
vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useGetProcessSheetReconciliationQuery: (...args) => mocks.review(...args),
  useReconcileProcessSheetMutation: () => [mocks.reconcile, { isLoading: false }],
}));

import { ProcessSheetReconciliationDialog } from
  '@/features/process-sheets/components/process-sheet-reconciliation-dialog';

const props = {
  open: true, canApply: true, workspaceId: 'workspace-1',
  dossierId: 'dossier-1', processSheetId: 'process-1',
  technicalSheetId: 'sheet-1',
  onUpdated: mocks.updated, onClose: mocks.close,
};
const plan = {
  status: 'REVIEW_REQUIRED',
  compositionChanged: false,
  oldIngredientCount: 2,
  newIngredients: [
    { lineKey: 'line:new-1', name: 'Tomate', position: 0 },
    { lineKey: 'line:new-2', name: 'Fromage', position: 1 },
  ],
  assignments: [
    { from: 'line:old-1', name: 'Tomate', position: 0, proposedTo: 'line:new-1' },
  ],
  unresolvedCount: 0,
  processRevision: 2,
  draftRevision: 1,
  currentValidationId: 'validation-new',
};
function view(overrides = {}) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ProcessSheetReconciliationDialog {...props} {...overrides} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.review.mockReturnValue({
    data: plan, isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
  });
  mocks.reconcile.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
  mocks.updated.mockResolvedValue({});
});

describe('M-006 — dialogue de réconciliation M-004', () => {
  it('actualise explicitement une recette identique et conserve les correspondances identifiées', async () => {
    const user = userEvent.setup();
    view();
    const dialog = screen.getByRole('dialog', { name: 'Actualiser la Fiche process' });
    expect(dialog).toHaveTextContent('Composition identique');
    expect(screen.getByRole('button', { name: 'Explication de la comparaison' }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À propos de l’actualisation de composition' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer l’actualisation' }));
    expect(mocks.reconcile).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1',
      expectedRevision: 2, expectedDraftRevision: 1,
      currentValidationId: 'validation-new', decisions: [],
    }));
    expect(mocks.updated).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it('ne permet aucune adoption silencieuse lorsque la correspondance est incertaine', () => {
    mocks.review.mockReturnValue({
      data: {
        ...plan, compositionChanged: true, unresolvedCount: 1,
        assignments: [{ ...plan.assignments[0], proposedTo: null }],
      },
      isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('dialog')).toHaveTextContent('Composition modifiée');
    expect(screen.getByRole('button', { name: 'Confirmer l’actualisation' })).toBeDisabled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });

  it('propose le bon parcours si une révision M-004 est encore ouverte', () => {
    mocks.review.mockReturnValue({
      data: { status: 'PARENT_REVISION_OPEN' },
      isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('dialog')).toHaveTextContent('modification de la Fiche technique');
    expect(screen.getByRole('link', { name: 'Ouvrir la Fiche technique' }))
      .toHaveAttribute('href',
        '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets/sheet-1');
    expect(screen.getByRole('button', { name: 'Confirmer l’actualisation' }))
      .toBeDisabled();
    expect(screen.getByRole('button', {
      name: 'Disponibilité de la confirmation d’actualisation',
    })).toBeInTheDocument();
  });

  it('garde la confirmation visible mais désactivée quand la composition est déjà courante', () => {
    mocks.review.mockReturnValue({
      data: { status: 'CURRENT' },
      isLoading: false, isFetching: false, isError: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByText('Composition déjà à jour.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer l’actualisation' })).toBeDisabled();
  });

  it('garde la confirmation visible pendant le chargement de l’analyse', () => {
    mocks.review.mockReturnValue({
      data: undefined,
      isLoading: true, isFetching: true, isError: false, refetch: vi.fn(),
    });
    view();
    expect(screen.getByRole('button', { name: 'Confirmer l’actualisation' })).toBeDisabled();
  });

  it('refuse la mutation sans autorisation suffisante', () => {
    view({ canApply: false });
    expect(screen.getByRole('button', { name: 'Confirmer l’actualisation' }))
      .toBeDisabled();
    expect(mocks.reconcile).not.toHaveBeenCalled();
  });
});
