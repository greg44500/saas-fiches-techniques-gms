import {
  Plus,
  Search,
  WandSparkles,
} from 'lucide-react';
import { useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router';

import { DataTable } from '@/components/data-display/data-table';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { DataPagination } from '@/components/data-display/data-pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  useDeleteTechnicalSheetMutation,
  useGetDossierTechnicalSheetSettingsQuery,
  useGetTechnicalSheetCapacityQuery,
  useGetTechnicalSheetMetadataQuery,
  useListTechnicalSheetRangeOptionsQuery,
  useListTechnicalSheetsQuery,
  useStartTechnicalSheetDraftMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetCreateDialog,
} from '@/features/technical-sheets/components/technical-sheet-create-dialog';
import {
  TechnicalSheetRowActions,
} from '@/features/technical-sheets/components/technical-sheet-row-actions';
import { TechnicalSheetRangeAssignmentDialog } from '@/features/technical-sheets/components/technical-sheet-range-assignment-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  TechnicalSheetPreviewDialog,
} from '@/features/technical-sheets/components/technical-sheet-preview-dialog';
import {
  TechnicalSheetOptimizerPickerDialog,
} from '@/features/technical-sheets/components/technical-sheet-optimizer-picker-dialog';
import {
  TechnicalSheetStatusBadge,
} from '@/features/technical-sheets/components/technical-sheet-status-badge';
import { TECHNICAL_SHEET_FEATURE } from '@/features/technical-sheets/constants/technical-sheet-features';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  getTechnicalSheetApiErrorMessage,
  getTechnicalSheetEditorialPresentation,
  getTechnicalSheetStatusPresentation,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useGetDossierByIdQuery,
} from '@/features/dossiers/api/dossiers-api';
import { useDataPagination } from '@/hooks/use-data-pagination';
import { useTableViewport } from '@/hooks/use-table-viewport';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetsPage() {
  const { dossierId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    can,
    hasFeature,
    workspace,
  } = useWorkspaceContext();
  const [search, setSearch] = useState('');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [sheetToClassify, setSheetToClassify] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [optimizerPickerOpen, setOptimizerPickerOpen] = useState(false);
  const [optimizerOpeningSheetId, setOptimizerOpeningSheetId] = useState(null);
  const [previewSheet, setPreviewSheet] =
    useState(null);
  const [sheetToDelete, setSheetToDelete] = useState(null);
  const [deleteSheet, deleteState] = useDeleteTechnicalSheetMutation();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination();

  const dossierQuery = useGetDossierByIdQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const listQuery = useListTechnicalSheetsQuery({
    workspaceId: workspace.id,
    dossierId,
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    rangeId: rangeFilter === 'all' ? undefined : rangeFilter,
  });
  const rangesQuery = useListTechnicalSheetRangeOptionsQuery({
    workspaceId: workspace.id,
    includeArchived: true,
  });
  const viewport = useTableViewport({
    dependency: listQuery.data?.sheets?.length,
  });
  const settingsQuery =
    useGetDossierTechnicalSheetSettingsQuery({
      workspaceId: workspace.id,
      dossierId,
    });
  const metadataQuery =
    useGetTechnicalSheetMetadataQuery({
      workspaceId: workspace.id,
      dossierId,
    });
  const capacityQuery =
    useGetTechnicalSheetCapacityQuery(
      workspace.id,
    );
  const canDelete = can(TECHNICAL_SHEET_PERMISSION.DELETE);
  const canUseOptimizer =
    hasFeature(TECHNICAL_SHEET_FEATURE.OPTIMIZER)
    && can(TECHNICAL_SHEET_PERMISSION.UPDATE);
  const [startDraft] =
    useStartTechnicalSheetDraftMutation();
  const [
    draftStartingSheetId,
    setDraftStartingSheetId,
  ] = useState(null);
  const optimizerListQuery =
    useListTechnicalSheetsQuery(
      {
        workspaceId: workspace.id,
        dossierId,
        page: 1,
        limit: 100,
        status: 'ACTIVE',
      },
      {
        skip:
          !optimizerPickerOpen
          || !canUseOptimizer,
      },
    );

  if (
    (dossierQuery.isLoading && !dossierQuery.data)
    || (listQuery.isLoading && !listQuery.data)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement des Fiches techniques…
      </p>
    );
  }

  if (
    dossierQuery.isError
    || !dossierQuery.data
  ) {
    return (
      <ErrorState
        description="Le Dossier demandé n’est pas accessible ou n’a pas pu être chargé."
        onRetry={dossierQuery.refetch}
        title="Dossier indisponible"
      />
    );
  }

  if (listQuery.isError) {
    return (
      <ErrorState
        description="Les Fiches techniques n’ont pas pu être chargées."
        onRetry={listQuery.refetch}
        title="Liste indisponible"
      />
    );
  }

  const dossier = dossierQuery.data;
  const sheets =
    listQuery.data?.sheets
    ?? [];
  const pagination =
    listQuery.data?.pagination;
  const capacity =
    capacityQuery.data;
  const quotaReached = Boolean(
    capacity
    && !capacity.unlimited
    && capacity.current
      >= capacity.limit,
  );
  const defaultTargetMarginBasisPoints =
    settingsQuery.data
      ?.defaultTargetMarginBasisPoints
    ?? dossier.technicalSheetSettings
      ?.defaultTargetMarginBasisPoints
    ?? null;
  const operational =
    dossier.status === 'ACTIVE';
  const canCreate =
    can(TECHNICAL_SHEET_PERMISSION.CREATE)
    && operational
    && !quotaReached;
  const canModify =
    can(
      TECHNICAL_SHEET_PERMISSION.UPDATE,
    );
  const canOptimize =
    canUseOptimizer
    && operational;

  function openTechnicalSheet(sheet) {
    navigate(
      '/workspaces/' + workspace.id
      + '/dossiers/' + dossierId
      + '/technical-sheets/' + sheet.id,
    );
  }

  async function openOptimizer(
    sheet,
  ) {
    if (!sheet) return;

    setOptimizerOpeningSheetId(
      sheet.id,
    );

    try {
      if (!sheet.hasDraft) {
        if (
          !sheet.currentValidatedStateId
        ) {
          throw new Error(
            'Aucun brouillon exploitable.',
          );
        }

        await startDraft({
          workspaceId:
            workspace.id,
          dossierId,
          technicalSheetId:
            sheet.id,
          expectedSheetRevision:
            sheet.revision,
        }).unwrap();
      }

      setOptimizerPickerOpen(false);
      navigate(
        '/workspaces/' + workspace.id
        + '/dossiers/' + dossierId
        + '/technical-sheets/' + sheet.id
        + '/optimization',
      );
    } catch (error) {
      toast({
        title: 'Action impossible',
        description:
          getTechnicalSheetApiErrorMessage(
            error,
            'L’Atelier d’optimisation n’a pas pu être ouvert.',
          ),
        variant: 'destructive',
      });
    } finally {
      setOptimizerOpeningSheetId(
        null,
      );
    }
  }

  async function modifyTechnicalSheet(
    sheet,
  ) {
    if (
      sheet.hasDraft
      || !sheet.currentValidatedStateId
    ) {
      openTechnicalSheet(sheet);
      return;
    }

    setDraftStartingSheetId(sheet.id);

    try {
      await startDraft({
        workspaceId:
          workspace.id,
        dossierId,
        technicalSheetId:
          sheet.id,
        expectedSheetRevision:
          sheet.revision,
      }).unwrap();

      openTechnicalSheet(sheet);
    } catch (error) {
      toast({
        title: 'Action impossible',
        description:
          getTechnicalSheetApiErrorMessage(
            error,
            'Le brouillon n’a pas pu être créé.',
          ),
        variant: 'destructive',
      });
    } finally {
      setDraftStartingSheetId(null);
    }
  }

  async function confirmDelete() {
    if (!sheetToDelete) return;

    try {
      await deleteSheet({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId: sheetToDelete.id,
        expectedRevision: sheetToDelete.revision,
      }).unwrap();
      setSheetToDelete(null);
      toast({ title: 'Fiche technique placée dans la Corbeille', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Suppression impossible',
        description: getTechnicalSheetApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const columns = [
    {
      id: 'name',
      header: 'Fiche technique',
      cell: (sheet) => (
        <p className="font-medium">
          {sheet.name}
        </p>
      ),
    },
    {
      id: 'range',
      header: 'Gamme',
      cell: (sheet) => (
        <span>
          {sheet.range?.name ?? 'Sans gamme'}
          {sheet.range?.status === 'ARCHIVED' ? ' (archivée)' : ''}
        </span>
      ),
    },
    {
      id: 'editorialState',
      header: 'État',
      cell: (sheet) => {
        const presentation =
          getTechnicalSheetEditorialPresentation({
            currentValidatedStateId:
              sheet.currentValidatedStateId,
            hasDraft:
              sheet.hasDraft,
          });

        return (
          <TechnicalSheetStatusBadge
            tone={presentation.tone}
          >
            {presentation.label}
          </TechnicalSheetStatusBadge>
        );
      },
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (sheet) => {
        const presentation =
          getTechnicalSheetStatusPresentation(
            sheet.status,
            metadataQuery.data
              ?.statusDefinitions,
          );

        return (
          <TechnicalSheetStatusBadge
            tone={presentation.tone}
          >
            {presentation.label}
          </TechnicalSheetStatusBadge>
        );
      },
    },
    {
      id: 'updated',
      header: 'Dernière modification',
      cell: (sheet) =>
        new Date(
          sheet.updatedAt,
        ).toLocaleString('fr-FR'),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (sheet) => {
        const hasValidatedState =
          Boolean(
            sheet.currentValidatedStateId,
          );

        return (
          <TechnicalSheetRowActions
            sheet={sheet}
            canModify={canModify}
            canAssign={canModify && operational && sheet.status === 'ACTIVE'}
            onAssign={() => setSheetToClassify(sheet)}
            canOptimize={canOptimize && sheet.status === 'ACTIVE'}
            canDelete={canDelete && sheet.status === 'ACTIVE'}
            hasValidatedState={hasValidatedState}
            isDeleting={deleteState.isLoading}
            isOptimizing={optimizerOpeningSheetId === sheet.id}
            isStartingDraft={draftStartingSheetId === sheet.id}
            onPreview={() => setPreviewSheet(sheet)}
            onOptimize={() => openOptimizer(sheet)}
            onModify={() => modifyTechnicalSheet(sheet)}
            onDelete={() => setSheetToDelete(sheet)}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Fiches techniques
          </h2>
          <InfoTooltip
            content="Composition, approvisionnement, valorisation et historique validé de ce Dossier."
            label="À propos des Fiches techniques"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {canOptimize && (
            <Button
              disabled={
                optimizerOpeningSheetId
                !== null
              }
              onClick={() =>
                setOptimizerPickerOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <WandSparkles
                aria-hidden="true"
                className="size-4"
              />
              Atelier d’optimisation
            </Button>
          )}

          {can(
            TECHNICAL_SHEET_PERMISSION.CREATE,
          ) && (
            <Button
              disabled={!canCreate}
              onClick={() =>
                setCreateOpen(true)}
              size="sm"
              type="button"
            >
              <Plus
                aria-hidden="true"
                className="size-4"
              />
              Créer
            </Button>
          )}
        </div>
      </header>

      {quotaReached && (
        <div
          className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"
          role="alert"
        >
          La limite de Fiches techniques du Workspace est atteinte. Les Fiches existantes restent modifiables, mais aucune nouvelle Fiche ni copie ne peut être créée.
        </div>
      )}

      {!operational && (
        <Card>
          <CardHeader>
            <CardTitle>
              Dossier non opérationnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Les consultations restent disponibles selon vos droits, mais la création et le travail courant exigent un Dossier actif.
            </p>
          </CardContent>
        </Card>
      )}

      <section className="min-h-0 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xl sm:flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
              />
              <Input
                aria-label="Rechercher une Fiche technique"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  viewport.resetScroll();
                }}
                placeholder="Rechercher par nom ou description…"
                value={search}
              />
            </div>
            <Select
              disabled={rangesQuery.isLoading || rangesQuery.isError}
              items={[
                { value: 'all', label: 'Toutes les gammes' },
                { value: 'unassigned', label: 'Sans gamme' },
                ...(rangesQuery.data ?? []).map((range) => ({
                  value: range.id,
                  label: range.name + (range.status === 'ARCHIVED' ? ' (archivée)' : ''),
                })),
              ]}
              onValueChange={(next) => {
                setRangeFilter(next);
                setPage(1);
                viewport.resetScroll();
              }}
              value={rangeFilter}
            >
              <SelectTrigger
                aria-label="Filtrer les Fiches par gamme"
                className="w-full sm:w-64"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les gammes</SelectItem>
                <SelectItem value="unassigned">Sans gamme</SelectItem>
                {(rangesQuery.data ?? []).map((range) => (
                  <SelectItem key={range.id} value={range.id}>
                    {range.name}{range.status === 'ARCHIVED' ? ' (archivée)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {rangesQuery.isError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              Impossible de charger le filtre des Gammes.
            </p>
          )}
        </div>

        <div
          aria-label="Lignes des Fiches techniques"
          className="min-h-0 overflow-auto overscroll-contain [&>div]:overflow-visible"
          ref={viewport.ref}
          role="region"
          style={{ height: viewport.height }}
          tabIndex={0}
        >
          <DataTable
            aria-label="Fiches techniques"
            columns={columns}
            data={sheets}
            emptyContent={(
              <EmptyState
                className="p-0"
                description={
                  search.trim() || rangeFilter !== 'all'
                    ? 'Aucune Fiche ne correspond aux filtres sélectionnés.'
                    : 'Créez la première Fiche technique de ce Dossier.'
                }
                title="Aucune Fiche technique"
              />
            )}
            getRowKey={(sheet) => sheet.id}
            headerClassName="sticky top-0 z-10 bg-muted text-muted-foreground"
            rowClassName="transition-colors hover:bg-muted/50"
          />
        </div>

        <div className="px-5 pb-5">
          <DataPagination
            disabled={
              listQuery.isFetching
            }
            onPageChange={(nextPage) => {
              setPage(nextPage);
              viewport.resetScroll();
            }}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              viewport.resetScroll();
            }}
            page={page}
            pageSize={pageSize}
            pagination={pagination}
          />
        </div>
      </section>

      {sheetToDelete && (
        <ConfirmationDialog
          confirmLabel="Mettre dans la Corbeille"
          description="Cette Fiche technique sera placée dans la Corbeille. Elle pourra être restaurée selon les règles de conservation applicables."
          onCancel={() => setSheetToDelete(null)}
          onConfirm={confirmDelete}
          pending={deleteState.isLoading}
          title={`Supprimer « ${sheetToDelete.name} » ?`}
        />
      )}

      {sheetToClassify && (
        <TechnicalSheetRangeAssignmentDialog
          canManage={can(TECHNICAL_SHEET_PERMISSION.RANGE_MANAGE)}
          dossierId={dossierId}
          onClose={() => setSheetToClassify(null)}
          onUpdated={() => {
            setSheetToClassify(null);
            toast({ title: 'Gamme de la Fiche mise à jour', variant: 'success' });
          }}
          sheet={sheetToClassify}
          workspaceId={workspace.id}
        />
      )}

      <TechnicalSheetCreateDialog
        canManageRanges={can(TECHNICAL_SHEET_PERMISSION.RANGE_MANAGE)}
        defaultTargetMarginBasisPoints={
          defaultTargetMarginBasisPoints
        }
        dossierId={dossierId}
        onClose={() =>
          setCreateOpen(false)}
        onCreated={(result) => {
          setCreateOpen(false);
          navigate(
            '/workspaces/' + workspace.id
            + '/dossiers/' + dossierId
            + '/technical-sheets/'
            + result.sheet.id,
          );
        }}
        open={createOpen}
        workspaceId={workspace.id}
      />

      <TechnicalSheetPreviewDialog
        dossierId={dossierId}
        onClose={() =>
          setPreviewSheet(null)}
        open={Boolean(previewSheet)}
        sheet={previewSheet}
        workspaceId={workspace.id}
      />

      <TechnicalSheetOptimizerPickerDialog
        onClose={() =>
          setOptimizerPickerOpen(false)}
        onSelect={openOptimizer}
        open={optimizerPickerOpen}
        pendingSheetId={
          optimizerOpeningSheetId
        }
        sheets={
          optimizerListQuery.data
            ?.sheets
          ?? []
        }
      />
    </div>
  );
}

export { TechnicalSheetsPage };
