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
    { value: 'ACTIVE', label: 'Favori' },
    { value: 'ARCHIVED', label: 'Retiré des favoris' },
  ],
  conservationTypes: [
    { value: 'FRAIS', label: 'Frais' },
    { value: 'SURGELE', label: 'Surgelé' },
  ],
  referenceUnits: [{ value: 'KG', label: 'kg' }],
  foodRanges: [
    {
      value: 1,
      label: 'Gamme 1',
      name: 'Frais',
      processingStates: ['Produit frais'],
      defaultProcessingState: 'Produit frais',
    },
  ],
};

const result = {
  source: 'PRODUCT_VARIANT',
  product: {
    id: 'product-1',
    name: 'Carotte',
    aliases: [],
    category: { id: 'category-1', name: 'Légumes', status: 'ACTIVE' },
    status: 'ACTIVE',
  },
  variant: {
    id: 'variant-1',
    name: 'Carotte',
    variety: null,
    characteristics: [{
      id: 'presentation-whole',
      kind: 'PRESENTATION',
      name: 'Entière',
      aliases: [],
      status: 'ACTIVE',
    }],
    presentation: 'Entière',
    processingState: null,
    conservationType: 'FRAIS',
    foodRange: 1,
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

  it('affiche Produit, Conservation et Actions sans bruit secondaire', () => {
    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Produit' }))
      .toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Conservation' }))
      .toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' }))
      .toBeInTheDocument();
    expect(screen.getByText('Frais')).toBeInTheDocument();
    expect(screen.queryByText('Légumes')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Gamme' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrer par conservation' }))
      .toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filtrer par gamme' }))
      .toBeInTheDocument();
  });

  it('recherche côté serveur dans la portée sélectionnée', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('tab', { name: 'Tous les produits' }))
      .toHaveAttribute('aria-selected', 'true');

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher un Produit' }),
      'carotte',
    );
    await user.click(screen.getByRole('button', { name: 'Rechercher' }));

    expect(mocks.searchQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        q: 'carotte',
        scope: 'REFERENCE',
        sort: 'NAME',
      }),
    );

    await user.click(screen.getByRole('tab', { name: 'Favoris' }));

    expect(mocks.searchQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'WORKSPACE',
      }),
    );
    expect(screen.getByRole('tab', { name: 'Favoris' }))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('cherche prédictivement dans le référentiel et bascule sur une référence absente du Workspace', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Favoris' }));
    expect(screen.getByRole('tab', { name: 'Favoris' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('predictive-scope')).toHaveTextContent('REFERENCE');

    await user.click(screen.getByRole('button', { name: 'Suggestion Carotte' }));

    expect(screen.getByRole('tab', { name: 'Tous les produits' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(mocks.searchQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scope: 'REFERENCE',
        q: 'Carotte',
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

  it('affiche une action compacte pour retirer une référence précise du catalogue', () => {
    renderPage();

    expect(screen.getByRole('button', {
      name: 'Retirer Carotte des favoris',
    })).toBeInTheDocument();
  });

  it('affiche une action compacte pour ajouter une référence précise au catalogue', () => {
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
      name: 'Ajouter Carotte aux favoris',
    })).toBeInTheDocument();
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
      name: 'Retirer Carotte des favoris',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir Carotte' }))
      .toBeInTheDocument();
  });

  it('conserve Favoris mais masque Tous les produits sans product_reference_access', () => {
    mocks.workspaceContext.mockReturnValue({
      workspace: { id: 'workspace-1', name: 'Acme' },
      can: () => true,
      hasFeature: () => false,
    });

    renderPage();

    expect(screen.getByText('Carotte')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Favoris' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Tous les produits' }))
      .not.toBeInTheDocument();
  });
});
