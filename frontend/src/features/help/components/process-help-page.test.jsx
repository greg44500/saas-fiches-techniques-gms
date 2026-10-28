import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { HelpPage } from '@/features/help/components/help-page';

const basePath = '/workspaces/workspace-1/help';
const catalog = {
  categories: [{
    id: 'workspace_process_sheets',
    context: 'workspace',
    label: 'Fiches process',
    description: 'Aide sur la fabrication.',
    order: 140,
  }],
  entries: [
    {
      id: 'workspace.process_sheets.organize',
      categoryId: 'workspace_process_sheets',
      title: 'Organiser les phases et les étapes',
      summary: 'Compléter les instructions de fabrication.',
      search: { keywords: ['phase', 'étape'], questions: ['Comment ajouter une étape ?'] },
      order: 120,
    },
    {
      id: 'workspace.process_sheets.save',
      categoryId: 'workspace_process_sheets',
      title: 'Enregistrer les modifications du brouillon',
      summary: 'Sauvegarder le brouillon sur le serveur.',
      search: { keywords: ['enregistrer'], questions: ['Comment enregistrer ?'] },
      order: 150,
    },
  ],
};
const details = {
  'workspace.process_sheets.organize': {
    ...catalog.entries[0],
    whoCanPerform: 'Un membre autorisé à modifier les Fiches process.',
    prerequisites: ['Une Fiche process active.'],
    steps: ['Ajoutez une phase.', 'Enregistrez le brouillon.'],
    outcome: 'La procédure est conservée après sauvegarde.',
    edgeCases: [],
    sensitiveConsequences: [],
    relatedEntryIds: ['workspace.process_sheets.save'],
  },
  'workspace.process_sheets.save': {
    ...catalog.entries[1],
    whoCanPerform: 'Un membre autorisé à modifier les Fiches process.',
    prerequisites: [],
    steps: ['Choisissez Enregistrer le brouillon.'],
    outcome: 'Le brouillon est enregistré.',
    edgeCases: [],
    sensitiveConsequences: [],
    relatedEntryIds: [],
  },
};

function ProcessHelpTestRoute() {
  const { entryId } = useParams();
  return (
    <HelpPage
      basePath={basePath}
      catalog={catalog}
      catalogLoading={false}
      description="Aide du Dossier"
      entry={details[entryId]}
      entryId={entryId}
      entryLoading={false}
      title="Centre d’aide"
    />
  );
}

describe('Centre d’aide Workspace — Fiches process', () => {
  it('affiche la catégorie M-006, ouvre une procédure et propose ses liens autorisés', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <MemoryRouter initialEntries={[basePath]}>
          <Routes>
            <Route path="/workspaces/:workspaceId/help" element={<ProcessHelpTestRoute />} />
            <Route path="/workspaces/:workspaceId/help/:entryId" element={<ProcessHelpTestRoute />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );

    expect(screen.getByRole('tab', { name: 'Fiches process' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Organiser les phases et les étapes/ }));

    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByRole('heading', {
      name: 'Organiser les phases et les étapes',
    })).toBeInTheDocument();
    expect(within(drawer).getByText('Ajoutez une phase.')).toBeInTheDocument();
    expect(within(drawer).getByRole('link', {
      name: 'Enregistrer les modifications du brouillon',
    })).toHaveAttribute('href', basePath + '/workspace.process_sheets.save');
  });
});
