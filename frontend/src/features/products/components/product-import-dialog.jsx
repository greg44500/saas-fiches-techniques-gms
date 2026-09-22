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
  { key: 'aliases', label: 'Alias' },
  { key: 'category', label: 'Catégorie' },
  { key: 'form', label: 'Forme' },
  { key: 'processingState', label: 'État / transformation' },
  { key: 'preservation', label: 'Conservation' },
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
  onClose,
  onCommitted,
  open,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [mapping, setMapping] = useState({});
  const [defaultUnit, setDefaultUnit] = useState(
    metadata?.referenceUnits?.[0]?.value ?? '',
  );
  const [preview, setPreview] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [candidateVariants, setCandidateVariants] = useState({});
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState('');
  const [stalePreview, setStalePreview] = useState(false);

  const [inspectImport, inspectState] = useInspectProductImportMutation();
  const [previewImport, previewState] = usePreviewProductImportMutation();
  const [commitImport, commitState] = useCommitProductImportMutation();
  const [loadProductDetail, candidateState] = useLazyGetWorkspaceProductDetailQuery();

  useEffect(() => {
    if (!open) return;
    setStep('upload');
    setFile(null);
    setInspection(null);
    setMapping({});
    setDefaultUnit(metadata?.referenceUnits?.[0]?.value ?? '');
    setPreview(null);
    setDecisions({});
    setCandidateVariants({});
    setResult(null);
    setFormError('');
    setStalePreview(false);
  }, [metadata, open]);

  const pending = (
    inspectState.isLoading
    || previewState.isLoading
    || commitState.isLoading
    || candidateState.isFetching
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
      const data = await inspectImport({ workspaceId, file }).unwrap();
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
    const defaults = defaultUnit ? { referenceUnit: defaultUnit } : {};

    return {
      workspaceId,
      importId: inspection.importId,
      mapping: mappingPayload,
      defaults,
    };
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

    setFormError('');
    try {
      const data = await previewImport(getPreviewRequest()).unwrap();
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
    try {
      const detail = await loadProductDetail({
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
    try {
      const data = await commitImport({
        workspaceId,
        importId: inspection.importId,
        decisions: Object.values(decisions),
      }).unwrap();
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
      const data = await previewImport(getPreviewRequest()).unwrap();
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
              Le fichier est analysé temporairement puis les références sont revues avant confirmation. Les données fournisseur et prix restent hors périmètre.
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
                    <p className="font-medium">Colonnes hors périmètre M-002</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ces colonnes semblent concerner les fournisseurs, références commerciales ou prix. Elles ne seront pas importées ici.
                    </p>
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {inspection.outOfScopeColumns.map((column) => (
                        <li key={column.index + ':' + column.header}>{column.header}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {IMPORT_FIELDS.map((field) => {
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

                        {row.classification === 'REVIEW_REQUIRED' && (
                          <div className="mt-4 space-y-3 border-t border-border pt-3">
                            <p className="text-sm font-medium">Produits proches</p>
                            <div className="flex flex-wrap gap-2">
                              {(row.candidates ?? []).map((candidate) => (
                                <Button
                                  disabled={pending}
                                  key={candidate.id}
                                  onClick={() => chooseCandidate(row, candidate)}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Utiliser {candidate.name}
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
                                Créer une nouvelle référence
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
                                  Déclinaison à rattacher
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
                                    <SelectValue placeholder="Choisir une déclinaison" />
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
                                Aucune déclinaison active de ce candidat ne peut être rattachée.
                              </p>
                            )}

                            {decision && (
                              <p className="text-sm font-medium">
                                Décision enregistrée : {
                                  decision.action === 'ATTACH_EXISTING'
                                    ? 'utiliser l’existant'
                                    : decision.action === 'CREATE_NEW'
                                      ? 'créer une nouvelle référence'
                                      : 'ignorer'
                                }.
                              </p>
                            )}
                          </div>
                        )}

                        {!['INVALID', 'PRIVATE_CONFLICT', 'REVIEW_REQUIRED'].includes(row.classification) && (
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
                {inspectState.isLoading ? 'Analyse…' : 'Analyser le fichier'}
              </Button>
            )}
            {step === 'mapping' && (
              <Button disabled={pending} onClick={generatePreview} type="button">
                {previewState.isLoading ? 'Préparation…' : 'Prévisualiser'}
              </Button>
            )}
            {step === 'preview' && (
              <Button disabled={pending || stalePreview} onClick={commit} type="button">
                {commitState.isLoading ? 'Confirmation…' : 'Confirmer l’import'}
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
