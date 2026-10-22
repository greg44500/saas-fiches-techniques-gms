import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  createArticle: vi.fn(),
  metadataQuery: vi.fn(),
  standardMetadataQuery: vi.fn(),
  creationSearchQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useGetProductMetadataQuery: mocks.standardMetadataQuery,
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: ({
    onSelect, onValueChange, onCreateMissingReference,
    onDebouncedSearchChange, externalSearch, externalQuery,
  }) => (
    <>
      <button
      onClick={() => {
        const result = {
          product: { id: 'product-abricot', name: 'Abricot' },
          variant: {
            id: 'variant-abricot',
            name: 'Abricot',
            referenceUnit: 'KG',
          },
        };

        onSelect(result);
        onValueChange('Abricot');
      }}
      type="button"
    >
      Choisir Abricot
      </button>
      <button
        data-contextual-search={externalSearch ? 'enabled' : 'disabled'}
        data-contextual-query={externalQuery ? 'provided' : 'absent'}
        onClick={() => {
          onValueChange('Œufs blancs pasteurisés');
          onDebouncedSearchChange?.('Œufs blancs pasteurisés');
        }}
        type="button"
      >
        Rechercher Œufs blancs pasteurisés
      </button>
      {onCreateMissingReference && (
        <div aria-label="Suggestions Produits">
          <button
            onClick={() => {
              onCreateMissingReference('Œufs blancs pasteurisés');
              // Reproduit un événement de fermeture tardif de Base UI :
              // il ne doit pas annuler la décision explicite.
              onValueChange('');
            }}
            type="button"
          >
            Créer cette Référence
          </button>
        </div>
      )}
    </>
  ),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useGetSupplierArticleCreationProductMetadataQuery: mocks.metadataQuery,
  useSearchSupplierArticleCreationProductsQuery: mocks.creationSearchQuery,
  useCreateSupplierArticleMutation: () => [
    mocks.createArticle,
    { isLoading: false },
  ],
}));

import {
  SupplierArticleFormDialog,
} from '@/features/suppliers/components/supplier-article-form-dialog';

function renderDialog(onSaved = vi.fn(), props = {}) {
  return render(
    <TooltipProvider>
      <SupplierArticleFormDialog
        onClose={vi.fn()}
        onSaved={onSaved}
        open
        suppliers={[{
          id: 'supplier-1',
          name: 'Sysco',
        }]}
        workspaceId="workspace-1"
        {...props}
      />
    </TooltipProvider>,
  );
}

async function selectOption(user, triggerName, optionName) {
  const trigger = screen.getByRole('combobox', {
    name: triggerName,
  });

  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
  );

  await user.click(trigger);
  await user.click(await screen.findByRole('option', {
    name: optionName,
  }));
}

describe('SupplierArticleFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.creationSearchQuery.mockReturnValue({
      currentData: { results: [] },
      data: { results: [] },
      isSuccess: true,
      isFetching: false,
      isError: false,
    });

    const metadata = {
      data: {
        referenceUnits: [
          { value: 'KG', label: 'kg' },
          { value: 'UNIT', label: 'pièce' },
        ],
      },
    };
    mocks.metadataQuery.mockReturnValue(metadata);
    mocks.standardMetadataQuery.mockReturnValue(metadata);
    mocks.createArticle.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        id: 'article-1',
      }),
    });
  });

  it('conserve la Référence Produit choisie quand l autocomplete applique son libellé', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    renderDialog(onSaved);

    await selectOption(
      user,
      'Sélectionner le Fournisseur',
      'Sysco',
    );

    await user.click(screen.getByRole('button', { name: 'Choisir Abricot' }));

    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'ABR-001',
    );

    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        supplierId: 'supplier-1',
        productVariantId: 'variant-abricot',
        supplierReference: 'ABR-001',
      }),
    );
    expect(onSaved).toHaveBeenCalledWith({ id: 'article-1' });
  });


  it('cherche une Référence avant création par le seul contexte M-003 autorisé', async () => {
    const user = userEvent.setup();
    renderDialog(vi.fn(), { canCreateProduct: true });

    await user.click(screen.getByRole('button', {
      name: 'Rechercher Œufs blancs pasteurisés',
    }));
    expect(mocks.creationSearchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        scope: 'REFERENCE',
        q: 'Œufs blancs pasteurisés',
        page: 1,
        limit: 6,
      }),
      { skip: false },
    );
    expect(mocks.metadataQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
    expect(mocks.standardMetadataQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: true },
    );
    expect(screen.getByRole('button', {
      name: 'Rechercher Œufs blancs pasteurisés',
    })).toHaveAttribute('data-contextual-search', 'enabled');
  });

  it('ne lance pas la recherche contextuelle si le droit d’import est absent', () => {
    renderDialog(vi.fn(), { canCreateProduct: false });
    expect(mocks.creationSearchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'workspace-1' }),
      { skip: true },
    );
    expect(mocks.metadataQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: true },
    );
    expect(mocks.standardMetadataQuery).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
    expect(screen.getByRole('button', {
      name: 'Rechercher Œufs blancs pasteurisés',
    })).toHaveAttribute('data-contextual-search', 'disabled');
    expect(screen.queryByRole('button', { name: 'Créer cette Référence' }))
      .not.toBeInTheDocument();
  });

  it('permet une création en deux temps sans Référence existante, avec contribution immédiate', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderDialog(onSaved, { canCreateProduct: true });

    await selectOption(user, 'Sélectionner le Fournisseur', 'Sysco');
    await user.click(screen.getByRole('button', { name: 'Rechercher Œufs blancs pasteurisés' }));
    await user.click(screen.getByRole('button', { name: 'Créer cette Référence' }));

    const pending = screen.getByRole('status', { name: 'Référence Produit à créer' });
    expect(pending).toHaveTextContent('Œufs blancs pasteurisés');
    expect(screen.getByRole('button', { name: 'Créer l’Article et la Référence' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechercher Œufs blancs pasteurisés' }))
      .not.toBeInTheDocument();

    // Changement de focus et de champs commerciaux : la décision persiste.
    await user.type(screen.getByLabelText('Référence fournisseur'), 'OVO-123');
    await user.type(screen.getByLabelText('Désignation fournisseur'), 'Œufs blancs pasteurisés');
    expect(screen.getByRole('button', { name: 'Créer l’Article et la Référence' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer l’Article et la Référence' }));

    expect(mocks.createArticle).toHaveBeenCalledWith(expect.objectContaining({
      supplierReference: 'OVO-123',
      productVariantId: null,
    }));
    expect(onSaved).toHaveBeenCalledWith(
      { id: 'article-1' },
      { createMissingReference: 'Œufs blancs pasteurisés' },
    );
  });

  it('n’annule la création envisagée que sur action explicite Modifier la recherche', async () => {
    const user = userEvent.setup();
    renderDialog(vi.fn(), { canCreateProduct: true });

    await user.click(screen.getByRole('button', {
      name: 'Rechercher Œufs blancs pasteurisés',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Créer cette Référence',
    }));

    expect(screen.getByRole('button', { name: 'Créer l’Article et la Référence' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier la recherche' }));
    expect(screen.queryByRole('status', { name: 'Référence Produit à créer' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer l’Article', exact: true }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechercher Œufs blancs pasteurisés' }))
      .toBeInTheDocument();
    // Après annulation, un Produit existant doit pouvoir être sélectionné
    // sans recréer de contribution provisoire et sans réutiliser l'ancien nom.
    // Le comportement de sélection est vérifié ici par le formulaire lui-même.
    await user.click(screen.getByRole('button', { name: 'Choisir Abricot' }));
    await selectOption(user, 'Sélectionner le Fournisseur', 'Sysco');
    await user.type(screen.getByLabelText('Référence fournisseur'), 'ABR-REUSE');
    await user.click(screen.getByRole('button', { name: 'Créer l’Article', exact: true }));
    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        productVariantId: 'variant-abricot',
        supplierReference: 'ABR-REUSE',
      }),
    );
  });

  it('exige le nombre de pièces déclaré à la création d’un Article au poids vendu à la pièce', async () => {
    const user = userEvent.setup();
    renderDialog(vi.fn(), {
      initialProductVariant: {
        id: 'variant-croissant',
        name: 'Croissant individuel PAI',
        referenceUnit: 'UNIT',
        countUnitLabelSingular: 'pièce',
        countUnitLabelPlural: 'pièces',
      },
    });
    await selectOption(user, 'Sélectionner le Fournisseur', 'Sysco');
    await user.type(screen.getByLabelText('Référence fournisseur'), 'CRO-43279');
    await user.type(screen.getByLabelText('Contenant principal'), 'Carton');
    await user.type(screen.getByLabelText('Sous-unités'), '36');
    await user.type(screen.getByLabelText('Quantité / sous-unité'), '120');
    await selectOption(user, 'Unité du conditionnement', 'g');
    expect(screen.getByLabelText('Nombre exact de pièces utilisables par colis')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer l’Article' }));
    expect(mocks.createArticle).not.toHaveBeenCalled();
    expect(screen.getByText(/Précisez le nombre exact de pièces/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nombre exact de pièces utilisables par colis'), '36');
    await user.click(screen.getByRole('button', { name: 'Créer l’Article' }));
    expect(mocks.createArticle).toHaveBeenCalledWith(expect.objectContaining({
      productVariantId: 'variant-croissant',
      recipeUnitsPerPackage: 36,
      confirmRecipeUnits: true,
      packaging: expect.objectContaining({ unitCount: 36, unit: 'G' }),
    }));
  });

  it('réutilise le même workflow avec une Référence Produit préremplie', async () => {
    const user = userEvent.setup();

    renderDialog(vi.fn(), {
      initialProductVariant: {
        id: 'variant-prefilled',
        name: 'Purée d’abricots',
        referenceUnit: 'KG',
      },
    });

    expect(screen.getByText('Purée d’abricots')).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Choisir Abricot',
    })).not.toBeInTheDocument();
    expect(screen.getByText(
      'La Référence Produit est préremplie depuis le Produit consulté.',
    )).toBeInTheDocument();

    await selectOption(
      user,
      'Sélectionner le Fournisseur',
      'Sysco',
    );
    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'PUR-001',
    );
    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        productVariantId: 'variant-prefilled',
        supplierId: 'supplier-1',
        supplierReference: 'PUR-001',
      }),
    );
  });

  it('présente une aide métier sans jargon M-002 et affiche UNIT comme pièce', async () => {
    const user = userEvent.setup();

    renderDialog();

    expect(screen.getByRole('button', {
      name: 'À propos de l’Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Informations sur la recherche de Référence Produit',
    })).toBeInTheDocument();
    expect(screen.queryByText(
      'Recherchez une Référence existante avant d’en proposer une nouvelle.',
    )).not.toBeInTheDocument();
    expect(screen.queryByText(/M-002/)).not.toBeInTheDocument();

    const unitTrigger = screen.getByRole('combobox', {
      name: 'Unité du conditionnement',
    });

    vi.spyOn(unitTrigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );

    await user.click(unitTrigger);

    expect(
      await screen.findByRole('option', { name: 'pièce' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'UNIT' })).not.toBeInTheDocument();
  });

  it('conserve un conditionnement plat calculable et son libellé fournisseur complet', async () => {
    const user = userEvent.setup();

    renderDialog(vi.fn(), {
      initialProductVariant: {
        id: 'variant-bruschetta',
        name: 'Pain bruschetta surgelé',
        referenceUnit: 'UNIT',
        countUnitLabelSingular: 'tranche',
        countUnitLabelPlural: 'tranches',
      },
    });

    await selectOption(
      user,
      'Sélectionner le Fournisseur',
      'Sysco',
    );

    expect(screen.getByRole('combobox', {
      name: 'Unité du conditionnement',
    })).toHaveTextContent('tranche');
    await user.type(
      screen.getByLabelText('Référence fournisseur'),
      'BRU-032',
    );
    await user.type(screen.getByLabelText('Contenant principal'), 'Carton');
    await user.type(screen.getByLabelText('Sous-unités'), '8');
    await user.type(screen.getByLabelText('Quantité / sous-unité'), '4');
    await user.type(screen.getByLabelText('Poids net total'), '3200');
    await user.type(
      screen.getByLabelText('Libellé fournisseur d’origine'),
      '1 carton = 8 paquets × 4 tranches de 100 g',
    );
    await user.click(screen.getByRole('button', {
      name: 'Créer l’Article',
    }));

    expect(mocks.createArticle).toHaveBeenCalledWith(
      expect.objectContaining({
        packaging: {
          containerType: 'Carton',
          unitCount: 8,
          quantityPerUnit: '4',
          unit: 'UNIT',
          netWeight: '3200',
          netWeightUnit: 'G',
          supplierLabel:
            '1 carton = 8 paquets × 4 tranches de 100 g',
        },
      }),
    );
  });
});
