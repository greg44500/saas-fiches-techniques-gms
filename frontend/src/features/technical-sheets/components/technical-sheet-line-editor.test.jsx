import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  productSearchProps: vi.fn(),
  sourcingProps: vi.fn(),
}));

vi.mock('@/features/products/components/product-search-autocomplete', () => ({
  ProductSearchAutocomplete: (props) => {
    mocks.productSearchProps(props);

    return (
      <div>
        <span data-testid="product-search-scope">{props.scope}</span>
        <button
          onClick={() => props.onSelect({
            product: {
              id: 'product-2',
              name: 'Pomme',
            },
            variant: {
              id: 'variant-2',
              name: 'Pomme',
              referenceUnit: 'KG',
            },
          })}
          type="button"
        >
          Ajouter le Produit simulé
        </button>
      </div>
    );
  },
}));

vi.mock('@/features/technical-sheets/components/technical-sheet-sourcing-select', () => ({
  TechnicalSheetSourcingSelect: (props) => {
    mocks.sourcingProps(props);

    return (
      <span data-testid={'sourcing-' + props.line.id}>
        {props.disabled ? 'Approvisionnement verrouillé' : 'Sysco · 874215'}
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
  },
  netQuantity: '2.5',
  inputUnit: 'KG',
  note: '',
  selectedSupplierArticleId: 'article-1',
  calculation: {
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
    <TechnicalSheetLineEditor
      canManageSourcing
      disabled={false}
      dossierId="dossier-1"
      draftRevision={4}
      lines={[valuedLine]}
      metadata={metadata}
      onChange={onChange}
      onSourcingError={vi.fn()}
      onSourcingPendingChange={vi.fn()}
      onSourcingSelected={vi.fn()}
      productMetadata={{}}
      sourcingDisabled={false}
      technicalSheetId="sheet-1"
      workspaceId="workspace-1"
      {...overrides}
    />,
  );

  return { onChange };
}

describe('TechnicalSheetLineEditor', () => {
  it('ouvre la recherche sur Tous les produits puis permet de basculer sur les Favoris', async () => {
    const user = userEvent.setup();

    renderEditor();

    expect(screen.getByTestId('product-search-scope')).toHaveTextContent(
      PRODUCT_SOURCE.REFERENCE,
    );
    expect(
      mocks.productSearchProps.mock.lastCall[0].showWorkspaceFavorite,
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Favoris' }));

    expect(screen.getByTestId('product-search-scope')).toHaveTextContent(
      PRODUCT_SOURCE.FAVORITES,
    );
    expect(
      mocks.productSearchProps.mock.lastCall[0].showWorkspaceFavorite,
    ).toBe(false);
  });

  it('affiche sur une même ligne le Produit, l’approvisionnement, le prix, sa source et le coût', () => {
    renderEditor();

    expect(screen.getByText('Carotte râpée')).toBeInTheDocument();
    expect(screen.getByText(/2\.778/)).toBeInTheDocument();
    expect(screen.getByTestId('sourcing-line-1')).toHaveTextContent(
      'Sysco · 874215',
    );
    expect(screen.getByText(/2,15/)).toBeInTheDocument();
    expect(screen.getByText('Tarif négocié')).toBeInTheDocument();
    expect(screen.getByText(/6,02/)).toBeInTheDocument();
    expect(screen.getByText('Valorisée')).toBeInTheDocument();
  });

  it('verrouille le sourcing lorsque le brouillon doit d’abord être enregistré', () => {
    renderEditor({
      sourcingDisabled: true,
      sourcingDisabledReason:
        'Enregistrez le brouillon avant de modifier l’approvisionnement ou de valoriser.',
    });

    expect(screen.getByTestId('sourcing-line-1')).toHaveTextContent(
      'Approvisionnement verrouillé',
    );
    expect(screen.getByText(
      'Enregistrez le brouillon avant de modifier l’approvisionnement ou de valoriser.',
    )).toBeInTheDocument();
  });

  it('ajoute une Référence globale sélectionnée sans exiger qu’elle soit favorite', async () => {
    const user = userEvent.setup();
    const { onChange } = renderEditor();

    await user.click(
      screen.getByRole('button', { name: 'Ajouter le Produit simulé' }),
    );

    expect(onChange).toHaveBeenCalledWith([
      valuedLine,
      expect.objectContaining({
        productVariantId: 'variant-2',
        productVariantName: 'Pomme',
        referenceUnit: 'KG',
        inputUnit: 'KG',
      }),
    ]);
  });
});
