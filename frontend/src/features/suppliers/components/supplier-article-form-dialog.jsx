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
  FieldDescription,
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
  ProductSearchAutocomplete,
} from '@/features/products/components/product-search-autocomplete';
import {
  useGetProductMetadataQuery,
} from '@/features/products/api/product-catalog-api';
import {
  useCreateSupplierArticleMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';

const NO_SUPPLIER = '__NONE__';

function SupplierArticleFormDialog({
  onClose,
  onSaved,
  open,
  suppliers,
  workspaceId,
}) {
  const cancelRef = useRef(null);
  const metadataQuery = useGetProductMetadataQuery(workspaceId, {
    skip: !open,
  });
  const [createArticle, createState] =
    useCreateSupplierArticleMutation();
  const [supplierId, setSupplierId] = useState(NO_SUPPLIER);
  const [productSearch, setProductSearch] = useState('');
  const [productVariant, setProductVariant] = useState(null);
  const [supplierReference, setSupplierReference] = useState('');
  const [designation, setDesignation] = useState('');
  const [brand, setBrand] = useState('');
  const [containerType, setContainerType] = useState('');
  const [unitCount, setUnitCount] = useState('');
  const [quantityPerUnit, setQuantityPerUnit] = useState('');
  const [unit, setUnit] = useState('KG');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setSupplierId(NO_SUPPLIER);
    setProductSearch('');
    setProductVariant(null);
    setSupplierReference('');
    setDesignation('');
    setBrand('');
    setContainerType('');
    setUnitCount('');
    setQuantityPerUnit('');
    setUnit('KG');
    setError('');
  }, [open]);

  async function submit(event) {
    event.preventDefault();

    if (supplierId === NO_SUPPLIER) {
      setError('Sélectionnez un Fournisseur.');
      return;
    }

    if (!productVariant?.id) {
      setError('Sélectionnez une Référence Produit exploitable.');
      return;
    }

    if (!supplierReference.trim()) {
      setError('La référence fournisseur est obligatoire.');
      return;
    }

    const parsedUnitCount = unitCount ? Number(unitCount) : null;

    if (
      parsedUnitCount !== null
      && (!Number.isInteger(parsedUnitCount) || parsedUnitCount <= 0)
    ) {
      setError('Le nombre d’unités doit être un entier positif.');
      return;
    }

    try {
      const article = await createArticle({
        workspaceId,
        supplierId,
        productVariantId: productVariant.id,
        supplierReference: supplierReference.trim(),
        supplierDesignation: designation.trim() || null,
        brand: brand.trim() || null,
        packaging: (
          containerType.trim()
          || parsedUnitCount
          || quantityPerUnit
        )
          ? {
            containerType: containerType.trim() || null,
            unitCount: parsedUnitCount,
            quantityPerUnit: quantityPerUnit || null,
            unit: quantityPerUnit ? unit : null,
          }
          : null,
      }).unwrap();

      onSaved(article);
    } catch (submissionError) {
      setError(getApiErrorMessage(
        submissionError,
        'L’Article fournisseur n’a pas pu être créé.',
      ));
    }
  }

  return (
    <DialogRoot
      disablePointerDismissal
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !createState.isLoading) onClose();
      }}
      open={open}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto"
          initialFocus={cancelRef}
        >
          <DialogHeader>
            <DialogTitle>Créer un Article fournisseur</DialogTitle>
            <DialogDescription>
              L’Article relie une référence commerciale fournisseur à une Référence Produit M-002.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field>
              <FieldLabel>Fournisseur</FieldLabel>
              <Select
                items={[
                  { value: NO_SUPPLIER, label: 'Sélectionner' },
                  ...suppliers.map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                  })),
                ]}
                onValueChange={setSupplierId}
                value={supplierId}
              >
                <SelectTrigger aria-label="Sélectionner le Fournisseur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>Sélectionner</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Référence Produit</FieldLabel>
              <ProductSearchAutocomplete
                metadata={metadataQuery.data}
                onSelect={(result) => {
                  if (!result.variant) {
                    setProductVariant(null);
                    setError(
                      'Ce Produit ne possède pas encore de Référence Produit exploitable.',
                    );
                    return;
                  }

                  setProductVariant(result.variant);
                  setError('');
                }}
                onValueChange={(value) => {
                  setProductSearch(value);
                  setProductVariant(null);
                }}
                scope="REFERENCE"
                value={productSearch}
                workspaceId={workspaceId}
              />
              <FieldDescription>
                Recherchez la référence M-002 correspondant à l’Article fournisseur.
              </FieldDescription>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="supplier-article-ref">Référence fournisseur</FieldLabel>
                <Input
                  id="supplier-article-ref"
                  maxLength={120}
                  onChange={(event) => setSupplierReference(event.target.value)}
                  value={supplierReference}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="supplier-article-brand">Marque</FieldLabel>
                <Input
                  id="supplier-article-brand"
                  maxLength={160}
                  onChange={(event) => setBrand(event.target.value)}
                  value={brand}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="supplier-article-designation">
                Désignation fournisseur
              </FieldLabel>
              <Input
                id="supplier-article-designation"
                maxLength={300}
                onChange={(event) => setDesignation(event.target.value)}
                value={designation}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="supplier-packaging-type">Contenant</FieldLabel>
                <Input
                  id="supplier-packaging-type"
                  maxLength={80}
                  onChange={(event) => setContainerType(event.target.value)}
                  placeholder="Carton, sac…"
                  value={containerType}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="supplier-packaging-count">Nombre d’unités</FieldLabel>
                <Input
                  id="supplier-packaging-count"
                  min="1"
                  onChange={(event) => setUnitCount(event.target.value)}
                  type="number"
                  value={unitCount}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="supplier-packaging-quantity">Quantité / unité</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="supplier-packaging-quantity"
                    min="0"
                    onChange={(event) => setQuantityPerUnit(event.target.value)}
                    step="any"
                    type="number"
                    value={quantityPerUnit}
                  />
                  <Select
                    items={['G', 'KG', 'ML', 'CL', 'L', 'UNIT'].map((value) => ({
                      value,
                      label: value,
                    }))}
                    onValueChange={setUnit}
                    value={unit}
                  >
                    <SelectTrigger aria-label="Unité du conditionnement" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['G', 'KG', 'ML', 'CL', 'L', 'UNIT'].map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Field>
            </div>

            <FieldError>{error}</FieldError>

            <DialogFooter>
              <DialogClose
                disabled={createState.isLoading}
                ref={cancelRef}
                render={<Button type="button" variant="outline" />}
              >
                Annuler
              </DialogClose>
              <Button disabled={createState.isLoading} type="submit">
                {createState.isLoading ? 'Création…' : 'Créer l’Article'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

export { SupplierArticleFormDialog };
