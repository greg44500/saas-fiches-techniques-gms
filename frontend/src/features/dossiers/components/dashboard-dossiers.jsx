import { Link } from 'react-router';
import { Plus, Search, X } from 'lucide-react';

import { PagedCardCarousel } from '@/components/shared/paged-card-carousel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  canCreate = false,
  dossiers,
  isError,
  isLoading,
  isFetching = false,
  metadata,
  onCreate,
  onPageChange,
  onSearch,
  onSearchChange,
  page = 1,
  pageSize = 3,
  search = '',
  searchInput = '',
  totalPages = 1,
  onRetry,
  total,
  workspaceId,
}) {
  const statusLabels = createDossierStatusLabelMap(metadata);
  const help = 'Dossiers actifs ou en pause auxquels vous avez accès dans ce workspace.';

  return (
    <Card>
      <CardHeader className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Dossiers ({total})</h2>
            <InfoTooltip content={help} label="À propos des dossiers" />
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <form className="flex min-w-48 max-w-sm flex-1" onSubmit={onSearch}>
              <div className="relative w-full">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher un dossier dans le tableau de bord"
                  className="pl-9 pr-9"
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder="Rechercher un dossier…"
                  value={searchInput}
                />
                {searchInput && (
                  <button aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground" onClick={() => onSearchChange?.('')} type="button">
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </div>
            </form>
            {canCreate && (
              <Button onClick={onCreate} size="sm" type="button" variant="outline">
                <Plus aria-hidden="true" className="size-4" />
                Créer un dossier
              </Button>
            )}
            <Button asChild size="sm" variant="ghost">
              <Link to={`/workspaces/${workspaceId}/dossiers`}>Voir tous</Link>
            </Button>
          </div>
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
            description={search ? 'Aucun dossier ne correspond à cette recherche.' : 'Les dossiers auxquels vous avez accès apparaîtront ici.'}
            title="Aucun dossier accessible"
          />
        ) : (
          <div className="p-5">
            <PagedCardCarousel
              disabled={isFetching}
              label="Dossiers accessibles"
              onPageChange={onPageChange}
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
            >
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
                <div key={dossier.id}>
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
                        <h3 className="break-words font-semibold">Informations du dossier</h3>
                        <p><span className="text-muted-foreground">Enseigne :</span> {dossier.brand || 'Non renseignée'}</p>
                        <p className="break-words"><span className="text-muted-foreground">Adresse :</span> {address}</p>
                        <p><span className="text-muted-foreground">Interlocuteur :</span> {dossier.contactName || 'Non renseigné'}</p>
                        <p><span className="text-muted-foreground">Création :</span> {createdAt}</p>
                        <p><span className="text-muted-foreground">Statut :</span> {statusLabels.get(dossier.status) ?? dossier.status}</p>
                        <p><span className="text-muted-foreground">Fiches techniques :</span> {dossier.technicalSheetCount ?? '—'}</p>
                        <p><span className="text-muted-foreground">Marge cible :</span> {Number.isInteger(margin) ? `${(margin / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %` : 'Non définie'}</p>
                        {isOperational && (
                          <div className="flex justify-end pt-2">
                            <Link
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              to={`/workspaces/${workspaceId}/dossiers/${dossier.id}`}
                            >
                              Ouvrir
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  />
                </div>
              );
            })}
            </PagedCardCarousel>
          </div>
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
