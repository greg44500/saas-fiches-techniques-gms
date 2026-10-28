import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ProcessSheetControlPanel,
} from '@/features/process-sheets/components/process-sheet-control-panel';

const actions = () => ({
  onPreview: vi.fn(), onReconcile: vi.fn(), onSave: vi.fn(), onValidate: vi.fn(),
});

function view(overrides = {}) {
  const callbacks = actions();
  const props = {
    editorialState: 'DRAFT', saveStatus: 'Enregistré',
    previewActive: false, compositionDisabled: true,
    compositionHelp: 'La composition est déjà à jour.',
    saveDisabled: true, saveHelp: 'Aucune modification à enregistrer.',
    validationDisabled: true, validationHelp: 'Enregistrez avant de valider.',
    ...callbacks, ...overrides,
  };
  return {
    callbacks,
    ...render(
      <TooltipProvider>
        <ProcessSheetControlPanel {...props} />
      </TooltipProvider>,
    ),
  };
}

describe('M-006 — panneau de contrôle de la Fiche process', () => {
  it('présente les états et quatre actions à icône dans un seul groupe', () => {
    view();
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('Enregistré')).toBeInTheDocument();
    const panel = screen.getByRole('group', { name: 'Actions de la Fiche process' });
    expect(within(panel).getAllByRole('button')).toHaveLength(4);
    expect(within(panel).getByRole('button', { name: 'Aperçu du process' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Actualiser la composition' }))
      .toHaveAttribute('aria-disabled', 'true');
    expect(within(panel).getByRole('button', { name: 'Enregistrer le brouillon' }))
      .toHaveAttribute('aria-disabled', 'true');
    expect(within(panel).getByRole('button', { name: 'Valider la Fiche process' }))
      .toHaveAttribute('aria-disabled', 'true');
  });

  it('garde le tooltip accessible au focus sans déclencher les actions indisponibles', async () => {
    const user = userEvent.setup();
    const { callbacks } = view();
    const preview = screen.getByRole('button', { name: 'Aperçu du process' });
    const compare = screen.getByRole('button', { name: 'Actualiser la composition' });
    // Navigate with the keyboard, as a real user would. Base UI renders its
    // tooltip popup without role="tooltip"; assert visible content instead.
    await user.tab();
    expect(preview).toHaveFocus();
    await user.tab();
    expect(compare).toHaveFocus();
    expect(await screen.findByText('La composition est déjà à jour.')).toBeVisible();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(compare);
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await user.click(screen.getByRole('button', { name: 'Valider la Fiche process' }));
    expect(callbacks.onReconcile).not.toHaveBeenCalled();
    expect(callbacks.onSave).not.toHaveBeenCalled();
    expect(callbacks.onValidate).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'Enregistrer le brouillon',
      help: 'Aucune modification à enregistrer.',
      callback: 'onSave',
    },
    {
      label: 'Valider la Fiche process',
      help: 'Enregistrez avant de valider.',
      callback: 'onValidate',
    },
  ])('explique au focus pourquoi $label est indisponible, sans exécuter l’action',
    async ({ label, help, callback }) => {
      const user = userEvent.setup();
      const { callbacks } = view();
      const action = screen.getByRole('button', { name: label });

      expect(action).toHaveAttribute('aria-disabled', 'true');
      action.focus();
      expect(action).toHaveFocus();
      expect(await screen.findByText(help)).toBeVisible();

      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      await user.click(action);
      expect(callbacks[callback]).not.toHaveBeenCalled();
    });

  it('exécute uniquement les commandes autorisées sans changer leur emplacement', async () => {
    const user = userEvent.setup();
    const { callbacks } = view({
      editorialState: 'VALIDATED',
      previewActive: true, compositionDisabled: false,
      saveDisabled: false, validationDisabled: false,
    });
    const panel = screen.getByRole('group', { name: 'Actions de la Fiche process' });
    expect(screen.getByText('Validée')).toBeInTheDocument();
    expect(within(panel).getAllByRole('button')).toHaveLength(4);
    await user.click(within(panel).getByRole('button', { name: 'Revenir à l’édition' }));
    await user.click(within(panel).getByRole('button', { name: 'Actualiser la composition' }));
    await user.click(within(panel).getByRole('button', { name: 'Enregistrer le brouillon' }));
    await user.click(within(panel).getByRole('button', { name: 'Valider la Fiche process' }));
    expect(callbacks.onPreview).toHaveBeenCalledOnce();
    expect(callbacks.onReconcile).toHaveBeenCalledOnce();
    expect(callbacks.onSave).toHaveBeenCalledOnce();
    expect(callbacks.onValidate).toHaveBeenCalledOnce();
  });
});
