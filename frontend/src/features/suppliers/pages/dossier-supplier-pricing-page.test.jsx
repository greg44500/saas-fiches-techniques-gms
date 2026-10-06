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
  listIndicative: vi.fn(),
  listWorkspaceIndicative: vi.fn(),
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
  useListDossierIndicativePricesQuery: mocks.listIndicative,
  useListWorkspaceIndicativePricesQuery: mocks.listWorkspaceIndicative,
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

vi.mock('@/features/suppliers/components/indicative-price-dialog', () => ({
  IndicativePriceDialog: ({ open }) => (
    open ? <div>Dialogue Prix indicatif ouvert</div> : null
  ),
}));

import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierSupplierPricingPage,
  normalizeArticle,
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

describe('normalizeArticle', () => {
  it('conserve le contexte unité métier de la Référence Produit', () => {
    const productVariant = {
      id: 'variant-unit',
      name: 'Pain bruschetta surgelé',
      referenceUnit: 'UNIT',
      countUnitLabelSingular: 'tranche',
      countUnitLabelPlural: 'tranches',
    };

    expect(normalizeArticle({
      id: 'article-unit',
      supplier: {
        id: 'supplier-1',
        name: 'Sysco',
      },
      supplierReference: 'BRU-001',
      productVariant,
    })).toMatchObject({
      id: 'article-unit',
      supplierId: 'supplier-1',
      productVariant,
      productVariantName: 'Pain bruschetta surgelé',
    });
  });
});

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
    mocks.listIndicative.mockReturnValue(queryResult([]));
    mocks.listWorkspaceIndicative.mockReturnValue(queryResult([]));
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
      name: 'Catalogues (1)',
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

  it('rend les volumes visibles et l’ajout d’un tarif négocié explicite', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => [
        SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ,
        SUPPLIER_PERMISSION.NEGOTIATED_PRICE_MANAGE,
        SUPPLIER_PERMISSION.INVOICED_PRICE_READ,
        SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ,
      ].includes(permission),
    });
    mocks.listNegotiated.mockReturnValue(queryResult([
      {
        id: 'price-active',
        status: 'ACTIVE',
        validFrom: '2026-09-01T00:00:00.000Z',
        validTo: null,
      },
      {
        id: 'price-archived',
        status: 'ARCHIVED',
        validFrom: '2026-01-01T00:00:00.000Z',
        validTo: null,
      },
    ]));
    mocks.listInvoiced.mockReturnValue(queryResult([
      { id: 'invoice-1', status: 'VALIDATED', invoiceDate: '2026-09-01T00:00:00.000Z' },
      { id: 'invoice-2', status: 'PENDING_VALIDATION', invoiceDate: '2026-09-02T00:00:00.000Z' },
    ]));
    mocks.listIndicative.mockReturnValue(queryResult([
      {
        id: 'indicative-1',
        status: 'ACTIVE',
        productVariant: {
          id: 'variant-1',
          name: 'Carotte',
          productName: 'Carotte',
        },
        normalizedAmount: '1.8',
        normalizedUnit: 'KG',
        currency: 'EUR',
      },
    ]));

    renderPage();

    expect(screen.getByRole('tab', {
      name: 'Tarifs négociés (2)',
    })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', {
      name: 'Prix facturés (2)',
    })).toBeInTheDocument();
    expect(screen.getByRole('tab', {
      name: 'Prix indicatifs (1)',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Ajouter un tarif négocié',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'À propos des Tarifs négociés',
    })).toBeInTheDocument();
  });

  it('affiche le Prix indicatif Workspace hérité lorsqu’aucune surcharge Dossier n’existe', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => [
        SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ,
        SUPPLIER_PERMISSION.INDICATIVE_PRICE_MANAGE,
      ].includes(permission),
    });
    mocks.listWorkspaceIndicative.mockReturnValue(queryResult([
      {
        id: 'workspace-indicative-1',
        status: 'ACTIVE',
        productVariant: {
          id: 'variant-1',
          name: 'Carotte',
          productName: 'Carotte',
        },
        normalizedAmount: '1.8',
        normalizedUnit: 'KG',
        currency: 'EUR',
        source: 'Estimation Workspace',
      },
    ]));

    renderPage();

    expect(screen.getByRole('tab', {
      name: 'Prix indicatifs (1)',
    })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('columnheader', {
      name: /PU HT/,
    })).toBeInTheDocument();
    expect(screen.getByText('1,800 / kg')).toBeInTheDocument();
    expect(screen.getByText('Espace de travail')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Définir un prix indicatif pour ce Dossier',
    })).toBeInTheDocument();
  });

  it('privilégie le Prix indicatif du Dossier sur la valeur Workspace affichée', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ
      ),
    });
    mocks.listWorkspaceIndicative.mockReturnValue(queryResult([
      {
        id: 'workspace-indicative-1',
        status: 'ACTIVE',
        productVariant: {
          id: 'variant-1',
          name: 'Carotte',
          productName: 'Carotte',
        },
        normalizedAmount: '1.8',
        normalizedUnit: 'KG',
        currency: 'EUR',
      },
    ]));
    mocks.listIndicative.mockReturnValue(queryResult([
      {
        id: 'dossier-indicative-1',
        status: 'ACTIVE',
        productVariant: {
          id: 'variant-1',
          name: 'Carotte',
          productName: 'Carotte',
        },
        normalizedAmount: '2.1',
        normalizedUnit: 'KG',
        currency: 'EUR',
      },
    ]));

    renderPage();

    expect(screen.getByText('2,100 / kg')).toBeInTheDocument();
    expect(screen.queryByText('1,800 / kg')).not.toBeInTheDocument();
    expect(screen.getByText('Dossier')).toBeInTheDocument();
  });

  it('n’affiche qu’un seul message lorsque le Dossier n’a aucun tarif négocié', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: (permission) => (
        permission === SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ
      ),
    });

    renderPage();

    expect(screen.getAllByText(
      'Aucun tarif négocié n’est enregistré pour ce Dossier.',
    )).toHaveLength(1);
    expect(screen.queryByText('Aucun Tarif négocié'))
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
