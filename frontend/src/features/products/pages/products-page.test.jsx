import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  metadataQuery: vi.fn(),
  searchQuery: vi.fn(),
  workspaceContext: vi.fn(),
  productReferenceAccessQuery: vi.fn(),
  attachMutation: vi.fn(),
  archiveMutation: vi.fn(),
}));

vi.mock('@/features/products/api/product-reference-api', () => ({
  useGetProductReferenceAccessQuery: mocks.productReferenceAccessQuery,
}));

vi.mock('@/features/products/api/product-catalog-api', () => ({
  useArchiveProductVariantMutation: () => [mocks.archiveMutation, { isLoading: false }],
  useAttachProductVariantMutation: () => [mocks.attachMutation, { isLoading: false }],
  useGetProductMetadataQuery: mocks.metadataQuery,
  useSearchProductsQuery: mocks.searchQuery,
}));

vi.mock('@/features/products/components/product-create-dialog', () => ({
  ProductCreateDialog: ({ open }) => (
    open ? <div>Création Produit ouverte</div> : null
  ),
}));

vi.mock('@/features/products/components/product-details-drawer', () => ({
  ProductDetailsDrawer: ({ open }) => (
    open ? <div>Détail Produit ouvert</div> : null
  ),
}));

vi.mock('@/features/products/components/product-import-dialog', () => ({
  ProductImportDialog: ({ open }) => (
    open ? <div>Import Produits ouvert</div> : null
  ),
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: ({
    onSelect,
    onValueChange,
    scope,
    value,
  }) => (
    <div>
      <input
        aria-label="Rechercher un Produit"
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      />
      <span data-testid="predictive-scope">{scope}</span>
      <button
        onClick={() => onSelect({
          ...result,
          workspaceEntry: null,
        })}
        type="button"
      >
        Suggestion Carotte
      </button>
    </div>
  ),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

import {
  PRODUCT_CAPABILITY,
  PRODUCT_PERMISSION,
} from '@/features/products/constants/product-permissions';
import { ProductsPage } from '@/features/products/pages/products-page';

const metadata = {
  categories: [{ id: 'category-1', name: 'Légumes', status: 'ACTIVE' }],
  productStatuses: [
    { value: 'ACTIVE', label: 'Actif' },
    { value: 'ARCHIVED', label: 'Archivé' },
  ],
  workspaceProductStatuses: [
    { value: 'ACTIVE', label: 'Dans le catalogue' },
    { value: 'ARCHIVED', label: 'Retiré du catalogue' },
  ],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
};

const result = {
  source: 'CANONICAL_PRODUCT',
  product: {
    id: 'product-1',
    name: 'Carotte',
    aliases: [],
    category: { id: 'category-1', name: 'Légumes', status: 'ACTIVE' },
    status: 'ACTIVE',
  },
  variant: {
    id: 'variant-1',
    form: 'Entière',
    processingState: null,
    preservation: 'Fraîche',
    referenceUnit: 'KG',
    yieldPercent: 90,
    status: 'ACTIVE',
  },
  workspaceEntry: {
    id: 'entry-1',
    status: 'ACTIVE',
  },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <ToastProvider>
          <ProductsPage />
        </ToastProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: () => true,
      hasFeature: () => true,
    });
    mocks.productReferenceAccessQuery.mockReturnValue({
      data: { permissions: [] },
      isError: false,
      isFetching: false,
      isLoading: false,
    });
    mocks.metadataQuery.mockReturnValue({
      data: metadata,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.searchQuery.mockReturnValue({
      data: {
        results: [result],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('affiche le catalogue Workspace avec les libellés backend', () => {
    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByText('Légumes')).toBeInTheDocument();
    expect(screen.getByText('Entière · Fraîche')).toBeInTheDocument();
    expect(screen.getByText('Dans le catalogue')).toBeInTheDocument();
  });

  it('recherche côté serveur et bascule vers le référentiel global', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher un Produit' }),
      'carotte',
    );
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(mocks.searchQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        q: 'carotte',
        scope: 'WORKSPACE',
      }),
    );

    await user.click(screen.getByRole('tab', { name: 'Tout le référentiel' }));

    expect(mocks.searchQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'REFERENCE',
        status: undefined,
      }),
    );
    expect(screen.getByText('Références actives du référentiel commun'))
      .toBeInTheDocument();
  });

  it('cherche prédictivement dans le référentiel et bascule sur une référence absente du Workspace', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByTestId('predictive-scope')).toHaveTextContent('REFERENCE');

    await user.click(screen.getByRole('button', { name: 'Suggestion Carotte' }));

    expect(screen.getByRole('tab', { name: 'Tout le référentiel' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(mocks.searchQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'REFERENCE',
        q: 'Carotte',
        status: undefined,
      }),
    );
  });

  it('ouvre création, import et détail selon les droits', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Créer un Produit' }));
    expect(screen.getByText('Création Produit ouverte')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Importer' }));
    expect(screen.getByText('Import Produits ouvert')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Voir Carotte' }));
    expect(screen.getByText('Détail Produit ouvert')).toBeInTheDocument();
  });

  it('affiche une action compacte pour retirer une référence du catalogue', () => {
    renderPage();

    expect(screen.getByRole('button', {
      name: 'Retirer Carotte du catalogue',
    })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retirer' }))
      .not.toBeInTheDocument();
  });

  it('affiche une action compacte pour ajouter une référence au catalogue', () => {
    mocks.searchQuery.mockReturnValue({
      data: {
        results: [{
          ...result,
          workspaceEntry: null,
        }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('button', {
      name: 'Ajouter Carotte au catalogue',
    })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter' }))
      .not.toBeInTheDocument();
  });

  it('masque les actions d’écriture sans permissions ou capabilities M-002', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: (permission) => permission === PRODUCT_PERMISSION.READ,
      hasFeature: (feature) => feature === PRODUCT_CAPABILITY.REFERENCE_ACCESS,
    });

    renderPage();

    expect(screen.queryByRole('button', { name: 'Créer un Produit' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Importer' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Retirer Carotte du catalogue',
    })).not.toBeInTheDocument();
  });

  it('conserve Mon catalogue mais masque le référentiel global sans product_reference_access', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: () => true,
      hasFeature: () => false,
    });

    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mon catalogue' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Tout le référentiel' }))
      .not.toBeInTheDocument();
  });
});
