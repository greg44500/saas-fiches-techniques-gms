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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldError, FieldLabel } from '@/components/ui/field';
import {
  useMergeProductReferenceCategoriesMutation,
} from '@/features/products/api/product-reference-api';
import { getApiErrorMessage } from '@/features/products/lib/product-presentation';

/**
 * Fusion métier explicite : la source disparaît et tous ses Produits sont
 * affectés à la catégorie cible existante ; aucun Produit n'est fusionné.
 */
function ProductReferenceCategoryMergeDialog({
  source,
  categories,
  onClose,
  onMerged,
}) {
  const cancelRef = useRef(null);
  const [targetId, setTargetId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [merge, { isLoading: pending }] = useMergeProductReferenceCategoriesMutation();

  const targets = (categories ?? []).filter((item) => (
    item.id !== source?.id && item.status === 'ACTIVE'
  ));
  const target = targets.find((item) => item.id === targetId);

  useEffect(() => {
    setTargetId('');
    setErrorMessage('');
  }, [source?.id]);

  async function confirmMerge() {
    if (!source || !target || pending) return;
    setErrorMessage('');
    try {
      const result = await merge({
        sourceCategoryId: source.id,
        targetCategoryId: target.id,
      }).unwrap();
      onMerged(result);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(
        error,
        'La fusion des catégories a échoué.',
      ));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(open) => { if (!open && !pending) onClose(); }}
      open={Boolean(source)}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent initialFocus={cancelRef}>
          <DialogHeader>
            <DialogTitle>Fusionner des catégories</DialogTitle>
            <DialogDescription>
              Les Produits de « {source?.name} » seront rattachés à la catégorie
              conservée, y compris les Produits archivés. La catégorie
              « {source?.name} » sera supprimée. Aucun Produit ne sera supprimé.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-3">
            <p className="text-sm">
              Catégorie à fusionner : <strong>{source?.name}</strong>
              {' · '}{source?.totalProductCount ?? 0} produit(s) associé(s)
            </p>
            <div className="space-y-2">
              <FieldLabel htmlFor="category-merge-target">Catégorie à conserver</FieldLabel>
              <Select
                items={targets.map((item) => ({ value: item.id, label: item.name }))}
                onValueChange={(value) => setTargetId(value ?? '')}
                value={targetId || null}
              >
                <SelectTrigger aria-label="Catégorie à conserver" id="category-merge-target">
                  <SelectValue placeholder="Choisir une catégorie existante" />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {target && (
              <p className="text-sm text-muted-foreground">
                Le nom « {target.name} » sera conservé et pourra être modifié
                ensuite depuis l'action Renommer.
              </p>
            )}
            {targets.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune autre catégorie active n'est disponible.
              </p>
            )}
            <FieldError>{errorMessage}</FieldError>
          </div>

          <DialogFooter>
            <DialogClose
              disabled={pending}
              ref={cancelRef}
              render={<Button type="button" variant="outline" />}
            >
              Annuler
            </DialogClose>
            <Button disabled={!target || pending} onClick={confirmMerge} type="button">
              {pending ? 'Fusion en cours…' : 'Fusionner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { ProductReferenceCategoryMergeDialog };
