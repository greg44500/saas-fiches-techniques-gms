import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  createNegotiated: vi.fn(),
  createInvoice: vi.fn(),
}));

vi.mock('@/features/suppliers/api/supplier-api', () => ({
  useCreateNegotiatedPriceMutation: () => [
    mocks.createNegotiated,
    { isLoading: false },
  ],
  useCreateInvoicedPriceMutation: () => [
    mocks.createInvoice,
    { isLoading: false },
  ],
}));

import {
  SupplierPriceFormDialog,
} from '@/features/suppliers/components/supplier-price-form-dialog';

async function selectOption(user, triggerName, optionName) {
  const trigger = screen.getByRole('combobox', {
    name: triggerName,
  });

  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
  );

  await user.click(trigger);
  await user.click(await screen.findByRole('option', {
    name: optionName,
  }));
}

describe('SupplierPriceFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createNegotiated.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'price-1' }),
    });
    mocks.createInvoice.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ id: 'invoice-1' }),
    });
  });

  it('préselectionne et présente le libellé métier de UNIT pour l’Article choisi', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <SupplierPriceFormDialog
          articles={[{
            id: 'article-unit',
            supplierId: 'supplier-1',
            supplierName: 'Sysco',
            supplierReference: 'BRU-001',
            productVariant: {
              id: 'variant-unit',
              referenceUnit: 'UNIT',
              countUnitLabelSingular: 'tranche',
              countUnitLabelPlural: 'tranches',
            },
          }]}
          dossierId="dossier-1"
          mode="negotiated"
          onClose={vi.fn()}
          onSaved={vi.fn()}
          open
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    await selectOption(
      user,
      'Article fournisseur',
      'Sysco · BRU-001',
    );

    const unitTrigger = screen.getByRole('combobox', {
      name: 'Unité du prix',
    });

    expect(unitTrigger).toHaveTextContent('tranche');

    vi.spyOn(unitTrigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );

    await user.click(unitTrigger);

    expect(
      await screen.findByRole('option', { name: 'tranche' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'UNIT' }))
      .not.toBeInTheDocument();
  });
});
