import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DialogContent, DialogFooter, DialogHeader, DialogOverlay,
  DialogPortal, DialogRoot, DialogTitle,
} from '@/components/ui/dialog';
import { ProductCreateDialog } from '@/features/products/components/product-create-dialog';
import { ProductVariantCreateDialog } from '@/features/products/components/product-variant-create-dialog';
import { useGetProductMetadataQuery } from '@/features/products/api/product-catalog-api';
import {
  useCheckSupplierArticleProductDuplicateMutation,
  useCreateSupplierArticleProductMutation,
  useCreateSupplierArticleProductVariantMutation,
  useUpdateSupplierArticleMutation,
} from '@/features/suppliers/api/supplier-api';
import { getApiErrorMessage } from '@/features/suppliers/lib/supplier-presentation';

/**
 * Parcours contextuel : un seul dialogue actif à la fois.
 * Une création réussie reste persistée si l'association échoue ; le retry
 * réutilise le même identifiant et ne génère aucune deuxième contribution.
 */
function SupplierArticleProductCreationFlow({
  article, initialName, onAssociated, onClose, workspaceId,
}) {
  const [step, setStep] = useState('product');
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [error, setError] = useState('');
  const metadata = useGetProductMetadataQuery(workspaceId);
  const [duplicateCheck] = useCheckSupplierArticleProductDuplicateMutation();
  const [createProduct] = useCreateSupplierArticleProductMutation();
  const [createVariant] = useCreateSupplierArticleProductVariantMutation();
  const [updateArticle, updateState] = useUpdateSupplierArticleMutation();

  async function associate(id) {
    setVariantId(id);
    setError('');
    setStep('associate');
    try {
      await updateArticle({
        workspaceId,
        articleId: article.id,
        productVariantId: id,
      }).unwrap();
      onAssociated();
    } catch (failure) {
      setError(getApiErrorMessage(failure, 'La Référence a été créée, mais son association a échoué.'));
    }
  }

  function useExisting(_id, candidate) {
    if (candidate?.variantId && candidate.status === 'ACTIVE') {
      void associate(candidate.variantId);
      return;
    }
    setProduct({ id: candidate.id, name: candidate.rootName ?? candidate.name });
    setStep('variant');
  }

  function createdProduct(result) {
    if (result?.classification === 'EXISTING' && result.existingReference) {
      useExisting(result.existingReference.id, result.existingReference);
      return;
    }
    const createdVariant = result?.provisionalReference?.variant
      ?? result?.publishedReference?.variant ?? result?.variant;
    if (createdVariant?.id) {
      void associate(createdVariant.id);
      return;
    }
    setError('Aucune Référence exploitable n’a été retournée. Reprenez l’association.');
    setStep('associate');
  }

  function createdVariant(result) {
    const existing = result?.existingReference;
    const id = result?.variant?.id ?? existing?.variantId ?? existing?.id;
    if (id) {
      void associate(id);
      return;
    }
    setError('La Référence créée ne peut pas être associée automatiquement.');
    setStep('associate');
  }

  return (
    <>
      <ProductCreateDialog
        createRequest={({ workspaceId: _workspaceId, ...body }) =>
          createProduct({ workspaceId, articleId: article.id, ...body }).unwrap()}
        duplicateCheckRequest={({ name, aliases }) =>
          duplicateCheck({ workspaceId, articleId: article.id, name, aliases }).unwrap()}
        initialName={initialName}
        metadata={metadata.data}
        onClose={onClose}
        onCreated={createdProduct}
        onUseCandidate={useExisting}
        onUseExisting={useExisting}
        open={step === 'product'}
        workspaceId={workspaceId}
      />
      {product && (
        <ProductVariantCreateDialog
          allowDimensionContribution={false}
          createRequest={({ workspaceId: _workspaceId, productId, ...body }) =>
            createVariant({ workspaceId, articleId: article.id, productId, ...body }).unwrap()}
          initialName={initialName}
          metadata={metadata.data}
          onClose={onClose}
          onCreated={createdVariant}
          open={step === 'variant'}
          product={product}
          workspaceId={workspaceId}
        />
      )}
      <DialogRoot open={step === 'associate'} disablePointerDismissal>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Association à l’Article fournisseur</DialogTitle>
            </DialogHeader>
            <p className="mt-4 text-sm">
              {error || 'Association de la Référence Produit en cours…'}
            </p>
            <DialogFooter>
              <Button
                disabled={updateState.isLoading}
                onClick={onClose}
                type="button"
                variant="outline"
              >Fermer</Button>
              {error && variantId && (
                <Button
                  disabled={updateState.isLoading}
                  onClick={() => associate(variantId)}
                  type="button"
                >Réessayer l’association</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

export { SupplierArticleProductCreationFlow };
