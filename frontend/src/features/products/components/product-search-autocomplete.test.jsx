import { useState } from 'react';
import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  searchQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useSearchProductsQuery: mocks.searchQuery,
}));

import {
  ProductSearchAutocomplete,
} from '@/features/products/components/product-search-autocomplete';

const metadata = {
  defaults: {
    activeWorkspaceProductStatus: 'ACTIVE',
  },
  conservationTypes: [{ value: 'FRAIS', label: 'Frais' }],
  foodRanges: [{
    value: 1,
    label: 'Gamme 1',
    name: 'Frais',
    defaultProcessingState: 'Produit frais',
  }],
};

const result = {
  source: 'PRODUCT_VARIANT',
  product: {
    id: 'product-1',
    name: 'Carotte',
    category: { id: 'category-1', name: 'Légumes' },
  },
  variant: {
    id: 'variant-1',
    name: 'Carotte râpée',
    conservationType: 'FRAIS',
    variety: null,
    characteristics: [{
      id: 'presentation-rapee',
      kind: 'PRESENTATION',
      name: 'Râpée',
    }],
    processingState: 'Produit frais',
    foodRange: 1,
  },
  workspaceEntry: null,
};

function Harness({
  ariaLabel,
  clearOnSelect = false,
  compact = false,
  descriptionId,
  onSelect,
  onCreateMissingReference,
  placeholder,
  resultOverride = result,
  showWorkspaceFavorite = false,
}) {
  const [value, setValue] = useState('');

  mocks.searchQuery.mockImplementation((args, options) => ({
    data: (
      !options?.skip
      && args?.q === 'car'
    )
      ? {
          results: [resultOverride],
          pagination: {
            page: 1,
            limit: 6,
            total: 1,
            totalPages: 1,
          },
        }
      : undefined,
    isFetching: false,
    isSuccess: !options?.skip,
    isError: false,
  }));

  return (
    <ProductSearchAutocomplete
      ariaLabel={ariaLabel}
      categoryId={undefined}
      clearOnSelect={clearOnSelect}
      compact={compact}
      descriptionId={descriptionId}
      metadata={metadata}
      onSelect={onSelect}
      onCreateMissingReference={onCreateMissingReference}
      onValueChange={setValue}
      placeholder={placeholder}
      scope="REFERENCE"
      showWorkspaceFavorite={showWorkspaceFavorite}
      status={undefined}
      value={value}
      workspaceId="workspace-1"
    />
  );
}

describe('ProductSearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('présente la Référence fournisseur et le Produit associé dans les suggestions Articles', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const article = {
      id: 'article-43279',
      supplier: { name: 'BRIDOR' },
      supplierReference: '43279',
      supplierDesignation: 'Croissant 120 g',
      packagingLabel: 'Carton de 36',
    };
    const articleResult = {
      product: { id: 'variant-bridor', name: 'Croissant individuel PAI' },
      variant: { id: 'variant-bridor', name: 'Croissant individuel PAI', referenceUnit: 'UNIT' },
      supplierArticle: article,
    };

    function ArticleHarness() {
      const [value, setValue] = useState('');
      return (
        <ProductSearchAutocomplete
          externalSearch
          externalQuery={{
            data: { results: [articleResult] },
            isFetching: false,
            isSuccess: true,
            isError: false,
          }}
          metadata={metadata}
          onSelect={onSelect}
          onValueChange={setValue}
          scope="ARTICLES"
          value={value}
          workspaceId="workspace-1"
        />
      );
    }

    render(<ArticleHarness />);
    await user.type(screen.getByRole('combobox', {
      name: 'Rechercher un Produit',
    }), '43279');
    const option = await screen.findByRole('option', {
      name: /Croissant individuel PAI.*BRIDOR.*43279.*Croissant 120 g/i,
    });
    expect(option).toHaveTextContent('Produit associé : Croissant individuel PAI');
    expect(option).toHaveTextContent('Carton de 36');
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith(articleResult);
  });

  it('transmet la description de saisie au champ de recherche', () => {
    render(<>
      <p id="product-search-help">Saisissez au moins 3 caractères</p>
      <Harness descriptionId="product-search-help" onSelect={vi.fn()} />
    </>);
    expect(screen.getByRole('combobox', { name: 'Rechercher un Produit' }))
      .toHaveAttribute('aria-describedby', 'product-search-help');
  });

  it('déclenche une recherche prédictive après trois caractères et applique la référence métier', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Harness onSelect={onSelect} />);

    const input = screen.getByRole('combobox', {
      name: 'Rechercher un Produit',
    });

    await user.type(input, 'car');

    await waitFor(() => {
      expect(mocks.searchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          scope: 'REFERENCE',
          q: 'car',
          page: 1,
          limit: 6,
        }),
        { skip: false },
      );
    });

    const suggestion = await screen.findByRole('option', {
      name: /Carotte râpée.*Légumes.*Référence Produit/i,
    });
    expect(suggestion).not.toHaveTextContent(/Gamme/i);
    expect(suggestion).toHaveTextContent('Frais');

    await user.click(suggestion);

    expect(onSelect).toHaveBeenCalledWith(result);
    expect(input).toHaveValue('Carotte râpée');
    expect(input).toHaveAttribute('placeholder', 'Rechercher un produit…');
  });

  it('accepte un libellé accessible et un placeholder compacts pour la Composition', () => {
    render(
      <Harness
        ariaLabel="Ajouter un produit aux Ingrédients"
        compact
        onSelect={vi.fn()}
        placeholder="Ajouter un produit"
      />,
    );

    const input = screen.getByRole('combobox', {
      name: 'Ajouter un produit aux Ingrédients',
    });

    expect(input).toHaveAttribute('placeholder', 'Ajouter un produit');
    expect(input).toHaveClass('h-8');
  });

  it('signale une Référence déjà favorite dans la recherche globale', async () => {
    const user = userEvent.setup();

    render(
      <Harness
        onSelect={vi.fn()}
        resultOverride={{
          ...result,
          workspaceEntry: {
            id: 'workspace-product-1',
            status: 'ACTIVE',
          },
        }}
        showWorkspaceFavorite
      />,
    );

    await user.type(
      screen.getByRole('combobox', {
        name: 'Rechercher un Produit',
      }),
      'car',
    );

    const suggestion = await screen.findByRole('option', {
      name: /Carotte râpée.*Favori/i,
    });

    expect(suggestion).not.toHaveTextContent('Favori');

    const favorite = within(suggestion).getByLabelText('Favori');
    expect(favorite).toBeInTheDocument();
    expect(favorite).toHaveClass('text-warning');
  });

  it('efface la saisie après sélection lorsque le mode ajout le demande', async () => {
    const user = userEvent.setup();

    render(
      <Harness
        clearOnSelect
        onSelect={vi.fn()}
      />,
    );

    const input = screen.getByRole('combobox', {
      name: 'Rechercher un Produit',
    });

    await user.type(input, 'car');

    const suggestion = await screen.findByRole('option', {
      name: /Carotte râpée.*Référence Produit/i,
    });

    await user.click(suggestion);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('propose la création directement dans les suggestions vides et transmet le texte recherché', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<Harness onSelect={vi.fn()} onCreateMissingReference={onCreate} />);

    await user.type(screen.getByRole('combobox', {
      name: 'Rechercher un Produit',
    }), 'oeufs blancs pasteurises');

    expect(await screen.findByText('Aucun Produit ne correspond à cette recherche.'))
      .toBeInTheDocument();
    const create = await screen.findByRole('button', { name: 'Créer cette Référence' });
    await user.click(create);
    expect(onCreate).toHaveBeenCalledWith('oeufs blancs pasteurises');
  });

  it('ne propose pas de créer une Référence quand les suggestions existent', async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={vi.fn()} onCreateMissingReference={vi.fn()} />);
    await user.type(screen.getByRole('combobox', {
      name: 'Rechercher un Produit',
    }), 'car');
    expect(await screen.findByRole('option', { name: /Carotte râpée/i }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer cette Référence' }))
      .not.toBeInTheDocument();
  });

  it('ne suggère jamais de création si aucune permission de contribution n est fournie', async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={vi.fn()} />);
    await user.type(screen.getByRole('combobox', {
      name: 'Rechercher un Produit',
    }), 'oeufs');
    expect(await screen.findByText('Aucun Produit ne correspond à cette recherche.'))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer cette Référence' }))
      .not.toBeInTheDocument();
  });

  it('n interroge pas le serveur avant le seuil de trois caractères', async () => {
    const user = userEvent.setup();

    render(<Harness onSelect={vi.fn()} />);

    await user.type(
      screen.getByRole('combobox', {
        name: 'Rechercher un Produit',
      }),
      'ca',
    );

    await new Promise((resolve) => window.setTimeout(resolve, 350));

    expect(mocks.searchQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({ q: 'ca' }),
      { skip: false },
    );
  });
});
