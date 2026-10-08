import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

const useWorkspaceDashboardWidgetsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/hooks/use-workspace-dashboard-widgets', () => ({
  useWorkspaceDashboardWidgets: useWorkspaceDashboardWidgetsMock,
}));

import {
  WorkspaceDashboardPage,
  getSummaryGridClass,
  getSummaryItemClass,
} from '@/features/workspace/pages/workspace-dashboard-page';

function MembersWidget() {
  return <div>Membres : 4</div>;
}

function InvitationsWidget() {
  return <div>Invitations en attente : 2</div>;
}

function ActivityWidget() {
  return <div>Activité récente : Workspace modifié</div>;
}

const allWidgets = [
  {
    id: 'core.members',
    label: 'Membres',
    description: 'Nombre de membres visibles dans le workspace.',
    slot: 'summary',
    configurable: true,
    component: MembersWidget,
  },
  {
    id: 'core.pending-invitations',
    label: 'Invitations en attente',
    description: 'Invitations workspace encore en attente de réponse.',
    slot: 'summary',
    configurable: true,
    component: InvitationsWidget,
  },
  {
    id: 'core.recent-activity',
    label: 'Activité récente',
    description: 'Dernières actions auditables du workspace.',
    slot: 'content',
    configurable: true,
    component: ActivityWidget,
  },
];

const baseData = {
  workspace: { id: 'workspace-1', name: 'Acme', status: 'active' },
  accessibleWidgets: allWidgets,
  visibleWidgets: allWidgets,
  preferencesQuery: {
    data: { dashboard: { hiddenWidgetIds: [] } },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  isPreferencesLoading: false,
};

function renderDashboard() {
  return render(
    <TooltipProvider>
      <WorkspaceDashboardPage />
    </TooltipProvider>,
  );
}

describe('WorkspaceDashboardPage', () => {
  beforeEach(() => {
    useWorkspaceDashboardWidgetsMock.mockReset();
    useWorkspaceDashboardWidgetsMock.mockReturnValue(baseData);
  });

  afterEach(() => cleanup());

  it('compose uniquement les widgets visibles fournis par le registre', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'À propos du tableau de bord' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Membres : 4')).toBeInTheDocument();
    expect(screen.getByText('Invitations en attente : 2')).toBeInTheDocument();
    expect(screen.getByText('Activité récente : Workspace modifié')).toBeInTheDocument();
    expect(screen.queryByText(/Abonnement/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Statut du workspace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Votre rôle/)).not.toBeInTheDocument();
  });

  it('place les Dossiers avant les KPI métier et regroupe Exports et Capacité', () => {
    const widgets = [
      { id: 'gms.technical-sheet-exports-monthly', slot: 'summary', component: () => <div>Exports métier</div> },
      { id: 'gms.technical-sheets-capacity', slot: 'content', component: () => <div>Capacité métier</div> },
      { id: 'gms.dossiers-overview', slot: 'content', component: () => <div>Cartes Dossiers</div> },
    ];
    useWorkspaceDashboardWidgetsMock.mockReturnValue({
      ...baseData,
      accessibleWidgets: widgets,
      visibleWidgets: widgets,
    });
    const { container } = renderDashboard();
    const text = container.textContent;
    expect(text.indexOf('Cartes Dossiers')).toBeLessThan(text.indexOf('Exports métier'));
    expect(text.indexOf('Exports métier')).toBeLessThan(text.indexOf('Capacité métier'));
    expect(screen.getByRole('region', { name: 'Indicateurs Fiches techniques' })).toHaveClass('md:grid-cols-2');
  });

  it('utilise une grille à six colonnes pour répartir les tiers et les moitiés', () => {
    expect(getSummaryGridClass()).toBe('grid grid-cols-6 gap-4');
  });

  it('équilibre automatiquement la dernière ligne selon le nombre visible', () => {
    expect(getSummaryItemClass(0, 1)).toContain('xl:col-span-6');
    expect(getSummaryItemClass(0, 2)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(1, 2)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(0, 3)).toContain('xl:col-span-2');
    expect(getSummaryItemClass(2, 3)).toContain('xl:col-span-2');
    expect(getSummaryItemClass(0, 4)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(3, 4)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(0, 5)).toContain('xl:col-span-2');
    expect(getSummaryItemClass(2, 5)).toContain('xl:col-span-2');
    expect(getSummaryItemClass(3, 5)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(4, 5)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(0, 7)).toContain('xl:col-span-2');
    expect(getSummaryItemClass(3, 7)).toContain('xl:col-span-3');
    expect(getSummaryItemClass(6, 7)).toContain('xl:col-span-3');
  });

  it('ne monte pas un widget accessible mais masqué par la préférence utilisateur', () => {
    useWorkspaceDashboardWidgetsMock.mockReturnValue({
      ...baseData,
      visibleWidgets: allWidgets.filter((widget) => widget.id !== 'core.members'),
    });

    renderDashboard();

    expect(screen.queryByText('Membres : 4')).not.toBeInTheDocument();
    expect(screen.getByText('Invitations en attente : 2')).toBeInTheDocument();
  });

  it('affiche des skeletons sans monter les widgets configurables pendant le chargement des préférences', () => {
    useWorkspaceDashboardWidgetsMock.mockReturnValue({
      ...baseData,
      visibleWidgets: [],
      isPreferencesLoading: true,
    });

    renderDashboard();

    expect(screen.queryByText('Membres : 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Invitations en attente : 2')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
