import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  TechnicalSheetIdentityDialog,
} from '@/features/technical-sheets/components/technical-sheet-identity-dialog';

describe('TechnicalSheetIdentityDialog', () => {
  it('édite uniquement le nom et la description de la Fiche', async () => {
    const user = userEvent.setup();
    const onNameChange = vi.fn();
    const onDescriptionChange = vi.fn();
    const onSave = vi.fn();

    render(
      <TechnicalSheetIdentityDialog
        canEdit
        description="Description"
        dirty
        name="Quiche"
        onClose={vi.fn()}
        onDescriptionChange={onDescriptionChange}
        onNameChange={onNameChange}
        onSave={onSave}
        open
        pending={false}
      />,
    );

    expect(screen.getByRole('heading', {
      name: 'Modifier la Fiche',
    })).toBeInTheDocument();
    expect(screen.queryByLabelText('TVA (%)')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nom'), ' lorraine');
    await user.type(
      screen.getByLabelText('Description / notes'),
      ' test',
    );
    await user.click(screen.getByRole('button', {
      name: 'Enregistrer',
    }));

    expect(onNameChange).toHaveBeenCalled();
    expect(onDescriptionChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
