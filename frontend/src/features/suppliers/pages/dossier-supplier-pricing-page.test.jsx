import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  dossierQuery: vi.fn(),
  params: vi.fn(),
  workspaceContext: vi.fn(),
  listReferences: vi.fn(),
  listArticles: vi.fn(),
  listCatalogs: vi.fn(),
  listNegotiated: vi.fn(),
  listInvoiced: vi.fn(),
  lazyApplicable: vi.fn(),
}));

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useParams: mocks.params,
  };
});

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierByIdQuery: mocks.dossierQuery,
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListDossierSupplierReferencesQuery: mocks.listReferences,
  useListSupplierArticlesQuery: mocks.listArticles,
  useListSupplierCatalogsQuery: mocks.listCatalogs,
  useListNegotiatedPricesQuery: mocks.listNegotiated,
  useListInvoicedPricesQuery: mocks.listInvoiced,
  useLazyGetApplicableSupplierPriceQuery: mocks.lazyApplicable,
  useAddDossierSupplierReferenceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useRemoveDossierSupplierReferenceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useArchiveNegotiatedPriceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
  useDecideInvoicedPriceMutation: () => [
    vi.fn(),
    { isLoading: false },
  ],
}));

vi.mock('@/features/suppliers/components/supplier-price-form-dialog', () => ({
  SupplierPriceFormDialog: () => null,
}));

import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierSupplierPricingPage,
} from '@/features/suppliers/pages/dossier-supplier-pricing-page';

function queryResult(data) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <DossierSupplierPricingPage />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('DossierSupplierPricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.params.mockReturnValue({
      dossierId: 'dossier-1',
    });
    mocks.dossierQuery.mockReturnValue(queryResult({
      id: 'dossier-1',
      name: 'Magasin A',
      status: 'ACTIVE',
    }));
    mocks.listReferences.mockReturnValue(queryResult([]));
    mocks.listArticles.mockReturnValue(queryResult({
      articles: [],
    }));
    mocks.listCatalogs.mockReturnValue(queryResult({
      catalogs: [],
      pagination: {
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      },
    }));
    mocks.listNegotiated.mockReturnValue(queryResult([]));
    mocks.listInvoiced.mockReturnValue(queryResult([]));
    mocks.lazyApplicable.mockReturnValue([
      vi.fn(),
      {
        data: undefined,
        isError: false,
        isFetching: false,
      },
    ]);
  });

  it('affiche les catalogues accessibles avec portée et provenance dans le contexte Dossier', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.CATALOG_READ
      ),
    });
    mocks.listCatalogs.mockReturnValue(queryResult({
      catalogs: [{
        id: 'catalog-1',
        name: 'Catalogue partagé 2026',
        supplierName: 'Sysco',
        scope: 'GLOBAL_SHARED',
        source: 'Catalogue contractuel septembre 2026',
        status: 'ACTIVE',
        validFrom: '2026-09-01T00:00:00.000Z',
        validTo: null,
      }],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    }));

    renderPage();

    expect(screen.getByRole('heading', {
      name: 'Magasin A — Fournisseurs et prix',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'À propos des Fournisseurs et prix',
    })).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(screen.queryByText('Politique de l’espace de travail'))
      .not.toBeInTheDocument();
    expect(screen.getByRole('tab', {
      name: 'Catalogues',
    })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Catalogue partagé 2026'))
      .toBeInTheDocument();
    expect(screen.getByText(/Référentiel partagé/))
      .toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Portée' }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Catalogue contractuel septembre 2026'))
      .toBeInTheDocument();
    expect(screen.getByText(/Les tarifs fournisseur proviennent des catalogues/))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gérer les catalogues/ }))
      .toHaveAttribute(
        'href',
        '/workspaces/workspace-1/suppliers?section=catalogs',
      );
  });

  it('affiche le Prix applicable avec sa source et son fallback sans ouvrir un onglet non autorisé', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ
      ),
    });
    mocks.lazyApplicable.mockReturnValue([
      vi.fn(),
      {
        data: {
          requestedMode: 'INVOICED_PRICE',
          resolvedSource: 'NEGOTIATED_PRICE',
          fallbackApplied: true,
          fallbackReason: 'NO_VALIDATED_INVOICE',
          price: {
            normalizedAmount: '12.5',
            normalizedUnit: 'KG',
            currency: 'EUR',
          },
          alerts: ['NO_VALIDATED_INVOICE'],
        },
        isError: false,
        isFetching: false,
      },
    ]);

    renderPage();

    expect(screen.getByText('12,500 EUR / KG'))
      .toBeInTheDocument();
    expect(screen.getByText('Vérifier un prix applicable'))
      .toBeInTheDocument();
    expect(screen.getByText(/Source retenue : Tarif négocié/))
      .toBeInTheDocument();
    expect(screen.getByText(/source de remplacement/))
      .toBeInTheDocument();
    expect(screen.queryByText(/NEGOTIATED_PRICE/))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('tab'))
      .not.toBeInTheDocument();
  });
});
