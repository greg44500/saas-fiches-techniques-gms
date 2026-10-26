import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  addReference: vi.fn(),
  removeReference: vi.fn(),
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
    mocks.addReference,
    { isLoading: false },
  ],
  useRemoveDossierSupplierReferenceMutation: () => [
    mocks.removeReference,
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
    mocks.addReference.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mocks.removeReference.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });

    mocks.params.mockReturnValue({
      dossierId: 'dossier-1',
    });
    mocks.listReferences.mockReturnValue(queryResult([]));
    mocks.listArticles.mockReturnValue(queryResult({
      articles: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
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

  it('affiche les Articles du Workspace et identifie les favoris propres au Dossier', async () => {
    const user = userEvent.setup();
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => [
        SUPPLIER_PERMISSION.ARTICLE_READ,
        SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ,
        SUPPLIER_PERMISSION.DOSSIER_REFERENCE_MANAGE,
      ].includes(permission),
    });
    mocks.listReferences.mockReturnValue(queryResult([{
      id: 'favorite-1',
      supplierArticle: {
        id: 'article-34171',
        supplierReference: '34171',
        supplierName: 'BRIDOR',
        supplierDesignation: 'Plaque feuilletée',
        productVariantName: 'Pâte feuilletée pur beurre',
      },
    }]));
    mocks.listArticles.mockImplementation((args) => queryResult({
      articles: args.limit === 1 ? [] : [
        {
          id: 'article-34171', supplierReference: '34171',
          supplierDesignation: 'Plaque feuilletée',
          supplier: { name: 'BRIDOR' },
          productVariant: { name: 'Pâte feuilletée pur beurre' },
        },
        {
          id: 'article-43279', supplierReference: '43279',
          supplierDesignation: 'Croissant pur beurre',
          supplier: { name: 'BRIDOR' },
          associationStatus: 'PENDING',
        },
      ],
      pagination: { page: args.page ?? 1, limit: args.limit, total: 2, totalPages: 1 },
    }));

    renderPage();
    expect(screen.getByRole('tab', { name: 'Articles fournisseur (2)' }))
      .toBeInTheDocument();
    expect(screen.getByText('Plaque feuilletée')).toBeInTheDocument();
    expect(screen.getByText('Croissant pur beurre')).toBeInTheDocument();
    expect(screen.getByText('Non associé')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', {
      name: 'Référence à ajouter au Dossier',
    })).not.toBeInTheDocument();

    const add = screen.getByRole('button', {
      name: 'Ajouter aux favoris : 43279',
    });
    await user.click(add);
    expect(mocks.addReference).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      articleId: 'article-43279',
    });

    await user.click(screen.getByRole('button', { name: 'Favoris (1)' }));
    expect(screen.getByText('Plaque feuilletée')).toBeInTheDocument();
    expect(screen.queryByText('Croissant pur beurre')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter aux favoris : 43279' }))
      .not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retirer des favoris : 34171' }));
    expect(mocks.removeReference).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      articleId: 'article-34171',
    });
  });

  it('recherche et pagine les Articles côté serveur sans plafond de 100 éléments', async () => {
    const user = userEvent.setup();
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => permission === SUPPLIER_PERMISSION.ARTICLE_READ,
    });
    mocks.listArticles.mockImplementation((args) => queryResult({
      articles: [],
      pagination: {
        page: args.page ?? 1, limit: args.limit,
        total: 125, totalPages: Math.ceil(125 / args.limit),
      },
    }));
    renderPage();
    expect(screen.getByRole('tab', { name: 'Articles fournisseur (125)' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Favoris \(/ }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajouter aux favoris/ }))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(mocks.listArticles).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
      { skip: false },
    );
    await user.type(screen.getByRole('searchbox', {
      name: 'Rechercher un Article fournisseur',
    }), 'BRIDOR');
    expect(mocks.listArticles).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, search: 'BRIDOR', limit: 10 }),
      { skip: false },
    );
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

  it('affiche le Prix indicatif Workspace hérité lorsqu’aucune surcharge Dossier n’existe', async () => {
    const user = userEvent.setup();
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
      name: 'Actions de Carotte',
    })).toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Définir un prix indicatif pour ce Dossier',
    })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Actions de Carotte',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Définir un prix indicatif pour ce Dossier',
    }));

    expect(screen.getByText('Dialogue Prix indicatif ouvert'))
      .toBeInTheDocument();
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

  it.each([
    ['Articles fournisseur (0)', 'Lignes des Articles fournisseur du Dossier', 'Article fournisseur'],
    ['Catalogues (0)', 'Lignes des catalogues fournisseurs', 'Catalogue'],
    ['Tarifs négociés (0)', 'Lignes des tarifs négociés', 'Article'],
    ['Prix facturés (0)', 'Lignes des prix facturés', 'Article'],
    ['Prix indicatifs (0)', 'Lignes des prix indicatifs', 'Produit'],
  ])('conserve l’entête visible avec défilement interne dans %s', async (
    tab,
    regionName,
    firstColumn,
  ) => {
    const user = userEvent.setup();
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: () => true,
    });
    renderPage();
    await user.click(screen.getByRole('tab', { name: tab }));
    const region = screen.getByRole('region', { name: regionName });
    expect(region).toHaveClass('overflow-auto');
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('columnheader', { name: firstColumn })
      .closest('thead')).toHaveClass('sticky', 'top-0');
  });

  it('conserve la consultation des favoris sans ouvrir le catalogue sans droit Article', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => permission === SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ,
    });
    mocks.listReferences.mockReturnValue(queryResult([{
      id: 'favorite-1',
      supplierArticle: {
        id: 'article-34171', supplierReference: '34171',
        supplierName: 'BRIDOR', supplierDesignation: 'Plaque feuilletée',
        productVariantName: 'Pâte feuilletée pur beurre',
      },
    }]));
    renderPage();
    expect(screen.getByRole('tab', { name: 'Articles favoris (1)' }))
      .toBeInTheDocument();
    expect(screen.getByText('Plaque feuilletée')).toBeInTheDocument();
    expect(mocks.listArticles.mock.calls.every(([,options]) => options?.skip === true))
      .toBe(true);
    expect(screen.queryByRole('button', { name: /Ajouter aux favoris/ }))
      .not.toBeInTheDocument();
  });

  it('ne propose pas Retirer du Dossier sans permission de gestion', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => permission === SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ,
    });
    mocks.listReferences.mockReturnValue(queryResult([{
      id: 'dossier-reference-readonly',
      supplierArticle: {
        id: 'article-readonly',
        supplierReference: 'Lecture seule',
        supplierName: 'BRIDOR',
        productVariantName: 'Pâte feuilletée',
      },
    }]));
    renderPage();
    expect(screen.queryByRole('button', { name: /Retirer du Dossier/ }))
      .not.toBeInTheDocument();
  });

  it('n’offre pas de mutation de favoris avec la seule permission de lecture', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => [
        SUPPLIER_PERMISSION.ARTICLE_READ,
        SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ,
      ].includes(permission),
    });
    mocks.listReferences.mockReturnValue(queryResult([{
      id: 'favorite-1',
      supplierArticle: { id: 'article-1', supplierReference: 'Ali321',
        supplierName: 'Sysco', productVariantName: 'Ail' },
    }]));
    mocks.listArticles.mockImplementation((args) => queryResult({
      articles: args.limit === 1 ? [] : [{
        id: 'article-1', supplierReference: 'Ali321',
        supplierDesignation: 'Ail entier', supplier: { name: 'Sysco' },
      }],
      pagination: { page: 1, limit: args.limit, total: 1, totalPages: 1 },
    }));
    renderPage();
    expect(screen.getByText('Ail entier')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajouter aux favoris|Retirer des favoris/ }))
      .not.toBeInTheDocument();
    expect(screen.getByText('Favori', { exact: true })).toBeInTheDocument();
  });
});
