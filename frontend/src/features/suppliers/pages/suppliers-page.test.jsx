import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ToastProvider,
} from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  workspaceContext: vi.fn(),
  listSuppliers: vi.fn(),
  listArticles: vi.fn(),
  listCatalogs: vi.fn(),
  updateSupplierStatus: vi.fn(),
  updateArticleStatus: vi.fn(),
  updateCatalogStatus: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/components/shared/info-tooltip', () => ({
  InfoTooltip: ({ label }) => (
    <button aria-label={label} type="button" />
  ),
}));

vi.mock('@/components/shared/action-icon-button', () => ({
  ActionIconButton: ({ label, onClick, disabled }) => (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      type="button"
    />
  ),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSuppliersQuery: mocks.listSuppliers,
  useListSupplierArticlesQuery: mocks.listArticles,
  useListSupplierCatalogsQuery: mocks.listCatalogs,
  useUpdateSupplierStatusMutation: () => [
    mocks.updateSupplierStatus,
    { isLoading: false },
  ],
  useUpdateSupplierArticleStatusMutation: () => [
    mocks.updateArticleStatus,
    { isLoading: false },
  ],
  useUpdateSupplierCatalogStatusMutation: () => [
    mocks.updateCatalogStatus,
    { isLoading: false },
  ],
}));

vi.mock('@/features/suppliers/components/supplier-details-drawer', () => ({
  SupplierDetailsDrawer: ({ open, supplier }) => (
    open ? <div>Détail Fournisseur : {supplier?.name}</div> : null
  ),
}));

vi.mock('@/features/suppliers/components/supplier-form-dialog', () => ({
  SupplierFormDialog: ({ open }) => (
    open ? <div>Formulaire Fournisseur ouvert</div> : null
  ),
}));

vi.mock('@/features/suppliers/components/supplier-article-form-dialog', () => ({
  SupplierArticleFormDialog: ({ open }) => (
    open ? <div>Formulaire Article ouvert</div> : null
  ),
}));

vi.mock('@/features/suppliers/components/supplier-catalog-import-dialog', () => ({
  SupplierCatalogImportDialog: ({ open }) => (
    open ? <div>Import catalogue ouvert</div> : null
  ),
}));

import {
  SUPPLIER_CAPABILITY,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  SuppliersPage,
} from '@/features/suppliers/pages/suppliers-page';

const queryResult = (data) => ({
  data,
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
});

function renderPage() {
  return render(
    <ToastProvider>
      <SuppliersPage />
    </ToastProvider>,
  );
}

describe('SuppliersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.updateSupplierStatus.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });

    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: () => true,
      hasFeature: () => true,
    });

    mocks.listSuppliers.mockImplementation(({ status }) => (
      queryResult({
        suppliers: status === 'ARCHIVED'
          ? [{
            id: 'supplier-archived',
            name: 'Fournisseur archivé',
            supplierCode: 'ARC',
            scope: 'WORKSPACE_PRIVATE',
            status: 'ARCHIVED',
          }]
          : [
            {
              id: 'supplier-global',
              name: 'Sysco partagé',
              supplierCode: 'SYS',
              scope: 'GLOBAL_SHARED',
              status: 'ACTIVE',
            },
            {
              id: 'supplier-private',
              name: 'Fournisseur local',
              supplierCode: 'LOC',
              scope: 'WORKSPACE_PRIVATE',
              status: 'ACTIVE',
            },
            ...(status === 'ALL'
              ? [{
                id: 'supplier-archived',
                name: 'Fournisseur archivé',
                supplierCode: 'ARC',
                scope: 'WORKSPACE_PRIVATE',
                status: 'ARCHIVED',
              }]
              : []),
          ],
        pagination: {
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 1,
        },
      })
    ));

    mocks.listArticles.mockReturnValue(queryResult({
      articles: [],
      pagination: {
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      },
    }));

    mocks.listCatalogs.mockReturnValue(queryResult({
      catalogs: [{
        id: 'catalog-1',
        name: 'Catalogue septembre',
        supplierName: 'Fournisseur local',
        scope: 'WORKSPACE_PRIVATE',
        status: 'ACTIVE',
        validFrom: '2026-09-01T00:00:00.000Z',
        validTo: '2026-09-30T00:00:00.000Z',
      }],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    }));
  });

  it('distingue les Fournisseurs partagés et privés', () => {
    renderPage();

    expect(mocks.listSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
        status: 'ALL',
      }),
    );

    expect(screen.getByRole('combobox', {
      name: 'Filtrer par statut',
    })).toHaveTextContent('Tous');
    expect(screen.getByText('Sysco partagé')).toBeInTheDocument();
    expect(screen.getByText('Fournisseur local')).toBeInTheDocument();
    expect(screen.getByText(/Référentiel partagé/)).toBeInTheDocument();
    expect(screen.getByText(/Cet espace de travail/)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Portée' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('combobox', {
      name: 'Nombre de lignes par page',
    })).toBeInTheDocument();
  });

  it('désactive la recherche tant que le champ est vide', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(screen.getByRole('button', { name: 'Rechercher' }))
      .toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: 'Rechercher' }),
      'sysco',
    );

    expect(screen.getByRole('button', { name: 'Rechercher' }))
      .toBeEnabled();

    await user.clear(screen.getByRole('textbox', { name: 'Rechercher' }));

    expect(screen.getByRole('button', { name: 'Rechercher' }))
      .toBeDisabled();
  });

  it('affiche tous les Fournisseurs par défaut et permet de réactiver un archivé', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(mocks.listSuppliers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: 'ALL',
        page: 1,
      }),
    );
    expect(screen.getByText('Fournisseur archivé')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Réactiver Fournisseur archivé',
    }));

    expect(mocks.updateSupplierStatus).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      supplierId: 'supplier-archived',
      status: 'ACTIVE',
    });
  });

  it('ouvre le détail Fournisseur depuis une action Voir', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', {
      name: 'Voir Fournisseur local',
    }));

    expect(
      screen.getByText('Détail Fournisseur : Fournisseur local'),
    ).toBeInTheDocument();
  });

  it('masque l import catalogue sans capability même avec la permission RBAC', async () => {
    const user = userEvent.setup();

    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: () => true,
      hasFeature: () => false,
    });

    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Catalogues' }));

    expect(screen.queryByRole('button', {
      name: 'Importer un catalogue',
    })).not.toBeInTheDocument();
  });

  it('autorise l import catalogue seulement avec permission et capability', async () => {
    const user = userEvent.setup();

    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
      can: () => true,
      hasFeature: (feature) => (
        feature === SUPPLIER_CAPABILITY.CATALOG_IMPORT
      ),
    });

    renderPage();

    await user.click(screen.getByRole('tab', { name: 'Catalogues' }));
    await user.click(screen.getByRole('button', {
      name: 'Importer un catalogue',
    }));

    expect(screen.getByText('Import catalogue ouvert')).toBeInTheDocument();
  });
});
