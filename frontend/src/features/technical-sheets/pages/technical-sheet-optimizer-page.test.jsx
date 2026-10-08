import {
  render,
  screen,
  within,
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
import {
  buildOptimizerLines,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

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
        level: 1,
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

    const panel =
      screen.getByLabelText(
        'Panneau de pilotage',
      );

    expect(
      within(panel).getByText(
        'Profil économique global',
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole(
        'button',
        { name: 'Contraintes' },
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole(
        'button',
        { name: 'Manuel' },
      ),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole(
        'button',
        { name: 'Auto' },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Fiche technique simulée',
      ),
    ).toHaveTextContent(
      'Purée M005',
    );
  });

  it('libère un ancien min=max égal à la quantité de référence sans supprimer un verrouillage explicite', () => {
    const legacyContext = {
      ...context,
      draft: {
        ...context.draft,
        lines: [{
          ...context.draft.lines[0],
          optimization: {
            minNetQuantity: '2.0',
            maxNetQuantity: '2',
            locked: false,
          },
        }],
      },
    };

    const [line] =
      buildOptimizerLines(
        legacyContext,
      );

    expect(line).toMatchObject({
      minNetQuantity: '',
      maxNetQuantity: '',
      locked: false,
    });

    const [lockedLine] =
      buildOptimizerLines({
        ...legacyContext,
        draft: {
          ...legacyContext.draft,
          lines: [{
            ...legacyContext
              .draft.lines[0],
            optimization: {
              minNetQuantity: '2',
              maxNetQuantity: '2',
              locked: true,
            },
          }],
        },
      });

    expect(lockedLine).toMatchObject({
      minNetQuantity: '2',
      maxNetQuantity: '2',
      locked: true,
    });
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

  it('n’utilise pas min=max comme verrouillage implicite', async () => {
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

    await user.type(
      screen.getByLabelText(
        'Minimum autorisé',
      ),
      '2',
    );
    await user.type(
      screen.getByLabelText(
        'Maximum autorisé',
      ),
      '2',
    );

    await user.click(
      screen.getByRole(
        'button',
        { name: 'Réglage' },
      ),
    );

    expect(
      screen.getByText(
        'Minimum et maximum identiques sont traités comme une plage libre. Utilisez Verrouiller pour figer réellement la quantité.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'slider',
        {
          name:
            'Ajustement économique de l’ingrédient',
        },
      ),
    ).not.toHaveAttribute(
      'data-disabled',
    );

    expect(
      screen.getByRole(
        'slider',
        {
          name: 'Ajustement Carotte',
        },
      ),
    ).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('n’envoie pas de simulation pendant une saisie décimale incomplète', async () => {
    const user =
      userEvent.setup();

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
    mocks.simulate.mockClear();

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
      '0,',
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          450,
        ),
    );

    expect(
      mocks.simulate,
    ).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Terminez la saisie de la quantité ou du garde-fou avant le recalcul.',
      ),
    ).toBeInTheDocument();
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
