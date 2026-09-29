import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({
    children,
    open,
    title,
  }) => (
    open
      ? (
        <aside>
          <h2>{title}</h2>
          {children}
        </aside>
      )
      : null
  ),
}));

import {
  TechnicalSheetInformationDrawer,
} from '@/features/technical-sheets/components/technical-sheet-information-drawer';

function renderDrawer(overrides = {}) {
  const props = {
    canEdit: true,
    canValidate: true,
    description: 'Description initiale',
    dirty: false,
    name: 'Fiche test',
    onClose: vi.fn(),
    onDescriptionChange: vi.fn(),
    onNameChange: vi.fn(),
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onValidationCommentChange: vi.fn(),
    open: false,
    pending: false,
    showValidationComment: true,
    validationComment: '',
    ...overrides,
  };

  render(<TechnicalSheetInformationDrawer {...props} />);

  return props;
}

describe('TechnicalSheetInformationDrawer', () => {
  it('expose une languette latérale pour ouvrir les informations', async () => {
    const user = userEvent.setup();
    const props = renderDrawer();

    await user.click(screen.getByRole('button', {
      name: 'Ouvrir les informations de la Fiche',
    }));

    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it('affiche les informations éditables dans le drawer', async () => {
    const user = userEvent.setup();
    const props = renderDrawer({
      dirty: true,
      open: true,
    });

    expect(screen.getByRole('heading', {
      name: 'Informations de la Fiche',
    })).toBeInTheDocument();

    const name = screen.getByLabelText('Nom');
    await user.clear(name);
    await user.type(name, 'Nouvelle fiche');

    expect(props.onNameChange).toHaveBeenCalled();

    const save = screen.getByRole('button', {
      name: 'Enregistrer les informations',
    });

    expect(save).toBeEnabled();
    expect(save).toHaveClass('text-warning');

    await user.click(save);
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  it('n’active pas l’enregistrement lorsqu’aucune information n’a changé', () => {
    renderDrawer({
      open: true,
      dirty: false,
    });

    expect(screen.getByRole('button', {
      name: 'Enregistrer les informations',
    })).toBeDisabled();
  });
});
