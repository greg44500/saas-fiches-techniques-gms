import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose, DialogContent, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [inspected, setInspected] = useState(null);
  const [supplierId, setSupplierId] = useState(NONE);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
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
      onCommitted(result);
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Confirmation impossible.'));
    }
  }

  const invalid = (preview?.counts?.INVALID ?? 0) > 0;

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(value) => { if (!value && !pending) onClose(); }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-y-auto"
          initialFocus={cancelRef}
        >
          <DialogHeader>
            <DialogTitle>Importer une liste d’Articles fournisseur</DialogTitle>
          </DialogHeader>
          <div className="mt-5 space-y-5">
            <p className="text-sm text-muted-foreground">
              Cet import crée ou actualise les Articles du Fournisseur sans créer
              de catalogue commercial ni de tarifs. Les nouveaux Articles
              restent « Produit à associer » jusqu’à leur rattachement.
            </p>
            {!inspected && (
              <section className="space-y-3">
                <Field>
                  <FieldLabel htmlFor="article-import-file">Fichier</FieldLabel>
                  <FieldDescription>Formats acceptés : CSV, XLS, XLSX.</FieldDescription>
                  <Input
                    accept=".csv,.xls,.xlsx"
                    className="sr-only"
                    id="article-import-file"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setError('');
                    }}
                    ref={fileInputRef}
                    type="file"
                  />
                  <div className="flex items-center gap-3">
                    <Button onClick={() => fileInputRef.current?.click()} type="button" variant="outline">
                      Choisir un fichier
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {file ? file.name : 'Aucun fichier choisi'}
                    </span>
                  </div>
                </Field>
                <Button disabled={pending || !file} onClick={inspect} type="button">
                  Inspecter le fichier
                </Button>
              </section>
            )}
            {inspected && (
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
                <Button disabled={pending} onClick={previewImport} type="button">
                  Prévisualiser les Articles
                </Button>
              </section>
            )}
            {preview && (
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
                {invalid && (
                  <p className="text-sm text-destructive">
                    Des lignes invalides bloquent la confirmation.
                    Corrigez le fichier ou le mapping.
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
              <Button disabled={pending || invalid} onClick={confirmImport} type="button">
                {pending ? 'Confirmation…' : 'Confirmer l’import des Articles'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
export { ARTICLE_FIELDS, SupplierArticleImportDialog };
