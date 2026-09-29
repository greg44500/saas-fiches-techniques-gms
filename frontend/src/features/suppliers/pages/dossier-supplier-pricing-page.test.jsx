import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  params: vi.fn(),
  workspaceContext: vi.fn(),
  listReferences: vi.fn(),
  listArticles: vi.fn(),
  listCatalogs: vi.fn(),
  listNegotiated: vi.fn(),
  listInvoiced: vi.fn(),
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

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListDossierSupplierReferencesQuery: mocks.listReferences,
  useListSupplierArticlesQuery: mocks.listArticles,
  useListSupplierCatalogsQuery: mocks.listCatalogs,
  useListNegotiatedPricesQuery: mocks.listNegotiated,
  useListInvoicedPricesQuery: mocks.listInvoiced,
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
  });

  it('affiche les catalogues accessibles avec portée et provenance dans le contexte Dossier', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.CATALOG_READ
        || permission === SUPPLIER_PERMISSION.SUPPLIER_READ
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
      name: 'Fournisseurs et prix',
    })).toBeInTheDocument();
    expect(screen.queryByText('Retour au Dossier')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', {
      name: 'Catalogues',
    })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Catalogue partagé 2026'))
      .toBeInTheDocument();
    expect(screen.getByText('Catalogue contractuel septembre 2026'))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gérer les catalogues/ }))
      .toHaveAttribute(
        'href',
        '/workspaces/workspace-1/suppliers?section=catalogs',
      );
    expect(screen.queryByText('Vérifier un prix applicable'))
      .not.toBeInTheDocument();
  });

  it('utilise une action Retirer dédiée plutôt qu’une suppression', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => [
        SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ,
        SUPPLIER_PERMISSION.DOSSIER_REFERENCE_MANAGE,
      ].includes(permission),
    });
    mocks.listReferences.mockReturnValue(queryResult([{
      id: 'dossier-reference-1',
      supplierArticle: {
        id: 'article-1',
        supplierReference: 'Ali321',
        supplierName: 'Sysco',
        productVariantName: 'Ail',
      },
    }]));

    renderPage();

    expect(screen.getByRole('button', {
      name: 'Retirer Ali321 du Dossier',
    })).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: /Supprimer Ali321/i,
    })).not.toBeInTheDocument();
  });
});
