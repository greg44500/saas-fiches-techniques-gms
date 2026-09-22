import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const autocomplete = vi.hoisted(() => ({
  dismiss: vi.fn(),
}));

vi.mock('@/features/dossiers/hooks/use-address-autocomplete', () => ({
  useAddressAutocomplete: (query) => ({
    dismiss: autocomplete.dismiss,
    isError: false,
    isLoading: false,
    suggestions: query?.trim?.().length >= 3
      ? [
          {
            id: 'address-1',
            label: '10 rue de la Paix, 44000 Nantes',
            address: '10 rue de la Paix',
            postalCode: '44000',
            city: 'Nantes',
          },
        ]
      : [],
  }),
}));

import { DossierFormDialog } from '@/features/dossiers/components/dossier-form-dialog';

describe('DossierFormDialog', () => {
  beforeEach(() => {
    autocomplete.dismiss.mockReset();
  });

  it('crée un payload nom seul et efface les champs facultatifs avec null', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <DossierFormDialog
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open
      />,
    );

    await user.type(screen.getByLabelText('Nom'), 'Magasin Nantes');
    await user.click(screen.getByRole('button', { name: 'Créer le dossier' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Magasin Nantes',
        brand: null,
        location: null,
        documentEmail: null,
        phone: null,
        contactName: null,
      });
    });
  });

  it('applique une suggestion sans rendre l’autocomplétion obligatoire', async () => {
    const user = userEvent.setup();

    render(
      <DossierFormDialog
        onClose={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        open
      />,
    );

    await user.type(screen.getByLabelText('Adresse'), '10 rue');

    await user.click(
      screen.getByRole('option', {
        name: '10 rue de la Paix, 44000 Nantes',
      }),
    );

    expect(screen.getByLabelText('Adresse')).toHaveValue('10 rue de la Paix');
    expect(screen.getByLabelText('Code postal')).toHaveValue('44000');
    expect(screen.getByLabelText('Ville')).toHaveValue('Nantes');
    expect(autocomplete.dismiss).toHaveBeenCalledWith('10 rue de la Paix');
  });

  it('affiche l’erreur serveur dans le formulaire', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue({
      data: {
        message: 'Nom déjà utilisé pour ce test.',
      },
    });

    render(
      <DossierFormDialog
        onClose={vi.fn()}
        onSubmit={onSubmit}
        open
      />,
    );

    await user.type(screen.getByLabelText('Nom'), 'Magasin Nantes');
    await user.click(screen.getByRole('button', { name: 'Créer le dossier' }));

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('Nom déjà utilisé pour ce test.');
  });
});
