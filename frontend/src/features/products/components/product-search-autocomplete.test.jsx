import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

function Harness({ onSelect }) {
  const [value, setValue] = useState('');

  return (
    <ProductSearchAutocomplete
      categoryId={undefined}
      foodRange={undefined}
      metadata={metadata}
      onSelect={onSelect}
      onValueChange={setValue}
      scope="REFERENCE"
      status={undefined}
      value={value}
      workspaceId="workspace-1"
    />
  );
}

describe('ProductSearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.searchQuery.mockImplementation((args, options) => ({
      data: (
        !options?.skip
        && args?.q === 'car'
      )
        ? {
            results: [result],
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
      name: /Carotte râpée.*Légumes.*Gamme 1/i,
    });

    await user.click(suggestion);

    expect(onSelect).toHaveBeenCalledWith(result);
    expect(input).toHaveValue('Carotte râpée');
    expect(input).toHaveAttribute('placeholder', 'Rechercher un produit…');
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
