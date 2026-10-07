import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import {
  TechnicalSheetValidationDialog,
} from '@/features/technical-sheets/components/technical-sheet-validation-dialog';

function renderDialog({
  comment = '',
} = {}) {
  const onCommentChange = vi.fn();
  const onConfirm = vi.fn();

  render(
    <TooltipProvider>
      <TechnicalSheetValidationDialog
        comment={comment}
        onClose={vi.fn()}
        onCommentChange={onCommentChange}
        onConfirm={onConfirm}
        open
        pending={false}
      />
    </TooltipProvider>,
  );

  return {
    onCommentChange,
    onConfirm,
  };
}

describe('TechnicalSheetValidationDialog', () => {
  it('présente l’explication dans une aide contextuelle et marque le commentaire comme facultatif', () => {
    renderDialog();

    expect(
      screen.getByRole('button', {
        name:
          'À propos de la validation',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'Commentaire de validation (facultatif)',
      ),
    ).toBeInTheDocument();
  });

  it('propose une validation explicite sans commentaire lorsque le champ est vide', async () => {
    const user = userEvent.setup();
    const { onConfirm } =
      renderDialog();

    await user.click(
      screen.getByRole('button', {
        name:
          'Valider sans commentaire',
      }),
    );

    expect(onConfirm)
      .toHaveBeenCalledTimes(1);
  });

  it('affiche Valider dès qu’un commentaire est renseigné', async () => {
    const user = userEvent.setup();
    const {
      onCommentChange,
      onConfirm,
    } = renderDialog({
      comment: 'Prix validé',
    });

    expect(
      screen.getByRole('button', {
        name: 'Valider',
        exact: true,
      }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(
        'Commentaire de validation (facultatif)',
      ),
      ' complément',
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Valider',
        exact: true,
      }),
    );

    expect(onCommentChange)
      .toHaveBeenCalled();
    expect(onConfirm)
      .toHaveBeenCalledTimes(1);
  });
});
