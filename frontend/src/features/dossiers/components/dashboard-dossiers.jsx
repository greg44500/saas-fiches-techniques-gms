import { Link } from 'react-router';

import { EmptyState } from '@/components/shared/empty-state';
import { FlippableCard } from '@/components/shared/flippable-card';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function createDossierStatusLabelMap(metadata) {
  return new Map(
    (metadata?.dossierStatuses ?? []).map(({ value, label }) => [value, label]),
  );
}

function getDossierSecondaryLabel(dossier) {
  const locality = [
    dossier.location?.postalCode,
    dossier.location?.city,
  ].filter(Boolean).join(' ');

  return [
    dossier.brand,
    locality,
  ].filter(Boolean).join(' · ') || 'Informations complémentaires non renseignées';
}

function formatAccessibleDossierCount(total) {
  if (total === 1) {
    return '1 dossier accessible';
  }

  return `${total ?? 0} dossiers accessibles`;
}

function DashboardDossiers({
  dossiers,
  isError,
  isLoading,
  metadata,
  onRetry,
  total,
  workspaceId,
}) {
  const statusLabels = createDossierStatusLabelMap(metadata);
  const help = 'Dossiers actifs ou en pause auxquels vous avez accès dans ce workspace.';

  return (
    <Card>
      <CardHeader className="border-b border-border pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-start gap-2">
              <h2 className="text-lg font-semibold">Dossiers</h2>
              <InfoTooltip content={help} label="À propos des dossiers" />
            </div>
            {!isLoading && !isError && (
              <p className="mt-1 text-sm text-muted-foreground">
                {formatAccessibleDossierCount(total)}
              </p>
            )}
          </div>

          {!isLoading && !isError && (
            <Link
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              to={`/workspaces/${workspaceId}/dossiers`}
            >
              Voir tous
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <DashboardDossiersSkeleton />
        ) : isError ? (
          <ErrorState
            className="p-5"
            description="Les dossiers accessibles n’ont pas pu être chargés."
            onRetry={onRetry}
            title="Dossiers indisponibles"
          />
        ) : dossiers.length === 0 ? (
          <EmptyState
            className="p-5"
            description="Les dossiers auxquels vous avez accès apparaîtront ici."
            title="Aucun dossier accessible"
          />
        ) : (
          <ul className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {dossiers.map((dossier) => {
              const isOperational = dossier.status === 'ACTIVE';
              const margin = dossier.technicalSheetSettings?.defaultTargetMarginBasisPoints;
              const createdAt = dossier.createdAt
                ? new Date(dossier.createdAt).toLocaleDateString('fr-FR')
                : 'Non renseignée';
              const address = [
                dossier.location?.address,
                [dossier.location?.postalCode, dossier.location?.city]
                  .filter(Boolean).join(' '),
              ].filter(Boolean).join(' · ') || 'Non renseignée';

              return (
                <li key={dossier.id}>
                  <FlippableCard
                    title={dossier.name}
                    front={(
                      <div className="flex h-full flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 break-words text-base font-semibold">{dossier.name}</h3>
                          <StatusBadge tone={isOperational ? 'success' : 'warning'}>
                            {statusLabels.get(dossier.status) ?? dossier.status}
                          </StatusBadge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {getDossierSecondaryLabel(dossier)}
                        </p>
                        <div className="mt-auto pt-4">
                          {isOperational && (
                            <Link
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              to={`/workspaces/${workspaceId}/dossiers/${dossier.id}`}
                            >
                              Ouvrir
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                    back={(
                      <div className="space-y-2 text-sm">
                        <h3 className="break-words font-semibold">{dossier.name}</h3>
                        <p><span className="text-muted-foreground">Enseigne :</span> {dossier.brand || 'Non renseignée'}</p>
                        <p className="break-words"><span className="text-muted-foreground">Adresse :</span> {address}</p>
                        <p><span className="text-muted-foreground">Interlocuteur :</span> {dossier.contactName || 'Non renseigné'}</p>
                        <p><span className="text-muted-foreground">Création :</span> {createdAt}</p>
                        <p><span className="text-muted-foreground">Statut :</span> {statusLabels.get(dossier.status) ?? dossier.status}</p>
                        <p><span className="text-muted-foreground">Fiches techniques :</span> {dossier.technicalSheetCount ?? '—'}</p>
                        <p><span className="text-muted-foreground">Marge cible :</span> {Number.isInteger(margin) ? `${(margin / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %` : 'Non définie'}</p>
                      </div>
                    )}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardDossiersSkeleton() {
  return (
    <div aria-live="polite" role="status">
      <span className="sr-only">Chargement des dossiers…</span>
      <div aria-hidden="true" className="divide-y divide-border">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="flex items-center justify-between gap-4 p-5"
            key={index}
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  DashboardDossiers,
  DashboardDossiersSkeleton,
  createDossierStatusLabelMap,
  formatAccessibleDossierCount,
  getDossierSecondaryLabel,
};
