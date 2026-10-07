import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  formatCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

const CURRENT_PRODUCT = '__CURRENT_PRODUCT__';

function supplierLabel(article) {
  return [
    article.supplierName,
    article.supplierReference,
  ].filter(Boolean).join(' · ');
}

function TechnicalSheetOptimizerInspector({
  alternatives,
  canManageSourcing,
  line,
  onChange,
  projectionLine,
}) {
  if (!line || !projectionLine) {
    return (
      <Card className="h-fit">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Sélectionnez un ingrédient pour régler son enveloppe d’optimisation.
        </CardContent>
      </Card>
    );
  }

  const productAlternatives =
    alternatives?.products ?? [];
  const currentProductId =
    projectionLine.productVariantId;
  const selectedProductId =
    line.productVariantId
    ?? CURRENT_PRODUCT;
  const selectedProduct =
    productAlternatives.find(
      (item) =>
        item.id
        === line.productVariantId,
    ) ?? null;
  const supplierOptions =
    selectedProduct
      ? selectedProduct
        .supplierCandidates
        ?? []
      : alternatives?.suppliers
        ?? [];

  function patch(values) {
    onChange({
      ...line,
      ...values,
    });
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">
          Réglages de l’ingrédient
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {projectionLine.productVariantName}
          {' · '}
          {formatCurrency(
            projectionLine.lineCostHt,
          )}
          {' · '}
          {projectionLine.materialCostSharePercent
            ? Number(
              projectionLine.materialCostSharePercent,
            ).toLocaleString(
              'fr-FR',
              {
                maximumFractionDigits: 1,
              },
            ) + ' %CM'
            : '—'}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={'optimizer-min-' + line.lineId}>
              Minimum
            </FieldLabel>
            <Input
              id={'optimizer-min-' + line.lineId}
              inputMode="decimal"
              onChange={(event) =>
                patch({
                  minNetQuantity:
                    event.target.value,
                })}
              value={line.minNetQuantity}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={'optimizer-max-' + line.lineId}>
              Maximum
            </FieldLabel>
            <Input
              id={'optimizer-max-' + line.lineId}
              inputMode="decimal"
              onChange={(event) =>
                patch({
                  maxNetQuantity:
                    event.target.value,
                })}
              value={line.maxNetQuantity}
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">
              Verrouiller la quantité
            </p>
            <p className="text-xs text-muted-foreground">
              La courbe ne modifiera pas cette ligne.
            </p>
          </div>
          <Switch
            aria-label="Verrouiller la quantité"
            checked={line.locked}
            onCheckedChange={(checked) =>
              patch({
                locked: checked,
                localNetQuantity:
                  checked ? '' : line.localNetQuantity,
              })}
          />
        </div>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={'optimizer-local-' + line.lineId}>
              Quantité locale
            </FieldLabel>
            <Button
              disabled={!line.localNetQuantity}
              onClick={() =>
                patch({
                  localNetQuantity: '',
                })}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RotateCcw
                aria-hidden="true"
                className="size-4"
              />
              Reprendre la courbe
            </Button>
          </div>
          <Input
            disabled={line.locked}
            id={'optimizer-local-' + line.lineId}
            inputMode="decimal"
            onChange={(event) =>
              patch({
                localNetQuantity:
                  event.target.value,
              })}
            placeholder={
              projectionLine.netQuantity
            }
            value={line.localNetQuantity}
          />
        </Field>

        <Field>
          <FieldLabel>
            Alternative Produit
          </FieldLabel>
          <Select
            items={[
              {
                value: CURRENT_PRODUCT,
                label:
                  projectionLine.productVariantName,
              },
              ...productAlternatives.map(
                (item) => ({
                  value: item.id,
                  label: item.name,
                }),
              ),
            ]}
            onValueChange={(value) => {
              if (
                value
                === CURRENT_PRODUCT
              ) {
                patch({
                  productVariantId: null,
                  supplierArticleId: null,
                  supplierArticleTouched: false,
                });
                return;
              }

              patch({
                productVariantId: value,
                supplierArticleId: null,
                supplierArticleTouched: false,
              });
            }}
            value={selectedProductId}
          >
            <SelectTrigger aria-label="Alternative Produit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CURRENT_PRODUCT}>
                {projectionLine.productVariantName}
              </SelectItem>
              {productAlternatives.map(
                (item) => (
                  <SelectItem
                    disabled={
                      !item.pricing
                      && (
                        !item.requiresSupplierSelection
                        || !canManageSourcing
                      )
                    }
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                    {item.pricing?.normalizedAmount
                      ? ' · '
                        + formatCurrency(
                          item.pricing.normalizedAmount,
                        )
                        + '/'
                        + item.pricing.normalizedUnit
                      : item.requiresSupplierSelection
                        ? ' · article à choisir'
                        : ' · prix indisponible'}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </Field>

        {canManageSourcing && (
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>
                Approvisionnement
              </FieldLabel>
              <Button
                disabled={!line.supplierArticleTouched}
                onClick={() =>
                  patch({
                    supplierArticleId: null,
                    supplierArticleTouched: false,
                  })}
                size="sm"
                type="button"
                variant="ghost"
              >
                <RotateCcw
                  aria-hidden="true"
                  className="size-4"
                />
                Reprendre l’actuel
              </Button>
            </div>

            {selectedProduct?.requiresSupplierSelection
              && supplierOptions.length === 0
              ? (
                <p className="text-sm text-muted-foreground">
                  Aucun Article fournisseur exploitable n’est disponible pour cette alternative.
                </p>
              )
              : (
                <Select
                  disabled={
                    supplierOptions.length === 0
                  }
                  items={supplierOptions.map(
                    (article) => ({
                      value: article.id,
                      label:
                        supplierLabel(article),
                    }),
                  )}
                  onValueChange={(value) =>
                    patch({
                      supplierArticleId:
                        value,
                      supplierArticleTouched:
                        true,
                    })}
                  value={
                    line.supplierArticleTouched
                      ? line.supplierArticleId
                      : null
                  }
                >
                  <SelectTrigger aria-label="Alternative d’approvisionnement">
                    <SelectValue placeholder="Choisir un autre Article" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOptions.map(
                      (article) => (
                        <SelectItem
                          key={article.id}
                          value={article.id}
                        >
                          {supplierLabel(article)}
                          {article.pricing?.normalizedAmount
                            ? ' · '
                              + formatCurrency(
                                article.pricing.normalizedAmount,
                              )
                              + '/'
                              + article.pricing.normalizedUnit
                            : ''}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              )}
          </Field>
        )}

        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Référence : {projectionLine.netQuantity} {projectionLine.referenceUnit}.
          Les bornes et substitutions sont revalidées par le serveur avant toute application.
        </div>

        <span className="sr-only">
          Référence Produit courante : {currentProductId}
        </span>
      </CardContent>
    </Card>
  );
}

export {
  TechnicalSheetOptimizerInspector,
};
