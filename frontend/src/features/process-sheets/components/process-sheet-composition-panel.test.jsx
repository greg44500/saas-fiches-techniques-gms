import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ query: vi.fn(), refetch: vi.fn() }));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useGetProcessSheetCompositionQuery: mocks.query,
}));

import {
  ProcessSheetCompositionPanel,
} from '@/features/process-sheets/components/process-sheet-composition-panel';

const args = {
  dossierId: 'dossier-1',
  technicalSheetId: 'sheet-1',
  workspaceId: 'workspace-1',
};

const composition = {
  technicalSheetId: 'sheet-1',
  technicalSheetName: 'Purée maison',
  technicalSheetStatus: 'ACTIVE',
  currentSourceKind: 'DRAFT',
  requiresExplicitLegacyMapping: true,
  draft: {
    sourceKind: 'DRAFT',
    hasLegacyLineIdentity: false,
    lines: [
      { lineKey: 'line:1', productVariantId: 'carotte', productVariantName: 'Carotte' },
      { lineKey: 'line:2', productVariantId: 'carotte', productVariantName: 'Carotte' },
    ],
    groupedIngredients: [{
      productVariantId: 'carotte',
      productVariantName: 'Carotte',
      lineKeys: ['line:1', 'line:2'],
    }],
  },
  validated: {
    sourceKind: 'VALIDATION',
    hasLegacyLineIdentity: true,
    lines: [{
      lineKey: 'validation:validation-1:index:0',
      productVariantId: 'carotte',
      productVariantName: 'Carotte',
      identityKind: 'LEGACY_POSITION',
    }],
    groupedIngredients: [{
      productVariantId: 'carotte',
      productVariantName: 'Carotte',
      lineKeys: ['validation:validation-1:index:0'],
    }],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockReturnValue({
    data: composition,
    isLoading: false,
    isError: false,
    refetch: mocks.refetch,
  });
});

describe('M-006 — aperçu de la composition process', () => {
  it('ne déclenche aucune récupération sans Fiche sélectionnée', () => {
    render(<ProcessSheetCompositionPanel {...args} technicalSheetId={null} />);
    expect(screen.getByText('Sélectionnez une Fiche technique')).toBeInTheDocument();
    expect(mocks.query).toHaveBeenCalledWith({
      ...args, technicalSheetId: null,
    }, { skip: true });
  });

  it('conserve les doublons de lignes et avertit en présence d’une validation legacy', () => {
    render(<ProcessSheetCompositionPanel {...args} />);

    const draft = document.body;
    expect(within(draft).getByText('Purée maison')).toBeInTheDocument();
    expect(within(draft).getByText(/2 occurrences/)).toBeInTheDocument();
    const lines = within(draft).getByRole('list', {
      name: 'Lignes de composition — Brouillon',
    });
    expect(within(lines).getAllByRole('listitem')).toHaveLength(2);
    expect(within(draft).getByText('Ligne historique')).toBeInTheDocument();
    expect(within(draft).getByText(/correspondance manuelle/)).toBeInTheDocument();
    expect(within(draft).getByText(/rapprochement avec d’autres versions/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Créer une Fiche process/ }))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/prix HT/i)).not.toBeInTheDocument();
  });

  it('présente un état vide sans brouillon ni validation', () => {
    mocks.query.mockReturnValue({
      data: {
        ...composition,
        draft: null,
        validated: null,
        requiresExplicitLegacyMapping: false,
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    render(<ProcessSheetCompositionPanel {...args} />);
    expect(screen.getByText('Aucune composition en cours.')).toBeInTheDocument();
    expect(screen.getByText('Aucune composition validée.')).toBeInTheDocument();
  });

  it('montre une erreur avec une relance et non une composition fictive', async () => {
    mocks.query.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    render(<ProcessSheetCompositionPanel {...args} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Composition indisponible');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });
});
