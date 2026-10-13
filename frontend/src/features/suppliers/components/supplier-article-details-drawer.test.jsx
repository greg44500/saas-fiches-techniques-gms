import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? <aside aria-label={title}>{children}</aside> : null
  ),
}));

const mocks = vi.hoisted(() => ({ history: vi.fn() }));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSupplierArticleTariffsQuery: mocks.history,
}));

import { SupplierArticleDetailsDrawer } from './supplier-article-details-drawer';

const article = {
  id: 'article-1',
  status: 'ACTIVE',
  supplierReference: '34171',
  supplierDesignation: 'Plaque de pâte feuilletée 300 g',
  supplier: { name: 'BRIDOR' },
  brand: 'BRIDOR',
  packagingLabel: 'Carton · 36 × 300 g',
  productVariant: { id: 'variant-1', name: 'Pâte feuilletée pur beurre' },
  supplierTariff: {
    id: 'tariff-1',
    sourceKind: 'PRICE_LIST',
    sourceLabel: 'Liste tarifaire',
    sourcePriceLabel: '11,200 € HT / unité',
    packagePriceLabel: '403,200 € HT / carton',
    piecePriceLabel: '11,200 € HT / pièce',
    unitPriceLabel: '37,333 € HT / kg',
    validFrom: '2026-10-13T00:00:00.000Z',
    validTo: '2026-10-14T00:00:00.000Z',
  },
};

describe('SupplierArticleDetailsDrawer', () => {
  it('évite les répétitions, montre un warning et masque initialement l’historique', async () => {
    const user = userEvent.setup();
    mocks.history.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{
        id: 'tariff-1',
        isCurrent: true,
        sourcePriceLabel: '11,200 € HT / unité',
        revision: 1,
        sourceLabel: 'Liste tarifaire',
        validFrom: article.supplierTariff.validFrom,
        validTo: article.supplierTariff.validTo,
      }],
    });
    render(<SupplierArticleDetailsDrawer
      article={article}
      canReadTariffs
      onClose={vi.fn()}
      open
      workspaceId="workspace-1"
    />);

    expect(screen.getByRole('complementary', {
      name: 'Plaque de pâte feuilletée 300 g',
    })).toBeInTheDocument();
    expect(screen.getByText('Informations de l’article')).toBeInTheDocument();
    expect(screen.getByText('Réf. fournisseur : 34171')).toBeInTheDocument();
    expect(screen.getByText('11,200 € HT / pièce')).toBeInTheDocument();
    expect(screen.getByText('37,333 € HT / kg')).toBeInTheDocument();
    expect(screen.queryByText('BRIDOR · Réf. 34171')).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveClass('text-warning');
    const trigger = screen.getByRole('button', {
      name: 'Informations tarifaires et historique',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Provenance')).toBeInTheDocument();
    expect(screen.getByText('Historique des listes tarifaires')).toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('protège les détails tarifaires sans permission de lecture', () => {
    mocks.history.mockReturnValue({ isLoading: false, data: [] });
    render(<SupplierArticleDetailsDrawer
      article={article}
      canReadTariffs={false}
      onClose={vi.fn()}
      open
      workspaceId="workspace-1"
    />);
    expect(screen.queryByText('Informations tarifaires et historique'))
      .not.toBeInTheDocument();
    expect(mocks.history).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });
});
