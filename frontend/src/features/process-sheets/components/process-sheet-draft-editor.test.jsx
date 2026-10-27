import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({ save: vi.fn(), reload: vi.fn() }));
vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useSaveProcessSheetDraftMutation: () => [mocks.save, { isLoading: false }],
}));

import { ProcessSheetDraftEditor } from '@/features/process-sheets/components/process-sheet-draft-editor';

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
async function addStep(user) {
  await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
  const phase = screen.getByRole('region', { name: 'Phase 1' });
  await user.click(within(phase).getByRole('button', { name: 'Ajouter une étape' }));
  return within(phase).getByRole('article', { name: 'Étape 1' });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ id: 'draft-1', revision: 1, phases: [], unassignedReasons: [] }),
  });
});

describe('M-006 — atelier de fabrication à deux zones', () => {
  it('sépare les ingrédients de la navigation phases/étapes, sans empilement de cartes', async () => {
    const user = userEvent.setup();
    const { container } = view();
    expect(screen.getByRole('complementary', { name: 'Suivi des ingrédients' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (2)' })).toBeInTheDocument();
    expect(screen.getByText(/0 sur 2 affectés/)).toBeInTheDocument();
    expect(container.querySelector('.backdrop-blur')).not.toBeInTheDocument();
    await addStep(user);
    expect(screen.getByRole('navigation', { name: 'Navigation des phases' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Étapes de la phase' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Éditeur de l’étape' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('sépare les identités de ligne même lorsqu’elles désignent le même produit', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    const group = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(group).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(group).getAllByRole('checkbox')[1]);
    const sidebar = screen.getByRole('complementary', { name: 'Suivi des ingrédients' });
    expect(within(sidebar).getByRole('heading', { name: 'Ingrédients non affectés (1)' }))
      .toBeInTheDocument();
    expect(within(sidebar).getByText('Déjà affectés (1)')).toBeInTheDocument();
    expect(within(sidebar).getByText('1 association(s)')).toBeInTheDocument();
    await user.click(within(group).getAllByRole('checkbox')[0]);
    expect(within(sidebar).getByRole('heading', { name: 'Ingrédients non affectés (0)' }))
      .toBeInTheDocument();
  });

  it('conserve le contenu en changeant de phase sans provoquer de sauvegarde', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Peser les ingrédients');
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    const navigation = screen.getByRole('navigation', { name: 'Navigation des phases' });
    await user.click(within(navigation).getByRole('button', { name: /01.*Nouvelle phase/ }));
    expect(within(screen.getByRole('article', { name: 'Étape 1' }))
      .getByRole('textbox', { name: 'Instructions' })).toHaveValue('Peser les ingrédients');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('replie les paramètres de l’étape sans les laisser accessibles au clavier', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    const disclosure = within(step).getByRole('button', { name: /Temps, température et équipements/ });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(within(step).queryByRole('spinbutton', { name: 'Temps actif (min)' }))
      .not.toBeInTheDocument();
    await user.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    expect(within(step).getByRole('spinbutton', { name: 'Temps actif (min)' }))
      .toBeInTheDocument();
    await user.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  });

  it('ajoute phase et étape, affecte la deuxième occurrence et sauvegarde sans fusionner les lignes M-004', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    expect(step).toBeInTheDocument();
    const selection = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    expect(within(selection).queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(within(selection).getByRole('button', { name: 'Associer des ingrédients' }));
    const checkboxes = within(selection).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    await user.click(checkboxes[1]);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (1)' })).toBeInTheDocument();
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

  it('replie les détails, et conserve deux équipements dans leur ordre', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.click(within(step).getByText(/Temps, température et équipements/));
    const equipmentGroup = within(step).getByRole('group', { name: 'Équipements' });
    await user.click(within(equipmentGroup).getByRole('button', { name: 'Ajouter' }));
    await user.type(within(equipmentGroup).getByRole('textbox', { name: 'Équipements 1' }), 'Four');
    await user.click(within(equipmentGroup).getByRole('button', { name: 'Ajouter' }));
    await user.type(within(equipmentGroup).getByRole('textbox', { name: 'Équipements 2' }), 'Plaque');
    await user.click(within(step).getByRole('button', { name: /Temps, température et équipements/ }));
    expect(within(step).queryByRole('group', { name: 'Équipements' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    expect(screen.getByRole('article', { name: 'Étape 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sélectionner étape 1 : Nouvelle étape' }));
    const reopened = screen.getByRole('article', { name: 'Étape 1' });
    await user.click(within(reopened).getByRole('button', { name: /Temps, température et équipements/ }));
    expect(within(reopened).getByRole('textbox', { name: 'Équipements 1' })).toHaveValue('Four');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].equipment).toEqual(['Four', 'Plaque']);
  });

  it('permet de justifier uniquement les ingrédients non affectés à la demande', async () => {
    const user = userEvent.setup();
    view();
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (2)' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Tomate \(ligne 1\)/ })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Justifier la non-utilisation' })[0]);
    await user.type(screen.getByRole('textbox', { name: /Tomate \(ligne 1\)/ }), 'Utilisé indirectement');
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const body = mocks.save.mock.calls[0][0];
    expect(body.unassignedReasons).toEqual([{ lineKey: 'line:a', reason: 'Utilisé indirectement' }]);
    expect(body.unassignedReasons.some((item) => item.lineKey === 'line:b')).toBe(false);
  });

  it('permet la même ligne sur une phase et sur son étape sans la consommer', async () => {
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    const phase = screen.getByRole('region', { name: 'Phase 1' });
    await user.click(within(phase).getByText(/Consignes et ingrédients propres à la phase/));
    const phaseIngredients = within(phase).getByRole('group', { name: 'Ingrédients directement affectés à la phase' });
    await user.click(within(phaseIngredients).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(phaseIngredients).getAllByRole('checkbox')[0]);
    await user.click(within(phase).getByRole('button', { name: 'Ajouter une étape' }));
    const step = within(phase).getByRole('article', { name: 'Étape 1' });
    const stepIngredients = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(stepIngredients).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(stepIngredients).getAllByRole('checkbox')[0]);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const saved = mocks.save.mock.calls[0][0].phases[0];
    expect(saved.ingredientLineKeys).toEqual(['line:a']);
    expect(saved.steps[0].ingredientLineKeys).toEqual(['line:a']);
  });

  it('ne montre les champs détaillés que pour une étape active et préserve les instructions', async () => {
    const user = userEvent.setup();
    view();
    const first = await addStep(user);
    await user.type(within(first).getByRole('textbox', { name: 'Instructions' }), 'Décongeler');
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    expect(screen.getByRole('article', { name: 'Étape 2' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Étape 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sélectionner étape 1 : Nouvelle étape' }))
      .toHaveTextContent('Décongeler');
    await user.click(screen.getByRole('button', { name: 'Sélectionner étape 1 : Nouvelle étape' }));
    expect(within(screen.getByRole('article', { name: 'Étape 1' }))
      .getByRole('textbox', { name: 'Instructions' })).toHaveValue('Décongeler');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].instructions).toBe('Décongeler');
  });

  it('garde une seule phase ouverte et préserve les identifiants et affectations après réordonnancement', async () => {
    const user = userEvent.setup();
    const initialDraft = {
      ...props.initialDraft, revision: 3,
      phases: [
        { id: 'phase-1', title: 'Préparation', instructions: '',
          ingredientLineKeys: ['line:a'], steps: [
            { id: 'step-1', title: 'Laver', instructions: 'Laver la tomate',
              ingredientLineKeys: ['line:b'], equipment: [] },
          ] },
        { id: 'phase-2', title: 'Assemblage', instructions: '', ingredientLineKeys: [], steps: [] },
      ],
    };
    view({ initialDraft });
    expect(screen.getByRole('article', { name: 'Étape 1' })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Navigation des phases' });
    await user.click(within(navigation).getByRole('button', { name: /02.*Assemblage/ }));
    const second = screen.getByRole('region', { name: 'Phase 2' });
    expect(screen.queryByRole('region', { name: 'Phase 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Étape 1' })).not.toBeInTheDocument();
    await user.click(within(second).getByRole('button', { name: 'Monter phase 2' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const body = mocks.save.mock.calls[0][0];
    expect(body.expectedRevision).toBe(3);
    expect(body.phases.map((phase) => phase.id)).toEqual(['phase-2', 'phase-1']);
    expect(body.phases[1].ingredientLineKeys).toEqual(['line:a']);
    expect(body.phases[1].steps[0]).toMatchObject({
      id: 'step-1', ingredientLineKeys: ['line:b'], instructions: 'Laver la tomate',
    });
  });

  it('affiche un aperçu de lecture sans altérer la saisie ni la révision', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Assembler la tartine');
    await user.click(screen.getByRole('button', { name: 'Aperçu du process' }));
    const preview = screen.getByRole('region', { name: 'Aperçu du process' });
    expect(within(preview).getByText('Assembler la tartine')).toBeInTheDocument();
    expect(within(preview).getByText(/1\.1 Nouvelle étape/)).toBeInTheDocument();
    expect(screen.getByText(/Modifications non enregistrées/)).toBeInTheDocument();
    expect(within(preview).queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revenir à l’édition' }));
    const reopened = screen.getByRole('article', { name: 'Étape 1' });
    expect(within(reopened).getByRole('textbox', { name: 'Instructions' }))
      .toHaveValue('Assembler la tartine');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].instructions).toBe('Assembler la tartine');
  });

  it('masque toutes les commandes de mutation à un lecteur tout en laissant la consultation', () => {
    view({ canEdit: false });
    expect(screen.queryByRole('button', { name: 'Ajouter une phase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
    expect(screen.getByText(/Consultation uniquement/)).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('préserve le brouillon local lors d’un conflit de révision 409', async () => {
    mocks.save.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({ status: 409 }) });
    const user = userEvent.setup();
    view();
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Une autre modification');
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Recharger le brouillon' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Titre de la phase' }), ' modifiée');
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Une autre modification');
  });

  it('n’affecte rien automatiquement et signale les identités historiques', async () => {
    view({ sourceIngredients: { ...ingredients, hasLegacyLineIdentity: true } });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    expect(screen.getByRole('note')).toHaveTextContent('identifiants limités');
    expect(screen.getByRole('heading', { name: 'Ingrédients non affectés (2)' })).toBeInTheDocument();
    expect(screen.getByText(/0 sur 2 affectés/)).toBeInTheDocument();
  });
});
