import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TechnicalSheetControlPanel,
} from '@/features/technical-sheets/components/technical-sheet-control-panel';

function renderPanel(overrides = {}) {
  const props = {
    actionAvailability: {
      archive: true,
      reactivate: false,
      delete: true,
    },
    canCopy: true,
    canDelete: true,
    canEditIdentity: true,
    canExport: true,
    canLifecycle: true,
    canOptimize: true,
    canValidate: true,
    copyDisabled: false,
    draft: {
      valuationStatus: 'COMPLETE',
    },
    draftDirty: false,
    draftSynchronizing: false,
    exportDisabledReason: null,
    exportingFormat: null,
    identityDirty: false,
    onArchive: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onEditIdentity: vi.fn(),
    onExport: vi.fn(),
    onOpenAnalysis: vi.fn(),
    onOpenDossier: vi.fn(),
    onOptimize: vi.fn(),
    onReactivate: vi.fn(),
    onValidate: vi.fn(),
    pendingLifecycle: false,
    rightPanel: null,
    validatePending: false,
    validationEligible: true,
    ...overrides,
  };

  const view = render(
    <TooltipProvider>
      <TechnicalSheetControlPanel {...props} />
    </TooltipProvider>,
  );

  return {
    ...props,
    ...view,
  };
}

describe('TechnicalSheetControlPanel', () => {
  it('regroupe les actions globales de la Fiche dans un panneau dédié', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByRole('group', {
      name: 'Panneau de contrôle',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Modifier',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Optimiser',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Analyse',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Infos dossier',
    }));
    await user.click(screen.getByRole('button', {
      name: 'Copier vers un autre Dossier',
    }));

    expect(props.onEditIdentity).toHaveBeenCalledTimes(1);
    expect(props.onOptimize).toHaveBeenCalledTimes(1);
    expect(props.onOpenAnalysis).toHaveBeenCalledTimes(1);
    expect(props.onOpenDossier).toHaveBeenCalledTimes(1);
    expect(props.onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {
      name: 'Valider la Fiche technique',
    })).toBeEnabled();
  });

  it('bloque Modifier pendant l’ouverture d’un brouillon depuis la version officielle', () => {
    renderPanel({
      draft: null,
      editPending: true,
    });

    expect(
      screen.getByRole('button', {
        name: 'Ouverture…',
      }),
    ).toBeDisabled();
  });

  it('conserve la position des actions et marque le panneau actif', () => {
    renderPanel({
      rightPanel: 'analysis',
    });

    expect(screen.getByRole('button', {
      name: 'Analyse',
    })).toHaveClass('bg-secondary');
    expect(screen.getByRole('button', {
      name: 'Réactiver la Fiche',
    })).toBeDisabled();
  });

  it('bloque la validation si les informations de la Fiche ne sont pas enregistrées', () => {
    renderPanel({
      identityDirty: true,
    });

    expect(screen.getByRole('button', {
      name: 'Valider la Fiche technique',
    })).toBeDisabled();
  });

  it('bloque la validation si le brouillon de composition est modifié', () => {
    renderPanel({
      draftDirty: true,
    });

    expect(screen.getByRole('button', {
      name: 'Valider la Fiche technique',
    })).toBeDisabled();
  });

  it('affiche l’action Exports uniquement lorsqu’elle est commercialement accessible', () => {
    const { unmount } = renderPanel();

    expect(
      screen.getByRole('button', {
        name: 'Exports',
      }),
    ).toBeInTheDocument();

    unmount();

    renderPanel({
      canExport: false,
    });

    expect(
      screen.queryByRole('button', {
        name: 'Exports',
      }),
    ).not.toBeInTheDocument();
  });

  it('bloque Optimiser pendant une synchronisation du brouillon', () => {
    renderPanel({
      optimizerDisabled: true,
    });

    expect(
      screen.getByRole('button', {
        name: 'Optimiser',
      }),
    ).toBeDisabled();
  });

  it('bloque la validation lorsque le backend indique que l’état économique ne le permet pas', () => {
    renderPanel({
      validationEligible: false,
    });

    expect(screen.getByRole('button', {
      name: 'Valider la Fiche technique',
    })).toBeDisabled();
  });
});
