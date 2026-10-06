import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  listGlobal: vi.fn(),
  setGlobal: vi.fn(),
  archiveGlobal: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useListGlobalIndicativePricesQuery: mocks.listGlobal,
  useSetGlobalIndicativePriceMutation: () => [
    mocks.setGlobal,
    { isLoading: false },
  ],
  useArchiveGlobalIndicativePriceMutation: () => [
    mocks.archiveGlobal,
    { isLoading: false },
  ],
}));

import {
  GlobalIndicativePriceDialog,
} from '@/features/suppliers/components/global-indicative-price-dialog';

const variant = {
  id: '507f1f77bcf86cd799439011',
  name: 'Sucre',
  referenceUnit: 'KG',
};

function queryResult(data = []) {
  return {
    data,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  };
}

function mutationResult(data) {
  return {
    unwrap: vi.fn().mockResolvedValue(data),
  };
}

describe('GlobalIndicativePriceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.listGlobal.mockReturnValue(queryResult([]));
    mocks.setGlobal.mockReturnValue(mutationResult({
      id: 'price-global-1',
    }));
    mocks.archiveGlobal.mockReturnValue(mutationResult({
      id: 'price-global-1',
      status: 'ARCHIVED',
    }));
  });

  it('enregistre le Prix repère dans l’unité de référence du Produit', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    render(
      <TooltipProvider>
        <GlobalIndicativePriceDialog
          onClose={vi.fn()}
          onSaved={onSaved}
          open
          variant={variant}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole('heading', {
      name: 'Prix repère global',
    })).toBeInTheDocument();
    expect(screen.getByText('Sucre')).toBeInTheDocument();
    expect(screen.getByText(/Prix repère HT \/ kg/i))
      .toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/Prix repère HT/i),
      '1.52',
    );
    await user.type(
      screen.getByLabelText('Note / provenance'),
      'Ajustement marché',
    );
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer',
    }));

    expect(mocks.setGlobal).toHaveBeenCalledWith({
      productVariantId: variant.id,
      sourceAmount: '1.52',
      sourceBasis: 'KG',
      currency: 'EUR',
      source: 'Ajustement marché',
      packaging: null,
      sourceOrganization: null,
      sourceUrl: null,
      observedAt: null,
    });
    expect(onSaved).toHaveBeenCalledWith({
      id: 'price-global-1',
    });
  });

  it('préremplit puis permet de retirer un Prix repère existant', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();

    mocks.listGlobal.mockReturnValue(queryResult([{
      id: 'price-global-existing',
      sourceAmount: '1.48',
      sourceBasis: 'KG',
      normalizedAmount: '1.48',
      normalizedUnit: 'KG',
      source: 'Référentiel de démonstration',
      productVariant: variant,
    }]));

    render(
      <TooltipProvider>
        <GlobalIndicativePriceDialog
          onClose={vi.fn()}
          onSaved={onSaved}
          open
          variant={variant}
        />
      </TooltipProvider>,
    );

    expect(await screen.findByDisplayValue('1.48'))
      .toBeInTheDocument();
    expect(screen.getByDisplayValue('Référentiel de démonstration'))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Retirer le Prix repère',
    }));

    expect(mocks.archiveGlobal).toHaveBeenCalledWith({
      productVariantId: variant.id,
    });
    expect(onSaved).toHaveBeenCalledWith({
      removed: true,
    });
  });

  it('normalise un prix relevé au conditionnement avec sa provenance structurée', async () => {
    const user = userEvent.setup();
    const countableVariant = {
      id: '507f1f77bcf86cd799439012',
      name: 'Pain bruschetta surgelé',
      referenceUnit: 'UNIT',
      countUnitLabelSingular: 'tranche',
      countUnitLabelPlural: 'tranches',
    };

    render(
      <TooltipProvider>
        <GlobalIndicativePriceDialog
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          variant={countableVariant}
        />
      </TooltipProvider>,
    );

    const basis = screen.getByRole('combobox', {
      name: 'Base du Prix repère',
    });
    vi.spyOn(basis, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );
    await user.click(basis);
    await user.click(await screen.findByRole('option', {
      name: 'Prix du conditionnement',
    }));

    await user.type(
      screen.getByLabelText('Prix HT du conditionnement observé'),
      '16',
    );
    await user.type(screen.getByLabelText('Contenant principal'), 'Carton');
    await user.type(screen.getByLabelText('Sous-unités'), '8');
    await user.type(
      screen.getByLabelText('Quantité par sous-unité'),
      '4',
    );
    await user.type(
      screen.getByLabelText('Libellé d’origine'),
      '1 carton = 8 paquets × 4 tranches',
    );
    await user.type(
      screen.getByLabelText('Source professionnelle'),
      'Catalogue professionnel vérifié',
    );
    fireEvent.change(screen.getByLabelText('Date du relevé'), {
      target: { value: '2026-10-05' },
    });
    await user.type(
      screen.getByLabelText('URL de la source'),
      'https://example.test/catalogue',
    );
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer',
    }));

    expect(mocks.setGlobal).toHaveBeenCalledWith({
      productVariantId: countableVariant.id,
      sourceAmount: '16',
      sourceBasis: 'PACKAGE',
      currency: 'EUR',
      source: null,
      packaging: {
        containerType: 'Carton',
        unitCount: 8,
        quantityPerUnit: '4',
        unit: 'UNIT',
        netWeight: null,
        netWeightUnit: null,
        supplierLabel: '1 carton = 8 paquets × 4 tranches',
      },
      sourceOrganization: 'Catalogue professionnel vérifié',
      sourceUrl: 'https://example.test/catalogue',
      observedAt: '2026-10-05',
    });
  });
});
