import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  list: vi.fn(), mutate: vi.fn(), close: vi.fn(), created: vi.fn(),
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useListEligibleProcessTechnicalSheetsQuery: mocks.list,
  useCreateProcessSheetMutation: () => [mocks.mutate, { isLoading: false }],
}));

import {
  ProcessSheetCreateDialog,
} from '@/features/process-sheets/components/process-sheet-create-dialog';

const args = {
  workspaceId: 'workspace-1', dossierId: 'dossier-1',
};

function renderDialog() {
  return render(
    <TooltipProvider>
      <ProcessSheetCreateDialog
        {...args}
        onClose={mocks.close}
        onCreated={mocks.created}
        open
      />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockReturnValue({
    data: {
      technicalSheets: [
        { id: 'sheet-1', name: 'Tartine validée' },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    },
    isError: false, isFetching: false, isLoading: false,
    refetch: vi.fn(),
  });
  mocks.mutate.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ id: 'process-new' }),
  });
});

describe('M-006 — modale de création', () => {
  it('demande uniquement le titre et la Fiche technique éligible', async () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('textbox', {
      name: 'Titre de la Fiche process',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'À propos du titre de la Fiche process',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Critères de disponibilité des Fiches techniques',
    })).toBeInTheDocument();
    expect(mocks.list).toHaveBeenCalledWith({
      ...args, page: 1, limit: 100,
    }, { skip: false });
    expect(screen.queryByRole('textbox', {
      name: 'Rechercher une Fiche technique éligible',
    })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Rechercher parmi les Fiches validées…'))
      .not.toBeInTheDocument();
    const titleField = screen.getByRole('textbox', {
      name: 'Titre de la Fiche process',
    }).closest('[data-slot="field"]');
    const linkedField = screen.getByRole('combobox', {
      name: 'Fiche technique associée',
    }).closest('[data-slot="field"]');
    expect(titleField).toHaveAttribute('data-label-state', 'empty');
    expect(linkedField).toHaveAttribute('data-label-state', 'empty');
    expect(titleField).toHaveClass('group', 'relative', 'pt-2');
    expect(linkedField).toHaveClass('group', 'relative', 'pt-2');
    expect(screen.getByRole('textbox', { name: 'Titre de la Fiche process' }))
      .toHaveClass('h-12', 'placeholder:text-transparent');
    expect(screen.getByRole('combobox', { name: 'Fiche technique associée' }))
      .toHaveClass('h-12', 'pt-3');
    expect(screen.getByText('Titre de la Fiche process').parentElement)
      .toHaveClass('group-focus-within:top-2');
    await userEvent.setup().click(screen.getByRole('combobox', {
      name: 'Fiche technique associée',
    }));
    expect(screen.getByRole('option', { name: 'Tartine validée' }))
      .toBeInTheDocument();
  });

  it('explique pourquoi aucune Fiche technique n’est éligible', () => {
    mocks.list.mockReturnValue({
      data: {
        technicalSheets: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      },
      isError: false, isFetching: false, isLoading: false,
      refetch: vi.fn(),
    });
    renderDialog();
    expect(screen.getByText(/Les Fiches en brouillon/)).toBeInTheDocument();
    expect(screen.getByText(/validation M-004 sans brouillon/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer et ouvrir' })).toBeDisabled();
  });

  it('déplace les libellés outlined au focus et garde le libellé relevé après sélection', async () => {
    renderDialog();
    const user = userEvent.setup();
    const title = screen.getByRole('textbox', { name: 'Titre de la Fiche process' });
    const linked = screen.getByRole('combobox', { name: 'Fiche technique associée' });
    expect(title).toHaveAttribute('placeholder', 'Ex. Fabrication de la tartine auvergnate');
    expect(title).toHaveClass('focus:placeholder:text-muted-foreground');
    await user.click(title);
    expect(title).toHaveFocus();
    await user.type(title, 'Fabrication');
    expect(title.closest('[data-slot="field"]')).toHaveAttribute('data-label-state', 'filled');
    await user.click(linked);
    expect(screen.getByRole('option', { name: 'Tartine validée' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Tartine validée' }));
    expect(linked.closest('[data-slot="field"]')).toHaveAttribute('data-label-state', 'filled');
    expect(linked).toHaveTextContent('Tartine validée');
    expect(screen.getByRole('button', { name: 'Créer et ouvrir' })).toBeEnabled();
  });

  it('n’ajoute une pagination que lorsque le nombre de Fiches dépasse une page', () => {
    renderDialog();
    expect(screen.queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', {
      name: 'Fiche technique associée',
    })).toBeInTheDocument();
  });

  it('permet de parcourir les lots rares de plus de 100 Fiches éligibles sans second champ', async () => {
    mocks.list.mockReturnValue({
      data: {
        technicalSheets: [{ id: 'sheet-1', name: 'Tartine validée' }],
        pagination: { page: 1, limit: 100, total: 122, totalPages: 2 },
      },
      isError: false, isFetching: false, isLoading: false,
      refetch: vi.fn(),
    });
    renderDialog();
    expect(screen.queryByRole('textbox', {
      name: 'Rechercher une Fiche technique éligible',
    })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Suivant' }));
    expect(mocks.list).toHaveBeenLastCalledWith({
      ...args, page: 2, limit: 100,
    }, { skip: false });
    expect(screen.getByRole('button', { name: 'Créer et ouvrir' })).toBeDisabled();
  });

  it('soumet exactement le titre et la référence M-004 choisie', async () => {
    renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', {
      name: 'Titre de la Fiche process',
    }), 'Fabrication tartine');
    await user.click(screen.getByRole('combobox', {
      name: 'Fiche technique associée',
    }));
    await user.click(screen.getByRole('option', { name: 'Tartine validée' }));
    await user.click(screen.getByRole('button', { name: 'Créer et ouvrir' }));
    expect(mocks.mutate).toHaveBeenCalledWith({
      ...args, title: 'Fabrication tartine', technicalSheetId: 'sheet-1',
    });
    expect(mocks.created).toHaveBeenCalledWith({ id: 'process-new' });
  });

  it('n’autorise pas la soumission sans titre ni sélection M-004', async () => {
    renderDialog();
    const submit = screen.getByRole('button', { name: 'Créer et ouvrir' });
    expect(submit).toBeDisabled();
    await userEvent.setup().type(
      screen.getByRole('textbox', { name: 'Titre de la Fiche process' }),
      'Fabrication tartine',
    );
    expect(submit).toBeDisabled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('refuse la création sur un conflit serveur et maintient le formulaire', async () => {
    mocks.mutate.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ status: 409 }),
    });
    renderDialog();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', {
      name: 'Titre de la Fiche process',
    }), 'Fabrication tartine');
    await user.click(screen.getByRole('combobox', {
      name: 'Fiche technique associée',
    }));
    await user.click(screen.getByRole('option', { name: 'Tartine validée' }));
    await user.click(screen.getByRole('button', { name: 'Créer et ouvrir' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cette Fiche technique n’est plus disponible',
    );
    expect(mocks.created).not.toHaveBeenCalled();
  });
});
