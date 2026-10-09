import { useEffect, useMemo, useRef, useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCommitGlobalSupplierCatalogImportMutation,
  useCommitSupplierCatalogImportMutation,
  useInspectGlobalSupplierCatalogImportMutation,
  useInspectSupplierCatalogImportMutation,
  usePreviewGlobalSupplierCatalogImportMutation,
  usePreviewSupplierCatalogImportMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getApiErrorMessage,
  getImportClassificationLabel,
} from '@/features/suppliers/lib/supplier-presentation';

const NONE = '__NONE__';

const MAPPING_FIELDS = Object.freeze([
  ['supplierReference', 'Référence fournisseur'],
  ['designation', 'Désignation'],
  ['brand', 'Marque'],
  ['containerType', 'Contenant'],
  ['unitCount', 'Nombre d’unités'],
  ['quantityPerUnit', 'Quantité par unité'],
  ['unit', 'Unité'],
  ['netWeight', 'Poids net'],
  ['netWeightUnit', 'Unité du poids net'],
  ['drainedNetWeight', 'Poids net égoutté'],
  ['drainedNetWeightUnit', 'Unité du poids net égoutté'],
  ['supplierLabel', 'Libellé fournisseur du conditionnement'],
  ['priceAmount', 'Prix HT'],
  ['priceBasis', 'Unité du prix (Kilo, Pièce, etc.)'],
]);

function autoDetectMapping(headers) {
  const normalized = headers.map((header) =>
    header.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, ''));

  const find = (...terms) => normalized.findIndex((header) =>
    terms.some((term) => header.includes(term)));
  const findExact = (...terms) => normalized.findIndex((header) =>
    terms.includes(header.trim()));
  const findWithout = (excludedTerms, ...terms) =>
    normalized.findIndex((header) =>
      terms.some((term) => header.includes(term))
      && !excludedTerms.some((term) => header.includes(term)));

  const candidates = {
    supplierReference: find('reference', 'ref article', 'code article', 'sku'),
    designation: find('designation', 'produit', 'libelle'),
    brand: find('marque', 'brand'),
    containerType: find('conditionnement', 'contenant', 'colisage'),
    unitCount: findExact('unites', 'nb unites', 'nombre unites'),
    quantityPerUnit: find(
      'quantite par unite',
      'qte par unite',
      'quantite unite',
      'qte unite',
      'grammage',
    ),
    unit: findExact('unite', 'unit', 'uom'),
    netWeight: findWithout(['egoutte'], 'poids net'),
    netWeightUnit: findWithout(
      ['egoutte'],
      'unite poids net',
      'unite du poids net',
    ),
    drainedNetWeight: find(
      'poids net egoutte',
      'poids egoutte',
    ),
    drainedNetWeightUnit: find(
      'unite poids net egoutte',
      'unite poids egoutte',
    ),
    supplierLabel: find(
      'libelle fournisseur',
      'libelle conditionnement',
    ),
    priceAmount: find('prix ht', 'prix', 'tarif', 'price'),
    priceBasis: find('base', 'unite prix', 'prix par'),
  };

  return Object.fromEntries(
    Object.entries(candidates)
      .filter(([, index]) => index >= 0)
      .map(([key, index]) => [key, index]),
  );
}

function SupplierCatalogImportDialog({
  mode = 'workspace',
  onClose,
  onCommitted,
  open,
  suppliers,
  workspaceId,
}) {
  const isGlobal = mode === 'global';
  const cancelRef = useRef(null);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [inspectResult, setInspectResult] = useState(null);
  const [supplierId, setSupplierId] = useState(NONE);
  const [editionName, setEditionName] = useState('');
  const [editionDate, setEditionDate] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  const [inspectWorkspace, inspectWorkspaceState] =
    useInspectSupplierCatalogImportMutation();
  const [previewWorkspace, previewWorkspaceState] =
    usePreviewSupplierCatalogImportMutation();
  const [commitWorkspace, commitWorkspaceState] =
    useCommitSupplierCatalogImportMutation();

  const [inspectGlobal, inspectGlobalState] =
    useInspectGlobalSupplierCatalogImportMutation();
  const [previewGlobal, previewGlobalState] =
    usePreviewGlobalSupplierCatalogImportMutation();
  const [commitGlobal, commitGlobalState] =
    useCommitGlobalSupplierCatalogImportMutation();

  const pending = [
    inspectWorkspaceState,
    previewWorkspaceState,
    commitWorkspaceState,
    inspectGlobalState,
    previewGlobalState,
    commitGlobalState,
  ].some(({ isLoading }) => isLoading);

  useEffect(() => {
    if (!open) return;

    setFile(null);
    setInspectResult(null);
    setSupplierId(NONE);
    setEditionName('');
    setEditionDate('');
    setValidFrom('');
    setValidTo('');
    setMapping({});
    setPreview(null);
    setError('');
  }, [open]);

  const invalidCount = preview?.counts?.INVALID ?? 0;

  const headerItems = useMemo(() => (
    inspectResult?.headers?.map((header, index) => ({
      value: String(index),
      label: header,
    })) ?? []
  ), [inspectResult?.headers]);

  async function inspect() {
    if (!file) {
      setError('Sélectionnez un fichier CSV, XLS ou XLSX.');
      return;
    }

    try {
      const result = isGlobal
        ? await inspectGlobal({ file }).unwrap()
        : await inspectWorkspace({ workspaceId, file }).unwrap();

      setInspectResult(result);
      setMapping(autoDetectMapping(result.headers ?? []));
      setPreview(null);
      setError('');
    } catch (inspectionError) {
      setError(getApiErrorMessage(
        inspectionError,
        'Le fichier n’a pas pu être inspecté.',
      ));
    }
  }

  function updateMapping(field, value) {
    setMapping((current) => {
      const next = { ...current };

      if (value === NONE) {
        delete next[field];
      } else {
        next[field] = Number(value);
      }

      return next;
    });
    setPreview(null);
  }

  async function runPreview() {
    if (supplierId === NONE) {
      setError('Sélectionnez le Fournisseur du catalogue.');
      return;
    }
    if (!editionName.trim()) {
      setError('Renseignez le nom de l’édition.');
      return;
    }
    if (
      !Number.isInteger(mapping.supplierReference)
      && !Number.isInteger(mapping.designation)
    ) {
      setError('Mappez au minimum la référence fournisseur ou la désignation.');
      return;
    }

    const body = {
      supplierId,
      edition: {
        name: editionName.trim(),
        editionDate: editionDate ? new Date(editionDate).toISOString() : null,
        validFrom: validFrom ? new Date(validFrom).toISOString() : null,
        validTo: validTo ? new Date(validTo).toISOString() : null,
      },
      mapping,
      defaults: { currency: 'EUR' },
      decisions: [],
    };

    try {
      const result = isGlobal
        ? await previewGlobal({
          importId: inspectResult.importId,
          ...body,
        }).unwrap()
        : await previewWorkspace({
          workspaceId,
          importId: inspectResult.importId,
          ...body,
        }).unwrap();

      setPreview(result);
      setError('');
    } catch (previewError) {
      setError(getApiErrorMessage(
        previewError,
        'La prévisualisation n’a pas pu être générée.',
      ));
    }
  }

  async function commit() {
    if (!preview || invalidCount > 0) return;

    try {
      const result = isGlobal
        ? await commitGlobal({
          importId: inspectResult.importId,
        }).unwrap()
        : await commitWorkspace({
          workspaceId,
          importId: inspectResult.importId,
        }).unwrap();

      onCommitted(result);
    } catch (commitError) {
      setError(getApiErrorMessage(
        commitError,
        'L’import n’a pas pu être confirmé.',
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
        <DialogContent
          className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-y-auto"
          initialFocus={cancelRef}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>Importer un catalogue fournisseur</DialogTitle>
              <InfoTooltip
                content="Le fichier reste temporaire. Les écritures définitives ne sont effectuées qu’à la confirmation."
                label="À propos de l’import d’un catalogue fournisseur"
              />
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-6">
            {!inspectResult && (
              <section className="space-y-4">
                <Field>
                  <div className="flex items-center gap-1">
                    <FieldLabel htmlFor="supplier-catalog-file">Fichier</FieldLabel>
                    <InfoTooltip
                      content="Formats autorisés : CSV, XLS et XLSX."
                      label="Formats de fichier autorisés"
                    />
                  </div>
                  <Input
                    accept=".csv,.xls,.xlsx"
                    className="sr-only"
                    id="supplier-catalog-file"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setError('');
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                      variant="outline"
                    >
                      Choisir un fichier
                    </Button>
                    <p
                      aria-live="polite"
                      className="text-sm text-muted-foreground"
                    >
                      {file
                        ? 'Fichier choisi : ' + file.name
                        : 'Pas de fichier pour le moment'}
                    </p>
                  </div>
                </Field>
                <Button disabled={pending || !file} onClick={inspect} type="button">
                  {pending ? 'Inspection…' : 'Inspecter le fichier'}
                </Button>
              </section>
            )}

            {inspectResult && (
              <>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field className="sm:col-span-2">
                    <FieldLabel>Fournisseur</FieldLabel>
                    <Select
                      items={[
                        { value: NONE, label: 'Sélectionner' },
                        ...suppliers.map((supplier) => ({
                          value: supplier.id,
                          label: supplier.name,
                        })),
                      ]}
                      onValueChange={(value) => {
                        setSupplierId(value);
                        setPreview(null);
                      }}
                      value={supplierId}
                    >
                      <SelectTrigger aria-label="Fournisseur du catalogue">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sélectionner</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="supplier-catalog-edition">
                      Édition
                    </FieldLabel>
                    <Input
                      id="supplier-catalog-edition"
                      maxLength={180}
                      onChange={(event) => {
                        setEditionName(event.target.value);
                        setPreview(null);
                      }}
                      placeholder="Ex. Septembre 2026"
                      value={editionName}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="supplier-catalog-edition-date">
                      Date d’édition
                    </FieldLabel>
                    <DatePicker
                      id="supplier-catalog-edition-date"
                      onChange={(value) => {
                        setEditionDate(value);
                        setPreview(null);
                      }}
                      value={editionDate}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="supplier-catalog-valid-from">
                      Valide à partir du
                    </FieldLabel>
                    <DatePicker
                      id="supplier-catalog-valid-from"
                      max={validTo || undefined}
                      onChange={(value) => {
                        setValidFrom(value);
                        setPreview(null);
                      }}
                      value={validFrom}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="supplier-catalog-valid-to">
                      Valide jusqu’au
                    </FieldLabel>
                    <DatePicker
                      id="supplier-catalog-valid-to"
                      min={validFrom || undefined}
                      onChange={(value) => {
                        setValidTo(value);
                        setPreview(null);
                      }}
                      value={validTo}
                    />
                  </Field>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Mapping des colonnes</h3>
                    <InfoTooltip
                      content="Associez les colonnes utiles. Les autres colonnes sont ignorées. En V1, la devise est fixée à l’euro (EUR)."
                      label="À propos du mapping des colonnes"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {MAPPING_FIELDS.map(([field, label]) => (
                      <Field key={field}>
                        <FieldLabel>{label}</FieldLabel>
                        <Select
                          items={[
                            { value: NONE, label: 'Non mappé' },
                            ...headerItems,
                          ]}
                          onValueChange={(value) => updateMapping(field, value)}
                          value={
                            Number.isInteger(mapping[field])
                              ? String(mapping[field])
                              : NONE
                          }
                        >
                          <SelectTrigger aria-label={'Colonne ' + label}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Non mappé</SelectItem>
                            {headerItems.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    ))}
                  </div>

                  <Button disabled={pending} onClick={runPreview} type="button">
                    {previewWorkspaceState.isLoading || previewGlobalState.isLoading
                      ? 'Prévisualisation…'
                      : 'Prévisualiser'}
                  </Button>
                </section>
              </>
            )}

            {preview && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Prévisualisation</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {preview.rows.length} ligne(s) analysée(s).
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(preview.counts ?? {}).map(([classification, count]) => (
                      <StatusBadge
                        key={classification}
                        tone={classification === 'INVALID'
                          ? 'destructive'
                          : classification === 'MATCHED'
                            ? 'success'
                            : 'warning'}
                      >
                        {getImportClassificationLabel(classification)} : {count}
                      </StatusBadge>
                    ))}
                  </div>
                </div>

                <div className="max-h-72 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2">Ligne</th>
                        <th className="px-3 py-2">Référence</th>
                        <th className="px-3 py-2">Désignation</th>
                        <th className="px-3 py-2">État</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.supplierReference || '—'}</td>
                          <td className="px-3 py-2">{row.designation || '—'}</td>
                          <td className="px-3 py-2">
                            <span>{getImportClassificationLabel(row.classification)}</span>
                            {row.errors?.length > 0 && (
                              <p className="mt-1 text-xs text-destructive">
                                {row.errors.join(' ')}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {invalidCount > 0 && (
                  <p className="text-sm text-destructive">
                    Corrigez le fichier ou le mapping avant de confirmer : les lignes invalides bloquent l’import.
                  </p>
                )}
              </section>
            )}

            <FieldError>{error}</FieldError>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Fermer
            </DialogClose>
            {preview && (
              <Button
                disabled={pending || invalidCount > 0}
                onClick={commit}
                type="button"
              >
                {commitWorkspaceState.isLoading || commitGlobalState.isLoading
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
  MAPPING_FIELDS,
  SupplierCatalogImportDialog,
  autoDetectMapping,
};
