import { useEffect, useMemo, useRef, useState } from 'react';

import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCommitProductImportMutation,
  useInspectProductImportMutation,
  useLazyGetWorkspaceProductDetailQuery,
  usePreviewProductImportMutation,
} from '@/features/products/api/product-catalog-api';
import {
  useCommitProductReferenceImportMutation,
  useInspectProductReferenceImportMutation,
  useLazyGetProductReferenceDetailQuery,
  usePreviewProductReferenceImportMutation,
} from '@/features/products/api/product-reference-api';
import {
  EMPTY_OPTION,
} from '@/features/products/components/product-variant-fields';
import {
  getApiErrorMessage,
  getImportClassificationPresentation,
  getReferenceUnitLabel,
  getVariantLabel,
} from '@/features/products/lib/product-presentation';

const IMPORT_FIELDS = Object.freeze([
  { key: 'name', label: 'Nom du Produit', required: true },
  { key: 'aliases', label: 'Synonymes métier', globalOnly: true },
  { key: 'category', label: 'Catégorie' },
  { key: 'variety', label: 'Variété' },
  { key: 'presentation', label: 'Présentation' },
  { key: 'commercialType', label: 'Type commercial' },
  { key: 'sizeFormat', label: 'Calibre / format' },
  { key: 'color', label: 'Couleur' },
  { key: 'qualityDesignation', label: 'Désignation de qualité' },
  { key: 'processingState', label: 'État / transformation' },
  { key: 'conservationType', label: 'Conservation' },
  { key: 'foodRange', label: 'Gamme' },
  { key: 'referenceUnit', label: 'Unité de référence' },
  { key: 'yieldPercent', label: 'Rendement (%)' },
]);

function buildMappingPayload(mapping) {
  return Object.fromEntries(
    Object.entries(mapping)
      .filter(([, value]) => value !== EMPTY_OPTION && value !== '')
      .map(([key, value]) => [key, Number(value)]),
  );
}

function ProductImportDialog({
  metadata,
  mode = 'workspace',
  onClose,
  onCommitted,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const isGlobal = mode === 'global';
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [mapping, setMapping] = useState({});
  const [defaultUnit, setDefaultUnit] = useState(
    metadata?.referenceUnits?.[0]?.value ?? '',
  );
  const [defaultCategoryId, setDefaultCategoryId] = useState(EMPTY_OPTION);
  const [defaultConservationType, setDefaultConservationType] = useState(
    metadata?.conservationTypes?.[0]?.value ?? '',
  );
  const [defaultFoodRange, setDefaultFoodRange] = useState(EMPTY_OPTION);
  const [preview, setPreview] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [candidateVariants, setCandidateVariants] = useState({});
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [stalePreview, setStalePreview] = useState(false);

  const [inspectWorkspaceImport, inspectWorkspaceState] = useInspectProductImportMutation();
  const [previewWorkspaceImport, previewWorkspaceState] = usePreviewProductImportMutation();
  const [commitWorkspaceImport, commitWorkspaceState] = useCommitProductImportMutation();
  const [inspectGlobalImport, inspectGlobalState] = useInspectProductReferenceImportMutation();
  const [previewGlobalImport, previewGlobalState] = usePreviewProductReferenceImportMutation();
  const [commitGlobalImport, commitGlobalState] = useCommitProductReferenceImportMutation();
  const [loadWorkspaceProductDetail, workspaceCandidateState] =
    useLazyGetWorkspaceProductDetailQuery();
  const [loadGlobalProductDetail, globalCandidateState] =
    useLazyGetProductReferenceDetailQuery();

  useEffect(() => {
    if (!open) return;
    setStep('upload');
    setFile(null);
    setInspection(null);
    setMapping({});
    setDefaultUnit(metadata?.referenceUnits?.[0]?.value ?? '');
    setDefaultCategoryId(EMPTY_OPTION);
    setDefaultConservationType(metadata?.conservationTypes?.[0]?.value ?? '');
    setDefaultFoodRange(EMPTY_OPTION);
    setPreview(null);
    setDecisions({});
    setCandidateVariants({});
    setResult(null);
    setFormError('');
    setStalePreview(false);
  }, [metadata, open]);

  const pending = (
    inspectWorkspaceState.isLoading
    || previewWorkspaceState.isLoading
    || commitWorkspaceState.isLoading
    || inspectGlobalState.isLoading
    || previewGlobalState.isLoading
    || commitGlobalState.isLoading
    || workspaceCandidateState.isFetching
    || globalCandidateState.isFetching
  );

  const activeCategories = useMemo(
    () => (metadata?.categories ?? []).filter((category) => category.status === 'ACTIVE'),
    [metadata?.categories],
  );
  const visibleImportFields = useMemo(
    () => IMPORT_FIELDS.filter((field) => isGlobal || !field.globalOnly),
    [isGlobal],
  );
  const characteristicKindLabels = useMemo(
    () => new Map(
      (metadata?.productCharacteristicKinds ?? []).map(
        ({ value, label }) => [value, label],
      ),
    ),
    [metadata?.productCharacteristicKinds],
  );
  const headerItems = useMemo(
    () => [
      { value: EMPTY_OPTION, label: 'Non associée' },
      ...(inspection?.headers ?? []).map((header, index) => ({
        value: String(index),
        label: header || 'Colonne ' + (index + 1),
      })),
    ],
    [inspection?.headers],
  );

  async function inspect() {
    if (!file) {
      setFormError('Sélectionnez un fichier CSV, XLS ou XLSX.');
      return;
    }

    setFormError('');
    try {
      const data = isGlobal
        ? await inspectGlobalImport({ file }).unwrap()
        : await inspectWorkspaceImport({ workspaceId, file }).unwrap();
      setInspection(data);
      setMapping({
        name: data.headers.length > 0 ? '0' : EMPTY_OPTION,
      });
      setStep('mapping');
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Le fichier n’a pas pu être analysé.'));
    }
  }

  function getPreviewRequest() {
    const mappingPayload = buildMappingPayload(mapping);
    const defaults = {
      ...(defaultUnit ? { referenceUnit: defaultUnit } : {}),
      ...(defaultCategoryId !== EMPTY_OPTION
        ? { categoryId: defaultCategoryId }
        : {}),
      ...(defaultConservationType
        ? { conservationType: defaultConservationType }
        : {}),
      ...(defaultFoodRange !== EMPTY_OPTION
        ? { foodRange: Number(defaultFoodRange) }
        : {}),
    };

    return isGlobal
      ? {
        importId: inspection.importId,
        mapping: mappingPayload,
        defaults,
      }
      : {
        workspaceId,
        importId: inspection.importId,
        mapping: mappingPayload,
        defaults,
      };
  }

  async function runPreview() {
    return isGlobal
      ? previewGlobalImport(getPreviewRequest()).unwrap()
      : previewWorkspaceImport(getPreviewRequest()).unwrap();
  }

  async function generatePreview() {
    const mappingPayload = buildMappingPayload(mapping);
    if (!Number.isInteger(mappingPayload.name)) {
      setFormError('Associez obligatoirement la colonne contenant le nom du Produit.');
      return;
    }

    const assignedColumns = Object.values(mappingPayload);
    if (new Set(assignedColumns).size !== assignedColumns.length) {
      setFormError('Une colonne ne peut pas être associée à plusieurs champs.');
      return;
    }

    if (!mappingPayload.referenceUnit && mappingPayload.referenceUnit !== 0 && !defaultUnit) {
      setFormError('Associez une unité de référence ou choisissez une unité par défaut.');
      return;
    }

    if (
      !Number.isInteger(mappingPayload.conservationType)
      && !defaultConservationType
    ) {
      setFormError('Associez une conservation ou choisissez une conservation par défaut.');
      return;
    }

    setFormError('');
    try {
      const data = await runPreview();
      setPreview(data);
      setDecisions({});
      setCandidateVariants({});
      setStalePreview(false);
      setStep('preview');
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La prévisualisation n’a pas pu être générée.',
      ));
    }
  }

  function setDecision(rowNumber, decision) {
    setDecisions((current) => ({
      ...current,
      [rowNumber]: decision,
    }));
  }

  function clearDecision(rowNumber) {
    setDecisions((current) => {
      const next = { ...current };
      delete next[rowNumber];
      return next;
    });
  }

  async function chooseCandidate(row, candidate) {
    setFormError('');

    if (candidate.status !== 'ACTIVE') {
      setFormError(
        'Cette référence candidate est archivée et ne peut pas être utilisée pour cet import.',
      );
      clearDecision(row.rowNumber);
      return;
    }

    try {
      const detail = isGlobal
        ? await loadGlobalProductDetail(candidate.id).unwrap()
        : await loadWorkspaceProductDetail({
          workspaceId,
          productId: candidate.id,
        }).unwrap();
      const variants = (detail?.variants ?? []).filter(
        (variant) => variant.status === 'ACTIVE',
      );

      setCandidateVariants((current) => ({
        ...current,
        [row.rowNumber]: {
          product: candidate,
          variants,
        },
      }));

      if (variants.length === 1) {
        setDecision(row.rowNumber, {
          rowNumber: row.rowNumber,
          action: 'ATTACH_EXISTING',
          variantId: variants[0].id,
        });
      } else {
        clearDecision(row.rowNumber);
      }
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La référence candidate n’a pas pu être chargée.',
      ));
    }
  }

  async function commit() {
    setFormError('');
    setStalePreview(false);
    const request = isGlobal
      ? {
        importId: inspection.importId,
        decisions: Object.values(decisions),
      }
      : {
        workspaceId,
        importId: inspection.importId,
        decisions: Object.values(decisions),
      };

    try {
      const data = isGlobal
        ? await commitGlobalImport(request).unwrap()
        : await commitWorkspaceImport(request).unwrap();
      setResult(data);
      setStep('done');
      onCommitted(data);
    } catch (error) {
      if (error?.status === 409) {
        setStalePreview(true);
        setFormError(
          'Le référentiel a changé depuis la prévisualisation. Actualisez-la avant de confirmer.',
        );
      } else {
        setFormError(getApiErrorMessage(error, 'L’import n’a pas pu être confirmé.'));
      }
    }
  }

  async function refreshPreview() {
    setFormError('');
    try {
      const data = await runPreview();
      setPreview(data);
      setDecisions({});
      setCandidateVariants({});
      setStalePreview(false);
    } catch (error) {
      setFormError(getApiErrorMessage(
        error,
        'La prévisualisation n’a pas pu être actualisée.',
      ));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !pending) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-y-auto" initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Importer des Produits</DialogTitle>
            <DialogDescription>
              {isGlobal
                ? 'Le fichier alimente le référentiel Produit global. Les données fournisseur, références commerciales, conditionnements et prix restent hors périmètre M-002.'
                : 'Le fichier est rapproché du référentiel global avant rattachement ou création. Les données fournisseur et prix restent hors périmètre M-002.'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <ol className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              {[
                ['upload', '1. Téléverser'],
                ['mapping', '2. Associer'],
                ['preview', '3. Vérifier'],
                ['done', '4. Confirmer'],
              ].map(([value, label]) => (
                <li
                  className={step === value ? 'font-semibold text-foreground' : ''}
                  key={value}
                >
                  {label}
                </li>
              ))}
            </ol>

            {step === 'upload' && (
              <Field>
                <FieldLabel htmlFor="product-import-file">Fichier</FieldLabel>
                <Input
                  accept=".csv,.xls,.xlsx"
                  disabled={pending}
                  id="product-import-file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  type="file"
                />
                <p className="text-sm text-muted-foreground">
                  Formats acceptés : CSV, XLS et XLSX.
                </p>
              </Field>
            )}

            {step === 'mapping' && inspection && (
              <>
                <div className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">
                    {inspection.rowCount} ligne{inspection.rowCount === 1 ? '' : 's'} détectée{inspection.rowCount === 1 ? '' : 's'}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Format : {inspection.format}
                  </p>
                </div>

                {inspection.outOfScopeColumns?.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <p className="font-medium">Colonnes commerciales détectées</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ces colonnes relèvent de M-003 et ne seront pas importées dans l’identité Produit.
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {inspection.outOfScopeColumns.map((column) => (
                        <li key={column.index + ':' + column.header}>{column.header}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {visibleImportFields.map((field) => {
                    const items = field.required
                      ? headerItems.filter((item) => item.value !== EMPTY_OPTION)
                      : headerItems;
                    const selected = mapping[field.key]
                      ?? (field.required ? (headerItems[1]?.value ?? null) : EMPTY_OPTION);

                    return (
                      <Field key={field.key}>
                        <FieldLabel htmlFor={'import-map-' + field.key}>
                          {field.label}{field.required ? ' *' : ''}
                        </FieldLabel>
                        <Select
                          disabled={pending}
                          items={items}
                          onValueChange={(nextValue) => setMapping((current) => ({
                            ...current,
                            [field.key]: nextValue,
                          }))}
                          value={selected}
                        >
                          <SelectTrigger id={'import-map-' + field.key}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    );
                  })}
                </div>

                {(mapping.referenceUnit === EMPTY_OPTION || mapping.referenceUnit === undefined) && (
                  <Field>
                    <FieldLabel htmlFor="import-default-unit">Unité de référence par défaut</FieldLabel>
                    <Select
                      disabled={pending}
                      items={metadata?.referenceUnits ?? []}
                      onValueChange={setDefaultUnit}
                      value={defaultUnit || null}
                    >
                      <SelectTrigger id="import-default-unit">
                        <SelectValue placeholder="Sélectionner une unité" />
                      </SelectTrigger>
                      <SelectContent>
                        {(metadata?.referenceUnits ?? []).map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {(mapping.category === EMPTY_OPTION || mapping.category === undefined) && (
                  <Field>
                    <FieldLabel htmlFor="import-default-category">
                      Catégorie par défaut pour les nouvelles références
                    </FieldLabel>
                    <Select
                      disabled={pending}
                      items={[
                        { value: EMPTY_OPTION, label: 'Aucune catégorie par défaut' },
                        ...activeCategories.map((category) => ({
                          value: category.id,
                          label: category.name,
                        })),
                      ]}
                      onValueChange={setDefaultCategoryId}
                      value={defaultCategoryId}
                    >
                      <SelectTrigger id="import-default-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_OPTION}>Aucune catégorie par défaut</SelectItem>
                        {activeCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {(mapping.conservationType === EMPTY_OPTION || mapping.conservationType === undefined) && (
                  <Field>
                    <FieldLabel htmlFor="import-default-conservation">
                      Conservation par défaut *
                    </FieldLabel>
                    <Select
                      disabled={pending}
                      items={metadata?.conservationTypes ?? []}
                      onValueChange={setDefaultConservationType}
                      value={defaultConservationType || null}
                    >
                      <SelectTrigger id="import-default-conservation">
                        <SelectValue placeholder="Sélectionner une conservation" />
                      </SelectTrigger>
                      <SelectContent>
                        {(metadata?.conservationTypes ?? []).map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {(mapping.foodRange === EMPTY_OPTION || mapping.foodRange === undefined) && (
                  <Field>
                    <FieldLabel htmlFor="import-default-food-range">
                      Gamme par défaut
                    </FieldLabel>
                    <Select
                      disabled={pending}
                      items={[
                        { value: EMPTY_OPTION, label: 'Aucune gamme par défaut' },
                        ...(metadata?.foodRanges ?? []).map((range) => ({
                          value: String(range.value),
                          label: range.label + ' — ' + range.name,
                        })),
                      ]}
                      onValueChange={setDefaultFoodRange}
                      value={defaultFoodRange}
                    >
                      <SelectTrigger id="import-default-food-range">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_OPTION}>Aucune gamme par défaut</SelectItem>
                        {(metadata?.foodRanges ?? []).map((range) => (
                          <SelectItem key={range.value} value={String(range.value)}>
                            {range.label} — {range.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </>
            )}

            {step === 'preview' && preview && (
              <>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview.counts ?? {}).map(([classification, count]) => {
                    const presentation = getImportClassificationPresentation(classification);
                    if (!count) return null;
                    return (
                      <StatusBadge key={classification} tone={presentation.tone}>
                        {presentation.label} : {count}
                      </StatusBadge>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {(preview.rows ?? []).map((row) => {
                    const presentation = getImportClassificationPresentation(row.classification);
                    const decision = decisions[row.rowNumber];
                    const candidateChoice = candidateVariants[row.rowNumber];

                    return (
                      <article className="rounded-lg border border-border p-4" key={row.rowNumber}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              Ligne {row.rowNumber} · {row.data?.name || 'Produit non renseigné'}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {presentation.description}
                            </p>
                          </div>
                          <StatusBadge tone={presentation.tone}>
                            {presentation.label}
                          </StatusBadge>
                        </div>

                        {row.errors?.length > 0 && (
                          <ul className="mt-3 list-disc pl-5 text-sm text-destructive">
                            {row.errors.map((error) => <li key={error}>{error}</li>)}
                          </ul>
                        )}
                        {row.warnings?.length > 0 && (
                          <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
                            {row.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                          </ul>
                        )}

                        {row.missingDimensions?.length > 0 && (
                          <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
                            <p className="font-medium">Dimensions à enrichir</p>
                            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                              {row.missingDimensions.map((dimension, index) => (
                                <li key={
                                  dimension.type
                                  + ':'
                                  + (dimension.kind ?? '')
                                  + ':'
                                  + dimension.value
                                  + ':'
                                  + index
                                }>
                                  {dimension.type === 'VARIETY'
                                    ? 'Variété'
                                    : characteristicKindLabels.get(dimension.kind)
                                      ?? 'Caractéristique'}
                                  {' : '}
                                  {dimension.value}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {row.classification === 'REVIEW_REQUIRED' && (
                          row.reviewMode === 'REFERENCE_GOVERNANCE' ? (
                            <div className="mt-4 space-y-3 border-t border-border pt-3">
                              <p className="text-sm font-medium">
                                Revue du référentiel global
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Cette nouvelle identité sera soumise à la gouvernance.
                                Elle ne sera pas publiée automatiquement par cet import Workspace.
                              </p>
                              {decision?.action === 'SKIP' ? (
                                <Button
                                  disabled={pending}
                                  onClick={() => clearDecision(row.rowNumber)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Inclure à nouveau
                                </Button>
                              ) : (
                                <Button
                                  disabled={pending}
                                  onClick={() => setDecision(row.rowNumber, {
                                    rowNumber: row.rowNumber,
                                    action: 'SKIP',
                                  })}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  Ignorer cette proposition
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="mt-4 space-y-3 border-t border-border pt-3">
                              <p className="text-sm font-medium">Produits proches</p>
                              <div className="flex flex-wrap gap-2">
                                {(row.candidates ?? []).map((candidate) => (
                                  <Button
                                    disabled={pending || candidate.status !== 'ACTIVE'}
                                    key={candidate.id}
                                    onClick={() => chooseCandidate(row, candidate)}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    {candidate.status === 'ACTIVE'
                                      ? 'Utiliser ' + candidate.name
                                      : candidate.name + ' · archivé'}
                                  </Button>
                                ))}
                                <Button
                                  disabled={pending}
                                  onClick={() => setDecision(row.rowNumber, {
                                    rowNumber: row.rowNumber,
                                    action: 'CREATE_NEW',
                                  })}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Soumettre comme nouvelle référence
                                </Button>
                                <Button
                                  disabled={pending}
                                  onClick={() => setDecision(row.rowNumber, {
                                    rowNumber: row.rowNumber,
                                    action: 'SKIP',
                                  })}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  Ignorer
                                </Button>
                              </div>

                              {candidateChoice?.variants?.length > 1 && (
                                <Field>
                                  <FieldLabel htmlFor={'candidate-variant-' + row.rowNumber}>
                                    Référence existante
                                  </FieldLabel>
                                  <Select
                                    items={candidateChoice.variants.map((variant) => ({
                                      value: variant.id,
                                      label: getVariantLabel(variant)
                                        + ' · '
                                        + getReferenceUnitLabel(metadata, variant.referenceUnit),
                                    }))}
                                    onValueChange={(variantId) => setDecision(row.rowNumber, {
                                      rowNumber: row.rowNumber,
                                      action: 'ATTACH_EXISTING',
                                      variantId,
                                    })}
                                    value={decision?.variantId ?? null}
                                  >
                                    <SelectTrigger id={'candidate-variant-' + row.rowNumber}>
                                      <SelectValue placeholder="Choisir une référence" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {candidateChoice.variants.map((variant) => (
                                        <SelectItem key={variant.id} value={variant.id}>
                                          {getVariantLabel(variant)}
                                          {' · '}
                                          {getReferenceUnitLabel(metadata, variant.referenceUnit)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </Field>
                              )}

                              {candidateChoice?.variants?.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Aucune référence active de ce candidat ne peut être utilisée.
                                </p>
                              )}

                              {decision && (
                                <p className="text-sm font-medium">
                                  Décision enregistrée : {
                                    decision.action === 'ATTACH_EXISTING'
                                      ? 'utiliser l’existant'
                                      : decision.action === 'CREATE_NEW'
                                        ? 'soumettre une nouvelle référence'
                                        : 'ignorer'
                                  }.
                                </p>
                              )}
                            </div>
                          )
                        )}

                        {!['INVALID', 'REVIEW_REQUIRED'].includes(row.classification) && (
                          <div className="mt-3 flex justify-end">
                            {decision?.action === 'SKIP' ? (
                              <Button
                                disabled={pending}
                                onClick={() => clearDecision(row.rowNumber)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Inclure à nouveau
                              </Button>
                            ) : (
                              <Button
                                disabled={pending}
                                onClick={() => setDecision(row.rowNumber, {
                                  rowNumber: row.rowNumber,
                                  action: 'SKIP',
                                })}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                Ignorer cette ligne
                              </Button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            {step === 'done' && result && (
              <div className="rounded-lg border border-border p-5">
                <h3 className="font-semibold">Import terminé</h3>
                <dl className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="text-xl font-semibold">{result.total}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Traitées</dt><dd className="text-xl font-semibold">{result.succeeded}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Échecs</dt><dd className="text-xl font-semibold">{result.failed}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Ignorées</dt><dd className="text-xl font-semibold">{result.skipped}</dd></div>
                </dl>
              </div>
            )}

            <FieldError>{formError}</FieldError>

            {stalePreview && (
              <Button
                disabled={pending}
                onClick={refreshPreview}
                type="button"
                variant="outline"
              >
                Actualiser la prévisualisation
              </Button>
            )}
          </div>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              {step === 'done' ? 'Fermer' : 'Annuler'}
            </DialogClose>

            {step === 'upload' && (
              <Button disabled={pending || !file} onClick={inspect} type="button">
                {(inspectWorkspaceState.isLoading || inspectGlobalState.isLoading)
                  ? 'Analyse…'
                  : 'Analyser le fichier'}
              </Button>
            )}
            {step === 'mapping' && (
              <Button disabled={pending} onClick={generatePreview} type="button">
                {(previewWorkspaceState.isLoading || previewGlobalState.isLoading)
                  ? 'Préparation…'
                  : 'Prévisualiser'}
              </Button>
            )}
            {step === 'preview' && (
              <Button disabled={pending || stalePreview} onClick={commit} type="button">
                {(commitWorkspaceState.isLoading || commitGlobalState.isLoading)
                  ? 'Confirmation…'
                  : 'Confirmer l’import'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export {
  IMPORT_FIELDS,
  ProductImportDialog,
  buildMappingPayload,
};
