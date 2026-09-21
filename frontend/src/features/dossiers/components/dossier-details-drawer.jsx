import { useRef } from 'react';
import { Pencil } from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useGetDossierByIdQuery } from '@/features/dossiers/api/dossiers-api';
import { DossierAccessSection } from '@/features/dossiers/components/dossier-access-section';
import { DossierActivitySection } from '@/features/dossiers/components/dossier-activity-section';
import { DossierLifecycleSection } from '@/features/dossiers/components/dossier-lifecycle-section';
import { DOSSIER_PERMISSION } from '@/features/dossiers/constants/dossier-permissions';
import {
  formatDossierLocation,
  getDossierStatusLabel,
  getDossierStatusTone,
} from '@/features/dossiers/lib/dossier-presentation';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">{value || 'Non renseigné'}</dd>
    </div>
  );
}

function DossierDetailsDrawer({
  dossierId,
  metadata,
  onClose,
  onEdit,
  open,
  workspaceId,
}) {
  const { can } = useWorkspaceContext();
  const retainedDossierRef = useRef(null);
  const query = useGetDossierByIdQuery(
    { workspaceId, dossierId },
    { skip: !dossierId },
  );

  if (query.data) {
    retainedDossierRef.current = query.data;
  }

  const dossier = query.data ?? retainedDossierRef.current;

  if (!dossier && !open) return null;

  return (
    <EntityDetailsDrawer
      description="Informations, affectations, activité et cycle de vie du dossier."
      onClose={onClose}
      open={open}
      title={dossier?.name ?? 'Dossier'}
    >
      {query.isLoading && !dossier ? (
        <p className="text-sm text-muted-foreground">Chargement du dossier…</p>
      ) : query.isError && !dossier ? (
        <ErrorState
          className="p-0"
          description="Le dossier n’a pas pu être chargé."
          onRetry={query.refetch}
          title="Dossier indisponible"
        />
      ) : dossier ? (
        <div className="space-y-7">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Informations</h3>
              {can(DOSSIER_PERMISSION.UPDATE) && ['ACTIVE', 'PAUSED'].includes(dossier.status) && (
                <ActionIconButton
                  Icon={Pencil}
                  label="Modifier le dossier"
                  onClick={() => onEdit(dossier)}
                  variant="outline"
                />
              )}
            </div>

            <div className="mt-3 rounded-lg border border-border px-4">
              <dl>
                <DetailRow label="Nom" value={dossier.name} />
                <DetailRow label="Enseigne" value={dossier.brand} />
                <DetailRow label="Localisation" value={formatDossierLocation(dossier)} />
                <DetailRow label="Email documents" value={dossier.documentEmail} />
                <DetailRow label="Téléphone" value={dossier.phone} />
                <DetailRow label="Responsable" value={dossier.contactName} />
                <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                  <dt className="text-sm text-muted-foreground">Statut</dt>
                  <dd className="sm:text-right">
                    <StatusBadge tone={getDossierStatusTone(dossier.status)}>
                      {getDossierStatusLabel(dossier.status, metadata)}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Cycle de vie</h3>
            <DossierLifecycleSection
              dossier={dossier}
              metadata={metadata}
              workspaceId={workspaceId}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Accès</h3>
            <DossierAccessSection
              dossier={dossier}
              workspaceId={workspaceId}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Activité</h3>
            <DossierActivitySection
              dossierId={dossier.id}
              metadata={metadata}
              workspaceId={workspaceId}
            />
          </section>
        </div>
      ) : null}
    </EntityDetailsDrawer>
  );
}

export { DetailRow, DossierDetailsDrawer };
