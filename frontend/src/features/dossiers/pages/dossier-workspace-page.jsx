import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useParams,
} from 'react-router';

import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  DOSSIER_SUPPLIER_PAGE_PERMISSIONS,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  DossierTechnicalSheetMarginDialog,
} from '@/features/technical-sheets/components/dossier-technical-sheet-margin-dialog';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  formatBasisPoints,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useGetDossierTechnicalSheetSettingsQuery,
} from '@/features/technical-sheets/api/technical-sheets-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { cn } from '@/lib/utils';

const DOSSIER_TAB_CLASS_NAME = [
  'inline-flex min-h-10 items-center justify-center rounded-t-lg border border-b-0 px-4 text-sm font-medium',
  'outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
].join(' ');

function DossierWorkspacePage() {
  const { dossierId } = useParams();
  const { can, canAny, workspace } = useWorkspaceContext();
  const [marginDialogOpen, setMarginDialogOpen] = useState(false);
  const dossierQuery = useGetDossierByIdQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const metadataQuery = useGetDossierMetadataQuery(workspace.id);
  const marginQuery = useGetDossierTechnicalSheetSettingsQuery(
    {
      workspaceId: workspace.id,
      dossierId,
    },
    {
      skip: !can(TECHNICAL_SHEET_PERMISSION.READ),
    },
  );

  if (
    (dossierQuery.isLoading && dossierQuery.data === undefined)
    || (metadataQuery.isLoading && metadataQuery.data === undefined)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement du dossier…
      </p>
    );
  }

  if (dossierQuery.isError || metadataQuery.isError || !dossierQuery.data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline">
          <Link to={`/workspaces/${workspace.id}/dossiers`}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Dossiers
          </Link>
        </Button>
        <ErrorState
          description="Le dossier demandé n’est pas accessible ou n’a pas pu être chargé."
          onRetry={() => {
            dossierQuery.refetch();
            metadataQuery.refetch();
          }}
          title="Dossier indisponible"
        />
      </div>
    );
  }

  const dossier = dossierQuery.data;
  const operational = dossier.status === 'ACTIVE';
  const canReadSuppliers = canAny(DOSSIER_SUPPLIER_PAGE_PERMISSIONS);
  const canReadTechnicalSheets = can(TECHNICAL_SHEET_PERMISSION.READ);
  const canManageMargin = can(TECHNICAL_SHEET_PERMISSION.SETTINGS_MANAGE);
  const marginBasisPoints = marginQuery.data?.defaultTargetMarginBasisPoints;
  const marginLabel = Number.isInteger(marginBasisPoints)
    ? 'Marge cible ' + formatBasisPoints(marginBasisPoints)
    : 'Marge cible';
  const hasLocation = Boolean(
    dossier.location?.address
    || dossier.location?.postalCode
    || dossier.location?.city,
  );
  const location = hasLocation ? formatDossierLocation(dossier) : null;

  return (
    <div className="space-y-5">
      <Button asChild size="sm" variant="ghost">
        <Link to={`/workspaces/${workspace.id}/dossiers`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Dossiers
        </Link>
      </Button>

      <header className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {dossier.name}
          </h1>
          <StatusBadge tone={getDossierStatusTone(dossier.status)}>
            {getDossierStatusLabel(dossier.status, metadataQuery.data)}
          </StatusBadge>

          {canManageMargin && (
            <Tooltip>
              <TooltipTrigger
                render={(
                  <Button
                    aria-label="Modifier la marge cible par défaut des nouvelles Fiches"
                    onClick={() => setMarginDialogOpen(true)}
                    size="sm"
                    type="button"
                    variant="outline"
                  />
                )}
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                {marginLabel}
              </TooltipTrigger>
              <TooltipContent>
                Modifier la marge cible par défaut des nouvelles Fiches.
              </TooltipContent>
            </Tooltip>
          )}

          {!canManageMargin
          && canReadTechnicalSheets
          && Number.isInteger(marginBasisPoints) && (
            <span className="text-sm font-medium text-muted-foreground">
              {marginLabel}
            </span>
          )}
        </div>

        {(location
          || dossier.contactName
          || dossier.documentEmail
          || dossier.phone) && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {location && (
              <div className="flex min-w-0 items-start gap-2">
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{location}</span>
              </div>
            )}
            {dossier.contactName && (
              <div className="flex min-w-0 items-start gap-2">
                <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{dossier.contactName}</span>
              </div>
            )}
            {dossier.documentEmail && (
              <div className="flex min-w-0 items-start gap-2">
                <Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="break-all">{dossier.documentEmail}</span>
              </div>
            )}
            {dossier.phone && (
              <div className="flex min-w-0 items-start gap-2">
                <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{dossier.phone}</span>
              </div>
            )}
          </div>
        )}
      </header>

      {!operational && (
        <Card>
          <CardHeader>
            <CardTitle>Dossier non opérationnel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              La consultation reste disponible selon vos droits, mais les actions métier courantes exigent un Dossier actif.
            </p>
          </CardContent>
        </Card>
      )}

      {(canReadSuppliers || canReadTechnicalSheets) && (
        <nav
          aria-label="Navigation du Dossier"
          className="flex flex-wrap gap-2 border-b border-border"
        >
          {canReadSuppliers && (
            <NavLink
              className={({ isActive }) => cn(
                DOSSIER_TAB_CLASS_NAME,
                isActive
                  ? 'border-border bg-card text-primary'
                  : 'border-transparent bg-muted/25 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              to={`/workspaces/${workspace.id}/dossiers/${dossier.id}/suppliers`}
            >
              Fournisseurs et prix
            </NavLink>
          )}
          {canReadTechnicalSheets && (
            <NavLink
              className={({ isActive }) => cn(
                DOSSIER_TAB_CLASS_NAME,
                isActive
                  ? 'border-border bg-card text-primary'
                  : 'border-transparent bg-muted/25 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
              to={`/workspaces/${workspace.id}/dossiers/${dossier.id}/technical-sheets`}
            >
              Fiches techniques
            </NavLink>
          )}
        </nav>
      )}

      <Outlet />

      {marginDialogOpen && (
        <DossierTechnicalSheetMarginDialog
          dossierId={dossier.id}
          onClose={() => setMarginDialogOpen(false)}
          open={marginDialogOpen}
          workspaceId={workspace.id}
        />
      )}
    </div>
  );
}

export { DossierWorkspacePage };
