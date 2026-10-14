import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  IMPORT_FILE_ACCEPT,
  ImportFilePicker,
} from '@/features/imports/components/import-file-picker';

describe('ImportFilePicker', () => {
  it('affiche une sélection française, les formats acceptés et le nom du fichier', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ImportFilePicker
        file={null}
        id="product-import-file"
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Aucun fichier sélectionné')).toBeInTheDocument();
    expect(screen.getByText('Formats acceptés : CSV, XLS et XLSX.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choisir un fichier' })).toBeEnabled();
    expect(screen.getByLabelText('Fichier')).toHaveAttribute('accept', IMPORT_FILE_ACCEPT);

    const file = new File(['reference;designation'], 'liste fournisseur.csv', {
      type: 'text/csv',
    });
    await user.upload(screen.getByLabelText('Fichier'), file);
    expect(onChange).toHaveBeenCalledWith(file);

    rerender(
      <ImportFilePicker
        file={file}
        id="product-import-file"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Fichier choisi : liste fournisseur.csv')).toBeInTheDocument();

    rerender(
      <ImportFilePicker
        file={null}
        id="product-import-file"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('Aucun fichier sélectionné')).toBeInTheDocument();
  });

  it('désactive la sélection pendant une opération en cours', () => {
    render(
      <ImportFilePicker
        disabled
        file={null}
        id="catalog-import-file"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Choisir un fichier' })).toBeDisabled();
    expect(screen.getByLabelText('Fichier')).toBeDisabled();
  });
});
