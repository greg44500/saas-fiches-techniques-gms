import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/shared/info-tooltip', () => ({
  InfoTooltip: ({ content, label }) => (
    <button
      aria-label={label}
      data-content={content}
      type="button"
    />
  ),
}));

const mocks = vi.hoisted(() => ({
  duplicateCheck: vi.fn(),
  createProduct: vi.fn(),
  globalDuplicateCheck: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useCreateProductMutation: () => [
    mocks.createProduct,
    { isLoading: false },
  ],
  useDuplicateCheckProductMutation: () => [
    mocks.duplicateCheck,
    { isLoading: false },
  ],
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useCreateProductReferenceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useDuplicateCheckProductReferenceMutation: () => [
    mocks.globalDuplicateCheck,
    { isLoading: false },
  ],
}));

import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';

const metadata = {
  categories: [{ id: 'category-1', name: 'Légumes', status: 'ACTIVE' }],
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
  conservationTypes: [{ value: 'FRAIS', label: 'Frais' }],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [
    {
      value: 1,
      label: 'Gamme 1',
      name: 'Frais',
      processingStates: ['Produit frais'],
      defaultProcessingState: 'Produit frais',
    },
    {
      value: 6,
      label: 'Gamme 6',
      name: 'PAI / PAE',
      processingStates: ['PAI / PAE'],
      defaultProcessingState: 'PAI / PAE',
    },
  ],
};

function resolved(value) {
  return { unwrap: vi.fn().mockResolvedValue(value) };
}

describe('ProductCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('préserve la saisie lorsque les métadonnées arrivent après ouverture', async () => {
    const user = userEvent.setup();
    const callbacks = {
      onClose: vi.fn(),
      onCreated: vi.fn(),
      onUseExisting: vi.fn(),
    };
    mocks.globalDuplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [],
    }));

    const renderDialog = (currentMetadata) => (
      <ProductCreateDialog
        {...callbacks}
        metadata={currentMetadata}
        mode="global"
        open
      />
    );
    const { rerender } = render(renderDialog(undefined));
    const input = screen.getByLabelText('Nom du Produit');
    const productName = 'Produit saisi avant chargement des métadonnées';

    await user.type(input, productName);
    rerender(renderDialog(metadata));

    expect(input).toHaveValue(productName);
    expect(screen.getByRole('button', { name: 'Rechercher l’existant' }))
      .toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));
    await waitFor(() => {
      expect(screen.getByRole('button', {
        name: 'Créer dans le référentiel global',
      })).toBeEnabled();
    });
  });

  it('confirme explicitement qu’aucun Produit existant ne correspond avant la création', async () => {
    const user = userEvent.setup();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [],
    }));

    render(
      <ProductCreateDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        onUseExisting={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom du Produit'), 'Abricotier');
    await user.click(screen.getByRole('button', {
      name: 'Rechercher l’existant',
    }));

    expect(await screen.findByText(
      'Aucun Produit existant correspondant n’a été trouvé.',
    )).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('border-warning/40');
    expect(screen.getByRole('button', {
      name: 'Aide sur la création d’un Produit',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Aide sur la nouvelle identité',
    })).toBeInTheDocument();
  });

  it('guide discrètement la recherche du parent sans notion d’étape', () => {
    render(
      <ProductCreateDialog
        initialName="Croissant individuel prêt à cuire"
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        onUseCandidate={vi.fn()}
        onUseExisting={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText('Rechercher un Produit existant')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Aide sur la recherche du Produit parent',
    })).toHaveAttribute('data-content', expect.stringContaining('Croissant'));
    expect(screen.queryByText(/Étape 1/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nom du Produit'))
      .toHaveValue('Croissant individuel prêt à cuire');
  });

  it('actualise les suggestions automatiquement sans nouveau clic de recherche', async () => {
    const user = userEvent.setup();
    const onUseCandidate = vi.fn();
    const duplicateCheckRequest = vi.fn().mockImplementation(async ({ name }) => ({
      exactMatch: null,
      candidates: name === 'Pâte'
        ? [{ id: 'product-1', name: 'Pâte à tartiner', status: 'ACTIVE' }]
        : [{ id: 'product-2', name: 'Pâte feuilletée', status: 'ACTIVE' }],
    }));
    render(<ProductCreateDialog
      duplicateCheckRequest={duplicateCheckRequest}
      initialName=""
      metadata={metadata}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      onUseCandidate={onUseCandidate}
      onUseExisting={vi.fn()}
      open
      workspaceId="workspace-1"
    />);

    const input = screen.getByLabelText('Nom du Produit');
    await user.type(input, 'Pâte');
    expect(screen.queryByRole('button', { name: 'Rechercher l’existant' }))
      .not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Pâte à tartiner')).toBeInTheDocument();
    });
    await user.type(input, ' feuilletée');
    await waitFor(() => {
      expect(screen.getByText('Pâte feuilletée')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pâte à tartiner')).not.toBeInTheDocument();
    expect(duplicateCheckRequest).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1', name: 'Pâte feuilletée', aliases: [],
    });
    await user.click(screen.getByRole('button', { name: 'Utiliser ce Produit' }));
    expect(onUseCandidate).toHaveBeenCalledWith(
      'product-2', expect.objectContaining({ name: 'Pâte feuilletée' }),
    );
  });

  it('ouvre un Produit actif parmi les proches au lieu de forcer un doublon', async () => {
    const user = userEvent.setup();
    const onUseExisting = vi.fn();
    const onCreated = vi.fn();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [{
        id: 'product-croissant',
        name: 'Croissant individuel PAI',
        status: 'ACTIVE',
        category: { name: 'Matières premières de pâtisserie et boulangerie' },
      }],
    }));

    render(<ProductCreateDialog
      metadata={metadata}
      onClose={vi.fn()}
      onCreated={onCreated}
      onUseExisting={onUseExisting}
      open
      workspaceId="workspace-1"
    />);

    await user.type(screen.getByLabelText('Nom du Produit'), 'croissant');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));
    expect(await screen.findByText('Croissant individuel PAI')).toBeInTheDocument();
    expect(screen.getByText(/Cochez « Différent » uniquement/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Différent' })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Ouvrir ce Produit' }));
    expect(onUseExisting).toHaveBeenCalledTimes(1);
    expect(onUseExisting).toHaveBeenCalledWith('product-croissant');
    expect(mocks.createProduct).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('n’offre pas de réutilisation Workspace pour un Produit proche archivé', async () => {
    const user = userEvent.setup();
    const onUseExisting = vi.fn();
    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [{
        id: 'product-old',
        name: 'Croissant ancien',
        status: 'ARCHIVED',
      }],
    }));
    render(<ProductCreateDialog
      metadata={metadata}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      onUseExisting={onUseExisting}
      open
      workspaceId="workspace-1"
    />);

    await user.type(screen.getByLabelText('Nom du Produit'), 'croissant');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));
    expect(await screen.findByText('Croissant ancien')).toBeInTheDocument();
    expect(screen.getByText('Produit archivé — non réutilisable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ouvrir ce Produit' }))
      .not.toBeInTheDocument();
    expect(onUseExisting).not.toHaveBeenCalled();
  });

  it('permet à l’administration globale d’ouvrir un Produit proche archivé', async () => {
    const user = userEvent.setup();
    const onUseExisting = vi.fn();
    mocks.globalDuplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [{
        id: 'product-archived',
        name: 'Croissant ancien',
        status: 'ARCHIVED',
      }],
    }));
    render(<ProductCreateDialog
      metadata={metadata}
      mode="global"
      onClose={vi.fn()}
      onCreated={vi.fn()}
      onUseExisting={onUseExisting}
      open
    />);

    await user.type(screen.getByLabelText('Nom du Produit'), 'croissant');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));
    expect(await screen.findByText('Croissant ancien')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ouvrir ce Produit' }));
    expect(onUseExisting).toHaveBeenCalledWith('product-archived');
    expect(screen.getByRole('checkbox', { name: 'Différent' })).not.toBeChecked();
  });

  it('demande une confirmation globale explicite avant de créer un Produit proche', async () => {
    const user = userEvent.setup();
    const createRequest = vi.fn().mockResolvedValue({
      classification: 'PROVISIONAL',
      provisionalReference: { id: 'new-product', variant: { id: 'new-variant' } },
    });
    const duplicateCheckRequest = vi.fn().mockResolvedValue({
      exactMatch: null,
      candidates: [
        { id: 'product-1', name: 'Pâte d’amande', status: 'ACTIVE' },
        { id: 'product-2', name: 'Pâte feuilletée', status: 'ACTIVE' },
      ],
    });
    render(<ProductCreateDialog
      createRequest={createRequest}
      duplicateCheckRequest={duplicateCheckRequest}
      initialName="Pâte"
      metadata={metadata}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      onUseCandidate={vi.fn()}
      onUseExisting={vi.fn()}
      open
      workspaceId="workspace-1"
    />);

    await screen.findByText('Pâte feuilletée');
    expect(screen.queryAllByRole('checkbox', { name: 'Différent' })).toHaveLength(0);
    const confirmation = screen.getByRole('checkbox', {
      name: /J’ai examiné ces Produits/,
    });
    expect(confirmation).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Soumettre la proposition' }))
      .not.toBeInTheDocument();
    await user.click(confirmation);
    await user.click(screen.getByRole('button', { name: 'Soumettre la proposition' }));
    await waitFor(() => expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Pâte',
        forceCreate: true,
        reviewedCandidateIds: ['product-1', 'product-2'],
      }),
    ));
  });

  it('refuse de créer si une correspondance exacte est renvoyée', async () => {
    const user = userEvent.setup();
    const duplicateCheckRequest = vi.fn().mockResolvedValue({
      exactMatch: { id: 'same-product', name: 'Croissant', status: 'ACTIVE' },
      candidates: [],
    });
    render(<ProductCreateDialog
      duplicateCheckRequest={duplicateCheckRequest}
      initialName="Croissant"
      metadata={metadata}
      onClose={vi.fn()}
      onCreated={vi.fn()}
      onUseCandidate={vi.fn()}
      onUseExisting={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    await screen.findByRole('button', { name: 'Utiliser ce Produit' });
    expect(screen.queryByRole('button', { name: 'Soumettre la proposition' }))
      .not.toBeInTheDocument();
    expect(duplicateCheckRequest).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Utiliser ce Produit' }));
  });

  it('privilégie une correspondance exacte au lieu de créer un doublon', async () => {
    const user = userEvent.setup();
    const onUseExisting = vi.fn();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: {
        id: 'product-existing',
        name: 'Carotte',
        aliases: [],
        category: { id: 'category-1', name: 'Légumes' },
        status: 'ACTIVE',
      },
      candidates: [],
    }));

    render(
      <ProductCreateDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        onUseExisting={onUseExisting}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom du Produit'), 'Carotte');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));
    await user.click(await screen.findByRole('button', { name: 'Ouvrir ce Produit' }));

    expect(onUseExisting).toHaveBeenCalledWith('product-existing');
    expect(mocks.createProduct).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Alias')).not.toBeInTheDocument();
  });

  it('signale une correspondance exacte archivée sans proposer de l ouvrir côté Workspace', async () => {
    const user = userEvent.setup();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: {
        id: 'product-archived',
        name: 'Carotte ancienne',
        aliases: [],
        category: { id: 'category-1', name: 'Légumes' },
        status: 'ARCHIVED',
      },
      candidates: [],
    }));

    render(
      <ProductCreateDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={vi.fn()}
        onUseExisting={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom du Produit'), 'Carotte ancienne');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));

    expect(await screen.findByText(/référence est archivée/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ouvrir ce Produit' }))
      .not.toBeInTheDocument();
  });

  it('exige la revue des candidats mais autorise une catégorie absente', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    mocks.duplicateCheck.mockReturnValue(resolved({
      exactMatch: null,
      candidates: [
        { id: 'candidate-1', name: 'Carotte entière', category: { name: 'Légumes' } },
        { id: 'candidate-2', name: 'Carottes', category: { name: 'Légumes' } },
      ],
    }));
    mocks.createProduct.mockReturnValue(resolved({
      classification: 'PROVISIONAL',
      provisionalReference: {
        id: 'product-provisional',
        name: 'Carotte nouvelle',
        governanceStatus: 'PROVISIONAL',
      },
      contribution: {
        id: 'contribution-1',
        status: 'PENDING_REVIEW',
      },
    }));

    render(
      <ProductCreateDialog
        metadata={metadata}
        onClose={vi.fn()}
        onCreated={onCreated}
        onUseExisting={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom du Produit'), 'Carotte nouvelle');
    await user.click(screen.getByRole('button', { name: 'Rechercher l’existant' }));

    const reviews = await screen.findAllByRole('checkbox', { name: 'Différent' });
    await user.click(reviews[0]);
    await user.click(reviews[1]);

    const createButton = screen.getByRole('button', {
      name: 'Soumettre la proposition',
    });
    expect(createButton).toBeEnabled();

    await user.click(createButton);

    await waitFor(() => {
      expect(mocks.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          name: 'Carotte nouvelle',
          categoryId: null,
          reviewedCandidateIds: ['candidate-1', 'candidate-2'],
          forceCreate: true,
          variant: expect.objectContaining({
            name: 'Carotte nouvelle',
            conservationType: 'FRAIS',
            processingState: null,
            referenceUnit: 'KG',
          }),
        }),
      );
    });
    expect(onCreated).toHaveBeenCalled();
  });

});
