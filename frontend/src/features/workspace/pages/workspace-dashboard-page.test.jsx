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

function SubscriptionWidget() {
  return <div>Abonnement : Free</div>;
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
    id: 'core.subscription',
    label: 'Abonnement',
    description: 'Synthèse de l’abonnement.',
    slot: 'summary',
    configurable: true,
    component: SubscriptionWidget,
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
    expect(
      screen.getByRole('button', { name: 'À propos du tableau de bord' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Membres : 4')).toBeInTheDocument();
    expect(screen.getByText('Abonnement : Free')).toBeInTheDocument();
    expect(screen.getByText('Activité récente : Workspace modifié')).toBeInTheDocument();
    expect(screen.queryByText(/Statut du workspace/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Votre rôle/)).not.toBeInTheDocument();
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
    expect(screen.getByText('Abonnement : Free')).toBeInTheDocument();
  });

  it('affiche des skeletons sans monter les widgets configurables pendant le chargement des préférences', () => {
    useWorkspaceDashboardWidgetsMock.mockReturnValue({
      ...baseData,
      visibleWidgets: [],
      isPreferencesLoading: true,
    });

    renderDashboard();

    expect(screen.queryByText('Membres : 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Abonnement : Free')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});
