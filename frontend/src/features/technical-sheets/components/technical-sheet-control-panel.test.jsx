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
    canLifecycle: true,
    canValidate: true,
    copyDisabled: false,
    draft: {
      valuationStatus: 'COMPLETE',
    },
    draftDirty: false,
    draftSynchronizing: false,
    identityDirty: false,
    onArchive: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onReactivate: vi.fn(),
    onValidate: vi.fn(),
    pendingLifecycle: false,
    validatePending: false,
    ...overrides,
  };

  render(
    <TooltipProvider>
      <TechnicalSheetControlPanel {...props} />
    </TooltipProvider>,
  );

  return props;
}

describe('TechnicalSheetControlPanel', () => {
  it('regroupe les actions globales de la Fiche dans un panneau dédié', async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByRole('group', {
      name: 'Panneau de contrôle',
    })).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Copier vers un autre Dossier',
    }));

    expect(props.onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {
      name: 'Valider la Fiche technique',
    })).toBeEnabled();
  });

  it('bloque la validation si les informations du drawer ne sont pas enregistrées', () => {
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
});
