import { SupplierImportSelector } from '@/features/suppliers/components/supplier-import-selector';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DialogContent, DialogOverlay, DialogPortal, DialogRoot,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ImportFilePicker } from '@/features/imports/components/import-file-picker';
import { ImportWizardFooter } from '@/features/imports/components/import-wizard-footer';
import { ImportWizardHeader } from '@/features/imports/components/import-wizard-header';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useCommitGlobalSupplierArticleImportMutation,
  useCommitSupplierArticleImportMutation,
  useInspectGlobalSupplierArticleImportMutation,
  useInspectSupplierArticleImportMutation,
  usePreviewGlobalSupplierArticleImportMutation,
  usePreviewSupplierArticleImportMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  autoDetectMapping,
} from '@/features/suppliers/components/supplier-catalog-import-dialog';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

const NONE = '__NONE__';
const ARTICLE_FIELDS = Object.freeze([
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
  ['supplierLabel', 'Libellé du conditionnement'],
  ['priceAmount', 'Prix HT'],
  ['priceBasis', 'Unité du prix (si présente dans le fichier)'],
  ['currency', 'Devise (si présente dans le fichier)'],
]);

const CLASSIFICATIONS = {
  CREATE: 'À créer',
  UPDATE: 'À actualiser',
  UNCHANGED: 'Déjà à jour',
  SHARED: 'Article partagé existant',
  SKIPPED: 'À résoudre (sans référence)',
  INVALID: 'À corriger',
};

function SupplierArticleImportDialog({
  mode = 'workspace', onClose, onCommitted, canCreateSupplier = false, open, suppliers, workspaceId,
}) {
  const isGlobal = mode === 'global';
  const cancelRef = useRef(null);
  const [file, setFile] = useState(null);
  const [inspected, setInspected] = useState(null);
  const [supplierId, setSupplierId] = useState(NONE);
  const [mapping, setMapping] = useState({});
  const [importPrices, setImportPrices] = useState(true);
  const [hasDefinedValidity, setHasDefinedValidity] = useState(false);
  const [priceListName, setPriceListName] = useState('');
  const [priceValidFrom, setPriceValidFrom] = useState('');
  const [priceValidTo, setPriceValidTo] = useState('');
  const [priceListSource, setPriceListSource] = useState('');
  const [defaultPriceBasis, setDefaultPriceBasis] = useState('PACKAGE');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [inspectWorkspace, inspectWorkspaceState] =
    useInspectSupplierArticleImportMutation();
  const [previewWorkspace, previewWorkspaceState] =
    usePreviewSupplierArticleImportMutation();
  const [commitWorkspace, commitWorkspaceState] =
    useCommitSupplierArticleImportMutation();
  const [inspectGlobal, inspectGlobalState] =
    useInspectGlobalSupplierArticleImportMutation();
  const [previewGlobal, previewGlobalState] =
    usePreviewGlobalSupplierArticleImportMutation();
  const [commitGlobal, commitGlobalState] =
    useCommitGlobalSupplierArticleImportMutation();

  const pending = [
    inspectWorkspaceState, previewWorkspaceState, commitWorkspaceState,
    inspectGlobalState, previewGlobalState, commitGlobalState,
  ].some((state) => state.isLoading);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setInspected(null);
    setSupplierId(NONE);
    setMapping({});
    setImportPrices(true);
    setHasDefinedValidity(false);
    setPriceListName('');
    setPriceValidFrom('');
    setPriceValidTo('');
    setPriceListSource('');
    setDefaultPriceBasis('PACKAGE');
    setPreview(null);
    setResult(null);
    setError('');
  }, [open]);

  const headers = useMemo(() => inspected?.headers?.map((name, index) => ({
    value: String(index), label: name,
  })) ?? [], [inspected?.headers]);

  async function inspect() {
    if (!file) {
      setError('Sélectionnez un fichier CSV, XLS ou XLSX.');
      return;
    }
    try {
      const result = isGlobal
        ? await inspectGlobal({ file }).unwrap()
        : await inspectWorkspace({ workspaceId, file }).unwrap();
      const detected = autoDetectMapping(result.headers ?? []);
      setInspected(result);
      setMapping(Object.fromEntries(
        Object.entries(detected).filter(([key]) => (
          ARTICLE_FIELDS.some(([field]) => field === key)
        )),
      ));
      setPreview(null);
      setError('');
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Inspection du fichier impossible.'));
    }
  }

  function changeMapping(field, value) {
    setMapping((current) => {
      const next = { ...current };
      if (value === NONE) delete next[field];
      else next[field] = Number(value);
      return next;
    });
    setPreview(null);
  }

  async function previewImport() {
    if (supplierId === NONE) {
      setError('Sélectionnez le Fournisseur concerné.');
      return;
    }
    if (!Number.isInteger(mapping.supplierReference)) {
      setError('Associez une colonne à la référence fournisseur pour créer des Articles.');
      return;
    }
    const hasPrices = importPrices && Number.isInteger(mapping.priceAmount);
    if (hasPrices && hasDefinedValidity && (!priceListName.trim() || !priceValidFrom)) {
      setError('Renseignez la référence de la liste et le début de sa validité.');
      return;
    }
    if (hasPrices && hasDefinedValidity && priceValidTo && priceValidTo < priceValidFrom) {
      setError('La date de fin ne peut pas précéder la date de début.');
      return;
    }
    // Exclure les colonnes tarifaires si l'utilisateur choisit de n'importer
    // que les Articles, même lorsque le fichier contient des prix.
    const effectiveMapping = hasPrices
      ? mapping
      : Object.fromEntries(Object.entries(mapping).filter(([field]) => (
        !['priceAmount', 'priceBasis', 'currency'].includes(field)
      )));
    try {
      const body = {
        importId: inspected.importId, supplierId, mapping: effectiveMapping,
        ...(hasPrices ? {
          priceList: hasDefinedValidity
            ? {
              validityMode: 'DEFINED',
              name: priceListName.trim(),
              validFrom: priceValidFrom,
              validTo: priceValidTo || null,
              source: priceListSource.trim() || null,
              defaultPriceBasis,
            }
            : {
              validityMode: 'FROM_IMPORT',
              defaultPriceBasis,
            },
        } : {}),
      };
      const result = isGlobal
        ? await previewGlobal(body).unwrap()
        : await previewWorkspace({ workspaceId, ...body }).unwrap();
      setPreview(result);
      setError('');
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Prévisualisation impossible.'));
    }
  }

  async function confirmImport() {
    try {
      const body = { importId: inspected.importId };
      const result = isGlobal
        ? await commitGlobal(body).unwrap()
        : await commitWorkspace({ workspaceId, ...body }).unwrap();
      setResult(result);
      onCommitted(result);
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Confirmation impossible.'));
    }
  }

  const invalid = (preview?.counts?.INVALID ?? 0) > 0;
  const step = result ? 'done' : preview ? 'preview' : inspected ? 'mapping' : 'upload';

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(value) => { if (!value && !pending) onClose(); }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-x-hidden overflow-y-auto"
          initialFocus={cancelRef}
        >
          <ImportWizardHeader
            helpText="Ajoutez les Articles d’un Fournisseur à partir d’un fichier. Les références existantes seront reconnues. Vous pourrez ensuite associer les nouveaux Articles aux Produits correspondants."
            step={step}
            title="Importer des Articles fournisseur"
          />

          <div className="mt-5 min-w-0 space-y-5">
            {step === 'upload' && (
              <ImportFilePicker
                disabled={pending}
                file={file}
                id="article-import-file"
                onChange={(value) => {
                  setFile(value);
                  setError('');
                }}
              />
            )}
            {step === 'mapping' && inspected && (
              <section className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {inspected.rowCount} ligne(s) lue(s) dans le fichier {inspected.format}.
                </p>
                <SupplierImportSelector
                  ariaLabel="Fournisseur des Articles"
                  canCreate={canCreateSupplier}
                  mode={mode}
                  onChange={(id) => { setSupplierId(id); setPreview(null); }}
                  suppliers={suppliers}
                  value={supplierId}
                  workspaceId={workspaceId}
                />
                <h3 className="font-medium">Correspondance des colonnes</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ARTICLE_FIELDS.map(([field, label]) => (
                    <Field key={field}>
                      <FieldLabel>{label}</FieldLabel>
                      <Select
                        items={[
                          { value: NONE, label: 'Non mappé' },
                          ...headers,
                        ]}
                        onValueChange={(value) => changeMapping(field, value)}
                        value={Number.isInteger(mapping[field])
                          ? String(mapping[field]) : NONE}
                      >
                        <SelectTrigger aria-label={'Colonne ' + label}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Non mappé</SelectItem>
                          {headers.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  ))}
                </div>
                {Number.isInteger(mapping.priceAmount) && (
                  <section className="space-y-4 rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={importPrices}
                        id="article-import-prices"
                        onChange={(event) => {
                          setImportPrices(event.target.checked);
                          setPreview(null);
                          setError('');
                        }}
                      />
                      <div className="space-y-1">
                        <label className="cursor-pointer font-medium" htmlFor="article-import-prices">
                          Importer les prix présents dans le fichier
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Les prix seront conservés indépendamment d’un catalogue fournisseur.
                        </p>
                      </div>
                    </div>
                    {importPrices && (
                      <div className="space-y-4 border-t border-border pt-4">
                        <Field>
                          <FieldLabel>À quoi correspond le prix indiqué dans le fichier ?</FieldLabel>
                          <Select
                            items={[
                              { value: 'PACKAGE', label: 'Par carton, sac ou colis' },
                              { value: 'KG', label: 'Au kilogramme' },
                              { value: 'G', label: 'Au gramme' },
                              { value: 'L', label: 'Au litre' },
                              { value: 'ML', label: 'Au millilitre' },
                              { value: 'CL', label: 'Au centilitre' },
                              { value: 'UNIT', label: 'À la pièce / unité' },
                            ]}
                            onValueChange={(value) => {
                              setDefaultPriceBasis(value);
                              setPreview(null);
                            }}
                            value={defaultPriceBasis}
                          >
                            <SelectTrigger aria-label="À quoi correspond le prix indiqué dans le fichier ?">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PACKAGE">Par carton, sac ou colis</SelectItem>
                              <SelectItem value="KG">Au kilogramme</SelectItem>
                              <SelectItem value="G">Au gramme</SelectItem>
                              <SelectItem value="L">Au litre</SelectItem>
                              <SelectItem value="ML">Au millilitre</SelectItem>
                              <SelectItem value="CL">Au centilitre</SelectItem>
                              <SelectItem value="UNIT">À la pièce / unité</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Si le fichier contient une colonne « Unité du prix » associée,
                            elle sera prioritaire pour chaque ligne.
                          </p>
                        </Field>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={hasDefinedValidity}
                            id="article-price-has-period"
                            onChange={(event) => {
                              setHasDefinedValidity(event.target.checked);
                              setPreview(null);
                              setError('');
                            }}
                          />
                          <div className="space-y-1">
                            <label className="cursor-pointer font-medium" htmlFor="article-price-has-period">
                              Ces prix ont une période de validité définie
                            </label>
                            <p className="text-sm text-muted-foreground">
                              Sinon, ils seront applicables dès la confirmation de l’import,
                              sans date d’expiration renseignée.
                            </p>
                          </div>
                        </div>
                        {hasDefinedValidity && (
                          <div className="grid gap-3 rounded-lg bg-muted/30 p-3 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="article-price-list-name">Référence de la liste de prix</FieldLabel>
                              <Input
                                id="article-price-list-name"
                                maxLength={180}
                                onChange={(event) => {
                                  setPriceListName(event.target.value);
                                  setPreview(null);
                                }}
                                placeholder="Ex. Prix fournisseur 2027"
                                value={priceListName}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="article-price-list-source">Provenance (facultatif)</FieldLabel>
                              <Input
                                id="article-price-list-source"
                                maxLength={240}
                                onChange={(event) => {
                                  setPriceListSource(event.target.value);
                                  setPreview(null);
                                }}
                                placeholder="Ex. Liste reçue par courriel"
                                value={priceListSource}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="article-price-valid-from">Valable à partir du</FieldLabel>
                              <DatePicker
                                id="article-price-valid-from"
                                max={priceValidTo || undefined}
                                onChange={(value) => {
                                  setPriceValidFrom(value);
                                  setPreview(null);
                                }}
                                value={priceValidFrom}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="article-price-valid-to">Valable jusqu’au (facultatif)</FieldLabel>
                              <DatePicker
                                id="article-price-valid-to"
                                min={priceValidFrom || undefined}
                                onChange={(value) => {
                                  setPriceValidTo(value);
                                  setPreview(null);
                                }}
                                value={priceValidTo}
                              />
                            </Field>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

              </section>
            )}
            {step === 'preview' && preview && (
              <section className="space-y-3">
                <h3 className="font-medium">Résultat de la prévisualisation</h3>
                <p className="text-sm text-muted-foreground">
                  {(preview.counts?.CREATE ?? 0)} création(s),{' '}
                  {(preview.counts?.UPDATE ?? 0)} actualisation(s),{' '}
                  {(preview.counts?.SKIPPED ?? 0)} ligne(s) sans référence ignorée(s).
                </p>
                <div className="max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2">Ligne</th>
                        <th className="px-3 py-2">Référence</th>
                        <th className="px-3 py-2">Désignation</th>
                        <th className="px-3 py-2">Prix importé HT</th>
                        <th className="px-3 py-2">Résultat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.supplierReference || '—'}</td>
                          <td className="px-3 py-2">{row.designation || '—'}</td>
                          <td className="px-3 py-2">{row.sourcePriceLabel || '—'}</td>
                          <td className="px-3 py-2">
                            {CLASSIFICATIONS[row.classification] ?? row.classification}
                            {row.errors?.length > 0 && (
                              <p className="text-xs text-destructive">{row.errors.join(' ')}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  disabled={pending}
                  onClick={() => setPreview(null)}
                  type="button"
                  variant="outline"
                >
                  Modifier les correspondances
                </Button>
                {invalid && (
                  <p className="text-sm text-destructive">
                    Des lignes invalides bloquent la confirmation.
                    Corrigez le fichier ou le mapping.
                  </p>
                )}
              </section>
            )}
            {step === 'done' && result && (
              <section className="rounded-lg border border-border p-4">
                <h3 className="font-semibold">Import terminé</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {result.created ?? 0} Article(s) créé(s),{' '}
                  {result.updated ?? 0} actualisé(s),{' '}
                  {result.skipped ?? 0} ligne(s) sans référence ignorée(s).
                  Retrouvez les Articles dans l’onglet Articles.
                </p>
              </section>
            )}
            <FieldError>{error}</FieldError>
          </div>
          <ImportWizardFooter
            cancelRef={cancelRef}
            pending={pending}
            primaryAction={
              step === 'upload'
                ? inspect
                : step === 'mapping'
                  ? previewImport
                  : step === 'preview' ? confirmImport : null
            }
            primaryDisabled={
              (step === 'upload' && !file)
              || (step === 'preview' && invalid)
            }
            primaryLabel={
              step === 'upload'
                ? (inspectWorkspaceState.isLoading || inspectGlobalState.isLoading
                  ? 'Analyse…' : 'Analyser le fichier')
                : step === 'mapping'
                  ? (previewWorkspaceState.isLoading || previewGlobalState.isLoading
                    ? 'Prévisualisation…' : 'Prévisualiser')
                  : (commitWorkspaceState.isLoading || commitGlobalState.isLoading
                    ? 'Confirmation…' : 'Confirmer l’import')
            }
            step={step}
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
export { ARTICLE_FIELDS, SupplierArticleImportDialog };
