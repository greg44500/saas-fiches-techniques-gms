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

  it('résout le prix dans une carte compacte dédiée au shell Dossier', async () => {
    const user = userEvent.setup();

    render(
      <DossierApplicablePriceCard
        dossierId="dossier-1"
        workspaceId="workspace-1"
      />,
    );

    await selectArticleOption(user);

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
});
