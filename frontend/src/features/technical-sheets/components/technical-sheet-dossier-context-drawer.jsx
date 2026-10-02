import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useGetDossierByIdQuery,
  useGetDossierMetadataQuery,
} from '@/features/dossiers/api/dossiers-api';
import {
  formatDossierLocation,
  getDossierStatusLabel,
  getDossierStatusTone,
} from '@/features/dossiers/lib/dossier-presentation';
import {
  DossierApplicablePriceCard,
} from '@/features/suppliers/components/dossier-applicable-price-card';
import {
  useGetDossierTechnicalSheetSettingsQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  formatBasisPoints,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function ContextRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">
        {value || 'Non renseigné'}
      </dd>
    </div>
  );
}

function TechnicalSheetDossierContextDrawer({
  dossierId,
  onClose,
  open,
  workspaceId,
}) {
  const dossierQuery = useGetDossierByIdQuery(
    { workspaceId, dossierId },
    { skip: !open },
  );
  const metadataQuery = useGetDossierMetadataQuery(
    workspaceId,
    { skip: !open },
  );
  const settingsQuery = useGetDossierTechnicalSheetSettingsQuery(
    { workspaceId, dossierId },
    { skip: !open },
  );

  const dossier = dossierQuery.data;
  const marginBasisPoints =
    settingsQuery.data?.defaultTargetMarginBasisPoints;

  return (
    <EntityDetailsDrawer
      description="Contexte magasin de la Fiche : identité du Dossier et vérification du prix applicable."
      onClose={onClose}
      open={open}
      title="Infos dossier"
    >
      {dossierQuery.isLoading && !dossier ? (
        <p className="text-sm text-muted-foreground">
          Chargement du Dossier…
        </p>
      ) : dossierQuery.isError || !dossier ? (
        <ErrorState
          className="p-0"
          description="Le contexte du Dossier n’a pas pu être chargé."
          onRetry={dossierQuery.refetch}
          title="Dossier indisponible"
        />
      ) : (
        <Tabs defaultValue="identity">
          <TabsList aria-label="Informations du Dossier" variant="section">
            <TabsTrigger value="identity" variant="section">Identité</TabsTrigger>
            <TabsTrigger value="price" variant="section">Prix applicable</TabsTrigger>
          </TabsList>

          <TabsContent value="identity" variant="section">
            <dl className="rounded-lg border border-border px-4">
              <ContextRow label="Nom" value={dossier.name} />
              <ContextRow label="Enseigne" value={dossier.brand} />
              <ContextRow
                label="Localisation"
                value={formatDossierLocation(dossier)}
              />
              <ContextRow label="Responsable" value={dossier.contactName} />
              <ContextRow label="Email documents" value={dossier.documentEmail} />
              <ContextRow label="Téléphone" value={dossier.phone} />
              <ContextRow
                label="Marge cible par défaut"
                value={
                  Number.isInteger(marginBasisPoints)
                    ? formatBasisPoints(marginBasisPoints)
                    : 'Non renseignée'
                }
              />
              <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                <dt className="text-sm text-muted-foreground">Statut</dt>
                <dd className="sm:text-right">
                  <StatusBadge tone={getDossierStatusTone(dossier.status)}>
                    {getDossierStatusLabel(
                      dossier.status,
                      metadataQuery.data,
                    )}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
          </TabsContent>

          <TabsContent value="price" variant="section">
            <DossierApplicablePriceCard
              dossierId={dossierId}
              workspaceId={workspaceId}
            />
          </TabsContent>
        </Tabs>
      )}
    </EntityDetailsDrawer>
  );
}

export { TechnicalSheetDossierContextDrawer };
