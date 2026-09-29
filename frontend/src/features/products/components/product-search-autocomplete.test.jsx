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
  onSelect,
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
  }));

  return (
    <ProductSearchAutocomplete
      ariaLabel={ariaLabel}
      categoryId={undefined}
      clearOnSelect={clearOnSelect}
      compact={compact}
      metadata={metadata}
      onSelect={onSelect}
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
          sort: 'NAME',
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
    expect(within(suggestion).getByLabelText('Favori')).toBeInTheDocument();
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

    expect(input).toHaveValue('');
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
