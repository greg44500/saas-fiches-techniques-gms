import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogClose, DialogContent, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { ProductSearchAutocomplete } from '@/features/products/components/product-search-autocomplete';
import { useGetProductMetadataQuery } from '@/features/products/api/product-catalog-api';
import { useUpdateSupplierArticleMutation } from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

function SupplierArticleAssociationDialog({
  article, onClose, onSaved, open, workspaceId,
}) {
  const cancelRef = useRef(null);
  const [search, setSearch] = useState('');
  const [variant, setVariant] = useState(null);
  const [error, setError] = useState('');
  const metadata = useGetProductMetadataQuery(workspaceId, { skip: !open });
  const [updateArticle, updateState] = useUpdateSupplierArticleMutation();

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setVariant(null);
    setError('');
  }, [open, article?.id]);

  async function save() {
    if (!variant?.id) {
      setError('Sélectionnez une Référence Produit.');
      return;
    }
    try {
      await updateArticle({
        workspaceId, articleId: article.id, productVariantId: variant.id,
      }).unwrap();
      onSaved();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'Association impossible.'));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(value) => {
        if (!value && !updateState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-xl" initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Associer une Référence Produit</DialogTitle>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              {article?.supplierReference} · {article?.supplierDesignation || 'Sans désignation'}
            </p>
            <Field>
              <FieldLabel>Référence Produit</FieldLabel>
              <ProductSearchAutocomplete
                metadata={metadata.data}
                onSelect={(result) => {
                  setVariant(result.variant ?? null);
                  setError(result.variant ? '' : 'Choisissez une Référence Produit exploitable.');
                }}
                onValueChange={(value) => {
                  setSearch(value);
                  setVariant((current) => current?.name === value ? current : null);
                }}
                scope="REFERENCE"
                value={search}
                workspaceId={workspaceId}
              />
            </Field>
            <FieldError>{error}</FieldError>
          </div>
          <DialogFooter>
            <DialogClose
              disabled={updateState.isLoading}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >Fermer</DialogClose>
            <Button disabled={updateState.isLoading || !variant} onClick={save} type="button">
              Associer
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}
export { SupplierArticleAssociationDialog };
