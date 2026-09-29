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
  TechnicalSheetProductScopeControls,
  getSupplierArticleActionTooltip,
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
    materialCostSharePercent: '100',
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

  it('expose les sources Produit sous forme de contrôles réutilisables', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TooltipProvider>
        <TechnicalSheetProductScopeControls
          onChange={onChange}
          productScope={PRODUCT_SOURCE.REFERENCE}
        />
      </TooltipProvider>,
    );

    const globalButton = screen.getByRole('button', {
      name: 'Tous les produits',
    });
    const favoritesButton = screen.getByRole('button', {
      name: 'Favoris',
    });

    expect(globalButton).toHaveAttribute('aria-pressed', 'true');
    await user.click(favoritesButton);
    expect(onChange).toHaveBeenCalledWith(PRODUCT_SOURCE.FAVORITES);
  });

  it('affiche le tableau métier compact sans quantité brute ni colonne fournisseur', () => {
    renderEditor();

    expect(screen.getByText('Qté')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText('%CM')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Part de cette ligne Ingrédient dans le coût matière HT total de la Fiche. Disponible après valorisation complète.',
    })).toBeInTheDocument();
    expect(screen.getByText('PUHT')).toBeInTheDocument();
    expect(screen.getByText('CMU HT')).toBeInTheDocument();
    expect(screen.getByText('%TR')).toBeInTheDocument();

    expect(screen.queryByText('Qté brute')).not.toBeInTheDocument();
    expect(screen.queryByText('Article / Fournisseur')).not.toBeInTheDocument();
    expect(screen.queryByText('Type')).not.toBeInTheDocument();

    expect(screen.getByText(/INGRÉDIENTS/)).toBeInTheDocument();
    expect(screen.getByText(/Économat/)).toBeInTheDocument();
    expect(screen.queryByText(
      'Sélectionnez une Référence Produit ; la quantité et l’unité restent modifiables dans la ligne.',
    )).not.toBeInTheDocument();
    expect(screen.getByText('90 %')).toBeInTheDocument();
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(screen.getByText(/2,15/)).toBeInTheDocument();
    expect(screen.getByText(/6,02/)).toBeInTheDocument();
  });

  it('signale un Prix indicatif comme source de valorisation', () => {
    renderEditor({
      lines: [{
        ...valuedLine,
        selectedSupplierArticleId: null,
        valuation: {
          ...valuedLine.valuation,
          supplierArticleId: null,
          applicableSource: 'INDICATIVE_WORKSPACE',
        },
      }],
    });

    expect(screen.getByRole('button', {
      name: 'Prix unitaire hors taxe — Prix indicatif espace de travail',
    })).toBeInTheDocument();
  });

  it('ne rend plus de badge permanent de sourcing sous le Produit', () => {
    renderEditor({
      lines: [{
        ...valuedLine,
        selectedSupplierArticleId: null,
        valuation: {
          ...valuedLine.valuation,
          status: 'UNRESOLVED',
          supplierArticleId: null,
          normalizedAmount: null,
          lineCostHt: null,
        },
      }],
    });

    expect(screen.queryByText('Article à choisir')).not.toBeInTheDocument();
  });

  it('décrit précisément l’action Article fournisseur selon le contexte', () => {
    const unresolvedLine = {
      ...valuedLine,
      selectedSupplierArticleId: null,
      valuation: {
        ...valuedLine.valuation,
        status: 'UNRESOLVED',
        supplierArticleId: null,
      },
    };

    expect(getSupplierArticleActionTooltip({
      canManageSourcing: true,
      line: unresolvedLine,
    })).toBe('Choisir un Article fournisseur');

    expect(getSupplierArticleActionTooltip({
      canManageSourcing: true,
      line: valuedLine,
    })).toBe('Modifier l’Article fournisseur');

    expect(getSupplierArticleActionTooltip({
      canManageSourcing: false,
      line: valuedLine,
    })).toBe('Consulter l’Article fournisseur');

    expect(getSupplierArticleActionTooltip({
      canManageSourcing: true,
      line: { ...unresolvedLine, id: undefined },
      requiresSave: true,
    })).toBe(
      'Choisir un Article fournisseur — enregistrez d’abord le brouillon',
    );
  });

  it('ajoute un Produit directement depuis la ligne de saisie de la section', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    expect(screen.getAllByPlaceholderText('Ajouter un produit')).toHaveLength(2);

    await user.click(screen.getByRole('button', {
      name: 'Sélectionner Pomme depuis Ajouter un produit aux Ingrédients',
    }));

    expect(onChange).toHaveBeenCalledWith(
      [
        valuedLine,
        expect.objectContaining({
          kind: 'INGREDIENT',
          productVariantId: 'variant-2',
          productVariantName: 'Pomme',
          inputUnit: 'KG',
        }),
      ],
      { immediate: true },
    );
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

    expect(onChange).toHaveBeenCalledWith(
      [
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
      ],
      { immediate: true },
    );
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

    const actionsButton = screen.getByRole('button', {
      name: 'Actions pour Carotte râpée',
    });

    expect(actionsButton).toBeEnabled();
    await user.click(actionsButton);
    await user.click(screen.getByRole('button', {
      name: /Article fournisseur/,
    }));

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

    const actionsButton = screen.getByRole('button', {
      name: 'Actions pour Carotte râpée',
    });

    expect(actionsButton).toBeEnabled();
    await user.click(actionsButton);
    await user.click(screen.getByRole('button', {
      name: /Article fournisseur/,
    }));

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
      name: 'Actions pour Carotte râpée',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Modifier l’Article fournisseur',
    }));

    expect(screen.getByRole('heading', {
      name: 'Article fournisseur',
    })).toBeInTheDocument();
    expect(screen.getByTestId('sourcing-select')).toHaveTextContent(
      'Carotte râpée',
    );
  });
});
