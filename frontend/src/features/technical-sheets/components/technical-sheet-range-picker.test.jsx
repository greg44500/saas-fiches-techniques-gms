import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  onChange: vi.fn(),
  listRanges: vi.fn(),
}));

vi.mock('@/features/technical-sheets/api/technical-sheets-api', () => ({
  useListTechnicalSheetRangeOptionsQuery: mocks.listRanges,
}));

vi.mock('@/features/technical-sheets/components/technical-sheet-range-form-dialog', () => ({
  TechnicalSheetRangeFormDialog: ({ onClose, onSaved }) => (
    <div aria-label="Créer une gamme" role="dialog">
      <button
        onClick={() => onSaved({ id: 'range-new', name: 'Traiteur' })}
        type="button"
      >Confirmer la création</button>
      <button onClick={onClose} type="button">Annuler</button>
    </div>
  ),
}));

import {
  TechnicalSheetRangePicker,
} from '@/features/technical-sheets/components/technical-sheet-range-picker';

describe('M-004 — création rapide depuis une Fiche', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listRanges.mockReturnValue({
      data: [{ id: 'range-1', name: 'Snacking' }],
      isLoading: false,
      isError: false,
    });
  });

  it('ouvre la même modale puis affecte la Gamme créée', async () => {
    const user = userEvent.setup();
    render(
      <TechnicalSheetRangePicker
        canCreate
        onChange={mocks.onChange}
        value={null}
        workspaceId="workspace-1"
      />,
    );
    expect(screen.queryByRole('dialog', { name: 'Créer une gamme' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /rechercher une gamme/i }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Gamme (facultative)' }))
      .toHaveTextContent('Sans gamme');
    await user.click(screen.getByRole('button', { name: 'Créer une gamme' }));
    expect(screen.getByRole('dialog', { name: 'Créer une gamme' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer la création' }));
    expect(mocks.onChange).toHaveBeenCalledWith('range-new');
    expect(screen.queryByRole('dialog', { name: 'Créer une gamme' }))
      .not.toBeInTheDocument();
  });

  it('permet de choisir une Gamme active ou Sans gamme par défaut', async () => {
    const user = userEvent.setup();
    render(
      <TechnicalSheetRangePicker
        canCreate
        onChange={mocks.onChange}
        value={null}
        workspaceId="workspace-1"
      />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Gamme (facultative)' }));
    await user.click(screen.getByRole('option', { name: 'Snacking' }));
    expect(mocks.onChange).toHaveBeenCalledWith('range-1');
  });

  it('ne propose pas la création rapide sans permission', () => {
    render(
      <TechnicalSheetRangePicker
        canCreate={false}
        onChange={mocks.onChange}
        value={null}
        workspaceId="workspace-1"
      />,
    );
    expect(screen.queryByRole('button', { name: 'Créer une gamme' }))
      .not.toBeInTheDocument();
  });
});
