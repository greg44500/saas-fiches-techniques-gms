import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  DossierSupplierArticleToolbar,
} from '@/features/suppliers/components/dossier-supplier-article-toolbar';

function ToolbarHarness({ showFavoriteFilter = true }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  return (
    <>
      <DossierSupplierArticleToolbar
        favoriteCount={1}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        search={search}
        selectedFilter={filter}
        showFavoriteFilter={showFavoriteFilter}
      />
      <output aria-label="Recherche en cours">{search}</output>
    </>
  );
}

describe('DossierSupplierArticleToolbar', () => {
  it('déplace un indicateur de 200 ms à la sélection et conserve aria-pressed', async () => {
    const user = userEvent.setup();
    const { container } = render(<ToolbarHarness />);
    const group = screen.getByRole('group', {
      name: 'Filtrer les Articles fournisseur',
    });
    const indicator = container.querySelector('[data-slot="article-filter-indicator"]');
    expect(indicator).toHaveClass('transition-transform', 'duration-200');
    expect(indicator).toHaveClass('motion-reduce:transition-none');
    expect(indicator).toHaveStyle({ transform: 'translateX(0%)' });

    await user.click(within(group).getByRole('button', { name: 'Favoris (1)' }));
    expect(indicator).toHaveStyle({ transform: 'translateX(100%)' });
    expect(within(group).getByRole('button', { name: 'Favoris (1)' }))
      .toHaveAttribute('aria-pressed', 'true');

    await user.click(within(group).getByRole('button', { name: 'Tous les articles' }));
    expect(indicator).toHaveStyle({ transform: 'translateX(0%)' });
    expect(within(group).getByRole('button', { name: 'Tous les articles' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  it('déploie la recherche en douceur et conserve la saisie au clic extérieur', async () => {
    const user = userEvent.setup();
    const { container } = render(<ToolbarHarness />);
    const root = container.querySelector('[data-slot="dossier-article-search"]');

    expect(root).toHaveClass('w-10', 'transition-[width]', 'duration-300');
    expect(screen.queryByRole('searchbox', {
      name: 'Rechercher un Article fournisseur',
    })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: "Ouvrir la recherche d'Articles fournisseur",
    }));
    const input = screen.getByRole('searchbox', {
      name: 'Rechercher un Article fournisseur',
    });
    expect(input).toHaveFocus();
    expect(root).toHaveClass('w-[min(22rem,calc(100vw-3rem))]');

    await user.type(input, 'BRIDOR');
    expect(screen.getByRole('status', { name: 'Recherche en cours' }))
      .toHaveTextContent('BRIDOR');
    await user.click(screen.getByRole('button', { name: 'Tous les articles' }));
    expect(input).toBeInTheDocument();
    expect(root).toHaveClass('w-[min(22rem,calc(100vw-3rem))]');
  });

  it('efface au premier Échap, se replie au second, puis rend le focus à la loupe', async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);
    await user.click(screen.getByRole('button', {
      name: "Ouvrir la recherche d'Articles fournisseur",
    }));
    const input = screen.getByRole('searchbox');
    await user.type(input, 'ail');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(input).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: "Ouvrir la recherche d'Articles fournisseur",
    })).toHaveFocus();
  });

  it('n’affiche pas de filtre Favoris si la lecture est interdite', () => {
    render(<ToolbarHarness showFavoriteFilter={false} />);
    expect(screen.queryByRole('group', {
      name: 'Filtrer les Articles fournisseur',
    })).not.toBeInTheDocument();
  });
});
