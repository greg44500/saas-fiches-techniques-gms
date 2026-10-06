import { useEffect, useRef, useState } from 'react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
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
  getReferenceUnitLabel,
  getVariantReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
import {
  useCreateSupplierArticleMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  getApiErrorMessage,
} from '@/features/suppliers/lib/supplier-presentation';

const NO_SUPPLIER = '__NONE__';
const PACKAGING_UNITS = Object.freeze(['G', 'KG', 'ML', 'CL', 'L', 'UNIT']);

function SupplierArticleFormDialog({
  initialProductVariant = null,
  onClose,
  onSaved,
  open,
  suppliers,
  suppliersLoading = false,
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
  const [netWeight, setNetWeight] = useState('');
  const [netWeightUnit, setNetWeightUnit] = useState('G');
  const [supplierLabel, setSupplierLabel] = useState('');
  const [error, setError] = useState('');
  const packagingUnitItems = PACKAGING_UNITS.map((value) => ({
    value,
    label:
      value === 'UNIT'
        ? getVariantReferenceUnitLabel(
            metadataQuery.data,
            productVariant?.referenceUnit === 'UNIT'
              ? productVariant
              : { referenceUnit: 'UNIT' },
          )
        : getReferenceUnitLabel(metadataQuery.data, value),
  }));

  useEffect(() => {
    if (!open) return;

    setSupplierId(NO_SUPPLIER);
    setProductSearch(initialProductVariant?.name ?? '');
    setProductVariant(initialProductVariant ?? null);
    setSupplierReference('');
    setDesignation('');
    setBrand('');
    setContainerType('');
    setUnitCount('');
    setQuantityPerUnit('');
    setUnit(initialProductVariant?.referenceUnit ?? 'KG');
    setNetWeight('');
    setNetWeightUnit('G');
    setSupplierLabel('');
    setError('');
  }, [initialProductVariant, open]);

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
          || netWeight
          || supplierLabel.trim()
        )
          ? {
            containerType: containerType.trim() || null,
            unitCount: parsedUnitCount,
            quantityPerUnit: quantityPerUnit || null,
            unit: quantityPerUnit ? unit : null,
            netWeight: netWeight || null,
            netWeightUnit: netWeight ? netWeightUnit : null,
            supplierLabel: supplierLabel.trim() || null,
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
            <div className="flex items-center gap-2">
              <DialogTitle>Créer un Article fournisseur</DialogTitle>
              <InfoTooltip
                content="L’Article relie une référence commerciale fournisseur au Produit correspondant."
                label="À propos de l’Article fournisseur"
              />
            </div>
          </DialogHeader>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <Field>
              <FieldLabel>Fournisseur</FieldLabel>
              <Select
                disabled={suppliersLoading || suppliers.length === 0}
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
              {suppliersLoading ? (
                <FieldDescription>
                  Chargement des Fournisseurs…
                </FieldDescription>
              ) : suppliers.length === 0 ? (
                <FieldDescription>
                  Aucun Fournisseur actif n’est disponible. Créez d’abord un Fournisseur depuis la page Fournisseurs.
                </FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel>Référence Produit</FieldLabel>
              {initialProductVariant ? (
                <p className="rounded-md border border-border px-3 py-2 text-sm">
                  {initialProductVariant.name}
                </p>
              ) : (
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
                    setUnit(result.variant.referenceUnit);
                    setError('');
                  }}
                  onValueChange={(value) => {
                    setProductSearch(value);
                    setProductVariant((current) => (
                      current?.name === value ? current : null
                    ));
                  }}
                  scope="REFERENCE"
                  value={productSearch}
                  workspaceId={workspaceId}
                />
              )}
              <FieldDescription>
                {initialProductVariant
                  ? 'La Référence Produit est préremplie depuis le Produit consulté.'
                  : 'Recherchez puis sélectionnez le Produit correspondant à cet Article fournisseur.'}
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

            <div className="space-y-4 rounded-md border border-border p-4">
              <div>
                <p className="text-sm font-medium">Conditionnement commercial</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Décrivez une structure calculable simple. Le libellé d’origine conserve les niveaux supplémentaires, par exemple un carton de paquets.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="supplier-packaging-type">Contenant principal</FieldLabel>
                  <Input
                    id="supplier-packaging-type"
                    maxLength={80}
                    onChange={(event) => setContainerType(event.target.value)}
                    placeholder="Carton, sac…"
                    value={containerType}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="supplier-packaging-count">Sous-unités</FieldLabel>
                  <Input
                    id="supplier-packaging-count"
                    min="1"
                    onChange={(event) => setUnitCount(event.target.value)}
                    placeholder="Ex. 8"
                    type="number"
                    value={unitCount}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="supplier-packaging-quantity">Quantité / sous-unité</FieldLabel>
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
                      items={packagingUnitItems}
                      onValueChange={setUnit}
                      value={unit}
                    >
                      <SelectTrigger aria-label="Unité du conditionnement" className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingUnitItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="supplier-packaging-net-weight">Poids net total</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="supplier-packaging-net-weight"
                      min="0"
                      onChange={(event) => setNetWeight(event.target.value)}
                      step="any"
                      type="number"
                      value={netWeight}
                    />
                    <Select
                      items={[
                        { value: 'G', label: 'g' },
                        { value: 'KG', label: 'kg' },
                      ]}
                      onValueChange={setNetWeightUnit}
                      value={netWeightUnit}
                    >
                      <SelectTrigger aria-label="Unité du poids net" className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="G">g</SelectItem>
                        <SelectItem value="KG">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="supplier-packaging-label">Libellé fournisseur d’origine</FieldLabel>
                  <Input
                    id="supplier-packaging-label"
                    maxLength={240}
                    onChange={(event) => setSupplierLabel(event.target.value)}
                    placeholder="Ex. carton de 8 paquets × 4 tranches"
                    value={supplierLabel}
                  />
                </Field>
              </div>
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
              <Button
                disabled={
                  createState.isLoading
                  || suppliersLoading
                  || suppliers.length === 0
                }
                type="submit"
              >
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
