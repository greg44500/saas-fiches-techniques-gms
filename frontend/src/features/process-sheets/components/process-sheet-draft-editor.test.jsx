import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  save: vi.fn(), validate: vi.fn(), reload: vi.fn(), phaseTitles: vi.fn(), createTitle: vi.fn(),
}));
vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useSaveProcessSheetDraftMutation: () => [mocks.save, { isLoading: false }],
  useValidateProcessSheetMutation: () => [mocks.validate, { isLoading: false }],
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
      processRevision: body.expectedRevision + 1,
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
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
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
    const dialog = screen.getByRole('dialog', { name: 'Temps, température et équipements' });
    expect(within(dialog).getByRole('spinbutton', { name: 'Temps actif (min)' })).toHaveValue(5);
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const payload = mocks.save.mock.calls[0][0];
    expect(payload.expectedRevision).toBe(4);
    expect(payload.phases.map((phase) => phase.id)).toEqual(['phase-two', 'phase-one']);
    expect(payload.phases[1].ingredientLineKeys).toEqual(['line:a']);
    expect(payload.phases[1].steps[0]).toMatchObject(originalStep);
  });

  it('ouvre la modale des temps avec champs outlined et ne valide que localement', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.click(within(step).getByRole('button', { name: /Temps, température et équipements/ }));
    const dialog = screen.getByRole('dialog', { name: 'Temps, température et équipements' });
    expect(within(dialog).getByRole('button', {
      name: 'À propos de Temps, température et équipements',
    })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Informations facultatives de l’étape/))
      .not.toBeInTheDocument();
    const active = within(dialog).getByRole('spinbutton', { name: 'Temps actif (min)' });
    expect(active).toHaveAttribute('placeholder', 'Ex. 15');
    expect(within(dialog).getByText('Temps actif (min)')).toHaveAttribute('for', active.id);
    expect(within(dialog).getByText('Repos (min)')).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: 'Repos / attente (min)' }))
      .toBeInTheDocument();
    expect(within(dialog).getByText('Cuisson (min)')).toBeInTheDocument();
    expect(within(dialog).getByRole('spinbutton', { name: 'Cuisson / traitement (min)' }))
      .toBeInTheDocument();
    await user.type(active, '15');
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Température (°C)' }), '65.5');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Équipements 1' }), 'Four');
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(step).getByRole('button', { name: /Temps, température et équipements/ }))
      .toHaveTextContent('Renseignés');
    expect(within(step).getByRole('button', {
      name: /Vigilance, qualité et maîtrise sanitaire/,
    })).toHaveTextContent('Facultatifs');
    expect(mocks.save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Temps, température et équipements/ }));
    expect(within(screen.getByRole('dialog')).getByRole('spinbutton', {
      name: 'Temps actif (min)',
    })).toHaveValue(15);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0]).toMatchObject({
      duration: { activeMinutes: 15 }, temperatureCelsius: 65.5, equipment: ['Four'],
    });
  });

  it('annule les saisies de la modale sans modifier le brouillon local', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(screen.queryByText('Brouillon enregistré.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Temps, température et équipements/ }));
    let dialog = screen.getByRole('dialog', { name: 'Temps, température et équipements' });
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Temps actif (min)' }), '25');
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    expect(screen.getByText('Enregistré')).toHaveClass('text-success');
    await user.click(screen.getByRole('button', { name: /Temps, température et équipements/ }));
    dialog = screen.getByRole('dialog', { name: 'Temps, température et équipements' });
    expect(within(dialog).getByRole('spinbutton', { name: 'Temps actif (min)' })).toHaveValue(null);
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: /Temps, température et équipements/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider' }));
    expect(screen.getByText('Enregistré')).toHaveClass('text-success');
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toHaveAttribute('aria-disabled', 'true');
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it('édite les vigilances, contrôles qualité et sanitaires dans une seconde modale', async () => {
    const user = userEvent.setup();
    view();
    const step = await addStep(user);
    await user.click(within(step).getByRole('button', {
      name: /Vigilance, qualité et maîtrise sanitaire/,
    }));
    const dialog = screen.getByRole('dialog', {
      name: 'Vigilance, qualité et maîtrise sanitaire',
    });
    expect(within(dialog).getByRole('button', {
      name: 'À propos de Vigilance, qualité et maîtrise sanitaire',
    })).toBeInTheDocument();
    expect(within(dialog).queryByText(/Informations facultatives de l’étape/))
      .not.toBeInTheDocument();
    expect(within(dialog).queryByRole('spinbutton')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Points de vigilance 1' }),
      'Surveiller la texture');
    const quality = within(dialog).getByRole('group', { name: 'Qualité' });
    await user.click(within(quality).getByRole('button', { name: 'Ajouter un contrôle' }));
    await user.type(within(quality).getByRole('textbox', { name: 'Qualité Instruction 1' }),
      'Vérifier la couleur');
    await user.type(within(quality).getByRole('textbox', { name: 'Qualité Critère attendu 1' }),
      'Dorée');
    const sanitary = within(dialog).getByRole('group', { name: 'Maîtrise sanitaire' });
    await user.click(within(sanitary).getByRole('button', { name: 'Ajouter un contrôle' }));
    await user.type(within(sanitary).getByRole('textbox', {
      name: 'Maîtrise sanitaire Instruction 1',
    }), 'Contrôler la température');
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }));
    expect(within(step).getByRole('button', {
      name: /Vigilance, qualité et maîtrise sanitaire/,
    })).toHaveTextContent('Renseignés');
    expect(within(step).getByRole('button', { name: /Temps, température et équipements/ }))
      .toHaveTextContent('Facultatifs');
    expect(mocks.save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0]).toMatchObject({
      manufacturingVigilance: ['Surveiller la texture'],
      qualityControls: [{ instruction: 'Vérifier la couleur', expectedCriterion: 'Dorée' }],
      sanitaryControls: [{ instruction: 'Contrôler la température' }],
    });
  });

  it('bloque les lignes facultatives incomplètes avant de les placer dans le brouillon', async () => {
    const user = userEvent.setup();
    view();
    await addStep(user);
    await user.click(screen.getByRole('button', { name: /Vigilance, qualité et maîtrise sanitaire/ }));
    const dialog = screen.getByRole('dialog', { name: 'Vigilance, qualité et maîtrise sanitaire' });
    const quality = within(dialog).getByRole('group', { name: 'Qualité' });
    await user.click(within(quality).getByRole('button', { name: 'Ajouter un contrôle' }));
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Renseignez chaque vigilance');
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(mocks.save.mock.calls[0][0].phases[0].steps[0].qualityControls).toEqual([]);
  });

  it('utilise une modale pour l’échec d’enregistrement, sans message technique brut dans la page', async () => {
    const user = userEvent.setup();
    view();
    expect(screen.getByText('Enregistré')).toHaveClass('text-success');
    await addFreePhase(user);
    expect(screen.getByText('Modifications non enregistrées')).toHaveClass('text-warning');
    mocks.save.mockReturnValue({ unwrap: vi.fn().mockRejectedValue({
      status: 500, data: { message: 'Échec serveur' },
    }) });
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(await screen.findByText('Non enregistré')).toHaveClass('text-muted-foreground');
    expect(screen.getByRole('dialog', { name: 'Enregistrement impossible' }))
      .toHaveTextContent('Votre travail reste affiché');
    expect(screen.queryByText('Échec serveur')).not.toBeInTheDocument();
  });

  it('conserve les deux modales consultables mais non modifiables en lecture seule', async () => {
    const user = userEvent.setup();
    view({ canEdit: false, initialDraft: {
      ...props.initialDraft,
      phases: [{ id: 'phase-read', title: 'Préparation', instructions: '',
        ingredientLineKeys: [], steps: [
          { id: 'step-read', title: 'Rincer', instructions: '', ingredientLineKeys: [],
            duration: { activeMinutes: 5 }, manufacturingVigilance: ['Vérifier le rinçage'] },
        ] }],
    } });
    await user.click(screen.getByRole('button', { name: /Temps, température et équipements/ }));
    let dialog = screen.getByRole('dialog', { name: 'Temps, température et équipements' });
    expect(within(dialog).getByRole('spinbutton', { name: 'Temps actif (min)' })).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    await user.click(screen.getByRole('button', { name: /Vigilance, qualité et maîtrise sanitaire/ }));
    dialog = screen.getByRole('dialog', { name: 'Vigilance, qualité et maîtrise sanitaire' });
    expect(within(dialog).getByRole('textbox', { name: 'Points de vigilance 1' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Fermer' }));
    expect(mocks.save).not.toHaveBeenCalled();
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
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
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
    expect(await screen.findByText('Enregistrement à vérifier')).toHaveClass('text-muted-foreground');
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase modifiée' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('button', { name: 'Recharger le brouillon' }));
    expect(screen.getByRole('dialog', { name: 'Recharger le brouillon ?' }))
      .toHaveTextContent('Les modifications locales non enregistrées');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
    expect(mocks.reload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Phase 1 : Nouvelle phase modifiée' })).toBeInTheDocument();
  });

  it('laisse naviguer le lecteur avec les actions d’écriture visibles mais désactivées', async () => {
    const user = userEvent.setup();
    view({ canEdit: false, initialDraft: {
      ...props.initialDraft,
      phases: [{ id: 'phase-read', title: 'Préparation', instructions: '',
        ingredientLineKeys: [], steps: [
          { id: 'step-read', title: 'Rincer', instructions: '', ingredientLineKeys: [] },
        ] }],
    } });
    expect(screen.queryByRole('button', { name: 'Ajouter une phase' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Valider la Fiche process' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('group', { name: 'Actions de la Fiche process' })).toBeInTheDocument();
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

  const readyDraft = {
    id: 'draft-1', revision: 0, unassignedReasons: [],
    phases: [{
      id: 'phase-validate-1', title: 'Préparation', instructions: '',
      ingredientLineKeys: [], steps: [{
        id: 'step-validate-1', title: 'Assembler', instructions: 'Mélanger les ingrédients',
        ingredientLineKeys: [],
      }],
    }],
  };

  it('empêche de confirmer une procédure sans étape documentée', async () => {
    const user = userEvent.setup();
    view({ canValidate: true, processRevision: 0 });
    await user.click(screen.getByRole('button', { name: 'Valider la Fiche process' }));
    expect(screen.getByRole('dialog', { name: 'Valider quand même' }))
      .toHaveTextContent('Au moins une étape avec des instructions est nécessaire');
    expect(screen.getByRole('button', { name: 'Valider quand même' })).toBeDisabled();
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('valide explicitement via la révision process sans enregistrer automatiquement', async () => {
    const user = userEvent.setup();
    view({ canValidate: true, processRevision: 0, initialDraft: readyDraft });
    const button = screen.getByRole('button', { name: 'Valider la Fiche process' });
    expect(button).toBeEnabled();
    mocks.validate.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      id: 'process-1', editorialState: 'VALIDATED',
    }) });
    mocks.reload.mockResolvedValue({ data: { draft: readyDraft } });
    await user.click(button);
    expect(screen.getByRole('dialog', { name: 'Valider quand même' }))
      .toHaveTextContent('2 ingrédient(s) ne sont associés');
    expect(mocks.validate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Valider quand même' }));
    expect(mocks.validate).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', dossierId: 'dossier-1',
      processSheetId: 'process-1', expectedRevision: 0,
    });
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.reload).toHaveBeenCalledTimes(1);
  });

  it('autorise la revalidation quand la révision agrégat diffère de celle du brouillon', async () => {
    const user = userEvent.setup();
    const initialDraft = { ...readyDraft, revision: 1 };
    view({ canValidate: true, editorialState: 'DRAFT', processRevision: 2, initialDraft });
    const button = screen.getByRole('button', { name: 'Valider la Fiche process' });
    expect(button).toBeEnabled();
    mocks.validate.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      id: 'process-1', revision: 3, editorialState: 'VALIDATED',
    }) });
    mocks.reload.mockResolvedValue({ data: { draft: initialDraft } });
    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Valider quand même' }));
    expect(mocks.validate).toHaveBeenCalledWith(expect.objectContaining({
      expectedRevision: 2,
    }));
  });

  it('utilise après sauvegarde la nouvelle révision agrégat et non celle du brouillon', async () => {
    const user = userEvent.setup();
    view({ canValidate: true, editorialState: 'DRAFT', processRevision: 2,
      initialDraft: { ...props.initialDraft, revision: 1 } });
    const step = await addStep(user);
    await user.type(within(step).getByRole('textbox', { name: 'Instructions' }), 'Assembler');
    mocks.save.mockImplementation((body) => ({
      unwrap: vi.fn().mockResolvedValue({
        id: 'draft-1', revision: 2, processRevision: 3,
        phases: body.phases, unassignedReasons: body.unassignedReasons,
      }),
    }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    const button = screen.getByRole('button', { name: 'Valider la Fiche process' });
    expect(button).toBeEnabled();
    mocks.validate.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({
      id: 'process-1', revision: 4, editorialState: 'VALIDATED',
    }) });
    mocks.reload.mockResolvedValue({ data: { draft: { ...props.initialDraft, revision: 2 } } });
    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'Valider quand même' }));
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 1 }));
    expect(mocks.validate).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 3 }));
  });

  it('explique pourquoi une Fiche process déjà validée ne peut pas être validée à nouveau', () => {
    view({ canValidate: true, editorialState: 'VALIDATED' });
    expect(screen.getByRole('button', { name: 'Valider la Fiche process' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('group', { name: 'Actions de la Fiche process' }))
      .toBeInTheDocument();
  });

  it('bloque la validation en présence de changements locaux ou de M-004 décalée', () => {
    view({ canValidate: true, processRevision: 0, compositionOutdated: true });
    expect(screen.getByRole('button', { name: 'Valider la Fiche process' })).toHaveAttribute('aria-disabled', 'true');
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('signale les identifiants historiques sans association automatique', async () => {
    const user = userEvent.setup();
    view({ sourceIngredients: { ...ingredients, hasLegacyLineIdentity: true } });
    await addFreePhase(user);
    expect(screen.getByRole('button', { name: 'À propos de la composition historique' })).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Suivi des ingrédients' }))
      .getByRole('status')).toHaveTextContent('0 affectés · 2 à affecter');
  });
});
