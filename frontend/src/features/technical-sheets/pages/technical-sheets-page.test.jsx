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

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  exportMutation: vi.fn(),
  navigate: vi.fn(),
  previewProps: null,
  startDraftMutation: vi.fn(),
  workspaceContext: vi.fn(),
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
    }),
  };
});

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierByIdQuery: () => ({
    data: {
      id: 'dossier-1',
      status: 'ACTIVE',
      technicalSheetSettings: {
        defaultTargetMarginBasisPoints:
          5000,
      },
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useExportTechnicalSheetMutation: () => [
    mocks.exportMutation,
  ],
  useGetDossierTechnicalSheetSettingsQuery: () => ({
    data: {
      defaultTargetMarginBasisPoints:
        5000,
    },
  }),
  useGetTechnicalSheetCapacityQuery: () => ({
    data: {
      current: 3,
      limit: 10,
      unlimited: false,
    },
  }),
  useGetTechnicalSheetExportUsageQuery: () => ({
    data: {
      current: 0,
      limit: 10,
      remaining: 10,
      unlimited: false,
    },
  }),
  useGetTechnicalSheetMetadataQuery: () => ({
    data: {
      statusDefinitions: [
        {
          value: 'ACTIVE',
          label: 'Active',
          tone: 'success',
        },
      ],
    },
  }),
  useStartTechnicalSheetDraftMutation: () => [
    mocks.startDraftMutation,
  ],
  useListTechnicalSheetsQuery: () => ({
    data: {
      sheets: [
        {
          id: 'sheet-draft',
          name: 'Boeuf Bourguignon',
          status: 'ACTIVE',
          currentValidatedStateId: null,
          hasDraft: true,
          revision: 2,
          updatedAt:
            '2026-10-07T06:00:00.000Z',
        },
        {
          id: 'sheet-validated',
          name: 'Tartine auvergnate',
          status: 'ACTIVE',
          currentValidatedStateId:
            'validation-1',
          hasDraft: false,
          revision: 5,
          updatedAt:
            '2026-10-07T06:00:00.000Z',
        },
        {
          id: 'sheet-review',
          name: 'Tatin',
          status: 'ACTIVE',
          currentValidatedStateId:
            'validation-2',
          hasDraft: true,
          revision: 7,
          updatedAt:
            '2026-10-07T06:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      },
    },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/technical-sheets/components/technical-sheet-create-dialog', () => ({
  TechnicalSheetCreateDialog: () =>
    null,
}));

vi.mock('@/features/technical-sheets/components/technical-sheet-export-menu', () => ({
  TechnicalSheetExportMenu: ({
    label,
  }) => (
    <button
      aria-label={label}
      type="button"
    >
      Export
    </button>
  ),
}));

vi.mock('@/features/technical-sheets/components/technical-sheet-preview-dialog', () => ({
  TechnicalSheetPreviewDialog: (
    props,
  ) => {
    mocks.previewProps = props;
    return props.open
      ? (
        <div role="dialog">
          Prévisualisation
        </div>
      )
      : null;
  },
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext:
    mocks.workspaceContext,
}));

import {
  TECHNICAL_SHEET_FEATURE,
} from '@/features/technical-sheets/constants/technical-sheet-features';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  TechnicalSheetsPage,
} from '@/features/technical-sheets/pages/technical-sheets-page';

function renderPage() {
  return render(
    <TooltipProvider>
      <TechnicalSheetsPage />
    </TooltipProvider>,
  );
}

describe('TechnicalSheetsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewProps = null;
    mocks.startDraftMutation
      .mockReturnValue({
        unwrap: vi.fn()
          .mockResolvedValue({}),
      });

    mocks.workspaceContext.mockReturnValue({
      can: (permission) => [
        TECHNICAL_SHEET_PERMISSION.READ,
        TECHNICAL_SHEET_PERMISSION.CREATE,
        TECHNICAL_SHEET_PERMISSION.UPDATE,
        TECHNICAL_SHEET_PERMISSION.EXPORT,
      ].includes(permission),
      hasFeature: (feature) =>
        feature
        === TECHNICAL_SHEET_FEATURE.EXPORT,
      workspace: {
        id: 'workspace-1',
      },
    });
  });

  it('affiche Brouillon, Validée et En révision sans sous-titre ambigu', () => {
    renderPage();

    expect(
      screen.getByText(
        'Brouillon',
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Validée',
        { exact: true },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'En révision',
        { exact: true },
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        'Un état validé est disponible',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Aucun état validé',
      ),
    ).not.toBeInTheDocument();
  });

  it('garde Modifier sur les états éditables et réserve Prévisualiser/Exporter aux versions validées', () => {
    renderPage();

    expect(
      screen.getByRole('button', {
        name:
          'Modifier Boeuf Bourguignon',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name:
          'Prévisualiser Boeuf Bourguignon',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name:
          'Exporter Boeuf Bourguignon',
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name:
          'Prévisualiser Tartine auvergnate',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name:
          'Exporter Tartine auvergnate',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name:
          'Prévisualiser Tatin',
      }),
    ).toBeInTheDocument();
  });

  it('masque seulement Exporter lorsque la capability commerciale est absente', () => {
    mocks.workspaceContext.mockReturnValue({
      can: (permission) => [
        TECHNICAL_SHEET_PERMISSION.READ,
        TECHNICAL_SHEET_PERMISSION.CREATE,
        TECHNICAL_SHEET_PERMISSION.UPDATE,
        TECHNICAL_SHEET_PERMISSION.EXPORT,
      ].includes(permission),
      hasFeature: () => false,
      workspace: {
        id: 'workspace-1',
      },
    });

    renderPage();

    expect(
      screen.getByRole('button', {
        name:
          'Prévisualiser Tartine auvergnate',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name:
          'Exporter Tartine auvergnate',
      }),
    ).not.toBeInTheDocument();
  });

  it('ouvre la prévisualisation validée sans quitter la liste', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(
      screen.getByRole('button', {
        name:
          'Prévisualiser Tartine auvergnate',
      }),
    );

    expect(
      screen.getByRole('dialog'),
    ).toBeInTheDocument();
    expect(
      mocks.navigate,
    ).not.toHaveBeenCalled();
    expect(
      mocks.previewProps.sheet.id,
    ).toBe('sheet-validated');
    expect(
      mocks.previewProps.sheet
        .currentValidatedStateId,
    ).toBe('validation-1');
  });

  it('crée un brouillon depuis la version officielle avant d’ouvrir une Fiche validée', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(
      screen.getByRole('button', {
        name:
          'Modifier Tartine auvergnate',
      }),
    );

    expect(
      mocks.startDraftMutation,
    ).toHaveBeenCalledWith({
      workspaceId:
        'workspace-1',
      dossierId:
        'dossier-1',
      technicalSheetId:
        'sheet-validated',
      expectedSheetRevision: 5,
    });
    expect(
      mocks.navigate,
    ).toHaveBeenCalledWith(
      '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets/sheet-validated',
    );
  });

  it('ouvre directement un brouillon existant avec le bouton crayon', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(
      screen.getByRole('button', {
        name:
          'Modifier Boeuf Bourguignon',
      }),
    );

    expect(
      mocks.navigate,
    ).toHaveBeenCalledWith(
      '/workspaces/workspace-1/dossiers/dossier-1/technical-sheets/sheet-draft',
    );
  });
});
