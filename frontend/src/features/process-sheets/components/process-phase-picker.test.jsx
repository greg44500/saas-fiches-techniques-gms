import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTitles: vi.fn(),
  createTitle: vi.fn(),
}));

vi.mock('@/features/process-sheets/api/process-sheets-api', () => ({
  useListProcessPhaseTitlesQuery: (...args) => mocks.getTitles(...args),
  useCreateProcessPhaseTitleMutation: () => [
    mocks.createTitle, { isLoading: false },
  ],
}));

import { ProcessPhasePicker } from '@/features/process-sheets/components/process-phase-picker';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getTitles.mockReturnValue({
    data: { phases: [] }, isLoading: false, isFetching: false,
  });
  mocks.createTitle.mockImplementation(({ title }) => ({
    unwrap: vi.fn().mockResolvedValue({ id: 'created', title }),
  }));
});

describe('M-006 — menu déroulant des intitulés de phases', () => {
  it('ouvre le menu Base UI depuis son bouton + et propose Autre phase même avec une liste vide', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ProcessPhasePicker
        canReadLibrary onSelect={onSelect} workspaceId="workspace-1"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Ajouter une phase' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Autre phase…' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Autre phase…' }));
    expect(screen.getByRole('dialog', { name: 'Nouvel intitulé de phase' }))
      .toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Intitulé' }), 'Assaisonnement');
    await user.click(screen.getByRole('button', { name: 'Ajouter la phase' }));
    expect(mocks.createTitle).toHaveBeenCalledWith({
      workspaceId: 'workspace-1', title: 'Assaisonnement',
    });
    expect(onSelect).toHaveBeenCalledWith('Assaisonnement');
  });

  it('lit les choix du backend et appelle onSelect sans publier une autre phase', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    mocks.getTitles.mockReturnValue({
      data: { phases: [{ id: 'p-1', title: 'Cuisson' }] },
      isLoading: false, isFetching: false,
    });
    render(<ProcessPhasePicker canReadLibrary onSelect={onSelect} workspaceId="workspace-1" />);
    await user.click(screen.getByRole('button', { name: 'Ajouter une phase' }));
    await user.click(screen.getByRole('button', { name: 'Cuisson' }));
    expect(onSelect).toHaveBeenCalledWith('Cuisson');
    expect(mocks.createTitle).not.toHaveBeenCalled();
  });
});

