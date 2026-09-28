import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ToastProvider,
} from '@/components/shared/toast-provider';

const mocks = vi.hoisted(() => ({
  listGlobalSuppliers: vi.fn(),
  listGlobalArticles: vi.fn(),
  listGlobalCatalogs: vi.fn(),
  updateSupplierStatus: vi.fn(),
  updateArticleStatus: vi.fn(),
  updateCatalogStatus: vi.fn(),
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
  useListGlobalSuppliersQuery: mocks.listGlobalSuppliers,
  useListGlobalSupplierArticlesQuery: mocks.listGlobalArticles,
  useListGlobalSupplierCatalogsQuery: mocks.listGlobalCatalogs,
  useUpdateGlobalSupplierStatusMutation: () => [
    mocks.updateSupplierStatus,
    { isLoading: false },
  ],
  useUpdateGlobalSupplierArticleStatusMutation: () => [
    mocks.updateArticleStatus,
    { isLoading: false },
  ],
  useUpdateGlobalSupplierCatalogStatusMutation: () => [
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

vi.mock('@/features/suppliers/components/supplier-catalog-import-dialog', () => ({
  SupplierCatalogImportDialog: ({ open }) => (
    open ? <div>Import catalogue ouvert</div> : null
  ),
}));

import {
  SupplierReferencePage,
} from '@/features/suppliers/pages/supplier-reference-page';

const queryResult = (data) => ({
  data,
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
});

function renderPage({ canManage = true } = {}) {
  return render(
    <ToastProvider>
      <SupplierReferencePage canManage={canManage} />
    </ToastProvider>,
  );
}

describe('SupplierReferencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.updateSupplierStatus.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });

    mocks.listGlobalSuppliers.mockImplementation(({ page = 1, limit, status }) => {
      if (limit === 100) {
        return queryResult({
          suppliers: [{
            id: 'supplier-active',
            name: 'Sysco',
            supplierCode: 'SYS',
            status: 'ACTIVE',
          }],
          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
          },
        });
      }

      return queryResult({
        suppliers: [{
          id: 'supplier-' + page,
          name: page === 1 ? 'Sysco' : 'Metro',
          supplierCode: page === 1 ? 'SYS' : 'MET',
          status,
        }],
        pagination: {
          page,
          limit,
          total: 11,
          totalPages: 2,
        },
      });
    });

    mocks.listGlobalArticles.mockImplementation(({ page = 1, limit }) => (
      queryResult({
        articles: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    ));

    mocks.listGlobalCatalogs.mockImplementation(({ page = 1, limit }) => (
      queryResult({
        catalogs: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      })
    ));
  });

  it('utilise la pagination serveur sur le référentiel global', async () => {
    const user = userEvent.setup();

    renderPage();

    expect(mocks.listGlobalSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      }),
    );
    expect(screen.getByRole('combobox', {
      name: 'Nombre de lignes par page',
    })).toBeInTheDocument();
    expect(screen.getByText('Page 1 sur 2 · 11 résultats'))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(mocks.listGlobalSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
        status: 'ACTIVE',
      }),
    );
    expect(screen.getByText('Metro')).toBeInTheDocument();
  });

  it('revient à la première page lors du changement de section', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await user.click(screen.getByRole('tab', { name: 'Articles' }));

    expect(mocks.listGlobalArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      }),
    );
  });

  it('désactive la recherche vide et la réinitialise quand le champ est effacé', async () => {
    const user = userEvent.setup();

    renderPage();

    const searchInput = screen.getByRole('textbox', {
      name: 'Rechercher dans le référentiel Fournisseurs',
    });
    const searchButton = screen.getByRole('button', { name: 'Rechercher' });

    expect(searchButton).toBeDisabled();

    await user.type(searchInput, 'sysco');
    expect(searchButton).toBeEnabled();

    await user.click(searchButton);

    expect(mocks.listGlobalSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'sysco',
        page: 1,
      }),
    );

    await user.clear(searchInput);

    expect(searchButton).toBeDisabled();
    expect(mocks.listGlobalSuppliers).toHaveBeenCalledWith(
      expect.objectContaining({
        search: undefined,
        page: 1,
      }),
    );
  });

  it('ouvre le détail Fournisseur depuis l action Voir', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', {
      name: 'Voir Sysco',
    }));

    expect(screen.getByText('Détail Fournisseur : Sysco'))
      .toBeInTheDocument();
  });

  it('masque les actions de gestion sans permission globale manage', () => {
    renderPage({ canManage: false });

    expect(screen.queryByRole('button', {
      name: 'Créer un Fournisseur',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Modifier Sysco',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Archiver Sysco',
    })).not.toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Voir Sysco',
    })).toBeInTheDocument();
  });

  it('conserve l import global sous autorité manage sans capability Workspace', async () => {
    const user = userEvent.setup();

    renderPage({ canManage: true });

    await user.click(screen.getByRole('tab', { name: 'Catalogues' }));
    await user.click(screen.getByRole('button', {
      name: 'Importer un catalogue',
    }));

    expect(screen.getByText('Import catalogue ouvert')).toBeInTheDocument();
  });
});
