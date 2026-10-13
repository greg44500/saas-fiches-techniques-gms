import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogOverlay, DialogPortal, DialogRoot,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
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
  mode = 'workspace', onClose, onCommitted, open, suppliers, workspaceId,
}) {
  const isGlobal = mode === 'global';
  const cancelRef = useRef(null);
  const [file, setFile] = useState(null);
  const [inspected, setInspected] = useState(null);
  const [supplierId, setSupplierId] = useState(NONE);
  const [mapping, setMapping] = useState({});
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
    try {
      const body = {
        importId: inspected.importId, supplierId, mapping,
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
                <Field>
                  <FieldLabel>Fournisseur</FieldLabel>
                  <Select
                    items={[
                      { value: NONE, label: 'Sélectionner' },
                      ...suppliers.map((item) => ({ value: item.id, label: item.name })),
                    ]}
                    onValueChange={(value) => {
                      setSupplierId(value);
                      setPreview(null);
                    }}
                    value={supplierId}
                  >
                    <SelectTrigger aria-label="Fournisseur des Articles"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sélectionner</SelectItem>
                      {suppliers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
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
                        <th className="px-3 py-2">Résultat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.rows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{row.supplierReference || '—'}</td>
                          <td className="px-3 py-2">{row.designation || '—'}</td>
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
