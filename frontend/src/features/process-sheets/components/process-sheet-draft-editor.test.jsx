import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({ save: vi.fn(), mutation: vi.fn(), reload: vi.fn() }));
vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useSaveProcessSheetDraftMutation: () => [mocks.save, { isLoading: false }],
}));

import {
  ProcessSheetDraftEditor,
} from '@/features/process-sheets/components/process-sheet-draft-editor';

const ingredients = {
  lines: [
    { lineKey: 'line:a', productVariantId: 'variant-a', productVariantName: 'Tomate', sourcePosition: 0 },
    { lineKey: 'line:b', productVariantId: 'variant-a', productVariantName: 'Tomate', sourcePosition: 1 },
  ],
  hasLegacyLineIdentity: false,
};
const props = {
  workspaceId: 'workspace-1', dossierId: 'dossier-1',
  processSheetId: 'process-1', canEdit: true,
  sourceIngredients: ingredients,
  initialDraft: { id: 'draft-1', revision: 0, phases: [], unassignedReasons: [] },
  onReload: mocks.reload,
};
function view(overrides = {}) {
  return render(
    <TooltipProvider>
      <ProcessSheetDraftEditor {...props} {...overrides} />
    </TooltipProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ id: 'draft-1', revision: 1, phases: [], unassignedReasons: [] }),
  });
});

describe('M-006 — éditeur de brouillon process', () => {
  it('ajoute phase et étape, puis sauvegarde avec la révision et les clés M-004 individuelles', async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    const phase = screen.getByRole('region', { name: 'Phase 1' });
    expect(phase).toBeInTheDocument();
    await user.click(within(phase).getByRole('button', { name: 'Ajouter une étape' }));
    const step = screen.getByRole('article', { name: 'Étape 1' });
    expect(step).toBeInTheDocument();
    const selection = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    const checkboxes = within(selection).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    await user.click(checkboxes[1]);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (1)' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    const payload = mocks.save.mock.calls[0][0];
    expect(payload).toMatchObject({
      workspaceId: 'workspace-1', dossierId: 'dossier-1',
      processSheetId: 'process-1', expectedRevision: 0, unassignedReasons: [],
    });
    expect(payload.phases).toHaveLength(1);
    expect(payload.phases[0].steps).toHaveLength(1);
    expect(payload.phases[0].steps[0].ingredientLineKeys).toEqual(['line:b']);
  });

  it('saisit deux équipements séparés et conserve leur ordre lors de la sauvegarde', async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    const step = screen.getByRole('article', { name: 'Étape 1' });
    const equipmentGroup = within(step).getByRole('group', { name: 'Équipements' });
    await user.click(within(equipmentGroup).getByRole('button', { name: 'Ajouter' }));
    await user.type(within(equipmentGroup).getByRole('textbox', {
      name: 'Équipements 1',
    }), 'Four');
    await user.click(within(equipmentGroup).getByRole('button', { name: 'Ajouter' }));
    await user.type(within(equipmentGroup).getByRole('textbox', {
      name: 'Équipements 2',
    }), 'Plaque');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].equipment)
      .toEqual(['Four', 'Plaque']);
  });

  it('garde chaque occurrence même avec une Référence Produit répétée et note les non-affectés', async () => {
    const user = userEvent.setup();
    view();
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (2)' }))
      .toBeInTheDocument();
    await user.type(screen.getByRole('textbox', {
      name: /Tomate \(ligne 1\)/,
    }), 'Affecté indirectement en atelier');
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const body = mocks.save.mock.calls[0][0];
    expect(body.unassignedReasons).toEqual([
      { lineKey: 'line:a', reason: 'Affecté indirectement en atelier' },
    ]);
    expect(body.unassignedReasons.some((item) => item.lineKey === 'line:b')).toBe(false);
  });

  it('bloque toutes les commandes d’édition pour un utilisateur lecteur', () => {
    view({ canEdit: false });
    expect(screen.queryByRole('button', { name: 'Ajouter une phase' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' }))
      .not.toBeInTheDocument();
    expect(screen.getByText(/Consultation uniquement/)).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('conserve le travail local en cas de conflit 409 et propose un rechargement explicite', async () => {
    mocks.save.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 409 }),
    });
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Une autre modification');
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' }))
      .toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recharger le brouillon' })).toBeInTheDocument();
  });

  it('n’affecte aucun ingrédient automatiquement lors de l’ajout d’une phase', async () => {
    view({ sourceIngredients: { ...ingredients, hasLegacyLineIdentity: true } });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    expect(screen.getByRole('note')).toHaveTextContent('identifiants limités');
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (2)' }))
      .toBeInTheDocument();
  });
});
