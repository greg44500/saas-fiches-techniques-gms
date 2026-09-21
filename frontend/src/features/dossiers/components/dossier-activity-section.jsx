import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetDossierActivityQuery } from '@/features/dossiers/api/dossiers-api';
import {
  createDossierMetadataLabelMaps,
  formatBusinessActivityDate,
  getBusinessActivityActorLabel,
} from '@/features/dossiers/lib/dossier-presentation';

const DOSSIER_ACTIVITY_LIMIT = 10;

function DossierActivitySection({ dossierId, metadata, workspaceId }) {
  const query = useGetDossierActivityQuery({
    workspaceId,
    dossierId,
    page: 1,
    limit: DOSSIER_ACTIVITY_LIMIT,
  });
  const labels = createDossierMetadataLabelMaps(metadata).activities;

  if (query.isLoading) {
    return (
      <div aria-live="polite" className="space-y-3" role="status">
        <span className="sr-only">Chargement de l’activité du dossier…</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        className="p-0"
        description="L’activité de ce dossier n’a pas pu être chargée."
        onRetry={query.refetch}
        title="Activité indisponible"
      />
    );
  }

  const activity = query.data?.activity ?? [];

  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun événement métier enregistré pour ce dossier.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {activity.map((event) => (
        <li className="space-y-1 p-3" key={event.id}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">
              {labels.get(event.action) ?? event.action}
            </p>
            <time
              className="shrink-0 text-xs text-muted-foreground"
              dateTime={event.createdAt}
            >
              {formatBusinessActivityDate(event.createdAt)}
            </time>
          </div>
          <p className="text-xs text-muted-foreground">
            {getBusinessActivityActorLabel(event.actor)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export { DOSSIER_ACTIVITY_LIMIT, DossierActivitySection };
