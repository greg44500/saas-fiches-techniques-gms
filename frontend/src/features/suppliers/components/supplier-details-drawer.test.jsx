import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listWorkspaceArticles: vi.fn(),
  listWorkspaceCatalogs: vi.fn(),
  listGlobalArticles: vi.fn(),
  listGlobalCatalogs: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSupplierArticlesQuery: mocks.listWorkspaceArticles,
  useListSupplierCatalogsQuery: mocks.listWorkspaceCatalogs,
  useListGlobalSupplierArticlesQuery: mocks.listGlobalArticles,
  useListGlobalSupplierCatalogsQuery: mocks.listGlobalCatalogs,
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? (
      <aside>
        <h2>{title}</h2>
        {children}
      </aside>
    ) : null
  ),
}));

import {
  SupplierDetailsDrawer,
} from '@/features/suppliers/components/supplier-details-drawer';

const queryResult = (data) => ({
  data,
  isError: false,
  isLoading: false,
  refetch: vi.fn(),
});

const supplier = {
  id: 'supplier-1',
  name: 'Fournisseur local',
  supplierCode: 'LOC',
  legalName: 'Fournisseur Local SAS',
  website: 'https://example.test',
  scope: 'WORKSPACE_PRIVATE',
  status: 'ACTIVE',
};

describe('SupplierDetailsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.listWorkspaceArticles.mockReturnValue(queryResult({
      articles: [{
        id: 'article-1',
        supplierReference: 'LOC-001',
        supplierDesignation: 'Carotte rondelle',
        productVariant: { name: 'Carotte rondelle' },
        packaging: {
          containerType: 'sac',
          unitCount: 1,
          quantityPerUnit: '25',
          totalQuantity: '25',
          unit: 'KG',
        },
        status: 'ACTIVE',
      }],
    }));
    mocks.listWorkspaceCatalogs.mockReturnValue(queryResult({
      catalogs: [{
        id: 'catalog-1',
        name: 'Catalogue septembre',
        source: 'Import fournisseur',
        validFrom: '2026-09-01T00:00:00.000Z',
        validTo: '2026-09-30T00:00:00.000Z',
        status: 'ACTIVE',
      }],
    }));
    mocks.listGlobalArticles.mockReturnValue(queryResult({ articles: [] }));
    mocks.listGlobalCatalogs.mockReturnValue(queryResult({ catalogs: [] }));
  });

  it('présente les informations et les extensions prévues du Fournisseur Workspace', async () => {
    const user = userEvent.setup();

    render(
      <SupplierDetailsDrawer
        canManage
        canReadArticles
        canReadCatalogs
        mode="workspace"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        open
        supplier={supplier}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText('Fournisseur Local SAS')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Utilisation' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Articles' }));
    expect(screen.getByText('LOC-001')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Catalogues' }));
    expect(screen.getByText('Catalogue septembre')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Utilisation' }));
    expect(screen.getByText(/Tarifs négociés et Prix facturés/i))
      .toBeInTheDocument();
  });

  it('ne mélange pas les usages Workspace dans le référentiel global', () => {
    render(
      <SupplierDetailsDrawer
        canManage
        canReadArticles
        canReadCatalogs
        mode="global"
        onClose={vi.fn()}
        onEdit={vi.fn()}
        open
        supplier={{
          ...supplier,
          scope: 'GLOBAL_SHARED',
        }}
      />,
    );

    expect(screen.queryByRole('tab', { name: 'Utilisation' }))
      .not.toBeInTheDocument();
  });
});
