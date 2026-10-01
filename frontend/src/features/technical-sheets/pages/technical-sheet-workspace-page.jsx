import {
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  TechnicalSheetAutosaveStatus,
} from '@/features/technical-sheets/components/technical-sheet-autosave-status';
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
  TechnicalSheetControlPanel,
} from '@/features/technical-sheets/components/technical-sheet-control-panel';
import {
  TechnicalSheetCopyDialog,
} from '@/features/technical-sheets/components/technical-sheet-copy-dialog';
import {
  TechnicalSheetInformationDrawer,
} from '@/features/technical-sheets/components/technical-sheet-information-drawer';
import {
  TechnicalSheetEconomicsBar,
} from '@/features/technical-sheets/components/technical-sheet-economics-bar';
import {
  PRODUCT_SOURCE,
  TechnicalSheetLineEditor,
  TechnicalSheetProductScopeControls,
  normalizeDraftLine,
} from '@/features/technical-sheets/components/technical-sheet-line-editor';
import {
  DOSSIER_SUPPLIER_PAGE_PERMISSIONS,
} from '@/features/suppliers/constants/supplier-permissions';
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
  useTechnicalSheetDraftAutosave,
} from '@/features/technical-sheets/hooks/use-technical-sheet-draft-autosave';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function buildDraftForm(draft) {
  return {
    productionQuantity: draft.productionQuantity ?? '',
    productionUnit: draft.productionUnit ?? '',
    vatRate: basisPointsToInput(draft.vatRateBasisPoints),
    targetMargin: basisPointsToInput(draft.targetMarginBasisPoints),
    finalPriceMode: draft.finalPriceMode ?? 'ADVISED',
    finalPriceTtc: minorToInput(draft.finalPriceTtcMinor),
    lines: (draft.lines ?? []).map(normalizeDraftLine),
  };
}

function buildDraftSaveRequest({
  dossierId,
  draftForm,
  revision,
  technicalSheetId,
  workspaceId,
}) {
  const vatRateBasisPoints = percentInputToBasisPoints(draftForm.vatRate);
  const targetMarginBasisPoints =
    percentInputToBasisPoints(draftForm.targetMargin);
  const finalPriceTtcMinor = draftForm.finalPriceMode === 'MANUAL'
    ? priceInputToMinor(draftForm.finalPriceTtc)
    : null;

  if (
    !draftForm.productionQuantity
    || !draftForm.productionUnit
    || vatRateBasisPoints === null
    || targetMarginBasisPoints === null
  ) {
    return {
      request: null,
      reason: 'Renseignez les indicateurs de production, la TVA de vente et la marge cible.',
    };
  }

  if (
    draftForm.finalPriceMode === 'MANUAL'
    && finalPriceTtcMinor === null
  ) {
    return {
      request: null,
      reason: 'Renseignez un Prix final TTC valide.',
    };
  }

  return {
    request: {
      workspaceId,
      dossierId,
      technicalSheetId,
      expectedRevision: revision,
      productionQuantity: draftForm.productionQuantity,
      productionUnit: draftForm.productionUnit,
      vatRateBasisPoints,
      targetMarginBasisPoints,
      finalPriceMode: draftForm.finalPriceMode,
      finalPriceTtcMinor,
      lines: draftForm.lines.map((line, index) => ({
        ...(line.id ? { id: line.id } : {}),
        kind: line.kind,
        productVariantId: line.productVariantId,
        netQuantity: line.netQuantity,
        inputUnit: line.inputUnit,
        order: index,
        note: line.note.trim() || null,
      })),
    },
  };
}

function mergeSavedLineIds(currentForm, snapshotForm, savedDraft) {
  const savedForm = buildDraftForm(savedDraft);
  const idsByClientKey = new Map();

  snapshotForm.lines.forEach((line, index) => {
    const savedLine = savedForm.lines[index];

    if (
      line.clientKey
      && savedLine?.id
      && savedLine.kind === line.kind
      && savedLine.productVariantId === line.productVariantId
    ) {
      idsByClientKey.set(line.clientKey, savedLine.id);
    }
  });

  return {
    ...currentForm,
    lines: currentForm.lines.map((line) => (
      idsByClientKey.has(line.clientKey)
        ? { ...line, id: idsByClientKey.get(line.clientKey) }
        : line
    )),
  };
}

function TechnicalSheetWorkspacePage() {
  const { dossierId, technicalSheetId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { can, canAny, workspace } = useWorkspaceContext();

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
  const [saveDraft] = useSaveTechnicalSheetDraftMutation();
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
    vatRate: '',
    targetMargin: '',
    finalPriceMode: 'ADVISED',
    finalPriceTtc: '',
    lines: [],
  });
  const draftFormRef = useRef(draftForm);
  const [draftFormRevision, setDraftFormRevision] = useState(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [identityDirty, setIdentityDirty] = useState(false);
  const [identityFormRevision, setIdentityFormRevision] = useState(null);
  const [informationOpen, setInformationOpen] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [productScope, setProductScope] = useState(PRODUCT_SOURCE.REFERENCE);
  const [sourcingPendingCount, setSourcingPendingCount] = useState(0);

  const {
    blockedReason: autosaveBlockedReason,
    flush: flushAutosave,
    hasUnsavedChanges: autosaveHasUnsavedChanges,
    isSaving: autosaveIsSaving,
    queue: queueAutosave,
    reset: resetAutosave,
    retry: retryAutosave,
    status: autosaveStatus,
  } = useTechnicalSheetDraftAutosave({
    buildRequest: (form, revision) => buildDraftSaveRequest({
      workspaceId: workspace.id,
      dossierId,
      technicalSheetId,
      draftForm: form,
      revision,
    }),
    enabled: Boolean(draft) && can(TECHNICAL_SHEET_PERMISSION.UPDATE),
    initialRevision: draftFormRevision,
    onError: (error) => {
      setDraftDirty(true);
      notifyError(
        error,
        'L’enregistrement automatique du brouillon a échoué.',
      );
    },
    onSaved: (savedDraft, { hasPendingChanges, snapshot }) => {
      setDraftFormRevision(savedDraft.revision);
      setDraftForm((current) => {
        const next = hasPendingChanges
          ? mergeSavedLineIds(current, snapshot, savedDraft)
          : buildDraftForm(savedDraft);
        draftFormRef.current = next;
        return next;
      });
      setDraftDirty(hasPendingChanges);
    },
    save: saveDraft,
  });

  useEffect(() => {
    if (!sheet || identityDirty) return;

    if (
      identityFormRevision !== null
      && sheet.revision < identityFormRevision
    ) {
      return;
    }

    setIdentity({
      name: sheet.name ?? '',
      description: sheet.description ?? '',
    });
    setIdentityFormRevision(sheet.revision);
  }, [identityDirty, identityFormRevision, sheet]);

  useEffect(() => {
    draftFormRef.current = {
      productionQuantity: '',
      productionUnit: '',
      vatRate: '',
      targetMargin: '',
      finalPriceMode: 'ADVISED',
      finalPriceTtc: '',
      lines: [],
    };
    setDraftDirty(false);
    setDraftFormRevision(null);
    setIdentityDirty(false);
    setIdentityFormRevision(null);
    setInformationOpen(false);
    setProductScope(PRODUCT_SOURCE.REFERENCE);
    resetAutosave(null);
  }, [resetAutosave, technicalSheetId]);

  useEffect(() => {
    if (!draft || draftDirty || autosaveHasUnsavedChanges) return;

    if (
      draftFormRevision !== null
      && draft.revision < draftFormRevision
    ) {
      return;
    }

    const nextForm = buildDraftForm(draft);
    draftFormRef.current = nextForm;
    setDraftForm(nextForm);
    setDraftFormRevision(draft.revision);
    resetAutosave(draft.revision);
  }, [
    autosaveHasUnsavedChanges,
    resetAutosave,
    draft,
    draftDirty,
    draftFormRevision,
  ]);

  useEffect(() => {
    if (
      !draft
      || draftDirty
      || autosaveHasUnsavedChanges
      || valuateState.isLoading
      || !['NOT_VALUED', 'STALE'].includes(draft.valuationStatus)
      || (draft.lines ?? []).length === 0
      || !draft.productionQuantity
      || !draft.productionUnit
      || draft.vatRateBasisPoints === null
      || draft.targetMarginBasisPoints === null
    ) {
      return;
    }

    valuate({
      workspaceId: workspace.id,
      dossierId,
      technicalSheetId,
      expectedRevision: draft.revision,
    }).unwrap().catch((error) => {
      toast({
        title: 'Calcul impossible',
        description: getTechnicalSheetApiErrorMessage(
          error,
          'Les calculs automatiques de la Fiche n’ont pas pu être actualisés.',
        ),
        variant: 'destructive',
      });
    });
  }, [
    autosaveHasUnsavedChanges,
    dossierId,
    draft,
    draftDirty,
    technicalSheetId,
    toast,
    valuate,
    valuateState.isLoading,
    workspace.id,
  ]);

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
  const canOpenSupplierPricing = canAny(DOSSIER_SUPPLIER_PAGE_PERMISSIONS);
  const canValidate = actionAvailability.update
    && can(TECHNICAL_SHEET_PERMISSION.VALIDATE);
  const canLifecycle = can(TECHNICAL_SHEET_PERMISSION.LIFECYCLE_MANAGE);
  const canDelete = can(TECHNICAL_SHEET_PERMISSION.DELETE);
  const canCopy = can(TECHNICAL_SHEET_PERMISSION.COPY);
  const copyDisabled = !actionAvailability.copy;
  const sourcingPending = sourcingPendingCount > 0;
  const draftSynchronizing = sourcingPending;
  const draftServerActionDisabled = (
    draftDirty
    || autosaveIsSaving
    || draftFormRevision === null
  );
  const parsedVatRate =
    percentInputToBasisPoints(draftForm.vatRate);
  const parsedTargetMargin =
    percentInputToBasisPoints(draftForm.targetMargin);
  const parametersComplete = Boolean(
    draftForm.productionQuantity.trim()
    && draftForm.productionUnit
    && parsedVatRate !== null
    && parsedVatRate >= 0
    && parsedVatRate <= 10000
    && parsedTargetMargin !== null
    && parsedTargetMargin >= 0
    && parsedTargetMargin < 10000
  );

  function handleSourcingPendingChange(pending) {
    setSourcingPendingCount((current) => (
      Math.max(0, current + (pending ? 1 : -1))
    ));
  }

  function updateDraftForm(updater, { immediate = false } = {}) {
    const current = draftFormRef.current;
    const next = typeof updater === 'function'
      ? updater(current)
      : updater;

    draftFormRef.current = next;
    setDraftForm(next);
    setDraftDirty(true);
    queueAutosave(next, { immediate });
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
      const updatedSheet = await updateSheet({
        workspaceId: workspace.id,
        dossierId,
        technicalSheetId,
        expectedRevision: identityFormRevision ?? sheet.revision,
        name: identity.name.trim(),
        description: identity.description.trim() || null,
      }).unwrap();

      setIdentity({
        name: updatedSheet.name ?? '',
        description: updatedSheet.description ?? '',
      });
      setIdentityFormRevision(updatedSheet.revision);
      setIdentityDirty(false);
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
        description: 'Les données validées ont été reprises et les calculs ont été actualisés.',
        variant: 'success',
      });
    } catch (error) {
      notifyError(error, 'Le brouillon n’a pas pu être créé.');
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
      resetAutosave(null);
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
      <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {sheet.name}
            </h1>

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

        {!draft && (
          <TechnicalSheetControlPanel
            actionAvailability={actionAvailability}
            canCopy={canCopy}
            canDelete={canDelete}
            canLifecycle={canLifecycle}
            canValidate={canValidate}
            copyDisabled={copyDisabled}
            draft={draft}
            draftDirty={draftDirty}
            draftSynchronizing={draftSynchronizing}
            identityDirty={identityDirty}
            onArchive={() => setConfirmation({ type: 'archive' })}
            onCopy={() => setCopyOpen(true)}
            onDelete={() => setConfirmation({ type: 'delete' })}
            onReactivate={() => setConfirmation({ type: 'reactivate' })}
            onValidate={validateDraft}
            pendingLifecycle={pendingLifecycle}
            validatePending={validateState.isLoading}
          />
        )}
      </header>

      <div className="space-y-6">
        {!draft && (
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
        )}
      </div>

      {draft && (
        <section className="relative space-y-6">
          <div
            className="sticky z-30"
            style={{ top: 'var(--workspace-topbar-height, 4rem)' }}
          >
            <Card className="border-primary/20 bg-background/97 shadow-lg backdrop-blur-md">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>Paramètres</CardTitle>
                    <InfoTooltip
                      content="Regroupe les paramètres de production, la TVA de vente de la Fiche et les principaux indicateurs économiques utilisés pour calculer et piloter sa valorisation."
                      label="À propos des Indicateurs de production"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {canUpdate && (
                      <TechnicalSheetProductScopeControls
                        onChange={setProductScope}
                        productScope={productScope}
                      />
                    )}
                    {canUpdate && (
                      <TechnicalSheetAutosaveStatus
                        blockedReason={autosaveBlockedReason}
                        onRetry={retryAutosave}
                        status={autosaveStatus}
                      />
                    )}
                    <TechnicalSheetControlPanel
                      actionAvailability={actionAvailability}
                      canCopy={canCopy}
                      canDelete={canDelete}
                      canLifecycle={canLifecycle}
                      canValidate={canValidate}
                      copyDisabled={copyDisabled}
                      draft={draft}
                      draftDirty={draftDirty}
                      draftSynchronizing={draftSynchronizing}
                      identityDirty={identityDirty}
                      onArchive={() => setConfirmation({ type: 'archive' })}
                      onCopy={() => setCopyOpen(true)}
                      onDelete={() => setConfirmation({ type: 'delete' })}
                      onReactivate={() => setConfirmation({ type: 'reactivate' })}
                      onValidate={validateDraft}
                      pendingLifecycle={pendingLifecycle}
                      validatePending={validateState.isLoading}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Field className="w-36">
                    <FieldLabel htmlFor="technical-sheet-production-quantity">
                      Quantité produite
                    </FieldLabel>
                    <Input
                      className="h-9"
                      disabled={!canUpdate || draftSynchronizing}
                      id="technical-sheet-production-quantity"
                      inputMode="decimal"
                      onBlur={flushAutosave}
                      onChange={(event) => {
                        updateDraftForm((current) => ({
                          ...current,
                          productionQuantity: event.target.value,
                        }));
                      }}
                      value={draftForm.productionQuantity}
                    />
                  </Field>

                  <Field className="w-44">
                    <FieldLabel>Unité</FieldLabel>
                    <Select
                      disabled={!canUpdate || draftSynchronizing}
                      items={unitItems}
                      onValueChange={(value) => {
                        updateDraftForm((current) => ({
                          ...current,
                          productionUnit: value,
                        }), { immediate: true });
                      }}
                      value={draftForm.productionUnit}
                    >
                      <SelectTrigger
                        aria-label="Unité de production"
                        className="h-9 min-h-9"
                      >
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

                  <Field className="w-28">
                    <FieldLabel htmlFor="technical-sheet-vat">
                      TVA (%)
                    </FieldLabel>
                    <Input
                      className="h-9"
                      disabled={!canUpdate || !canValuate || draftSynchronizing}
                      id="technical-sheet-vat"
                      inputMode="decimal"
                      onBlur={flushAutosave}
                      onChange={(event) => {
                        updateDraftForm((current) => ({
                          ...current,
                          vatRate: event.target.value,
                        }));
                      }}
                      value={draftForm.vatRate}
                    />
                  </Field>

                  <Field className="w-32">
                    <FieldLabel htmlFor="technical-sheet-target-margin">
                      Marge cible (%)
                    </FieldLabel>
                    <Input
                      className="h-9"
                      disabled={!canUpdate || !canValuate || draftSynchronizing}
                      id="technical-sheet-target-margin"
                      inputMode="decimal"
                      onBlur={flushAutosave}
                      onChange={(event) => {
                        updateDraftForm((current) => ({
                          ...current,
                          targetMargin: event.target.value,
                        }));
                      }}
                      value={draftForm.targetMargin}
                    />
                  </Field>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="mb-3 text-sm font-semibold">Résultats</h3>
                  <TechnicalSheetEconomicsBar
                    canValuate={canValuate}
                    economicSnapshot={economicSnapshot}
                    editDisabled={!canUpdate || draftSynchronizing}
                    finalPriceInputValue={draftForm.finalPriceTtc}
                    finalPriceMode={draftForm.finalPriceMode}
                    lines={draftForm.lines}
                    onFinalPriceInputChange={(value) => {
                      updateDraftForm((current) => ({
                        ...current,
                        finalPriceTtc: value,
                      }));
                    }}
                    onFinalPriceModeChange={(value) => {
                      updateDraftForm((current) => ({
                        ...current,
                        finalPriceMode: value,
                      }), { immediate: true });
                    }}
                    onFieldBlur={flushAutosave}
                    targetMarginBasisPoints={
                      parsedTargetMargin
                    }
                    vatRateBasisPoints={
                      parsedVatRate
                    }
                  />
                </div>
              </CardContent>
            </Card>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 -bottom-10 h-10 bg-linear-to-b from-background via-background/90 to-transparent"
            />
          </div>
          <Card className="overflow-hidden">
            <div className="border-b border-border px-3 py-2">
              <h2 className="text-sm font-semibold">Composition</h2>
            </div>
            <CardContent className="p-0">
              {!parametersComplete && (
                <p className="border-b border-border px-3 py-3 text-sm text-muted-foreground">
                  Complétez les paramètres de la Fiche avant de modifier sa composition.
                </p>
              )}
              <TechnicalSheetLineEditor
                canManageSourcing={canSource}
                disabled={
                  !canUpdate
                  || draftSynchronizing
                  || !parametersComplete
                }
                dossierId={dossierId}
                draftRevision={draftFormRevision}
                lines={draftForm.lines}
                metadata={metadata}
                onChange={(lines, { immediate = false } = {}) => {
                  updateDraftForm((current) => ({
                    ...current,
                    lines,
                  }), { immediate });
                }}
                onFieldBlur={flushAutosave}
                onOpenPricing={() => navigate(
                  '/workspaces/' + workspace.id
                  + '/dossiers/' + dossierId
                  + '/suppliers',
                )}
                onSourcingError={(message) => toast({
                  title: 'Sélection impossible',
                  description: message,
                  variant: 'destructive',
                })}
                onSourcingPendingChange={handleSourcingPendingChange}
                onSourcingSelected={(updatedDraft) => {
                  const nextForm = buildDraftForm(updatedDraft);
                  draftFormRef.current = nextForm;
                  setDraftForm(nextForm);
                  setDraftFormRevision(updatedDraft.revision);
                  setDraftDirty(false);
                  resetAutosave(updatedDraft.revision);
                }}
                productMetadata={productMetadataQuery.data}
                productScope={productScope}
                canOpenPricing={canOpenSupplierPricing}
                sourcingDisabled={
                  draftSynchronizing
                  || draftServerActionDisabled
                }
                technicalSheetId={technicalSheetId}
                workspaceId={workspace.id}
              />
            </CardContent>
          </Card>

        </section>
      )}

      <TechnicalSheetInformationDrawer
        canEdit={canEditIdentity && actionAvailability.update}
        canValidate={canValidate}
        description={identity.description}
        dirty={identityDirty}
        history={historyQuery.data?.validations ?? []}
        historyLoading={historyQuery.isLoading}
        name={identity.name}
        onClose={() => setInformationOpen(false)}
        onDescriptionChange={(value) => {
          setIdentityDirty(true);
          setIdentity((current) => ({
            ...current,
            description: value,
          }));
        }}
        onNameChange={(value) => {
          setIdentityDirty(true);
          setIdentity((current) => ({
            ...current,
            name: value,
          }));
        }}
        onOpen={() => setInformationOpen(true)}
        onSave={saveIdentity}
        onValidationCommentChange={setValidationComment}
        open={informationOpen}
        pending={updateSheetState.isLoading}
        showValidationComment={Boolean(draft)}
        validationComment={validationComment}
      />

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
