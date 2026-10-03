import { useState } from 'react';
import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  productsQuery: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useListProductReferenceProductsQuery: mocks.productsQuery,
}));

import {
  ProductReferenceSearchAutocomplete,
} from '@/features/products/components/product-reference-search-autocomplete';

const metadata = {
  conservationTypes: [{
    value: 'CONSERVE',
    label: 'Conserve',
  }],
};

const product = {
  id: 'product-1',
  name: 'Pomme de terre',
  category: {
    id: 'category-1',
    name: 'Fruits et légumes',
  },
  variants: [{
    id: 'variant-1',
    name: 'Purée de pomme de terre',
    conservationType: 'CONSERVE',
    status: 'ACTIVE',
  }],
};

function Harness({ onSelect = vi.fn() }) {
  const [value, setValue] = useState('');

  mocks.productsQuery.mockImplementation((args, options) => ({
    data: (
      !options?.skip
      && args?.q === 'pur'
    )
      ? {
          products: [product],
          pagination: {
            page: 1,
            limit: 6,
            total: 1,
            totalPages: 1,
          },
        }
      : undefined,
    isFetching: false,
    isError: false,
  }));

  return (
    <ProductReferenceSearchAutocomplete
      categoryId="category-1"
      metadata={metadata}
      onSelect={onSelect}
      onValueChange={setValue}
      status="ACTIVE"
      value={value}
    />
  );
}

describe('ProductReferenceSearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propose les Références Produit après trois caractères avec les filtres actifs', async () => {
    const user = userEvent.setup();

    render(<Harness />);

    const input = screen.getByRole('combobox', {
      name: 'Rechercher un Produit global',
    });

    await user.type(input, 'pur');

    await waitFor(() => {
      expect(mocks.productsQuery).toHaveBeenCalledWith(
        {
          status: 'ACTIVE',
          categoryId: 'category-1',
          q: 'pur',
          page: 1,
          limit: 6,
        },
        { skip: false },
      );
    });

    const suggestion = await screen.findByRole('option', {
      name: /Purée de pomme de terre.*Pomme de terre.*Fruits et légumes.*Conserve.*Référence Produit/i,
    });

    expect(suggestion).toBeInTheDocument();
  });

  it('applique immédiatement la Référence sélectionnée comme recherche', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<Harness onSelect={onSelect} />);

    const input = screen.getByRole('combobox', {
      name: 'Rechercher un Produit global',
    });

    await user.type(input, 'pur');

    await user.click(await screen.findByRole('option', {
      name: /Purée de pomme de terre.*Référence Produit/i,
    }));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        product,
        variant: product.variants[0],
      }),
      'Purée de pomme de terre',
    );
    expect(input).toHaveValue('Purée de pomme de terre');
  });

  it('n interroge pas le référentiel avant trois caractères', async () => {
    const user = userEvent.setup();

    render(<Harness />);

    await user.type(
      screen.getByRole('combobox', {
        name: 'Rechercher un Produit global',
      }),
      'pu',
    );

    await new Promise((resolve) => window.setTimeout(resolve, 350));

    expect(mocks.productsQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({ q: 'pu' }),
      { skip: false },
    );
  });
});
