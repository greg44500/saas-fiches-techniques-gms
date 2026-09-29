import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  articleQuery: vi.fn(),
  productSearchProps: vi.fn(),
  sourcingProps: vi.fn(),
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: (props) => {
    mocks.productSearchProps(props);

    return (
      <div>
        <input
          aria-label={props.ariaLabel}
          placeholder={props.placeholder}
          readOnly
          value={props.value}
        />
        <button
          aria-label={'Sélectionner Pomme depuis ' + props.ariaLabel}
          onClick={() => props.onSelect({
            product: {
              id: 'product-2',
              name: 'Pomme',
            },
            variant: {
              id: 'variant-2',
              name: 'Pomme',
              referenceUnit: 'KG',
              yieldPercent: '95',
            },
          })}
          type="button"
        >
          Pomme
        </button>
      </div>
    );
  },
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListSupplierArticlesQuery: mocks.articleQuery,
}));

vi.mock('@/features/technical-sheets/components/technical-sheet-sourcing-select', () => ({
  TechnicalSheetSourcingSelect: (props) => {
    mocks.sourcingProps(props);

    return (
      <span data-testid="sourcing-select">
        {props.line.productVariantName}
      </span>
    );
  },
}));

import {
  PRODUCT_SOURCE,
  TechnicalSheetLineEditor,
  normalizeDraftLine,
} from '@/features/technical-sheets/components/technical-sheet-line-editor';

const metadata = {
  units: [
    { value: 'KG', label: 'kg' },
    { value: 'UNIT', label: 'unité' },
  ],
};

const valuedLine = normalizeDraftLine({
  id: 'line-1',
  kind: 'INGREDIENT',
  productVariantId: 'variant-1',
  productVariant: {
    id: 'variant-1',
    name: 'Carotte râpée',
    referenceUnit: 'KG',
    yieldPercent: '90',
  },
  netQuantity: '2.5',
  inputUnit: 'KG',
  note: 'Note conservée',
  selectedSupplierArticleId: 'article-1',
  calculation: {
    yieldPercentUsed: '90',
    grossQuantity: '2.778',
    grossUnit: 'KG',
  },
  valuation: {
    status: 'VALUED',
    supplierArticleId: 'article-1',
    applicableSource: 'NEGOTIATED_PRICE',
    normalizedAmount: '2.15',
    normalizedUnit: 'KG',
    lineCostHt: '6.02',
  },
}, 0);

function renderEditor(overrides = {}) {
  const onChange = vi.fn();

  render(
    <TooltipProvider>
      <TechnicalSheetLineEditor
        canManageSourcing
        canOpenPricing
        disabled={false}
        dossierId="dossier-1"
        draftRevision={4}
        lines={[valuedLine]}
        metadata={metadata}
        onChange={onChange}
        onOpenPricing={vi.fn()}
        onSourcingError={vi.fn()}
        onSourcingPendingChange={vi.fn()}
        onSourcingSelected={vi.fn()}
        productMetadata={{}}
        sourcingDisabled={false}
        technicalSheetId="sheet-1"
        workspaceId="workspace-1"
        {...overrides}
      />
    </TooltipProvider>,
  );

  return { onChange };
}

describe('TechnicalSheetLineEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.articleQuery.mockReturnValue({
      data: {
        articles: [{
          id: 'article-1',
          supplierReference: 'SYS-001',
          supplierDesignation: 'Carotte râpée 10 kg',
          packaging: {
            unitCount: 1,
            quantityPerUnit: '10',
            unit: 'KG',
          },
          supplier: {
            id: 'supplier-1',
            name: 'Sysco',
          },
        }],
      },
      isError: false,
      isLoading: false,
    });
  });

  it('présente les sources Produit sous forme d’actions et bascule vers les Favoris', async () => {
    const user = userEvent.setup();

    renderEditor();

    expect(screen.queryByText('Source Produit')).not.toBeInTheDocument();

    const globalButton = screen.getByRole('button', {
      name: 'Tous les produits',
    });
    const favoritesButton = screen.getByRole('button', {
      name: 'Favoris',
    });

    expect(globalButton).toHaveAttribute('aria-pressed', 'true');
    expect(
      mocks.productSearchProps.mock.calls.some(
        ([props]) => props.scope === PRODUCT_SOURCE.REFERENCE,
      ),
    ).toBe(true);

    await user.click(favoritesButton);

    expect(favoritesButton).toHaveAttribute('aria-pressed', 'true');
    expect(
      mocks.productSearchProps.mock.lastCall[0].scope,
    ).toBe(PRODUCT_SOURCE.FAVORITES);
  });

  it('affiche le tableau métier compact sans quantité brute ni colonne fournisseur', () => {
    renderEditor();

    expect(screen.getByText('Qté')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText('PUHT')).toBeInTheDocument();
    expect(screen.getByText('CMU HT')).toBeInTheDocument();
    expect(screen.getByText('%TR')).toBeInTheDocument();

    expect(screen.queryByText('Qté brute')).not.toBeInTheDocument();
    expect(screen.queryByText('Article / Fournisseur')).not.toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();

    expect(screen.getByText(/Ingrédients/)).toBeInTheDocument();
    expect(screen.getByText(/Économat/)).toBeInTheDocument();
    expect(screen.getAllByText(
      'Sélectionnez une Référence Produit ; la quantité et l’unité restent modifiables dans la ligne.',
    )).toHaveLength(1);
    expect(screen.getByText('90 %')).toBeInTheDocument();
    expect(screen.getByText(/2,15/)).toBeInTheDocument();
    expect(screen.getByText(/6,02/)).toBeInTheDocument();
  });

  it('ajoute un Produit directement depuis la ligne de saisie de la section', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    expect(screen.getAllByPlaceholderText('Ajouter un produit')).toHaveLength(2);

    await user.click(screen.getByRole('button', {
      name: 'Sélectionner Pomme depuis Ajouter un produit aux Ingrédients',
    }));

    expect(onChange).toHaveBeenCalledWith([
      valuedLine,
      expect.objectContaining({
        kind: 'INGREDIENT',
        productVariantId: 'variant-2',
        productVariantName: 'Pomme',
        inputUnit: 'KG',
      }),
    ]);
  });

  it('demande l’effacement du champ après ajout d’un Produit', () => {
    renderEditor();

    const ingredientSearch = mocks.productSearchProps.mock.calls
      .map(([props]) => props)
      .find((props) => props.ariaLabel === 'Ajouter un produit aux Ingrédients');

    expect(ingredientSearch.clearOnSelect).toBe(true);
  });

  it('remplace un Produit sans conserver son ancien sourcing ni sa valorisation', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(screen.getByRole('button', {
      name: 'Modifier le produit Carotte râpée',
    }));

    await user.click(screen.getByRole('button', {
      name: 'Sélectionner Pomme depuis Modifier le produit Carotte râpée',
    }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: undefined,
        kind: 'INGREDIENT',
        productVariantId: 'variant-2',
        productVariantName: 'Pomme',
        netQuantity: '2.5',
        inputUnit: 'KG',
        note: 'Note conservée',
        selectedSupplierArticleId: null,
        calculation: null,
        valuation: null,
      }),
    ]);
  });

  it('affiche les informations fournisseur au survol du Produit', async () => {
    const user = userEvent.setup();

    renderEditor();

    await user.hover(screen.getByRole('button', {
      name: 'Modifier le produit Carotte râpée',
    }));

    expect(await screen.findByText('Fournisseur : Sysco'))
      .toBeInTheDocument();
    expect(screen.getByText('Référence fournisseur : SYS-001'))
      .toBeInTheDocument();
    expect(screen.getByText(/Conditionnement : 1 unité/))
      .toBeInTheDocument();
  });

  it('autorise le sourcing même lorsque la composition est en lecture seule', async () => {
    const user = userEvent.setup();

    renderEditor({
      disabled: true,
      sourcingDisabled: false,
    });

    expect(screen.queryByRole('button', {
      name: 'Tous les produits',
    })).not.toBeInTheDocument();

    const sourcingButton = screen.getByRole('button', {
      name: 'Approvisionnement de Carotte râpée',
    });

    expect(sourcingButton).toBeEnabled();

    await user.click(sourcingButton);

    expect(screen.getByRole('heading', {
      name: 'Article fournisseur',
    })).toBeInTheDocument();
  });

  it('garde l’action Approvisionnement explicable même avant enregistrement', async () => {
    const user = userEvent.setup();
    const unsavedLine = {
      ...valuedLine,
      id: undefined,
    };

    renderEditor({
      lines: [unsavedLine],
      sourcingDisabled: true,
    });

    const sourcingButton = screen.getByRole('button', {
      name: 'Approvisionnement de Carotte râpée',
    });

    expect(sourcingButton).toBeEnabled();

    await user.click(sourcingButton);

    expect(screen.getByRole('heading', {
      name: 'Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByText(
      'Enregistrez le brouillon avant de modifier l’approvisionnement.',
    )).toBeInTheDocument();
  });

  it('ouvre le choix Article fournisseur depuis les actions de la ligne', async () => {
    const user = userEvent.setup();

    renderEditor();

    await user.click(screen.getByRole('button', {
      name: 'Approvisionnement de Carotte râpée',
    }));

    expect(screen.getByRole('heading', {
      name: 'Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByTestId('sourcing-select')).toHaveTextContent(
      'Carotte râpée',
    );
  });
});
