import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  save: vi.fn(), reload: vi.fn(), phaseTitles: vi.fn(), createTitle: vi.fn(),
}));
vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useSaveProcessSheetDraftMutation: () => [mocks.save, { isLoading: false }],
  useListProcessPhaseTitlesQuery: (...args) => mocks.phaseTitles(...args),
  useCreateProcessPhaseTitleMutation: () => [mocks.createTitle, { isLoading: false }],
}));

import { ProcessSheetDraftEditor } from '@/features/process-sheets/components/process-sheet-draft-editor';

const ingredients = {
  lines: [
    { lineKey: 'line:a', productVariantName: 'Tomate', sourcePosition: 0 },
    { lineKey: 'line:b', productVariantName: 'Tomate', sourcePosition: 1 },
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
async function addFreePhase(user) {
  await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
  await user.click(screen.getByRole('button', { name: 'Autre phase…' }));
  await user.type(screen.getByRole('textbox', { name: 'Intitulé' }), 'Nouvelle phase');
  await user.click(screen.getByRole('button', { name: 'Ajouter la phase' }));
}
async function addStep(user) {
  await addFreePhase(user);
  await user.click(within(navigation()).getByRole('button', { name: 'Ajouter une étape à la phase 1' }));
  return screen.getByRole('article', { name: 'Étape 1' });
}
function navigation() {
  return screen.getByRole('navigation', { name: 'Navigation des phases et étapes' });
}
async function renamePhase(user, number, title) {
  await user.click(within(navigation()).getByRole('button', { name: 'Renommer phase ' + number }));
  const field = within(navigation()).getByRole('textbox', { name: 'Renommer phase ' + number });
  await user.clear(field);
  await user.type(field, title + '{Enter}');
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.phaseTitles.mockReturnValue({ data: { phases: [] }, isLoading: false });
  mocks.createTitle.mockImplementation(({ title }) => ({
    unwrap: vi.fn().mockResolvedValue({ id: 'custom-id', title }),
  }));
  mocks.save.mockImplementation((body) => ({
    unwrap: vi.fn().mockResolvedValue({
      id: 'draft-1', revision: body.expectedRevision + 1,
      phases: body.phases, unassignedReasons: body.unassignedReasons,
    }),
  }));
});

describe('M-006 — arbre phases/étapes et éditeur contextuel', () => {
  it('n’invente aucune proposition lorsque le backend est vide', async () => {
    const user = userEvent.setup();
    view({ canReadPhaseLibrary: true });
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    expect(screen.getByText('Aucune phase disponible')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cuisson' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Autre phase…' }));
    await user.type(screen.getByRole('textbox', { name: 'Intitulé' }), 'Marinade');
    await user.click(screen.getByRole('button', { name: 'Ajouter la phase' }));
    expect(mocks.createTitle).toHaveBeenCalledWith({ workspaceId: 'workspace-1', title: 'Marinade' });
    expect(screen.getByRole('heading', { name: 'Phase 1 : Marinade' })).toBeInTheDocument();
    expect(mocks.phaseTitles).toHaveBeenCalledWith(
      { workspaceId: 'workspace-1' }, expect.objectContaining({ skip: false }),
    );
  });

  it('respecte la lecture de bibliothèque du rôle et conserve la saisie libre', async () => {
    const user = userEvent.setup();
    view({ canReadPhaseLibrary: false });
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    expect(screen.getByText('Bibliothèque non autorisée')).toBeInTheDocument();
    expect(mocks.phaseTitles).toHaveBeenCalledWith(expect.anything(),
      expect.objectContaining({ skip: true }));
    await user.click(screen.getByRole('button', { name: 'Autre phase…' }));
    await user.type(screen.getByRole('textbox', { name: 'Intitulé' }), 'Découpe');
    await user.click(screen.getByRole('button', { name: 'Ajouter la phase' }));
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
  });

  it('propose les intitulés du backend Workspace et crée une phase sans étape automatique', async () => {
    const user = userEvent.setup();
    mocks.phaseTitles.mockReturnValue({ data: { phases: [
      { id: 'common-1', title: 'Cuisson' },
      { id: 'common-2', title: 'Préparation du poste' },
    ] }, isLoading: false });
    view({ canReadPhaseLibrary: true });
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    expect(screen.getByRole('button', { name: 'Préparation du poste' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cuisson' }));
    expect(screen.getByRole('heading', { name: 'Phase 1 : Cuisson' })).toBeInTheDocument();
    expect(within(navigation()).queryByText('Aucune étape')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0]).toMatchObject({
      title: 'Cuisson', steps: [], ingredientLineKeys: [],
    });
  });

  it('renomme une phase dans l’arborescence sans publier le nouveau titre au Workspace', async () => {
    const user = userEvent.setup();
    view({ canReadPhaseLibrary: true });
    await addFreePhase(user);
    await renamePhase(user, 1, 'Assemblage');
    expect(screen.getByRole('heading', { name: 'Phase 1 : Assemblage' })).toBeInTheDocument();
    expect(within(navigation()).getByRole('button', {
      name: 'Sélectionner phase 1 : Assemblage',
    })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0]).toMatchObject({ title: 'Assemblage', steps: [] });
    expect(mocks.createTitle).toHaveBeenCalledTimes(1);
  });

  it('ne crée pas de phase dans le brouillon si la création serveur échoue', async () => {
    mocks.createTitle.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 409 }),
    });
    const user = userEvent.setup();
    view({ canReadPhaseLibrary: true });
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Autre phase…' }));
    await user.type(screen.getByRole('textbox', { name: 'Intitulé' }), 'Cuisson');
    await user.click(screen.getByRole('button', { name: 'Ajouter la phase' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel intitulé de phase' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('existe déjà');
    expect(within(dialog).getByRole('textbox', { name: 'Intitulé' })).toHaveValue('Cuisson');
    // Base UI correctly makes the editor inert while the modal is open.
    // Close it before querying its navigation through accessible roles.
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    const tree = await screen.findByRole('navigation', { name: 'Navigation des phases et étapes' });
    expect(within(tree).queryByRole('button', { name: /Sélectionner phase/ }))
      .not.toBeInTheDocument();
    expect(screen.getByText('À jour')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('permet la suppression directe depuis la ligne d’étape, sans affichage de sous-liste vide', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    await user.click(within(navigation()).getByRole('button', { name: 'Supprimer étape 1 : Nouvelle étape' }));
    expect(screen.getByRole('dialog', { name: 'Supprimer cette étape ?' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }));
    expect(within(navigation()).queryByText('Aucune étape')).not.toBeInTheDocument();
    expect(within(navigation()).queryByRole('list', { name: 'Étapes de la phase 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
  });

  it('garde le rail ingrédients intact et remplace les onglets horizontaux par un arbre', async () => {
    const user = userEvent.setup();
    const { container } = view();
    const rail = screen.getByRole('complementary', { name: 'Suivi des ingrédients' });
    expect(within(rail).getByRole('status')).toHaveTextContent('0 affectés · 2 à affecter');
    expect(within(rail).getAllByText('Tomate')).toHaveLength(2);
    expect(within(rail).queryByText(/ligne [12]/)).not.toBeInTheDocument();
    expect(container.querySelector('.backdrop-blur')).not.toBeInTheDocument();
    await addStep(user);
    expect(navigation()).toBeInTheDocument();
    expect(within(navigation()).getByRole('list', { name: 'Étapes de la phase 1' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Éditeur de l’étape' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('édite une phase puis une étape, sans deuxième carte d’édition affichée', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
    await renamePhase(user, 1, 'Préparation');
    expect(screen.getByRole('heading', { name: 'Phase 1 : Préparation' })).toBeInTheDocument();
    expect(within(navigation()).getByRole('button', { name: 'Sélectionner phase 1 : Préparation' }))
      .toBeInTheDocument();
    await user.click(within(navigation()).getByRole('button', { name: 'Ajouter une étape à la phase 1' }));
    expect(screen.queryByRole('textbox', { name: 'Titre de la phase' })).not.toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Titre de l’étape' }));
    await user.type(screen.getByRole('textbox', { name: 'Titre de l’étape' }), 'Peser');
    expect(within(navigation()).getByRole('button', { name: 'Sélectionner étape 1 : Peser' }))
      .toHaveAttribute('aria-pressed', 'true');
    await user.click(within(navigation()).getByRole('button', { name: 'Sélectionner phase 1 : Préparation' }));
    expect(screen.getByRole('heading', { name: 'Phase 1 : Préparation' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('replie une phase avec Base UI, sans supprimer ses étapes', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    const collapse = within(navigation()).getByRole('button', { name: 'Replier phase 1' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await user.click(collapse);
    expect(within(navigation()).getByRole('button', { name: 'Déplier phase 1' }))
      .toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { name: 'Phase 1' })).toBeInTheDocument();
    await user.click(within(navigation()).getByRole('button', { name: 'Déplier phase 1' }));
    await user.click(within(navigation()).getByRole('button', { name: 'Sélectionner étape 1 : Nouvelle étape' }));
    expect(screen.getByRole('article', { name: 'Étape 1' })).toBeInTheDocument();
  });

  it('conserve les saisies locales en naviguant sans sauvegarde automatique', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Peser les ingrédients');
    await addFreePhase(user);
    await user.click(within(navigation()).getByRole('button', { name: 'Sélectionner étape 1 : Nouvelle étape' }));
    expect(within(screen.getByRole('article', { name: 'Étape 1' }))
      .getByRole('textbox', { name: 'Instructions' })).toHaveValue('Peser les ingrédients');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('distingue deux occurrences de même nom via lineKey et met à jour les localisations', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    const group = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(group).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(group).getAllByRole('checkbox')[1]);
    const rail = screen.getByRole('complementary', { name: 'Suivi des ingrédients' });
    expect(within(rail).getByRole('status')).toHaveTextContent('1 affecté · 1 à affecter');
    expect(within(rail).getAllByText('Tomate')).toHaveLength(2);
    expect(within(rail).getByRole('button', {
      name: 'Affecté dans : Étape : Nouvelle étape · Nouvelle phase',
    })).toBeInTheDocument();
    await user.clear(within(step).getByRole('textbox', { name: 'Titre de l’étape' }));
    await user.type(within(step).getByRole('textbox', { name: 'Titre de l’étape' }), 'Découper');
    expect(within(rail).getByRole('button', {
      name: 'Affecté dans : Étape : Découper · Nouvelle phase',
    })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].ingredientLineKeys).toEqual(['line:b']);
    expect(mocks.save.mock.calls[0][0].expectedRevision).toBe(0);
  });

  it('permet la même occurrence sur une phase et une étape, sans la consommer', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    const phaseIngredients = screen.getByRole('group', { name: 'Ingrédients directement affectés à la phase' });
    await user.click(within(phaseIngredients).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(phaseIngredients).getAllByRole('checkbox')[0]);
    const step = await (async () => {
      await user.click(within(navigation()).getByRole('button', { name: 'Ajouter une étape à la phase 1' }));
      return screen.getByRole('article', { name: 'Étape 1' });
    })();
    const stepIngredients = within(step).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(stepIngredients).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(stepIngredients).getAllByRole('checkbox')[0]);
    const rail = screen.getByRole('complementary', { name: 'Suivi des ingrédients' });
    expect(within(rail).getByRole('status')).toHaveTextContent('1 affecté · 1 à affecter');
    expect(within(rail).getByRole('button', {
      name: 'Affecté dans : Phase : Nouvelle phase ; Étape : Nouvelle étape · Nouvelle phase',
    })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].ingredientLineKeys).toEqual(['line:a']);
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].ingredientLineKeys).toEqual(['line:a']);
  });

  it('préserve tous les champs d’étape et les identifiants lors de la réorganisation', async () => {
    const user = userEvent.setup();
    const originalStep = {
      id: 'step-complete', title: 'Finition', instructions: 'Assembler',
      ingredientLineKeys: ['line:b'],
      duration: { activeMinutes: 5, restMinutes: 10, treatmentMinutes: 2 },
      temperatureCelsius: 65,
      equipment: ['Couteau', 'Planche'],
      manufacturingVigilance: ['Vérifier la texture'],
      qualityControls: [{ instruction: 'Couleur', expectedCriterion: 'Dorée', correctiveAction: 'Ajuster' }],
      sanitaryControls: [{ instruction: 'Contrôler la température', expectedCriterion: '65°C' }],
    };
    view({
      initialDraft: {
        ...props.initialDraft, revision: 4,
        phases: [
          { id: 'phase-one', title: 'Préparation', instructions: 'Nettoyer',
            ingredientLineKeys: ['line:a'], steps: [originalStep] },
          { id: 'phase-two', title: 'Assemblage', instructions: '', ingredientLineKeys: [], steps: [] },
        ],
      },
    });
    await user.click(within(navigation()).getByRole('button', { name: 'Sélectionner phase 2 : Assemblage' }));
    await user.click(screen.getByRole('button', { name: 'Monter phase 2' }));
    await user.click(within(navigation()).getByRole('button', { name: 'Sélectionner étape 1 : Finition' }));
    await user.click(screen.getByRole('button', { name: /Temps, température et équipements/ }));
    expect(screen.getByRole('spinbutton', { name: 'Temps actif (min)' })).toHaveValue(5);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const payload = mocks.save.mock.calls[0][0];
    expect(payload.expectedRevision).toBe(4);
    expect(payload.phases.map((phase) => phase.id)).toEqual(['phase-two', 'phase-one']);
    expect(payload.phases[1].ingredientLineKeys).toEqual(['line:a']);
    expect(payload.phases[1].steps[0]).toMatchObject(originalStep);
  });

  it('préserve le réordonnancement des étapes avec leurs ingrédients', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    await user.click(within(navigation()).getByRole('button', { name: 'Ajouter une étape à la phase 1' }));
    const second = screen.getByRole('article', { name: 'Étape 2' });
    const group = within(second).getByRole('group', { name: 'Ingrédients affectés à cette étape' });
    await user.click(within(group).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(group).getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: 'Monter étape 2' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const steps = mocks.save.mock.calls[0][0].phases[0].steps;
    expect(steps).toHaveLength(2);
    expect(steps[0].ingredientLineKeys).toEqual(['line:b']);
    expect(steps[1].ingredientLineKeys).toEqual([]);
    expect(new Set(steps.map((step) => step.id)).size).toBe(2);
  });

  it('demande confirmation avant de supprimer une étape, puis sélectionne sa voisine', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    await user.click(within(navigation()).getByRole('button', { name: 'Ajouter une étape à la phase 1' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer étape 2' }));
    expect(screen.getByRole('dialog', { name: 'Supprimer cette étape ?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('article', { name: 'Étape 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer étape 2' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }));
    expect(screen.getByRole('article', { name: 'Étape 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps).toHaveLength(1);
  });

  it('supprime une phase vide depuis l’arbre sans dialogue et conserve le PUT explicite', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    await user.click(within(navigation()).getByRole('button', { name: 'Supprimer phase 1' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(navigation()).queryByRole('button', { name: /Sélectionner phase/ }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Modifications non enregistrées')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases).toEqual([]);
  });

  it('demande confirmation pour une phase avec instructions, même sans étapes', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    await user.type(screen.getByRole('textbox', { name: 'Instructions de la phase' }), 'Vérifier le poste');
    await user.click(within(navigation()).getByRole('button', { name: 'Supprimer phase 1' }));
    expect(screen.getByRole('dialog', { name: 'Supprimer cette phase ?' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase' })).toBeInTheDocument();
  });

  it('annule le renommage avec Échap sans modifier le brouillon', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await user.click(within(navigation()).getByRole('button', { name: 'Renommer phase 1' }));
    const title = within(navigation()).getByRole('textbox', { name: 'Renommer phase 1' });
    await user.clear(title);
    await user.type(title, 'Nom temporaire{Escape}');
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase' })).toBeInTheDocument();
    expect(screen.getByText('À jour')).toBeInTheDocument();
  });

  it('protège une phase portant uniquement des ingrédients', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    const group = screen.getByRole('group', {
      name: 'Ingrédients directement affectés à la phase',
    });
    await user.click(within(group).getByRole('button', { name: 'Associer des ingrédients' }));
    await user.click(within(group).getAllByRole('checkbox')[0]);
    await user.click(within(navigation()).getByRole('button', { name: 'Supprimer phase 1' }));
    expect(screen.getByRole('dialog', { name: 'Supprimer cette phase ?' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
    expect(screen.getByRole('group', { name: 'Ingrédients directement affectés à la phase' })).toBeInTheDocument();
  });

  it('conserve un focus visible et non doublé pour les instructions', async () => {
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    const instructions = screen.getByRole('textbox', { name: 'Instructions de la phase' });
    await user.click(instructions);
    expect(instructions).toHaveFocus();
    expect(instructions).toHaveClass('focus-visible:border-ring', 'focus-visible:ring-0');
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase' })).toBeInTheDocument();
  });

  it('demande confirmation avant de supprimer une phase et ses étapes', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    await user.click(within(navigation()).getByRole('button', { name: 'Sélectionner phase 1 : Nouvelle phase' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer phase 1' }));
    expect(screen.getByRole('dialog', { name: 'Supprimer cette phase ?' }))
      .toHaveTextContent('toutes ses étapes');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Supprimer' }));
    expect(within(navigation()).queryByRole('button', { name: /Sélectionner phase/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases).toEqual([]);
  });

  it('conserve les anciens justificatifs cachés et ne force aucune affectation', async () => {
    const user = userEvent.setup();
    view({ initialDraft: {
      ...props.initialDraft,
      unassignedReasons: [{ lineKey: 'line:a', reason: 'Justification historique' }],
    } });
    const rail = screen.getByRole('complementary', { name: 'Suivi des ingrédients' });
    expect(within(rail).queryByRole('textbox')).not.toBeInTheDocument();
    await addFreePhase(user);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].unassignedReasons)
      .toEqual([{ lineKey: 'line:a', reason: 'Justification historique' }]);
  });

  it('préserve les saisies locales en cas de 409 et confirme le remplacement avant rechargement', async () => {
    mocks.save.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({ status: 409 }) });
    const user = userEvent.setup();
    view();
    await addFreePhase(user);
    await renamePhase(user, 1, 'Nouvelle phase modifiée');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Le brouillon local reste affiché');
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase modifiée' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Recharger le brouillon' }));
    expect(screen.getByRole('dialog', { name: 'Recharger le brouillon ?' }))
      .toHaveTextContent('Les modifications locales non enregistrées');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
    expect(mocks.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase modifiée' })).toBeInTheDocument();
  });

  it('laisse les outils de navigation à un lecteur mais masque les actions de modification', async () => {
    const user = userEvent.setup();
    view({ canEdit: false, initialDraft: {
      ...props.initialDraft,
      phases: [{ id: 'phase-read', title: 'Préparation', instructions: '',
        ingredientLineKeys: [], steps: [
          { id: 'step-read', title: 'Rincer', instructions: '', ingredientLineKeys: [] },
        ] }],
    } });
    expect(screen.queryByRole('button', { name: 'Ajouter une phase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
    await user.click(within(navigation()).getByRole('button', { name: 'Replier phase 1' }));
    await user.click(within(navigation()).getByRole('button', { name: 'Déplier phase 1' }));
    expect(within(navigation()).getByRole('button', { name: 'Sélectionner étape 1 : Rincer' }))
      .toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('garde un aperçu chronologique sans altérer les instructions du brouillon', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Assembler la tartine');
    await user.click(screen.getByRole('button', { name: 'Aperçu du process' }));
    expect(screen.getByRole('region', { name: 'Aperçu du process' }))
      .toHaveTextContent('Assembler la tartine');
    await user.click(screen.getByRole('button', { name: 'Revenir à l’édition' }));
    expect(screen.getByRole('textbox', { name: 'Instructions' })).toHaveValue('Assembler la tartine');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('signale les identifiants historiques sans association automatique', async () => {
    const user = userEvent.setup();
    view({ sourceIngredients: { ...ingredients, hasLegacyLineIdentity: true } });
    await addFreePhase(user);
    expect(screen.getByRole('note')).toHaveTextContent('identifiants limités');
    expect(within(screen.getByRole('complementary', { name: 'Suivi des ingrédients' }))
      .getByRole('status')).toHaveTextContent('0 affectés · 2 à affecter');
  });
});
