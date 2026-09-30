import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  TechnicalSheetAutosaveStatus,
} from '@/features/technical-sheets/components/technical-sheet-autosave-status';
import {
  TECHNICAL_SHEET_AUTOSAVE_STATUS,
} from '@/features/technical-sheets/hooks/use-technical-sheet-draft-autosave';

function renderStatus(status, blockedReason = null) {
  return render(
    <TechnicalSheetAutosaveStatus
      blockedReason={blockedReason}
      onRetry={vi.fn()}
      status={status}
    />,
  );
}

describe('TechnicalSheetAutosaveStatus', () => {
  it('affiche l’état enregistré avec le ton success', () => {
    renderStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED);

    const status = screen.getByRole('status', {
      name: 'État d’enregistrement du brouillon',
    });

    expect(status).toHaveClass('text-success');
    expect(status).toHaveTextContent('Enregistré');
  });

  it('affiche l’enregistrement en cours avec le ton warning', () => {
    renderStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVING);

    const status = screen.getByRole('status', {
      name: 'État d’enregistrement du brouillon',
    });

    expect(status).toHaveClass('text-warning');
    expect(status).toHaveTextContent('Enregistrement…');
  });

  it('affiche un brouillon bloqué comme non enregistré en alert', () => {
    renderStatus(
      TECHNICAL_SHEET_AUTOSAVE_STATUS.BLOCKED,
      'Champ obligatoire',
    );

    const status = screen.getByRole('status', {
      name: 'État d’enregistrement du brouillon',
    });

    expect(status).toHaveClass('text-destructive');
    expect(status).toHaveTextContent('Non enregistré — à compléter');
    expect(status).toHaveAttribute('title', 'Champ obligatoire');
  });

  it('affiche un échec comme non enregistré et permet de réessayer', () => {
    renderStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.ERROR);

    const status = screen.getByRole('status', {
      name: 'État d’enregistrement du brouillon',
    });

    expect(status).toHaveClass('text-destructive');
    expect(status).toHaveTextContent('Non enregistré — erreur');
    expect(screen.getByRole('button', { name: 'Réessayer' }))
      .toBeInTheDocument();
  });
});
