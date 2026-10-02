import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  TechnicalSheetValidationDialog,
} from '@/features/technical-sheets/components/technical-sheet-validation-dialog';

describe('TechnicalSheetValidationDialog', () => {
  it('porte le commentaire facultatif au moment de la validation', async () => {
    const user = userEvent.setup();
    const onCommentChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <TechnicalSheetValidationDialog
        comment=""
        onClose={vi.fn()}
        onCommentChange={onCommentChange}
        onConfirm={onConfirm}
        open
        pending={false}
      />,
    );

    await user.type(
      screen.getByLabelText('Commentaire de validation'),
      'Prix validé',
    );
    await user.click(screen.getByRole('button', {
      name: 'Valider',
    }));

    expect(onCommentChange).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
