import { useEffect, useRef, useState } from 'react';

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
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  useCreateGlobalSupplierMutation,
  useCreateSupplierMutation,
  useUpdateGlobalSupplierMutation,
  useUpdateSupplierMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';

function SupplierFormDialog({
  mode = 'workspace',
  onClose,
  onSaved,
  open,
  supplier = null,
  workspaceId,
}) {
  const isGlobal = mode === 'global';
  const cancelRef = useRef(null);
  const [name, setName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [legalName, setLegalName] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');

  const [createWorkspace, createWorkspaceState] =
    useCreateSupplierMutation();
  const [updateWorkspace, updateWorkspaceState] =
    useUpdateSupplierMutation();
  const [createGlobal, createGlobalState] =
    useCreateGlobalSupplierMutation();
  const [updateGlobal, updateGlobalState] =
    useUpdateGlobalSupplierMutation();

  const pending = [
    createWorkspaceState,
    updateWorkspaceState,
    createGlobalState,
    updateGlobalState,
  ].some(({ isLoading }) => isLoading);

  useEffect(() => {
    if (!open) return;

    setName(supplier?.name ?? '');
    setSupplierCode(supplier?.supplierCode ?? '');
    setLegalName(supplier?.legalName ?? '');
    setWebsite(supplier?.website ?? '');
    setError('');
  }, [open, supplier]);

  async function submit(event) {
    event.preventDefault();

    if (!name.trim()) {
      setError('Le nom du Fournisseur est obligatoire.');
      return;
    }

    const body = {
      name: name.trim(),
      supplierCode: supplierCode.trim() || null,
      legalName: legalName.trim() || null,
      website: website.trim() || null,
    };

    try {
      let result;

      if (isGlobal) {
        result = supplier
          ? await updateGlobal({
            supplierId: supplier.id,
            ...body,
          }).unwrap()
          : await createGlobal(body).unwrap();
      } else {
        result = supplier
          ? await updateWorkspace({
            workspaceId,
            supplierId: supplier.id,
            ...body,
          }).unwrap()
          : await createWorkspace({
            workspaceId,
            ...body,
          }).unwrap();
      }

      onSaved(result);
    } catch (submissionError) {
      setError(getApiErrorMessage(
        submissionError,
        'Le Fournisseur n’a pas pu être enregistré.',
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
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>
              {supplier ? 'Modifier le Fournisseur' : 'Créer un Fournisseur'}
            </DialogTitle>
            <DialogDescription>
              {isGlobal
                ? 'Cette identité sera partagée entre les espaces de travail autorisés.'
                : 'Ce Fournisseur restera propre à cet espace de travail.'}
            </DialogDescription>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor="supplier-name">Nom</FieldLabel>
              <Input
                id="supplier-name"
                maxLength={160}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="supplier-code">Code Fournisseur</FieldLabel>
              <Input
                id="supplier-code"
                maxLength={80}
                onChange={(event) => setSupplierCode(event.target.value)}
                value={supplierCode}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="supplier-legal-name">Raison sociale</FieldLabel>
              <Input
                id="supplier-legal-name"
                maxLength={200}
                onChange={(event) => setLegalName(event.target.value)}
                value={legalName}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="supplier-website">Site web</FieldLabel>
              <Input
                id="supplier-website"
                maxLength={500}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://..."
                value={website}
              />
            </Field>

            <FieldError>{error}</FieldError>

            <DialogFooter>
              <DialogClose
                disabled={pending}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button disabled={pending} type="submit">
                {pending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { SupplierFormDialog };
