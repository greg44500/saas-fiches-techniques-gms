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
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
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

describe('DossierApplicablePriceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.ARTICLE_READ
      ),
    });
    mocks.listReferences.mockReturnValue(queryResult([]));
    mocks.listArticles.mockReturnValue(queryResult({
      articles: [{
        id: 'article-1',
        supplierReference: 'Ali321',
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

    await user.click(screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    }));
    await user.click(screen.getByRole('option', {
      name: 'Sysco · Ali321',
    }));

    expect(mocks.loadApplicable).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      articleId: 'article-1',
    });
    expect(screen.getByText('12,500 EUR / PCE')).toBeInTheDocument();
    expect(screen.getByText(/Tarif négocié/)).toBeInTheDocument();
    expect(screen.getByText(/source de remplacement/)).toBeInTheDocument();
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

    await user.click(screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    }));
    await user.click(screen.getByRole('option', {
      name: 'Sysco · Ali321',
    }));

    expect(screen.getByText(/Prix indicatif espace de travail/))
      .toBeInTheDocument();
    expect(screen.getByText(/source de remplacement/))
      .toBeInTheDocument();
  });

  it('efface le résultat précédent quand la sélection revient à Sélectionner', async () => {
    const user = userEvent.setup();

    render(
      <DossierApplicablePriceCard
        dossierId="dossier-1"
        workspaceId="workspace-1"
      />,
    );

    await user.click(screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    }));
    await user.click(screen.getByRole('option', {
      name: 'Sysco · Ali321',
    }));

    expect(screen.getByText('12,500 EUR / PCE')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', {
      name: 'Article fournisseur à vérifier',
    }));
    await user.click(screen.getByRole('option', {
      name: 'Sélectionner',
    }));

    expect(mocks.resetApplicable).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('12,500 EUR / PCE')).not.toBeInTheDocument();
    expect(screen.queryByText(/source de remplacement/)).not.toBeInTheDocument();
  });
});
