import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HelpSearch } from '@/features/help/components/help-search';

const entries = [
  {
    id: 'workspace.files.upload',
    title: 'Téléverser un fichier',
    summary: 'Ajouter un document autorisé.',
    search: {
      keywords: ['fichier', 'upload'],
      questions: ['Comment ajouter un fichier ?'],
    },
    order: 10,
  },
  {
    id: 'workspace.activity.read',
    title: 'Consulter l’activité du workspace',
    summary: 'Lire l’historique des actions auditées.',
    search: {
      keywords: ['audit', 'historique'],
      questions: ['Où consulter les actions réalisées ?'],
    },
    order: 20,
  },
];

describe('HelpSearch', () => {
  it('détache visuellement les suggestions autorisées et permet une sélection clavier', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<HelpSearch entries={entries} onSelect={onSelect} />);

    const input = screen.getByRole('combobox', {
      name: 'Rechercher dans le centre d’aide',
    });

    await user.type(input, 'audit');

    expect(await screen.findByText('Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Consulter l’activité du workspace')).toBeInTheDocument();
    expect(screen.queryByText('Téléverser un fichier')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSelect).toHaveBeenCalledWith(entries[1]);
  });

  it('retrouve une procédure M-006 par une question métier et respecte les seules fiches reçues', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const available = [{
      id: 'workspace.process_sheets.ingredients',
      title: 'Associer les ingrédients aux phases et étapes',
      summary: 'Affecter les ingrédients de la Fiche technique.',
      search: {
        keywords: ['ingrédient', 'phase', 'étape'],
        questions: ['Comment affecter les ingrédients ?'],
      },
      order: 140,
    }];

    render(<HelpSearch entries={available} onSelect={onSelect} />);

    await user.type(screen.getByRole('combobox', {
      name: 'Rechercher dans le centre d’aide',
    }), 'comment affecter les ingrédients');

    expect(await screen.findByText('Associer les ingrédients aux phases et étapes'))
      .toBeInTheDocument();
    expect(screen.queryByText('Valider ou revalider une Fiche process'))
      .not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(available[0]);
  });
});
