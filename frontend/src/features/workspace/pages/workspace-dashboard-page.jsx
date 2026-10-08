import {
  getBalancedSixColumnGridClass,
  getBalancedSixColumnItemClass,
} from '@/components/shared/balanced-six-column-grid';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSummaryCard } from '@/features/workspace/components/dashboard-summary-card';
import { useWorkspaceDashboardWidgets } from '@/features/workspace/hooks/use-workspace-dashboard-widgets';

function getSummaryGridClass() {
  return getBalancedSixColumnGridClass();
}

/**
 * Conserve l'API locale historique du Dashboard Workspace tout en déléguant la
 * règle de répartition au moteur partagé utilisé aussi par la Platform.
 */
function getSummaryItemClass(index, itemCount) {
  return getBalancedSixColumnItemClass(index, itemCount);
}

function WorkspaceDashboardPage() {
  const {
    accessibleWidgets,
    visibleWidgets,
    isPreferencesLoading,
  } = useWorkspaceDashboardWidgets();
  const dossierWidget = visibleWidgets.find((widget) => widget.id === 'gms.dossiers-overview');
  const exportsWidget = visibleWidgets.find((widget) => widget.id === 'gms.technical-sheet-exports-monthly');
  const capacityWidget = visibleWidgets.find((widget) => widget.id === 'gms.technical-sheets-capacity');
  const productsWidget = visibleWidgets.find((widget) => widget.id === 'gms.products-catalog');
  const businessWidgets = [exportsWidget, productsWidget, capacityWidget].filter(Boolean);
  const pairedBusinessWidgets = businessWidgets.length === 3;
  const summaryWidgets = visibleWidgets.filter(
    (widget) => widget.slot === 'summary' && widget.id !== 'gms.technical-sheet-exports-monthly',
  );
  const contentWidgets = visibleWidgets.filter(
    (widget) => widget.slot === 'content'
      && widget.id !== 'gms.dossiers-overview'
      && widget.id !== 'gms.technical-sheets-capacity'
      && widget.id !== 'gms.products-catalog',
  );
  const pendingSummaryWidgets = isPreferencesLoading
    ? accessibleWidgets.filter((widget) => widget.configurable && widget.slot === 'summary')
    : [];
  const hasPendingContent = isPreferencesLoading
    && accessibleWidgets.some((widget) => widget.configurable && widget.slot === 'content');
  const renderedSummaryCount = summaryWidgets.length + pendingSummaryWidgets.length;
  const dashboardHelp = 'Vue synthétique du workspace courant. Les indicateurs affichés respectent les fonctionnalités réellement disponibles, les permissions de votre rôle et vos préférences personnelles d’affichage.';

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <div className="flex items-start gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
          <InfoTooltip content={dashboardHelp} label="À propos du tableau de bord" />
        </div>
      </header>

      {dossierWidget && <dossierWidget.component />}

      {businessWidgets.length > 0 && (
        <section
          aria-label="Indicateurs métier"
          className={getSummaryGridClass()}
        >
          {pairedBusinessWidgets ? (
            <>
              <div className="col-span-6 flex min-w-0 flex-col gap-4 md:col-span-3">
                <exportsWidget.component />
                <productsWidget.component />
              </div>
              <div className="col-span-6 min-w-0 md:col-span-3">
                <capacityWidget.component />
              </div>
            </>
          ) : businessWidgets.map((widget, index) => {
            const Widget = widget.component;
            return (
              <div
                className={businessWidgets.length === 1 ? "col-span-6" : "col-span-6 md:col-span-3"}
                key={widget.id}
              >
                <Widget />
              </div>
            );
          })}
        </section>
      )}

      {(summaryWidgets.length > 0 || pendingSummaryWidgets.length > 0) && (
        <section aria-label="Synthèse du workspace" className={getSummaryGridClass()}>
          {summaryWidgets.map((widget, index) => {
            const Widget = widget.component;
            return (
              <div className={getSummaryItemClass(index, renderedSummaryCount)} key={widget.id}>
                <Widget />
              </div>
            );
          })}
          {pendingSummaryWidgets.map((widget, pendingIndex) => {
            const index = summaryWidgets.length + pendingIndex;
            return (
              <div className={getSummaryItemClass(index, renderedSummaryCount)} key={`loading-${widget.id}`}>
                <DashboardSummaryCard description={widget.description} isLoading label={widget.label} />
              </div>
            );
          })}
        </section>
      )}

      {contentWidgets.map((widget) => {
        const Widget = widget.component;
        return <Widget key={widget.id} />;
      })}

      {hasPendingContent && (
        <section
          aria-live="polite"
          className="space-y-3 rounded-xl border border-border p-5"
          role="status"
        >
          <span className="sr-only">Chargement des préférences du tableau de bord…</span>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
        </section>
      )}
    </div>
  );
}

export {
  WorkspaceDashboardPage,
  getSummaryGridClass,
  getSummaryItemClass,
};
