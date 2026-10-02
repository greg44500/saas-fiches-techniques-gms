import {
  ArrowLeft,
  BarChart3,
  Building2,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { ErrorState } from '@/components/shared/error-state';
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
import { SegmentedControl } from '@/components/ui/segmented-control';
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
  TechnicalSheetAnalysisDrawer,
} from '@/features/technical-sheets/components/technical-sheet-analysis-drawer';
import {
  TechnicalSheetControlPanel,
} from '@/features/technical-sheets/components/technical-sheet-control-panel';
import {
  TechnicalSheetCopyDialog,
} from '@/features/technical-sheets/components/technical-sheet-copy-dialog';
import {
  TechnicalSheetDossierContextDrawer,
} from '@/features/technical-sheets/components/technical-sheet-dossier-context-drawer';
import {
  TechnicalSheetIdentityDialog,
} from '@/features/technical-sheets/components/technical-sheet-identity-dialog';
import {
  TechnicalSheetValidationDialog,
} from '@/features/technical-sheets/components/technical-sheet-validation-dialog';
import {
  TechnicalSheetEconomicsBar,
} from '@/features/technical-sheets/components/technical-sheet-economics-bar';
import {
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
    portionsPerProductionUnit:
      draft.portionsPerProductionUnit ?? '',
    totalPortions: draft.totalPortions ?? null,
    saleBasis: draft.saleBasis ?? '',
    vatRate: basisPointsToInput(draft.vatRateBasisPoints),
    targetMargin: basisPointsToInput(draft.targetMarginBasisPoints),
    finalPriceMode: draft.finalPriceMode ?? '',
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
  const productionQuantity =
    draftForm.productionQuantity.trim().replace(',', '.');
  const portionsPerProductionUnit =
    draftForm.portionsPerProductionUnit.trim().replace(',', '.');
  const vatRateBasisPoints = percentInputToBasisPoints(draftForm.vatRate);
  const targetMarginBasisPoints =
    percentInputToBasisPoints(draftForm.targetMargin);
  const finalPriceTtcMinor = draftForm.finalPriceMode === 'MANUAL'
    ? priceInputToMinor(draftForm.finalPriceTtc)
    : null;

  if (
    !/^\d+(?:\.\d+)?$/.test(productionQuantity)
    || Number(productionQuantity) <= 0
    || !draftForm.productionUnit
    || !/^\d+(?:\.\d+)?$/.test(portionsPerProductionUnit)
    || Number(portionsPerProductionUnit) <= 0
    || !draftForm.saleBasis
    || !draftForm.finalPriceMode
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
      reason: 'Renseignez un Prix retenu TTC valide.',
    };
  }

  return {
    request: {
      workspaceId,
      dossierId,
      technicalSheetId,
      expectedRevision: revision,
      productionQuantity,
      productionUnit: draftForm.productionUnit,
      portionsPerProductionUnit,
      saleBasis: draftForm.saleBasis,
      vatRateBasisPoints,
      targetMarginBasisPoints,
      finalPriceMode: draftForm.finalPriceMode,
      finalPriceTtcMinor,
      lines: draftForm.lines.map((line, index) => ({
        ...(line.id ? { id: line.id } : {}),
        kind: line.kind,
        productVariantId: line.productVariantId,
        netQuantity: line.netQuantity,
        inputUnit:
          line.referenceUnit
          ?? line.inputUnit,
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
    totalPortions: savedForm.totalPortions,
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
  const draftId = draft?.id ?? null;
  const metadata = metadataQuery.data;

  const [identity, setIdentity] = useState({
    name: '',
    description: '',
  });
  const [draftForm, setDraftForm] = useState({
    productionQuantity: '',
    productionUnit: '',
    portionsPerProductionUnit: '',
    totalPortions: null,
    saleBasis: '',
    vatRate: '',
    targetMargin: '',
    finalPriceMode: '',
    finalPriceTtc: '',
    lines: [],
  });
  const draftFormRef = useRef(draftForm);
  const automaticValuationAttemptRef = useRef(null);
  const [draftFormRevision, setDraftFormRevision] = useState(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [identityDirty, setIdentityDirty] = useState(false);
  const [identityFormRevision, setIdentityFormRevision] = useState(null);
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [productScope, setProductScope] = useState(null);
  const [sourcingPendingCount, setSourcingPendingCount] = useState(0);
  const stickyControlsRef = useRef(null);
  const [stickyControlsHeight, setStickyControlsHeight] = useState(0);

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
    const element = stickyControlsRef.current;

    if (!draftId || !element) {
      setStickyControlsHeight(0);
      return undefined;
    }

    const syncHeight = () => {
      const nextHeight = Math.ceil(
        element.getBoundingClientRect().height,
      );

      setStickyControlsHeight((current) => (
        current === nextHeight ? current : nextHeight
      ));
    };

    syncHeight();

    if (typeof window.ResizeObserver !== 'function') {
      return undefined;
    }

    const observer = new window.ResizeObserver(syncHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, [draftId]);

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
      portionsPerProductionUnit: '',
      totalPortions: null,
      saleBasis: '',
      vatRate: '',
      targetMargin: '',
      finalPriceMode: '',
      finalPriceTtc: '',
      lines: [],
    };
    setDraftDirty(false);
    setDraftFormRevision(null);
    setIdentityDirty(false);
    setIdentityFormRevision(null);
    setIdentityDialogOpen(false);
    setRightPanel(null);
    setValidationDialogOpen(false);
    setProductScope(null);
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
      || !can(TECHNICAL_SHEET_PERMISSION.VALUATION_MANAGE)
      || draftDirty
      || autosaveHasUnsavedChanges
      || valuateState.isLoading
      || !metadata?.valuationStatusDefinitions
        ?.find((definition) => (
          definition.value === draft.valuationStatus
        ))
        ?.automaticValuationEligible
      || (draft.lines ?? []).length === 0
      || !draft.productionQuantity
      || !draft.productionUnit
      || !draft.portionsPerProductionUnit
      || !draft.saleBasis
      || draft.vatRateBasisPoints === null
      || draft.targetMarginBasisPoints === null
    ) {
      return;
    }

    const attemptKey = [
      draft.id,
      draft.revision,
      draft.valuationStatus,
    ].join(':');

    if (
      automaticValuationAttemptRef.current
      === attemptKey
    ) {
      return;
    }

    automaticValuationAttemptRef.current =
      attemptKey;

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
    can,
    dossierId,
    draft,
    draftDirty,
    metadata?.valuationStatusDefinitions,
    technicalSheetId,
    toast,
    valuate,
    valuateState.isLoading,
    workspace.id,
  ]);

  const unitItems = useMemo(
    () => (
      metadata?.productionUnits
      ?? metadata?.units
      ?? []
    ).map((unit) => ({
      value: unit.value,
      label: unit.label,
    })),
    [metadata?.productionUnits, metadata?.units],
  );
  const saleBasisItems = metadata?.saleBases ?? [];
  const vatRateItems = (metadata?.vatRates ?? []).map((item) => ({
    value: basisPointsToInput(item.value),
    label: item.label,
  }));
  const finalPriceModeItems =
    metadata?.finalPriceModeDefinitions ?? [];
  const productSearchScopes =
    productMetadataQuery.data
      ?.productSearchScopes ?? [];
  const effectiveProductScope =
    productScope
    ?? metadata?.defaults
      ?.productSearchScope
    ?? null;

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

  const statusPresentation = getTechnicalSheetStatusPresentation(
    sheet.status,
    metadata?.statusDefinitions,
  );
  const valuationPresentation = draftDirty
    ? {
        label: 'Modifications non enregistrées',
        tone: 'warning',
      }
    : getTechnicalSheetValuationPresentation(
        draft?.valuationStatus,
        metadata?.valuationStatusDefinitions,
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
  const validationEligible = Boolean(
    draft
    && metadata?.valuationStatusDefinitions
      ?.find((definition) => (
        definition.value === draft.valuationStatus
      ))
      ?.validationEligible
  );
  const validations = historyQuery.data?.validations ?? [];
  const currentValidation = (
    validations.find((validation) => (
      validation.id === sheet.currentValidatedStateId
    ))
    ?? validations[0]
    ?? null
  );
  const sourcingPending = sourcingPendingCount > 0;
  const draftSynchronizing = sourcingPending;
  const draftServerActionDisabled = (
    draftDirty
    || autosaveIsSaving
    || draftFormRevision === null
  );
  const parsedVatRate =
    percentInputToBasisPoints(draftForm.vatRate);
  const vatRateIsRegistered = vatRateItems.some(
    (item) => item.value === draftForm.vatRate,
  );
  const parsedTargetMargin =
    percentInputToBasisPoints(draftForm.targetMargin);
  const normalizedProductionQuantity =
    draftForm.productionQuantity.trim().replace(',', '.');
  const normalizedPortionsPerProductionUnit =
    draftForm.portionsPerProductionUnit.trim().replace(',', '.');
  const parametersComplete = Boolean(
    /^\d+(?:\.\d+)?$/.test(normalizedProductionQuantity)
    && Number(normalizedProductionQuantity) > 0
    && draftForm.productionUnit
    && /^\d+(?:\.\d+)?$/.test(normalizedPortionsPerProductionUnit)
    && Number(normalizedPortionsPerProductionUnit) > 0
    && draftForm.saleBasis
    && draftForm.finalPriceMode
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
      setIdentityDialogOpen(false);
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
      setValidationDialogOpen(false);
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

  const economicSnapshot = (
    draft?.economicSnapshot
    ?? currentValidation?.economicSnapshot
    ?? null
  );
  const productionSnapshot = (
    draft
    ?? currentValidation?.sheetSnapshot
    ?? null
  );
  const economicsUpdating = Boolean(
    draft
    && (
      draftDirty
      || autosaveIsSaving
      || autosaveHasUnsavedChanges
      || valuateState.isLoading
    )
  );
  const pendingLifecycle = (
    archiveState.isLoading
    || reactivateState.isLoading
    || deleteState.isLoading
  );

  return (
    <div className="space-y-6">
      {!draft && (
        <header className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <ActionIconButton
            Icon={ArrowLeft}
            label="Retour vers Dossiers"
            onClick={() => navigate(
              '/workspaces/' + workspace.id
              + '/dossiers/' + dossierId
              + '/technical-sheets',
            )}
            tooltipLabel="Retour vers Dossiers"
            variant="ghost"
          />

          <div className="min-w-0">
            <h1 className="truncate text-3xl font-semibold tracking-tight">
              {sheet.name}
            </h1>

            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
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
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {canEditIdentity && actionAvailability.update && (
            <Button
              onClick={() => setIdentityDialogOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Pencil aria-hidden="true" className="size-4" />
              Modifier
            </Button>
          )}
          <Button
            onClick={() => setRightPanel('analysis')}
            size="sm"
            type="button"
            variant={rightPanel === 'analysis' ? 'default' : 'outline'}
          >
            <BarChart3 aria-hidden="true" className="size-4" />
            Analyse
          </Button>
          <Button
            onClick={() => setRightPanel('dossier')}
            size="sm"
            type="button"
            variant={rightPanel === 'dossier' ? 'default' : 'outline'}
          >
            <Building2 aria-hidden="true" className="size-4" />
            Infos dossier
          </Button>
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
          onValidate={() => setValidationDialogOpen(true)}
          pendingLifecycle={pendingLifecycle}
          validatePending={validateState.isLoading}
          validationEligible={validationEligible}
        />
        </div>
        </header>
      )}

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
            ref={stickyControlsRef}
            style={{ top: 'var(--workspace-topbar-height, 4rem)' }}
          >
            <Card className="border-primary/20 bg-background/97 shadow-lg backdrop-blur-md">
              <CardHeader className="p-4 pb-2">
                <div
                  className={
                    'grid items-center gap-x-4 gap-y-2 '
                    + 'xl:grid-cols-[minmax(0,1fr)_auto]'
                  }
                >
                  <div
                    className={
                      'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] '
                      + 'items-center gap-x-2 xl:col-start-1 xl:row-start-1'
                    }
                  >
                    <ActionIconButton
                      Icon={ArrowLeft}
                      label="Retour vers Dossiers"
                      onClick={() => navigate(
                        '/workspaces/' + workspace.id
                        + '/dossiers/' + dossierId
                        + '/technical-sheets',
                      )}
                      tooltipLabel="Retour vers Dossiers"
                      variant="ghost"
                    />

                    <h1 className="truncate text-2xl font-semibold tracking-tight">
                      {sheet.name}
                    </h1>
                  </div>

                  <div
                    className={
                      'grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] '
                      + 'gap-x-2 xl:col-start-1 xl:row-start-2'
                    }
                  >
                    <span aria-hidden="true" />
                    <div
                      className={
                        'flex min-h-6 min-w-0 flex-wrap items-center gap-2 '
                        + '2xl:flex-nowrap'
                      }
                    >
                      <TechnicalSheetStatusBadge tone={statusPresentation.tone}>
                        {statusPresentation.label}
                      </TechnicalSheetStatusBadge>

                      <TechnicalSheetStatusBadge tone="warning">
                        Brouillon
                      </TechnicalSheetStatusBadge>

                      <TechnicalSheetStatusBadge tone={valuationPresentation.tone}>
                        {valuationPresentation.label}
                      </TechnicalSheetStatusBadge>
                    </div>
                  </div>

                  <div
                    className={
                      'flex min-h-11 flex-wrap items-center justify-end gap-2 '
                      + 'xl:col-start-2 xl:row-span-2 xl:row-start-1'
                    }
                  >
                    {canUpdate && (
                      <div
                        className={
                          'flex h-9 w-60 shrink-0 items-center '
                          + 'justify-end whitespace-nowrap'
                        }
                      >
                        <TechnicalSheetAutosaveStatus
                          blockedReason={autosaveBlockedReason}
                          onRetry={retryAutosave}
                          status={autosaveStatus}
                        />
                      </div>
                    )}

                    <TechnicalSheetControlPanel
                      actionAvailability={actionAvailability}
                      canCopy={canCopy}
                      canDelete={canDelete}
                      canEditIdentity={
                        canEditIdentity
                        && actionAvailability.update
                      }
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
                      onEditIdentity={() => setIdentityDialogOpen(true)}
                      onOpenAnalysis={() => setRightPanel('analysis')}
                      onOpenDossier={() => setRightPanel('dossier')}
                      onReactivate={() => setConfirmation({ type: 'reactivate' })}
                      onValidate={() => setValidationDialogOpen(true)}
                      pendingLifecycle={pendingLifecycle}
                      rightPanel={rightPanel}
                      validatePending={validateState.isLoading}
                      validationEligible={validationEligible}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-2">
                <div
                  className={
                    'grid gap-3 '
                    + 'xl:grid-cols-[minmax(0,1.15fr)_minmax(12rem,0.5fr)_minmax(0,0.9fr)]'
                  }
                >
                  <div className="rounded-lg border border-border bg-muted/15 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Production
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                  <Field className="w-32">
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

                  <Field className="w-32">
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
                    <FieldLabel htmlFor="technical-sheet-portions-per-piece">
                      Portions / pièce
                    </FieldLabel>
                    <Input
                      className="h-9"
                      disabled={!canUpdate || draftSynchronizing}
                      id="technical-sheet-portions-per-piece"
                      inputMode="decimal"
                      onBlur={flushAutosave}
                      onChange={(event) => {
                        updateDraftForm((current) => ({
                          ...current,
                          portionsPerProductionUnit: event.target.value,
                        }));
                      }}
                      value={draftForm.portionsPerProductionUnit}
                    />
                  </Field>

                  <Field className="w-28">
                    <FieldLabel>Total portions</FieldLabel>
                    <div
                      aria-label="Total portions"
                      className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm font-medium tabular-nums"
                    >
                      {draftDirty || autosaveHasUnsavedChanges
                        ? 'Actualisation…'
                        : draftForm.totalPortions ?? 'NC'}
                    </div>
                  </Field>

                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/15 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Produits
                    </p>
                    <div className="flex min-h-16 items-end">
                      {productSearchScopes.length > 0
                        && effectiveProductScope
                        && (
                          <TechnicalSheetProductScopeControls
                            items={productSearchScopes}
                            onChange={setProductScope}
                            productScope={effectiveProductScope}
                          />
                        )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/15 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Vente
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                  <Field className="w-28">
                    <FieldLabel>Base de vente</FieldLabel>
                    <Select
                      disabled={!canUpdate || !canValuate || draftSynchronizing}
                      items={saleBasisItems}
                      onValueChange={(value) => {
                        updateDraftForm((current) => ({
                          ...current,
                          saleBasis: value,
                        }), { immediate: true });
                      }}
                      value={draftForm.saleBasis}
                    >
                      <SelectTrigger
                        aria-label="Base de vente"
                        className="h-9 min-h-9"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {saleBasisItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="w-28">
                    <FieldLabel>TVA</FieldLabel>
                    <SegmentedControl
                      ariaLabel="TVA de vente"
                      className="h-9 p-px"
                      disabled={!canUpdate || !canValuate || draftSynchronizing}
                      items={vatRateItems}
                      onValueChange={(value) => {
                        updateDraftForm((current) => ({
                          ...current,
                          vatRate: value,
                        }), { immediate: true });
                      }}
                      size="sm"
                      value={draftForm.vatRate}
                    />
                    {parsedVatRate !== null && !vatRateIsRegistered && (
                      <p className="max-w-60 text-xs text-warning">
                        Taux historique {draftForm.vatRate.replace('.', ',')} % conservé.
                        Choisissez un taux autorisé pour le modifier.
                      </p>
                    )}
                  </Field>

                  <Field className="w-28">
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
                  </div>
                </div>

                <div>

                  <TechnicalSheetEconomicsBar
                    canValuate={canValuate}
                    economicMetricDefinitions={metadata?.economicMetricDefinitions}
                    economicSnapshot={economicSnapshot}
                    editDisabled={!canUpdate || draftSynchronizing}
                    finalPriceInputValue={draftForm.finalPriceTtc}
                    finalPriceMode={draftForm.finalPriceMode}
                    finalPriceModeItems={finalPriceModeItems}
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
                    saleBasis={draftForm.saleBasis}
                    saleBasisItems={saleBasisItems}
                    updating={economicsUpdating}
                  />
                </div>
              </CardContent>
            </Card>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2 -bottom-10 h-10 bg-linear-to-b from-background via-background/90 to-transparent"
            />
          </div>
          <Card>
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
                compositionHeaderOffset={stickyControlsHeight}
                disabled={
                  !canUpdate
                  || draftSynchronizing
                  || !parametersComplete
                }
                dossierId={dossierId}
                draftRevision={draftFormRevision}
                lines={draftForm.lines}
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
                onUnitChangeWarning={({ previousUnit, nextUnit }) => {
                  toast({
                    title: 'Unité du Produit modifiée',
                    description:
                      'La ligne utilise désormais '
                      + nextUnit
                      + ' au lieu de '
                      + previousUnit
                      + '. Vérifiez la quantité conservée.',
                    variant: 'info',
                  });
                }}
                onSourcingSelected={(updatedDraft) => {
                  const nextForm = buildDraftForm(updatedDraft);
                  draftFormRef.current = nextForm;
                  setDraftForm(nextForm);
                  setDraftFormRevision(updatedDraft.revision);
                  setDraftDirty(false);
                  resetAutosave(updatedDraft.revision);
                }}
                metadata={metadata}
                productMetadata={productMetadataQuery.data}
                productScope={effectiveProductScope}
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

      <TechnicalSheetAnalysisDrawer
        economicSnapshot={economicSnapshot}
        history={validations}
        historyLoading={historyQuery.isLoading}
        metadata={metadata}
        onClose={() => setRightPanel(null)}
        open={rightPanel === 'analysis'}
        productionSnapshot={productionSnapshot}
      />

      <TechnicalSheetDossierContextDrawer
        dossierId={dossierId}
        onClose={() => setRightPanel(null)}
        open={rightPanel === 'dossier'}
        workspaceId={workspace.id}
      />

      <TechnicalSheetIdentityDialog
        canEdit={canEditIdentity && actionAvailability.update}
        description={identity.description}
        dirty={identityDirty}
        name={identity.name}
        onClose={() => setIdentityDialogOpen(false)}
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
        onSave={saveIdentity}
        open={identityDialogOpen}
        pending={updateSheetState.isLoading}
      />

      <TechnicalSheetValidationDialog
        comment={validationComment}
        onClose={() => setValidationDialogOpen(false)}
        onCommentChange={setValidationComment}
        onConfirm={validateDraft}
        open={validationDialogOpen}
        pending={validateState.isLoading}
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
