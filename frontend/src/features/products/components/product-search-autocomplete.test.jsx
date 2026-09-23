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

const result = {
  product: {
    id: 'product-1',
    name: 'Carotte',
    category: { id: 'category-1', name: 'Légumes' },
  },
  variant: {
    id: 'variant-1',
    form: 'Entière',
    processingState: 'Brute',
    preservation: 'Fraîche',
  },
};

function Harness({ onSearch }) {
  const [value, setValue] = useState('');

  return (
    <ProductSearchAutocomplete
      categoryId={undefined}
      onSearch={onSearch}
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

  it('déclenche une recherche prédictive après trois caractères et applique la suggestion', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<Harness onSearch={onSearch} />);

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
      name: /Carotte.*Légumes/i,
    });

    await user.click(suggestion);

    expect(onSearch).toHaveBeenCalledWith('Carotte');
    expect(input).toHaveValue('Carotte');
  });

  it('n interroge pas le serveur avant le seuil de trois caractères', async () => {
    const user = userEvent.setup();

    render(<Harness onSearch={vi.fn()} />);

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
