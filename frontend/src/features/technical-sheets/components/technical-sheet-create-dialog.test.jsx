import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  createSheet: vi.fn(),
  metadata: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useCreateTechnicalSheetMutation: () => [
    mocks.createSheet,
    { isLoading: false },
  ],
  useGetTechnicalSheetMetadataQuery: mocks.metadata,
}));

import {
  TechnicalSheetCreateDialog,
} from '@/features/technical-sheets/components/technical-sheet-create-dialog';

describe('TechnicalSheetCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.metadata.mockReturnValue({
      data: {
        productionUnits: [
          { value: 'UNIT', label: 'Pièce' },
        ],
        saleBases: [
          { value: 'PIECE', label: 'Pièce' },
          { value: 'PORTION', label: 'Portion' },
        ],
        vatRates: [
          { value: 550, label: '5,5 %' },
          { value: 1000, label: '10 %' },
        ],
        defaults: {
          productionUnit: 'UNIT',
          portionsPerProductionUnit: '1',
          saleBasis: 'PIECE',
          vatRateBasisPoints: 550,
          finalPriceMode: 'ADVISED',
        },
      },
      isLoading: false,
    });

    mocks.createSheet.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        sheet: { id: 'sheet-1' },
        draft: { revision: 0 },
      }),
    });
  });

  it('crée la Fiche avec ses paramètres obligatoires et la marge héritée en lecture seule', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(
      <TechnicalSheetCreateDialog
        defaultTargetMarginBasisPoints={3000}
        dossierId="dossier-1"
        onClose={vi.fn()}
        onCreated={onCreated}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(
      screen.getByLabelText('Nom'),
      'Purée de carottes',
    );
    await user.type(
      screen.getByLabelText('Quantité produite'),
      '10',
    );

    expect(
      screen.getByRole('button', { name: '5,5 %' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(
      screen.getByRole('button', { name: '10 %' }),
    );

    expect(
      screen.getByText('30 %', { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Marge du Dossier', { exact: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Portions / pièce'),
    ).toHaveValue('1');
    expect(
      screen.getByRole('combobox', {
        name: 'Base de vente',
      }),
    ).toHaveTextContent('Pièce');

    await user.click(
      screen.getByRole('button', {
        name: 'Créer',
        exact: true,
      }),
    );

    expect(mocks.createSheet).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      name: 'Purée de carottes',
      description: null,
      productionQuantity: '10',
      productionUnit: 'UNIT',
      portionsPerProductionUnit: '1',
      saleBasis: 'PIECE',
      vatRateBasisPoints: 1000,
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('permet de saisir une marge propre à la Fiche lorsque le Dossier n’en possède pas', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(
      <TechnicalSheetCreateDialog
        defaultTargetMarginBasisPoints={null}
        dossierId="dossier-1"
        onClose={vi.fn()}
        onCreated={onCreated}
        open
        workspaceId="workspace-1"
      />,
    );

    expect(
      screen.getByText(
        'Aucune marge n’est définie dans ce Dossier. Cette valeur sera utilisée pour cette Fiche.',
        { exact: true },
      ),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Nom'),
      'Soupe maison',
    );
    await user.type(
      screen.getByLabelText('Quantité produite'),
      '20',
    );
    const createButton = screen.getByRole('button', {
      name: 'Créer',
      exact: true,
    });

    expect(createButton).toBeDisabled();

    await user.type(
      screen.getByLabelText('Marge cible (%)'),
      '30',
    );

    expect(createButton).toBeEnabled();

    await user.click(createButton);

    expect(mocks.createSheet).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      dossierId: 'dossier-1',
      name: 'Soupe maison',
      description: null,
      productionQuantity: '20',
      productionUnit: 'UNIT',
      portionsPerProductionUnit: '1',
      saleBasis: 'PIECE',
      vatRateBasisPoints: 550,
      targetMarginBasisPoints: 3000,
    });
    expect(onCreated).toHaveBeenCalled();
  });

  it('permet de choisir une vente à la portion depuis les metadata backend', async () => {
    const user = userEvent.setup();

    render(
      <TechnicalSheetCreateDialog
        defaultTargetMarginBasisPoints={3000}
        dossierId="dossier-1"
        onClose={vi.fn()}
        onCreated={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    await user.type(screen.getByLabelText('Nom'), 'Quiche');
    await user.type(screen.getByLabelText('Quantité produite'), '10');
    await user.clear(screen.getByLabelText('Portions / pièce'));
    await user.type(screen.getByLabelText('Portions / pièce'), '8');
    await user.click(screen.getByRole('combobox', { name: 'Base de vente' }));
    await user.click(screen.getByRole('option', { name: 'Portion' }));
    await user.click(screen.getByRole('button', { name: '10 %' }));
    await user.click(screen.getByRole('button', { name: 'Créer', exact: true }));

    expect(mocks.createSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        productionQuantity: '10',
        productionUnit: 'UNIT',
        portionsPerProductionUnit: '8',
        saleBasis: 'PORTION',
      }),
    );
  });

  it('place l’explication de capacité dans une infobulle', async () => {
    const user = userEvent.setup();

    render(
      <TechnicalSheetCreateDialog
        defaultTargetMarginBasisPoints={3000}
        dossierId="dossier-1"
        onClose={vi.fn()}
        onCreated={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    const info = screen.getByRole('button', {
      name: 'À propos de la création d’une Fiche technique',
    });

    expect(
      screen.queryByText(
        'La Fiche est créée dans ce Dossier et consomme une unité de capacité du Workspace.',
        { exact: true },
      ),
    ).not.toBeInTheDocument();

    await user.hover(info);

    expect(
      await screen.findByText(
        'La Fiche est créée dans ce Dossier et consomme une unité de capacité du Workspace.',
        { exact: true },
      ),
    ).toBeInTheDocument();
  });
});
