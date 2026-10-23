import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Archive, Eye } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import {
  TableRowActionsMenu,
} from '@/components/data-display/table-row-actions-menu';

function renderMenu(actions) {
  render(
    <MemoryRouter>
      <TableRowActionsMenu actions={actions} label="Mon dossier" />
    </MemoryRouter>,
  );
}

describe('TableRowActionsMenu', () => {
  it('n’affiche aucune action lorsque la liste est vide', () => {
    renderMenu([]);
    expect(screen.queryByRole('button', { name: 'Actions de Mon dossier' }))
      .not.toBeInTheDocument();
  });

  it('ouvre au clic, exécute une action et referme le menu', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderMenu([{ key: 'view', Icon: Eye, label: 'Voir', onClick }]);

    expect(screen.queryByRole('button', { name: 'Voir' }))
      .not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions de Mon dossier' }));
    await user.click(screen.getByRole('button', { name: 'Voir' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Voir' }))
      .not.toBeInTheDocument();
  });

  it('conserve la navigation par lien et le style des actions sensibles', async () => {
    const user = userEvent.setup();
    renderMenu([
      { key: 'open', label: 'Ouvrir', to: '/workspaces/1/dossiers/2' },
      {
        key: 'archive',
        Icon: Archive,
        label: 'Archiver',
        destructive: true,
        onClick: vi.fn(),
      },
    ]);
    await user.click(screen.getByRole('button', { name: 'Actions de Mon dossier' }));

    expect(screen.getByRole('link', { name: 'Ouvrir' }))
      .toHaveAttribute('href', '/workspaces/1/dossiers/2');
    expect(screen.getByRole('button', { name: 'Archiver' }))
      .toHaveClass('text-destructive');
  });

  it('emploie les tons sémantiques uniquement au survol et au focus clavier', async () => {
    const user = userEvent.setup();
    renderMenu([
      { key: 'approve', label: 'Valider', tone: 'success', onClick: vi.fn() },
      { key: 'examine', label: 'Examiner', tone: 'warning', onClick: vi.fn() },
      { key: 'edit', label: 'Corriger', onClick: vi.fn() },
    ]);

    await user.click(screen.getByRole('button', { name: 'Actions de Mon dossier' }));
    const approve = screen.getByRole('button', { name: 'Valider' });
    const examine = screen.getByRole('button', { name: 'Examiner' });
    const edit = screen.getByRole('button', { name: 'Corriger' });
    expect(approve).toHaveClass('hover:text-success', 'focus-visible:text-success');
    expect(examine).toHaveClass('hover:text-warning', 'focus-visible:text-warning');
    expect(edit).not.toHaveClass('hover:text-success', 'hover:text-warning');
    expect(approve).not.toHaveClass('text-success');
    expect(examine).not.toHaveClass('text-warning');
  });

  it('laisse une action en cours désactivée', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderMenu([{
      key: 'archive', label: 'Archiver', disabled: true, onClick,
    }]);

    await user.click(screen.getByRole('button', { name: 'Actions de Mon dossier' }));
    expect(screen.getByRole('button', { name: 'Archiver' })).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
