import {
  Archive,
  ArrowLeft,
  Calculator,
  Copy,
  CheckCircle2,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  TechnicalSheetStatusBadge,
} from '@/features/technical-sheets/components/technical-sheet-status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useGetProductMetadataQuery,
} from '@/features/products/api/product-catalog-api';
import {
  useArchiveTechnicalSheetMutation,
  useDeleteTechnicalSheetMutation,
  useGetTechnicalSheetMetadataQuery,
  useGetTechnicalSheetQuery,
  useListTechnicalSheetHistoryQuery,
  useReactivateTechnicalSheetMutation,
  useSaveTechnicalSheetDraftMutation,
  useStartTechnicalSheetDraftMutation,
  useUpdateTechnicalSheetMutation,
  useValidateTechnicalSheetMutation,
  useValuateTechnicalSheetMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  TechnicalSheetCopyDialog,
} from '@/features/technical-sheets/components/technical-sheet-copy-dialog';
import {
  TechnicalSheetEconomicsBar,
} from '@/features/technical-sheets/components/technical-sheet-economics-bar';
import {
  TechnicalSheetHistory,
} from '@/features/technical-sheets/components/technical-sheet-history';
import {
  TechnicalSheetLineEditor,
  normalizeDraftLine,
} from '@/features/technical-sheets/components/technical-sheet-line-editor';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  basisPointsToInput,
  getTechnicalSheetActionAvailability,
  getTechnicalSheetApiErrorMessage,
  getTechnicalSheetStatusPresentation,
  getTechnicalSheetValuationPresentation,
  minorToInput,
  percentInputToBasisPoints,
  priceInputToMinor,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function buildDraftForm(draft) {
  return {
    productionQuantity: draft.productionQuantity ?? '',
    productionUnit: draft.productionUnit ?? '',
    portions: draft.portions ?? '',
    vatRate: basisPointsToInput(draft.vatRateBasisPoints),
    targetMargin: basisPointsToInput(draft.targetMarginBasisPoints),
    finalPriceMode: draft.finalPriceMode ?? 'ADVISED',
    finalPriceTtc: minorToInput(draft.finalPriceTtcMinor),
    lines: (draft.lines ?? []).map(normalizeDraftLine),
  };
}

function TechnicalSheetWorkspacePage() {
  const { dossierId, technicalSheetId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can, workspace } = useWorkspaceContext();

  const sheetQuery = useGetTechnicalSheetQuery({
    workspaceId: workspace.id,
    dossierId,
    technicalSheetId,
  });
  const metadataQuery = useGetTechnicalSheetMetadataQuery({
    workspaceId: workspace.id,
    dossierId,
  });
  const productMetadataQuery = useGetProductMetadataQuery(workspace.id);
  const historyQuery = useListTechnicalSheetHistoryQuery({
    workspaceId: workspace.id,
    dossierId,
    technicalSheetId,
    page: 1,
    limit: 20,
  });

  const [updateSheet, updateSheetState] = useUpdateTechnicalSheetMutation();
  const [startDraft, startDraftState] = useStartTechnicalSheetDraftMutation();
  const [saveDraft, saveDraftState] = useSaveTechnicalSheetDraftMutation();
  const [valuate, valuateState] = useValuateTechnicalSheetMutation();
  const [validateSheet, validateState] = useValidateTechnicalSheetMutation();
  const [archiveSheet, archiveState] = useArchiveTechnicalSheetMutation();
  const [reactivateSheet, reactivateState] = useReactivateTechnicalSheetMutation();
  const [deleteSheet, deleteState] = useDeleteTechnicalSheetMutation();

  const sheet = sheetQuery.data?.sheet;
  const draft = sheetQuery.data?.draft;
  const metadata = metadataQuery.data;

  const [identity, setIdentity] = useState({
    name: '',
    description: '',
  });
  const [draftForm, setDraftForm] = useState({
    productionQuantity: '',
    productionUnit: '',
    portions: '',
    vatRate: '',
    targetMargin: '',
    finalPriceMode: 'ADVISED',
    finalPriceTtc: '',
    lines: [],
  });
  const [draftFormRevision, setDraftFormRevision] = useState(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sourcingPendingCount, setSourcingPendingCount] = useState(0);

  useEffect(() => {
    if (!sheet) return;
    setIdentity({
      name: sheet.name ?? '',
      description: sheet.description ?? '',
    });
  }, [sheet]);

  useEffect(() => {
    setDraftDirty(false);
    setDraftFormRevision(null);
  }, [technicalSheetId]);

  useEffect(() => {
    if (!draft || draftDirty) return;

    if (
      draftFormRevision !== null
      && draft.revision < draftFormRevision
    ) {
      return;
    }

    setDraftForm(buildDraftForm(draft));
    setDraftFormRevision(draft.revision);
  }, [draft, draftDirty, draftFormRevision]);

  const unitItems = useMemo(
    () => (metadata?.units ?? []).map((unit) => ({
      value: unit.value,
      label: unit.label,
    })),
    [metadata?.units],
  );

  if (
    (sheetQuery.isLoading && !sheetQuery.data)
    || (metadataQuery.isLoading && !metadataQuery.data)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement de la Fiche technique…
      </p>
    );
  }

  if (sheetQuery.isError || !sheet) {
    return (
      <ErrorState
        description="La Fiche technique demandée n’est pas accessible ou n’a pas pu être chargée."
        onRetry={sheetQuery.refetch}
        title="Fiche technique indisponible"
      />
    );
  }

  const statusPresentation = getTechnicalSheetStatusPresentation(sheet.status);
  const valuationPresentation = draftDirty
    ? {
        label: 'Modifications non enregistrées',
        tone: 'warning',
      }
    : getTechnicalSheetValuationPresentation(
        draft?.valuationStatus,
      );
  const actionAvailability = getTechnicalSheetActionAvailability({
    status: sheet.status,
    hasDraft: Boolean(draft),
  });
  const canEditIdentity = can(TECHNICAL_SHEET_PERMISSION.UPDATE);
  const canUpdate = actionAvailability.update && canEditIdentity;
  const canSource = actionAvailability.update
    && can(TECHNICAL_SHEET_PERMISSION.SOURCING_MANAGE);
  const canValuate = actionAvailability.update
    && can(TECHNICAL_SHEET_PERMISSION.VALUATION_MANAGE);
  const canValidate = actionAvailability.update
    && can(TECHNICAL_SHEET_PERMISSION.VALIDATE);
  const canLifecycle = can(TECHNICAL_SHEET_PERMISSION.LIFECYCLE_MANAGE);
  const canDelete = can(TECHNICAL_SHEET_PERMISSION.DELETE);
  const canCopy = can(TECHNICAL_SHEET_PERMISSION.COPY);
  const copyDisabled = !actionAvailability.copy;
  const sourcingPending = sourcingPendingCount > 0;
  const draftSynchronizing = sourcingPending || sheetQuery.isFetching;
  const draftServerActionDisabled = (
    draftDirty
    || draftFormRevision === null
  );

  function handleSourcingPendingChange(pending) {
    setSourcingPendingCount((current) => (
      Math.max(0, current + (pending ? 1 : -1))
    ));
  }

  function notifyError(error, fallback) {
    toast({
      title: 'Action impossible',
      description: getTechnicalSheetApiErrorMessage(error, fallback),
      variant: 'destructive',
    });
  }

  async function saveIdentity() {
    try {
      await updateSheet({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId,
        expectedRevision: sheet.revision,
        name: identity.name.trim(),
        description: identity.description.trim() || null,
      }).unwrap();
      toast({
        title: 'Fiche technique mise à jour',
        variant: 'success',
      });
    } catch (error) {
      notifyError(error, 'Les informations générales n’ont pas pu être enregistrées.');
    }
  }

  async function createWorkingDraft() {
    try {
      await startDraft({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId,
        expectedSheetRevision: sheet.revision,
      }).unwrap();
      toast({
        title: 'Nouveau brouillon créé',
        description: 'Les données validées ont été reprises. Une revalorisation sera nécessaire.',
        variant: 'success',
      });
    } catch (error) {
      notifyError(error, 'Le brouillon n’a pas pu être créé.');
    }
  }

  async function saveWorkingDraft() {
    const vatRateBasisPoints = percentInputToBasisPoints(draftForm.vatRate);
    const targetMarginBasisPoints =
      percentInputToBasisPoints(draftForm.targetMargin);

    if (
      !draftForm.productionQuantity
      || !draftForm.productionUnit
      || vatRateBasisPoints === null
      || targetMarginBasisPoints === null
    ) {
      toast({
        title: 'Brouillon incomplet',
        description: 'Renseignez la base de production, son unité, la TVA et la marge cible.',
        variant: 'destructive',
      });
      return;
    }

    if (draftFormRevision === null) return;

    try {
      const savedDraft = await saveDraft({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId,
        expectedRevision: draftFormRevision,
        productionQuantity: draftForm.productionQuantity,
        productionUnit: draftForm.productionUnit,
        portions: draftForm.portions || null,
        vatRateBasisPoints,
        targetMarginBasisPoints,
        finalPriceMode: draftForm.finalPriceMode,
        finalPriceTtcMinor:
          draftForm.finalPriceMode === 'MANUAL'
            ? priceInputToMinor(draftForm.finalPriceTtc)
            : null,
        lines: draftForm.lines.map((line, index) => ({
          ...(line.id ? { id: line.id } : {}),
          kind: line.kind,
          productVariantId: line.productVariantId,
          netQuantity: line.netQuantity,
          inputUnit: line.inputUnit,
          order: index,
          note: line.note.trim() || null,
        })),
      }).unwrap();

      setDraftForm(buildDraftForm(savedDraft));
      setDraftFormRevision(savedDraft.revision);
      setDraftDirty(false);

      toast({
        title: 'Brouillon enregistré',
        variant: 'success',
      });
    } catch (error) {
      notifyError(error, 'Le brouillon n’a pas pu être enregistré.');
    }
  }

  async function valuateDraft() {
    try {
      const result = await valuate({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId,
        expectedRevision: draftFormRevision,
      }).unwrap();

      const ambiguityCount = Object.keys(result.resolutionCandidates ?? {}).length;
      toast({
        title: ambiguityCount > 0
          ? 'Valorisation incomplète'
          : 'Fiche technique valorisée',
        description: ambiguityCount > 0
          ? ambiguityCount + ' ligne(s) nécessitent un choix explicite d’Article fournisseur.'
          : undefined,
        variant: ambiguityCount > 0 ? 'info' : 'success',
      });
    } catch (error) {
      notifyError(error, 'La valorisation n’a pas pu être calculée.');
    }
  }

  async function validateDraft() {
    try {
      await validateSheet({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId,
        expectedSheetRevision: sheet.revision,
        expectedDraftRevision: draftFormRevision,
        comment: validationComment.trim() || null,
      }).unwrap();
      setValidationComment('');
      setDraftDirty(false);
      setDraftFormRevision(null);
      toast({
        title: 'Fiche technique validée',
        description: 'Un nouvel état historique immuable a été créé.',
        variant: 'success',
      });
    } catch (error) {
      notifyError(error, 'La validation n’a pas pu être effectuée.');
    }
  }

  async function confirmLifecycle() {
    if (!confirmation) return;

    const action = confirmation.type;

    try {
      if (action === 'archive') {
        await archiveSheet({
          workspaceId: workspace.id,
          dossierId,
          technicalSheetId,
          expectedRevision: sheet.revision,
        }).unwrap();
      } else if (action === 'reactivate') {
        await reactivateSheet({
          workspaceId: workspace.id,
          dossierId,
          technicalSheetId,
          expectedRevision: sheet.revision,
        }).unwrap();
      } else if (action === 'delete') {
        await deleteSheet({
          workspaceId: workspace.id,
          dossierId,
          technicalSheetId,
          expectedRevision: sheet.revision,
        }).unwrap();
      }

      setConfirmation(null);

      if (action === 'delete') {
        navigate(
          '/workspaces/' + workspace.id
          + '/dossiers/' + dossierId
          + '/technical-sheets',
        );
        return;
      }

      toast({
        title: action === 'archive'
          ? 'Fiche archivée'
          : 'Fiche réactivée',
        variant: 'success',
      });
    } catch (error) {
      notifyError(error, 'Le changement de statut n’a pas pu être appliqué.');
    }
  }

  const economicSnapshot = draft?.economicSnapshot;
  const pendingLifecycle = (
    archiveState.isLoading
    || reactivateState.isLoading
    || deleteState.isLoading
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ActionIconButton
            Icon={ArrowLeft}
            label="Retour aux Fiches techniques"
            onClick={() => navigate(
              '/workspaces/' + workspace.id
              + '/dossiers/' + dossierId
              + '/technical-sheets',
            )}
            tooltipLabel="Retour aux Fiches techniques"
            variant="ghost"
          />
          <h1 className="truncate text-3xl font-semibold tracking-tight">
            {sheet.name}
          </h1>
          <InfoTooltip
            content="Travail courant, valorisation et historique validé."
            label="À propos de la Fiche technique"
          />
        </div>      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Informations générales</CardTitle>

              <div className="flex flex-wrap gap-2">
                {canEditIdentity && (
                  <ActionIconButton
                    Icon={Save}
                    disabled={
                      !canUpdate
                      || updateSheetState.isLoading
                      || !identity.name.trim()
                    }
                    label="Enregistrer les informations"
                    onClick={saveIdentity}
                    tooltipLabel="Enregistrer les informations"
                    variant="outline"
                  />
                )}

                {canCopy && (
                  <ActionIconButton
                    Icon={Copy}
                    disabled={copyDisabled}
                    label="Copier vers un autre Dossier"
                    onClick={() => setCopyOpen(true)}
                    tooltipLabel={
                      copyDisabled
                        ? 'Copie indisponible tant qu’un brouillon est ouvert'
                        : 'Copier vers un autre Dossier'
                    }
                    variant="outline"
                  />
                )}

                {canLifecycle && (
                  <ActionIconButton
                    Icon={Archive}
                    disabled={!actionAvailability.archive || pendingLifecycle}
                    label="Archiver la Fiche"
                    onClick={() => setConfirmation({ type: 'archive' })}
                    tooltipLabel="Archiver"
                    variant="outline"
                  />
                )}

                {canLifecycle && (
                  <ActionIconButton
                    Icon={RotateCcw}
                    disabled={!actionAvailability.reactivate || pendingLifecycle}
                    label="Réactiver la Fiche"
                    onClick={() => setConfirmation({ type: 'reactivate' })}
                    tooltipLabel="Réactiver"
                    variant="outline"
                  />
                )}

                {canDelete && (
                  <ActionIconButton
                    Icon={Trash2}
                    disabled={!actionAvailability.delete || pendingLifecycle}
                    label="Mettre la Fiche dans la Corbeille"
                    onClick={() => setConfirmation({ type: 'delete' })}
                    tooltipLabel="Mettre dans la Corbeille"
                    variant="destructive"
                  />
                )}


                <ActionIconButton
                  Icon={CheckCircle2}
                  disabled={
                    !canValidate
                    || !draft
                    || validateState.isLoading
                    || draftSynchronizing
                    || draftServerActionDisabled
                    || draft?.valuationStatus !== 'COMPLETE'
                  }
                  label="Valider la Fiche technique"
                  onClick={validateDraft}
                  tooltipLabel={
                    !canValidate
                      ? 'Validation indisponible avec votre rôle ou le statut actuel'
                      : !draft
                        ? 'Aucun brouillon à valider'
                        : draftDirty
                          ? 'Enregistrer le brouillon avant validation'
                          : draft.valuationStatus === 'COMPLETE'
                            ? 'Valider la Fiche technique'
                            : 'Valorisation complète requise avant validation'
                  }
                  variant="outline"
                />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="flex flex-wrap gap-2">
                <TechnicalSheetStatusBadge tone={statusPresentation.tone}>
                  {statusPresentation.label}
                </TechnicalSheetStatusBadge>
                {draft && (
                  <TechnicalSheetStatusBadge tone="warning">
                    Brouillon
                  </TechnicalSheetStatusBadge>
                )}
                {draft && (
                  <TechnicalSheetStatusBadge tone={valuationPresentation.tone}>
                    {valuationPresentation.label}
                  </TechnicalSheetStatusBadge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="technical-sheet-edit-name">Nom</FieldLabel>
                  <Input
                    disabled={!canUpdate || updateSheetState.isLoading}
                    id="technical-sheet-edit-name"
                    maxLength={160}
                    onChange={(event) => setIdentity((current) => ({
                      ...current,
                      name: event.target.value,
                    }))}
                    value={identity.name}
                  />
                </Field>

                {canValidate && draft && (
                  <Field>
                    <FieldLabel htmlFor="technical-sheet-validation-comment">
                      Commentaire de validation
                    </FieldLabel>
                    <Textarea
                      className="min-h-20"
                      id="technical-sheet-validation-comment"
                      maxLength={1000}
                      onChange={(event) => setValidationComment(event.target.value)}
                      placeholder="Facultatif"
                      value={validationComment}
                    />
                  </Field>
                )}
              </div>

              <Field className="h-full">
                <FieldLabel htmlFor="technical-sheet-edit-description">
                  Description
                </FieldLabel>
                <Textarea
                  className="min-h-32 h-full"
                  disabled={!canUpdate || updateSheetState.isLoading}
                  id="technical-sheet-edit-description"
                  maxLength={2000}
                  onChange={(event) => setIdentity((current) => ({
                    ...current,
                    description: event.target.value,
                  }))}
                  value={identity.description}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {!draft ? (
          <Card>
            <CardHeader>
              <CardTitle>État de travail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Aucun brouillon n’est ouvert. L’état validé courant reste consultable dans l’historique.
              </p>
              {canUpdate && sheet.currentValidatedStateId && (
                <Button
                  disabled={startDraftState.isLoading}
                  onClick={createWorkingDraft}
                  type="button"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Reprendre en brouillon
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Base de production</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="technical-sheet-production-quantity">
                  Quantité
                </FieldLabel>
                <Input
                  disabled={!canUpdate || draftSynchronizing}
                  id="technical-sheet-production-quantity"
                  inputMode="decimal"
                  onChange={(event) => {
                    setDraftDirty(true);
                    setDraftForm((current) => ({
                      ...current,
                      productionQuantity: event.target.value,
                    }));
                  }}
                  value={draftForm.productionQuantity}
                />
              </Field>

              <Field>
                <FieldLabel>Unité</FieldLabel>
                <Select
                  disabled={!canUpdate || draftSynchronizing}
                  items={unitItems}
                  onValueChange={(value) => {
                    setDraftDirty(true);
                    setDraftForm((current) => ({
                      ...current,
                      productionUnit: value,
                    }));
                  }}
                  value={draftForm.productionUnit}
                >
                  <SelectTrigger aria-label="Unité de production">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="technical-sheet-portions">
                  Portions
                </FieldLabel>
                <Input
                  disabled={!canUpdate || draftSynchronizing}
                  id="technical-sheet-portions"
                  inputMode="decimal"
                  onChange={(event) => {
                    setDraftDirty(true);
                    setDraftForm((current) => ({
                      ...current,
                      portions: event.target.value,
                    }));
                  }}
                  value={draftForm.portions}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="technical-sheet-vat">
                  TVA (%)
                </FieldLabel>
                <Input
                  disabled={!canUpdate || !canValuate || draftSynchronizing}
                  id="technical-sheet-vat"
                  inputMode="decimal"
                  onChange={(event) => {
                    setDraftDirty(true);
                    setDraftForm((current) => ({
                      ...current,
                      vatRate: event.target.value,
                    }));
                  }}
                  value={draftForm.vatRate}
                />
              </Field>
            </CardContent>
          </Card>
        )}
      </div>

      {draft && (
        <section className="relative space-y-6">
          <TechnicalSheetEconomicsBar
            economicSnapshot={economicSnapshot}
            lines={draft.lines ?? []}
            notice={
              draftDirty
                ? 'Modifications non enregistrées : enregistrez puis revalorisez pour actualiser les montants.'
                : null
            }
            targetMarginBasisPoints={draft.targetMarginBasisPoints}
            vatRateBasisPoints={draft.vatRateBasisPoints}
          />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Composition</CardTitle>
                {canUpdate && (
                  <ActionIconButton
                    Icon={Save}
                    disabled={
                      saveDraftState.isLoading
                      || draftSynchronizing
                      || !draftDirty
                      || draftFormRevision === null
                    }
                    label="Enregistrer le brouillon"
                    onClick={saveWorkingDraft}
                    tooltipLabel={
                      draftDirty
                        ? 'Enregistrer le brouillon'
                        : 'Aucune modification à enregistrer'
                    }
                    variant="outline"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <TechnicalSheetLineEditor
                canManageSourcing={canSource}
                disabled={!canUpdate || draftSynchronizing}
                dossierId={dossierId}
                draftRevision={draftFormRevision}
                lines={draftForm.lines}
                metadata={metadata}
                onChange={(lines) => {
                  setDraftDirty(true);
                  setDraftForm((current) => ({
                    ...current,
                    lines,
                  }));
                }}
                onSourcingError={(message) => toast({
                  title: 'Sélection impossible',
                  description: message,
                  variant: 'destructive',
                })}
                onSourcingPendingChange={handleSourcingPendingChange}
                onSourcingSelected={(updatedDraft) => {
                  setDraftForm(buildDraftForm(updatedDraft));
                  setDraftFormRevision(updatedDraft.revision);
                  setDraftDirty(false);
                }}
                productMetadata={productMetadataQuery.data}
                sourcingDisabled={draftServerActionDisabled}
                sourcingDisabledReason={
                  draftDirty
                    ? 'Enregistrez le brouillon avant de modifier l’approvisionnement ou de valoriser.'
                    : ''
                }
                technicalSheetId={technicalSheetId}
                workspaceId={workspace.id}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Valorisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="technical-sheet-target-margin">
                    Marge cible (%)
                  </FieldLabel>
                  <Input
                    disabled={!canUpdate || !canValuate || draftSynchronizing}
                    id="technical-sheet-target-margin"
                    inputMode="decimal"
                    onChange={(event) => {
                      setDraftDirty(true);
                      setDraftForm((current) => ({
                        ...current,
                        targetMargin: event.target.value,
                      }));
                    }}
                    value={draftForm.targetMargin}
                  />
                </Field>

                <Field>
                  <FieldLabel>Mode de Prix final</FieldLabel>
                  <Select
                    disabled={!canUpdate || !canValuate || draftSynchronizing}
                    items={[
                      { value: 'ADVISED', label: 'Prix conseillé' },
                      { value: 'MANUAL', label: 'Prix manuel' },
                    ]}
                    onValueChange={(value) => {
                      setDraftDirty(true);
                      setDraftForm((current) => ({
                        ...current,
                        finalPriceMode: value,
                      }));
                    }}
                    value={draftForm.finalPriceMode}
                  >
                    <SelectTrigger aria-label="Mode de Prix final">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADVISED">Prix conseillé</SelectItem>
                      <SelectItem value="MANUAL">Prix manuel</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="technical-sheet-final-price">
                    Prix final TTC (€)
                  </FieldLabel>
                  <Input
                    disabled={
                      !canUpdate
                      || !canValuate
                      || draftSynchronizing
                      || draftForm.finalPriceMode !== 'MANUAL'
                    }
                    id="technical-sheet-final-price"
                    inputMode="decimal"
                    onChange={(event) => {
                      setDraftDirty(true);
                      setDraftForm((current) => ({
                        ...current,
                        finalPriceTtc: event.target.value,
                      }));
                    }}
                    value={draftForm.finalPriceTtc}
                  />
                </Field>

                <div className="flex items-end">
                  {canValuate && (
                    <Button
                      className="w-full"
                      disabled={
                        valuateState.isLoading
                        || draftSynchronizing
                        || draftServerActionDisabled
                      }
                      onClick={valuateDraft}
                      title={
                        draftDirty
                          ? 'Enregistrer le brouillon avant de valoriser'
                          : undefined
                      }
                      type="button"
                    >
                      <Calculator aria-hidden="true" className="size-4" />
                      {draft.valuationStatus === 'NOT_VALUED'
                        ? 'Valoriser'
                        : 'Revaloriser'}
                    </Button>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique validé</CardTitle>
        </CardHeader>
        <CardContent>
          <TechnicalSheetHistory
            validations={historyQuery.data?.validations ?? []}
          />
        </CardContent>
      </Card>

      <TechnicalSheetCopyDialog
        dossierId={dossierId}
        onClose={() => setCopyOpen(false)}
        onCopied={(result) => {
          setCopyOpen(false);
          navigate(
            '/workspaces/' + workspace.id
            + '/dossiers/' + result.sheet.dossierId
            + '/technical-sheets/' + result.sheet.id,
          );
        }}
        open={copyOpen && !copyDisabled}
        technicalSheetId={technicalSheetId}
        workspaceId={workspace.id}
      />

      {confirmation && (
        <ConfirmationDialog
          confirmLabel={
            confirmation.type === 'delete'
              ? 'Mettre dans la corbeille'
              : confirmation.type === 'archive'
                ? 'Archiver'
                : 'Réactiver'
          }
          confirmVariant={confirmation.type === 'delete' ? 'destructive' : 'default'}
          description={
            confirmation.type === 'delete'
              ? 'La Fiche restera restaurable jusqu’à sa date de suppression définitive et continuera de consommer une unité de capacité.'
              : 'Le changement de statut ne modifie ni l’historique validé ni le quota.'
          }
          onCancel={() => setConfirmation(null)}
          onConfirm={confirmLifecycle}
          pending={pendingLifecycle}
          title={
            confirmation.type === 'delete'
              ? 'Mettre cette Fiche dans la corbeille ?'
              : confirmation.type === 'archive'
                ? 'Archiver cette Fiche ?'
                : 'Réactiver cette Fiche ?'
          }
        />
      )}
    </div>
  );
}

export { TechnicalSheetWorkspacePage };
