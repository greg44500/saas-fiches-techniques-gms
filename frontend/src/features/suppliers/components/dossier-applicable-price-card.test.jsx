import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  workspaceContext: vi.fn(),
  listReferences: vi.fn(),
  listArticles: vi.fn(),
  loadApplicable: vi.fn(),
  resetApplicable: vi.fn(),
  lazyApplicable: vi.fn(),
  pricingMetadata: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useGetSupplierPricingMetadataQuery: mocks.pricingMetadata,
  useListDossierSupplierReferencesQuery: mocks.listReferences,
  useListSupplierArticlesQuery: mocks.listArticles,
  useLazyGetApplicableSupplierPriceQuery: mocks.lazyApplicable,
}));

import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierApplicablePriceCard,
} from '@/features/suppliers/components/dossier-applicable-price-card';

function queryResult(data) {
  return {
    data,
    isError: false,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  };
}

async function selectArticleOption(user) {
  await user.click(screen.getByRole('button', {
    name: 'Rechercher un Article fournisseur',
  }));
  const input = screen.getByRole('combobox', {
    name: 'Article fournisseur à vérifier',
  });
  await user.type(input, 'Ali321');
  await user.click(await screen.findByRole('option', {
    name: 'Ail semoule · Sysco · Ali321',
  }));
  return input;
}

describe('DossierApplicablePriceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.ARTICLE_READ
      ),
    });
    mocks.pricingMetadata.mockReturnValue(queryResult({
      applicablePriceSources: [
        { value: 'NEGOTIATED_PRICE', label: 'Tarif négocié' },
        { value: 'INDICATIVE_WORKSPACE', label: 'Prix indicatif espace de travail' },
      ],
    }));
    mocks.listReferences.mockReturnValue(queryResult([]));
    mocks.listArticles.mockReturnValue(queryResult({
      articles: [{
        id: 'article-1',
        supplierReference: 'Ali321',
        supplierDesignation: 'Ail semoule',
        supplier: { name: 'Sysco' },
      }],
    }));
    mocks.loadApplicable.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mocks.lazyApplicable.mockReturnValue([
      mocks.loadApplicable,
      {
        data: {
          productVariant: {
            id: 'variant-1',
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'tranche',
            countUnitLabelPlural: 'tranches',
          },
          resolvedSource: 'NEGOTIATED_PRICE',
          fallbackApplied: true,
          price: {
            normalizedAmount: '12.5',
            normalizedUnit: 'UNIT',
            currency: 'EUR',
          },
        },
        isError: false,
        isFetching: false,
        reset: mocks.resetApplicable,
      },
    ]);
  });

  it('affiche le prix après sélection, sans réserver d’espace vide', async () => {
    const user = userEvent.setup();

    render(
      <DossierApplicablePriceCard
        dossierId="dossier-1"
        workspaceId="workspace-1"
      />,
    );

    expect(screen.queryByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Rechercher un Article fournisseur',
    }).parentElement).toHaveClass('w-10');
    expect(screen.queryByRole('region', {
      name: 'Résultat du prix applicable',
    })).not.toBeInTheDocument();
    await selectArticleOption(user);
    expect(screen.getByRole('region', {
      name: 'Résultat du prix applicable',
    })).toBeInTheDocument();

    expect(mocks.loadApplicable).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      articleId: 'article-1',
    });
    expect(screen.getByText('12,500 / tranche')).toBeInTheDocument();
    expect(screen.getByText(/Tarif négocié/)).toBeInTheDocument();
    expect(screen.queryByText(/source de remplacement/)).not.toBeInTheDocument();
  });

  it('identifie visuellement le dernier prix expiré retenu par le backend', async () => {
    const user = userEvent.setup();
    mocks.lazyApplicable.mockReturnValue([
      mocks.loadApplicable,
      {
        data: {
          productVariant: { referenceUnit: 'KG' },
          resolvedSource: 'SUPPLIER_TARIFF',
          alerts: ['LAST_KNOWN_SUPPLIER_TARIFF_EXPIRED'],
          price: {
            normalizedAmount: '12',
            normalizedUnit: 'KG',
            currency: 'EUR',
            validityStatus: 'EXPIRED',
          },
        },
        isError: false,
        isFetching: false,
        reset: mocks.resetApplicable,
      },
    ]);
    render(<DossierApplicablePriceCard dossierId="dossier-1" workspaceId="workspace-1" />);
    await selectArticleOption(user);
    expect(screen.getByRole('note')).toHaveTextContent(
      'Dernier prix connu — tarif expiré',
    );
  });

  it('identifie explicitement un Prix indicatif utilisé en dernier recours', async () => {
    const user = userEvent.setup();

    mocks.lazyApplicable.mockReturnValue([
      mocks.loadApplicable,
      {
        data: {
          resolvedSource: 'INDICATIVE_WORKSPACE',
          fallbackApplied: true,
          price: {
            normalizedAmount: '3.1',
            normalizedUnit: 'KG',
            currency: 'EUR',
          },
        },
        isError: false,
        isFetching: false,
        reset: mocks.resetApplicable,
      },
    ]);

    render(
      <DossierApplicablePriceCard
        dossierId="dossier-1"
        workspaceId="workspace-1"
      />,
    );

    await selectArticleOption(user);

    expect(screen.getByText('3,100 / kg')).toBeInTheDocument();
    expect(screen.getByText(/Prix indicatif espace de travail/))
      .toBeInTheDocument();
    expect(screen.queryByText(/source de remplacement/))
      .not.toBeInTheDocument();
  });

  it('efface le résultat précédent quand la sélection revient à Sélectionner', async () => {
    const user = userEvent.setup();

    render(
      <DossierApplicablePriceCard
        dossierId="dossier-1"
        workspaceId="workspace-1"
      />,
    );

    await selectArticleOption(user);

    expect(screen.getByText('12,500 / tranche')).toBeInTheDocument();

    const input = screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    });
    await user.clear(input);

    expect(mocks.resetApplicable).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
    expect(mocks.loadApplicable).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('12,500 / tranche')).not.toBeInTheDocument();
    expect(screen.queryByText(/source de remplacement/)).not.toBeInTheDocument();
  });
  it('ferme puis rouvre le résultat sans perdre l’Article choisi', async () => {
    const user = userEvent.setup();
    render(<DossierApplicablePriceCard dossierId="dossier-1" workspaceId="workspace-1" />);
    const input = await selectArticleOption(user);
    await user.click(screen.getByRole('button', {
      name: 'Fermer le résultat du prix applicable',
    }));
    expect(screen.queryByRole('region', {
      name: 'Résultat du prix applicable',
    })).not.toBeInTheDocument();
    expect(input).toHaveValue('Ail semoule · Sysco · Ali321');
    await user.click(input);
    expect(screen.getByRole('region', {
      name: 'Résultat du prix applicable',
    })).toBeInTheDocument();
  });

  it('ferme le résultat par Échap sans effacer la sélection', async () => {
    const user = userEvent.setup();
    render(<DossierApplicablePriceCard dossierId="dossier-1" workspaceId="workspace-1" />);
    const input = await selectArticleOption(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', {
      name: 'Résultat du prix applicable',
    })).not.toBeInTheDocument();
    expect(input).toHaveValue('Ail semoule · Sysco · Ali321');
  });

  it('n’affiche que la loupe au repos et replie la recherche hors du champ', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Extérieur</button>
        <DossierApplicablePriceCard dossierId="dossier-1" workspaceId="workspace-1" />
      </>,
    );
    const trigger = screen.getByRole('button', {
      name: 'Rechercher un Article fournisseur',
    });
    expect(screen.queryByPlaceholderText('Rechercher un Article fournisseur…'))
      .not.toBeInTheDocument();
    await user.click(trigger);
    const input = screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    });
    expect(input).toHaveFocus();
    expect(input.closest('[data-slot="dossier-price-search"]'))
      .toHaveClass('transition-[width]');

    await user.click(screen.getByRole('button', { name: 'Extérieur' }));
    expect(screen.getByRole('button', {
      name: 'Rechercher un Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    })).not.toBeInTheDocument();
  });

  it('conserve l’Article et le prix après repli puis réouverture', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Extérieur</button>
        <DossierApplicablePriceCard dossierId="dossier-1" workspaceId="workspace-1" />
      </>,
    );
    await selectArticleOption(user);
    expect(screen.getByText('12,500 / tranche')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Extérieur' }));
    expect(screen.queryByRole('region', {
      name: 'Résultat du prix applicable',
    })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {
      name: 'Rechercher un Article fournisseur',
    }));
    expect(screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    })).toHaveValue('Ail semoule · Sysco · Ali321');
    expect(screen.getByText('12,500 / tranche')).toBeInTheDocument();
    expect(mocks.loadApplicable).toHaveBeenCalledTimes(1);
  });

  it('ne replie pas la recherche lors de la sélection d’une suggestion dans le portail', async () => {
    const user = userEvent.setup();
    render(<DossierApplicablePriceCard dossierId="dossier-1" workspaceId="workspace-1" />);
    await selectArticleOption(user);
    expect(screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    })).toHaveValue('Ail semoule · Sysco · Ali321');
    expect(screen.getByRole('region', {
      name: 'Résultat du prix applicable',
    })).toBeInTheDocument();
  });
});
