import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  apply: vi.fn(),
  navigate: vi.fn(),
  simulate: vi.fn(),
}));

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual(
      'react-router',
    );

  return {
    ...actual,
    useNavigate: () =>
      mocks.navigate,
    useParams: () => ({
      dossierId: 'dossier-1',
      technicalSheetId: 'sheet-1',
    }),
  };
});

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const context = {
  sheet: {
    id: 'sheet-1',
    name: 'Purée M005',
    revision: 1,
  },
  draft: {
    revision: 3,
    lines: [{
      id: 'line-1',
      kind: 'INGREDIENT',
      netQuantity: '2',
      optimization: {
        minNetQuantity: null,
        maxNetQuantity: null,
        locked: false,
      },
    }],
  },
  baseline: {
    draftRevision: 3,
    economicSnapshot: {
      materialCostHt: '20',
      manufacturingCostHt: '20',
      actualMarginBasisPoints: 5000,
    },
    lines: [{
      id: 'line-1',
      kind: 'INGREDIENT',
      productVariantId: 'variant-1',
      productVariantName: 'Carotte',
      referenceUnit: 'KG',
      netQuantity: '2',
      grossQuantity: '2',
      supplierArticleId: null,
      supplierName: null,
      applicableSource: 'INDICATIVE_DOSSIER',
      normalizedAmount: '10',
      normalizedUnit: 'KG',
      lineCostHt: '20',
      materialCostSharePercent: '100',
      optimization: {
        minNetQuantity: null,
        maxNetQuantity: null,
        locked: false,
      },
    }],
  },
  costAdjustmentRange: {
    min: -99,
    max: 100,
  },
  alternatives: {
    'line-1': {
      products: [],
      suppliers: [],
    },
  },
  canManageSourcing: true,
};

const neutralSimulation = {
  draftRevision: 3,
  mode: 'MANUAL',
  before: context.baseline,
  after: context.baseline,
  savings: {
    amountHt: '0',
    percent: '0',
  },
  transformations: [],
  simulationFingerprint:
    'a'.repeat(64),
  autoSuggestion: null,
};

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useApplyTechnicalSheetOptimizationMutation: () => [
    mocks.apply,
    {
      isLoading: false,
    },
  ],
  useGetTechnicalSheetOptimizationQuery: () => ({
    data: context,
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useSimulateTechnicalSheetOptimizationMutation: () => [
    mocks.simulate,
    {
      isLoading: false,
    },
  ],
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    workspace: {
      id: 'workspace-1',
    },
  }),
}));

import {
  TechnicalSheetOptimizerPage,
} from '@/features/technical-sheets/pages/technical-sheet-optimizer-page';

describe('TechnicalSheetOptimizerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.simulate.mockReturnValue({
      unwrap: vi.fn()
        .mockResolvedValue(
          neutralSimulation,
        ),
    });
    mocks.apply.mockReturnValue({
      unwrap: vi.fn()
        .mockResolvedValue({
          draft: {
            revision: 4,
          },
        }),
    });
  });

  it('affiche le profil économique global, les KPI et l’inspecteur de l’ingrédient', () => {
    render(
      <TechnicalSheetOptimizerPage />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Purée M005',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Profil économique global',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('slider', {
        name: 'Ajustement Carotte',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Carotte/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Réglage économique',
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Coût matière HT',
      ),
    ).toBeInTheDocument();
  });

  it('synchronise le point du profil avec l’intention économique de la ligne', async () => {
    const user =
      userEvent.setup();

    render(
      <TechnicalSheetOptimizerPage />,
    );

    const point =
      screen.getByRole(
        'slider',
        {
          name:
            'Ajustement Carotte',
        },
      );

    await user.click(point);
    await user.keyboard(
      '{ArrowLeft}',
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          450,
        ),
    );

    const request =
      mocks.simulate.mock
        .calls.at(-1)[0];

    expect(
      request.lines[0]
        .economicAdjustmentPercent,
    ).toBe(-5);
  });

  it('bascule en mode Auto sans rendre le sourcing disponible hors capability utilisateur', async () => {
    const user =
      userEvent.setup();

    render(
      <TechnicalSheetOptimizerPage />,
    );

    await user.click(
      screen.getByRole(
        'button',
        { name: 'Auto' },
      ),
    );

    expect(
      screen.getByText(
        'Leviers automatiques',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Produit / rendement',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Approvisionnement',
      ),
    ).toBeInTheDocument();
  });

  it('construit une simulation serveur après modification des contraintes', async () => {
    const user =
      userEvent.setup();

    render(
      <TechnicalSheetOptimizerPage />,
    );

    await user.click(
      screen.getByRole(
        'button',
        { name: 'Contraintes' },
      ),
    );

    const minimum =
      screen.getByLabelText(
        'Minimum autorisé',
      );

    await user.type(
      minimum,
      '1',
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          450,
        ),
    );

    const request =
      mocks.simulate.mock
        .calls.at(-1)[0];

    expect(
      request.lines[0]
        .minNetQuantity,
    ).toBe('1');
    expect(
      request.workspaceId,
    ).toBe('workspace-1');
  });

  it('n’invente aucune borne lorsque la recette ne définit pas de garde-fou', async () => {
    render(
      <TechnicalSheetOptimizerPage />,
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          450,
        ),
    );

    const request =
      mocks.simulate.mock
        .calls.at(-1)[0];

    expect(
      request.lines[0]
        .minNetQuantity,
    ).toBeNull();
    expect(
      request.lines[0]
        .maxNetQuantity,
    ).toBeNull();
    expect(
      request.lines[0]
        .economicAdjustmentPercent,
    ).toBe(0);
  });
});
