import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { HelpCenter } from '@/features/help/components/help-center';

const catalog = {
  categories: [
    {
      id: 'account',
      label: 'Mon compte',
      description: 'Gérer le compte.',
      order: 10,
    },
    {
      id: 'workspace',
      label: 'Workspace & équipe',
      description: 'Gérer le Workspace.',
      order: 20,
    },
  ],
  entries: [
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `account.task.${index}`,
      categoryId: 'account',
      title: `Procédure compte ${index + 1}`,
      summary: 'Consulter une procédure.',
      order: index,
    })),
    {
      id: 'workspace.members.read',
      categoryId: 'workspace',
      title: 'Consulter les membres',
      summary: 'Voir les membres autorisés.',
      order: 10,
    },
    {
      id: 'workspace.members.invite',
      categoryId: 'workspace',
      title: 'Inviter un membre',
      summary: 'Inviter une personne.',
      order: 20,
    },
  ],
};

describe('HelpCenter — apparition en cascade', () => {
  it('anime les cartes dans l’ordre et recommence à la catégorie suivante', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <MemoryRouter>
          <HelpCenter
            basePath="/workspaces/workspace-1/help"
            catalog={catalog}
            description="Aide du Workspace"
            isLoading={false}
            title="Centre d’aide"
          />
        </MemoryRouter>
      </TooltipProvider>,
    );

    const first = screen.getByRole('link', { name: /Procédure compte 1\b/ });
    const second = screen.getByRole('link', { name: /Procédure compte 2/ });
    const last = screen.getByRole('link', { name: /Procédure compte 10/ });

    expect(first).toHaveClass('help-card-stagger-in');
    expect(first.style.getPropertyValue('--help-card-stagger-index')).toBe('0');
    expect(second.style.getPropertyValue('--help-card-stagger-index')).toBe('1');
    expect(last.style.getPropertyValue('--help-card-stagger-index')).toBe('8');

    await user.click(screen.getByRole('tab', { name: 'Workspace & équipe' }));

    const members = screen.getByRole('link', { name: /Consulter les membres/ });
    const invite = screen.getByRole('link', { name: /Inviter un membre/ });
    expect(members).toHaveClass('help-card-stagger-in');
    expect(members.style.getPropertyValue('--help-card-stagger-index')).toBe('0');
    expect(invite.style.getPropertyValue('--help-card-stagger-index')).toBe('1');
    expect(screen.queryByRole('link', { name: /Procédure compte 1\b/ }))
      .not.toBeInTheDocument();
  });
});
