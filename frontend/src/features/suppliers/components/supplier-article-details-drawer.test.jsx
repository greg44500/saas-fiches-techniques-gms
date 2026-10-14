import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

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
  supplier: { id: 'supplier-1', name: 'BRIDOR' },
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

function renderDrawer(props = {}) {
  return render(
    <TooltipProvider>
      <SupplierArticleDetailsDrawer
        article={article}
        canReadTariffs
        onClose={vi.fn()}
        open
        workspaceId="workspace-1"
        {...props}
      />
    </TooltipProvider>,
  );
}

describe('SupplierArticleDetailsDrawer — onglets M-003', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.history.mockReturnValue({
      data: [{
        id: 'tariff-1',
        isCurrent: true,
        revision: 1,
        sourcePriceLabel: '11,200 € HT / unité',
        sourceLabel: 'Liste tarifaire',
        validFrom: article.supplierTariff.validFrom,
        validTo: article.supplierTariff.validTo,
      }],
      isLoading: false,
      isError: false,
    });
  });

  it('ouvre Infos Article avec les informations essentielles sans empiler les autres sections', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderDrawer({ canManage: true, onEdit });

    expect(screen.getByRole('complementary', {
      name: 'Plaque de pâte feuilletée 300 g',
    })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Infos Article' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Association' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tarif fournisseur' })).toBeInTheDocument();
    expect(screen.getByText('Réf. fournisseur')).toBeInTheDocument();
    expect(screen.getByText('34171')).toBeInTheDocument();
    expect(screen.getByText('Fournisseur')).toBeInTheDocument();
    expect(screen.getByText('Carton · 36 × 300 g')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(onEdit).toHaveBeenCalledWith(article);

    expect(screen.queryByText('Pâte feuilletée pur beurre')).not.toBeInTheDocument();
    expect(screen.queryByText('403,200 € HT / carton')).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('isole l’association et place son avertissement dans une aide contextuelle', async () => {
    const user = userEvent.setup();
    const onAssociate = vi.fn();
    renderDrawer({ canAssociate: true, onAssociate });

    await user.click(screen.getByRole('tab', { name: 'Association' }));
    expect(screen.getByText('Pâte feuilletée pur beurre')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Conséquences de la modification de l’association',
    })).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.queryByText(/valorisations futures/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifier l’association' }));
    expect(onAssociate).toHaveBeenCalledWith(article);
  });

  it('identifie clairement un Article sans Produit associé', async () => {
    const user = userEvent.setup();
    renderDrawer({ article: { ...article, productVariant: null } });
    await user.click(screen.getByRole('tab', { name: 'Association' }));
    expect(screen.getByText('Non associé')).toBeInTheDocument();
  });

  it('affiche prix et période dans Tarif fournisseur, avec historique replié par défaut', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole('tab', { name: 'Tarif fournisseur' }));
    const tariffCard = screen.getByRole('region', { name: 'Prix fournisseur HT' });
    expect(tariffCard).toHaveClass('rounded-lg');
    expect(within(tariffCard).getByText('403,200 € HT / carton')).toBeInTheDocument();
    expect(screen.getByText('11,200 € HT / pièce')).toBeInTheDocument();
    expect(screen.getByText('37,333 € HT / kg')).toBeInTheDocument();
    expect(screen.getByText('Liste tarifaire')).toBeInTheDocument();
    expect(screen.getByText('Début de validité')).toBeInTheDocument();
    expect(screen.getByText('Fin de validité')).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: 'Historique des tarifs' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Révision 1/)).toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('conserve le dernier tarif expiré et les deux actions de correction historisée', async () => {
    const user = userEvent.setup();
    const onCorrectPeriod = vi.fn();
    const onCorrectPrice = vi.fn();
    const expiredArticle = { ...article, supplierTariffStatus: 'EXPIRED' };
    renderDrawer({
      article: expiredArticle,
      canCorrectTariffs: true,
      onCorrectPrice,
      onCorrectPeriod,
    });

    await user.click(screen.getByRole('tab', { name: 'Tarif fournisseur' }));
    const tariffCard = screen.getByRole('region', { name: 'Prix fournisseur HT' });
    expect(within(tariffCard).getByText('Dernier prix connu — expiré')).toBeInTheDocument();
    expect(within(tariffCard).getByText('403,200 € HT / carton')).toBeInTheDocument();

    // Les actions appartiennent à l'en-tête de la carte, pas à un bloc sous celle-ci.
    const cardHeader = tariffCard.firstElementChild;
    const correctPrice = within(cardHeader).getByRole('button', { name: 'Corriger le prix' });
    const correctPeriod = within(cardHeader).getByRole('button', { name: 'Modifier la période' });
    await user.click(correctPeriod);
    expect(onCorrectPeriod).toHaveBeenCalledWith(expiredArticle);
    await user.click(correctPrice);
    expect(onCorrectPrice).toHaveBeenCalledWith(expiredArticle);
  });

  it('respecte l’accès tarifaire et les interdictions de modification', async () => {
    const user = userEvent.setup();
    const limited = renderDrawer({ canReadTariffs: false });
    expect(screen.queryByRole('tab', { name: 'Tarif fournisseur' })).not.toBeInTheDocument();
    expect(mocks.history).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );

    limited.unmount();
    const archived = { ...article, status: 'ARCHIVED' };
    renderDrawer({
      article: archived,
      canManage: true,
      canAssociate: true,
      canCorrectTariffs: true,
    });
    expect(screen.getByText('Archivé')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Association' }));
    expect(screen.queryByRole('button', { name: 'Modifier l’association' }))
      .not.toBeInTheDocument();
  });

  it('ne propose pas les actions de correction sur un tarif issu d’un Catalogue', async () => {
    const user = userEvent.setup();
    renderDrawer({
      article: {
        ...article,
        supplierTariff: { ...article.supplierTariff, sourceKind: 'CATALOG' },
      },
      canCorrectTariffs: true,
    });
    await user.click(screen.getByRole('tab', { name: 'Tarif fournisseur' }));
    expect(screen.queryByRole('button', { name: 'Modifier la période' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corriger le prix' }))
      .not.toBeInTheDocument();
    expect(screen.getByText(/correction relève du parcours Catalogue/)).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Prix fournisseur HT' }))
      .queryByRole('button')).not.toBeInTheDocument();
  });

  it('revient à Infos Article après fermeture et réouverture', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const props = { article, canReadTariffs: true, open: true, onClose };
    const { rerender } = render(
      <TooltipProvider>
        <SupplierArticleDetailsDrawer workspaceId="workspace-1" {...props} />
      </TooltipProvider>,
    );
    await user.click(screen.getByRole('tab', { name: 'Tarif fournisseur' }));
    expect(screen.getByRole('tab', { name: 'Tarif fournisseur' }))
      .toHaveAttribute('aria-selected', 'true');

    rerender(
      <TooltipProvider>
        <SupplierArticleDetailsDrawer workspaceId="workspace-1" {...props} open={false} />
      </TooltipProvider>,
    );
    rerender(
      <TooltipProvider>
        <SupplierArticleDetailsDrawer workspaceId="workspace-1" {...props} />
      </TooltipProvider>,
    );
    expect(screen.getByRole('tab', { name: 'Infos Article' }))
      .toHaveAttribute('aria-selected', 'true');
  });
});
