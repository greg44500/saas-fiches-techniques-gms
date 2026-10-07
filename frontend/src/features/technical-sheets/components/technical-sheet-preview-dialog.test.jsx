import {
  render,
  screen,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  validationQuery: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useGetTechnicalSheetValidationQuery:
    mocks.validationQuery,
}));

import {
  TechnicalSheetPreviewDialog,
} from '@/features/technical-sheets/components/technical-sheet-preview-dialog';

describe('TechnicalSheetPreviewDialog', () => {
  beforeEach(() => {
    mocks.validationQuery.mockReturnValue({
      data: {
        id: 'validation-1',
        validatedAt:
          '2026-10-07T06:00:00.000Z',
        sheetSnapshot: {
          name:
            'Tartine auvergnate validée',
          description:
            'Version officielle',
          productionQuantity:
            '10',
          productionUnit:
            'UNIT',
          portionsPerProductionUnit:
            '8',
        },
        linesSnapshot: [
          {
            _id: 'line-1',
            kind: 'INGREDIENT',
            productVariantName:
              'Pain',
            netQuantity:
              '1',
            inputUnit:
              'KG',
            grossQuantity:
              '1',
            grossUnit:
              'KG',
            normalizedPriceHt:
              '3.25',
            normalizedUnit:
              'KG',
            lineCostHt:
              '3.25',
            note:
              'Pain légèrement toasté',
          },
        ],
        economicSnapshot: {
          totalPortions:
            '80',
          materialCostHt:
            '3.25',
          economatCostHt:
            '0',
          manufacturingCostHt:
            '3.25',
          advisedPriceTtcMinor:
            500,
          finalPriceTtcMinor:
            550,
          actualMarginBasisPoints:
            4200,
          targetMarginDeltaBasisPoints:
            -800,
        },
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('prévisualise uniquement la validation immuable et masque les écarts', () => {
    render(
      <TooltipProvider>
        <TechnicalSheetPreviewDialog
          dossierId="dossier-1"
          onClose={vi.fn()}
          open
          sheet={{
            id: 'sheet-1',
            name:
              'Titre de brouillon courant',
            currentValidatedStateId:
              'validation-1',
          }}
          workspaceId="workspace-1"
        />
      </TooltipProvider>,
    );

    expect(
      mocks.validationQuery,
    ).toHaveBeenCalledWith(
      {
        workspaceId:
          'workspace-1',
        dossierId:
          'dossier-1',
        technicalSheetId:
          'sheet-1',
        validationId:
          'validation-1',
      },
      {
        skip: false,
      },
    );

    expect(
      screen.getByRole('dialog'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tartine auvergnate validée',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Titre de brouillon courant',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('table', {
        name: 'Composition',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Marge réelle'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Pain légèrement toasté',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Section',
        { exact: true },
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Qté brute',
        { exact: true },
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Écart/i),
    ).not.toBeInTheDocument();
  });
});
