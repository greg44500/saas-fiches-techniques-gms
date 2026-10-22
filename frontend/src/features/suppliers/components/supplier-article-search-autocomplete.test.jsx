import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  articles: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSupplierArticlesQuery: mocks.articles,
}));

import {
  SupplierArticleSearchAutocomplete,
} from '@/features/suppliers/components/supplier-article-search-autocomplete';

const bridor = {
  id: 'article-bridor',
  supplierDesignation: 'Croissant au beurre 120 g',
  supplier: { name: 'BRIDOR' },
  supplierReference: '43279',
  productVariant: { name: 'Croissant individuel PAI' },
};
const sysco = {
  id: 'article-sysco',
  supplierDesignation: 'Ail semoule',
  supplier: { name: 'SYSCO' },
  supplierReference: 'Ali321',
};

function Harness({ fallback = [], serverSearch = true, excludedIds = [] }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  return (
    <SupplierArticleSearchAutocomplete
      ariaLabel="Rechercher un Article"
      excludedIds={excludedIds}
      fallbackArticles={fallback}
      onSelect={setSelectedArticle}
      selectedArticle={selectedArticle}
      serverSearch={serverSearch}
      workspaceId="workspace-1"
    />
  );
}

describe('SupplierArticleSearchAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.articles.mockImplementation((_args, opts) => ({
      data: opts?.skip ? undefined : { articles: [bridor, sysco] },
      isFetching: false,
      isError: false,
    }));
  });

  it('recherche côté serveur avec pagination et présente le nom avant la référence', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Rechercher un Article' });
    await user.type(input, '43279');

    await waitFor(() => {
      expect(mocks.articles).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'workspace-1',
          search: '43279',
          status: 'ACTIVE',
          page: 1,
          limit: 10,
        }),
        { skip: false },
      );
    });
    const result = await screen.findByRole('option', {
      name: 'Croissant au beurre 120 g · BRIDOR · 43279',
    });
    expect(result).toHaveTextContent('Croissant au beurre 120 g');
    expect(result).toHaveTextContent('BRIDOR · 43279');
    await user.click(result);
    expect(input).toHaveValue('Croissant au beurre 120 g · BRIDOR · 43279');
  });

  it('ne déclenche pas de recherche distante sur une saisie trop courte', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox', {
      name: 'Rechercher un Article',
    }), 'Br');
    expect(mocks.articles).toHaveBeenLastCalledWith(
      expect.any(Object),
      { skip: true },
    );
  });

  it('exclut les Articles déjà favoris et recherche localement sans droit Article', async () => {
    const user = userEvent.setup();
    render(<Harness
      excludedIds={['article-bridor']}
      fallback={[bridor, sysco]}
      serverSearch={false}
    />);
    const input = screen.getByRole('combobox', { name: 'Rechercher un Article' });
    await user.type(input, 'sysco');
    expect(await screen.findByRole('option', {
      name: 'Ail semoule · SYSCO · Ali321',
    })).toBeInTheDocument();
    expect(screen.queryByRole('option', {
      name: /Croissant au beurre/i,
    })).not.toBeInTheDocument();
    expect(mocks.articles).toHaveBeenLastCalledWith(
      expect.any(Object), { skip: true },
    );
  });

  it('efface le choix au changement de saisie pour ne pas garder un identifiant périmé', async () => {
    const user = userEvent.setup();
    render(<Harness fallback={[bridor] serverSearch={false} />);
    const input = screen.getByRole('combobox', { name: 'Rechercher un Article' });
    await user.type(input, '43279');
    await user.click(await screen.findByRole('option', {
      name: 'Croissant au beurre 120 g · BRIDOR · 43279',
    }));
    await user.clear(input);
    expect(input).toHaveValue('');
    await user.type(input, 'Bridor');
    expect(await screen.findByRole('option', {
      name: 'Croissant au beurre 120 g · BRIDOR · 43279',
    })).toBeInTheDocument();
  });
});
