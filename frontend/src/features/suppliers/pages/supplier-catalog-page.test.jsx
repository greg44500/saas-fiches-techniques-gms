import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  listCatalogLines: vi.fn(),
  workspaceContext: vi.fn(),
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: mocks.workspaceContext,
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSupplierCatalogLinesQuery: mocks.listCatalogLines,
}));

vi.mock('@/components/shared/info-tooltip', () => ({
  InfoTooltip: ({ label }) => (
    <button aria-label={label} type="button" />
  ),
}));

vi.mock('@/components/shared/action-icon-button', () => ({
  ActionIconButton: ({ label, onClick }) => (
    <button aria-label={label} onClick={onClick} type="button" />
  ),
}));

import {
  SupplierCatalogPage,
} from '@/features/suppliers/pages/supplier-catalog-page';

const queryResult = {
  data: {
    catalog: {
      id: 'catalog-1',
      scope: 'WORKSPACE_PRIVATE',
      supplierName: 'Pro à Pro',
      name: 'Pro à Pro | Catalogue octobre 2026',
      editionDate: '2026-10-09T00:00:00.000Z',
      validFrom: '2026-10-01T00:00:00.000Z',
      validTo: '2026-10-31T00:00:00.000Z',
      source: 'Mercuriale octobre',
      status: 'ACTIVE',
      lineCount: 2,
    },
    lines: [{
      id: 'line-1',
      sourceRowNumber: 2,
      supplierReference: 'BAC-001',
      designation: 'Bacon fumé',
      brand: 'Marque Test',
      packaging: {
        containerType: 'Paquet',
        unitCount: 1,
        quantityPerUnit: '500',
        unit: 'G',
      },
      sourcePrice: {
        amount: '11.58',
        basis: 'KG',
        currency: 'EUR',
      },
      supplierArticleId: 'article-1',
      matchStatus: 'MATCHED',
    }],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    },
  },
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        '/workspaces/workspace-1/suppliers/catalogs/catalog-1',
      ]}
    >
      <Routes>
        <Route
          element={<SupplierCatalogPage />}
          path="/workspaces/:workspaceId/suppliers/catalogs/:catalogId"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SupplierCatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.workspaceContext.mockReturnValue({
      workspace: {
        id: 'workspace-1',
        name: 'Acme',
      },
    });
    mocks.listCatalogLines.mockReturnValue(queryResult);
  });

  it('affiche les informations et références du catalogue en français', () => {
    renderPage();

    expect(screen.getByRole('heading', {
      name: 'Catalogue octobre 2026',
    })).toBeInTheDocument();
    expect(screen.getAllByText('Pro à Pro').length).toBeGreaterThan(0);
    expect(screen.getByText('09/10/2026')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026 – 31/10/2026'))
      .toBeInTheDocument();
    expect(screen.getByText('BAC-001')).toBeInTheDocument();
    expect(screen.getByText('Bacon fumé')).toBeInTheDocument();
    expect(screen.getByText('Associé')).toBeInTheDocument();
    expect(screen.getByText('11,58 EUR / kg')).toBeInTheDocument();

    expect(mocks.listCatalogLines).toHaveBeenLastCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        catalogId: 'catalog-1',
        page: 1,
        limit: 10,
        search: undefined,
        matchStatus: undefined,
      }),
    );
  });

  it('transmet la recherche et le filtre de rapprochement au serveur', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByRole('textbox', {
        name: 'Rechercher dans le catalogue',
      }),
      'bacon',
    );
    await user.click(
      screen.getByRole('button', { name: 'Rechercher' }),
    );

    expect(mocks.listCatalogLines).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'bacon',
      }),
    );

    await user.click(
      screen.getByRole('combobox', {
        name: 'Filtrer par rapprochement',
      }),
    );
    await user.click(
      await screen.findByRole('option', {
        name: 'À associer',
      }),
    );

    expect(mocks.listCatalogLines).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'bacon',
        matchStatus: 'UNMATCHED',
      }),
    );
  });
});
