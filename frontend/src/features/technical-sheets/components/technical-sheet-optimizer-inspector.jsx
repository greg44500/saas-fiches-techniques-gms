import { RotateCcw } from 'lucide-react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatSignedCurrency,
  formatSignedPercent,
} from '@/features/technical-sheets/lib/technical-sheet-optimizer';

const CURRENT_PRODUCT = '__CURRENT_PRODUCT__';

function supplierLabel(article) {
  return [
    article.supplierName,
    article.supplierReference,
  ].filter(Boolean).join(' · ');
}

function ToolHeader({
  description,
  title,
}) {
  return (
    <div className="flex items-center gap-1">
      <h3 className="text-sm font-semibold">
        {title}
      </h3>
      <InfoTooltip
        content={description}
        label={'Aide · ' + title}
      />
    </div>
  );
}

function TechnicalSheetOptimizerInspector({
  activeTool,
  alternatives,
  baselineLine,
  canManageSourcing,
  line,
  onChange,
  onOpenConstraints,
  projectionLine,
  range,
}) {
  if (
    !line
    || !projectionLine
    || !baselineLine
  ) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Sélectionnez un ingrédient dans la Fiche ou le profil économique.
      </div>
    );
  }

  const productAlternatives =
    alternatives?.products ?? [];
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

  const adjustment =
    Number(
      line.economicAdjustmentPercent
      ?? 0,
    );
  const minAdjustment =
    Number(range?.min ?? -99);
  const maxAdjustment =
    Number(range?.max ?? 100);
  const quantityDelta =
    Number(projectionLine.netQuantity)
    - Number(baselineLine.netQuantity);
  const costDelta =
    Number(projectionLine.lineCostHt)
    - Number(baselineLine.lineCostHt);
  const hasQuantityEnvelope =
    Boolean(
      line.minNetQuantity
      || line.maxNetQuantity,
    );
  const minQuantity =
    Number(line.minNetQuantity);
  const maxQuantity =
    Number(line.maxNetQuantity);
  const quantityEnvelopePinned =
    Boolean(
      line.minNetQuantity
      && line.maxNetQuantity
      && Number.isFinite(minQuantity)
      && Number.isFinite(maxQuantity)
      && Math.abs(
        minQuantity - maxQuantity,
      ) < 1e-9,
    );

  return (
    <div className="space-y-3 p-3">
      <div className="border-b border-border pb-2">
        <p className="truncate text-sm font-semibold">
          {projectionLine.productVariantName}
        </p>
      </div>

      {activeTool === 'ADJUSTMENT' && (
        <section className="space-y-3">
          <ToolHeader
            description="Ajuste cette ligne par rapport à la recette de référence. Le serveur traduit le pourcentage en quantité, applique les contraintes puis recalcule toute la valorisation."
            title="Réglage économique"
          />

          <div className="rounded-lg border border-border p-3">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Ajustement
              </span>
              <strong className="text-lg tabular-nums">
                {formatSignedPercent(
                  adjustment,
                  0,
                )}
              </strong>
            </div>
            <Slider
              aria-label="Ajustement économique de l’ingrédient"
              disabled={
                line.locked
                || quantityEnvelopePinned
              }
              max={maxAdjustment}
              min={minAdjustment}
              onValueChange={([value]) =>
                patch({
                  economicAdjustmentPercent:
                    value,
                  localNetQuantity: '',
                })}
              step={1}
              value={[adjustment]}
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span title={minAdjustment + ' %'}>
                ≈ 0
              </span>
              <span title="0 %">
                Référence
              </span>
              <span title={'+' + maxAdjustment + ' %'}>
                2×
              </span>
            </div>
          </div>

          {line.locked && (
            <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              La quantité est verrouillée. Le réglage économique est neutralisé tant que ce garde-fou reste actif.
            </p>
          )}

          {!line.locked && hasQuantityEnvelope && (
            <div
              className={
                'flex items-center justify-between gap-3 rounded-lg border p-3 '
                + (
                  quantityEnvelopePinned
                    ? 'border-warning/35 bg-warning/10'
                    : 'border-border bg-muted/25'
                )
              }
            >
              <p className="text-xs text-muted-foreground">
                {quantityEnvelopePinned
                  ? 'Minimum et maximum sont identiques : la quantité ne peut pas évoluer.'
                  : 'Des garde-fous de quantité peuvent limiter l’ajustement demandé.'}
              </p>
              <Button
                className="shrink-0"
                onClick={onOpenConstraints}
                size="sm"
                type="button"
                variant="outline"
              >
                Contraintes
              </Button>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/35 p-3">
              <p className="text-[11px] text-muted-foreground">
                Quantité
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {formatQuantity(
                  baselineLine.netQuantity,
                  baselineLine.referenceUnit,
                )}
                {' → '}
                {formatQuantity(
                  projectionLine.netQuantity,
                  projectionLine.referenceUnit,
                )}
                {' '}
                {projectionLine.referenceUnit}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatSignedPercent(
                  Number(
                    baselineLine.netQuantity,
                  )
                    ? (
                      quantityDelta
                      / Number(
                        baselineLine.netQuantity,
                      )
                      * 100
                    )
                    : 0,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-muted/35 p-3">
              <p className="text-[11px] text-muted-foreground">
                Coût
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {formatCurrency(
                  baselineLine.lineCostHt,
                )}
                {' → '}
                {formatCurrency(
                  projectionLine.lineCostHt,
                )}
              </p>
              <p
                className={
                  'mt-1 text-xs font-medium '
                  + (
                    costDelta < 0
                      ? 'text-primary'
                      : costDelta > 0
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  )
                }
              >
                {formatSignedCurrency(
                  costDelta,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-muted/35 p-3">
              <p className="text-[11px] text-muted-foreground">
                Contribution CM
              </p>
              <p className="mt-1 text-sm font-medium tabular-nums">
                {formatPercent(
                  baselineLine
                    .materialCostSharePercent,
                )}
                {' → '}
                {formatPercent(
                  projectionLine
                    .materialCostSharePercent,
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTool === 'PRODUCT' && (
        <section className="space-y-3">
          <ToolHeader
            description="Teste une autre Référence Produit admissible. Rendement, quantité brute, sourcing et coût sont entièrement revalorisés par le serveur."
            title="Produit"
          />

          <Field>
            <FieldLabel>
              Référence Produit
            </FieldLabel>
            <Select
              items={[
                {
                  value: CURRENT_PRODUCT,
                  label:
                    baselineLine
                      .productVariantName,
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
                  {baselineLine
                    .productVariantName}
                </SelectItem>
                {productAlternatives.map(
                  (item) => (
                    <SelectItem
                      disabled={
                        !item.pricing
                        && (
                          !item
                            .requiresSupplierSelection
                          || !canManageSourcing
                        )
                      }
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                      {item.pricing
                        ?.normalizedAmount
                        ? ' · '
                          + formatCurrency(
                            item.pricing
                              .normalizedAmount,
                          )
                          + '/'
                          + item.pricing
                            .normalizedUnit
                        : item
                          .requiresSupplierSelection
                          ? ' · article à choisir'
                          : ' · prix indisponible'}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </Field>
        </section>
      )}

      {activeTool === 'SOURCING' && (
        <section className="space-y-3">
          <ToolHeader
            description="Compare les Articles réellement valorisables pour cette Référence Produit dans le Dossier courant. Aucun prix d’un autre Dossier n’est utilisé."
            title="Approvisionnement"
          />

          {!canManageSourcing
            ? (
              <p className="text-sm text-muted-foreground">
                Vous n’avez pas l’autorisation de modifier l’Article fournisseur.
              </p>
            )
            : selectedProduct
              ?.requiresSupplierSelection
              && supplierOptions.length
              === 0
              ? (
                <p className="text-sm text-muted-foreground">
                  Aucun Article fournisseur exploitable n’est disponible pour cette alternative.
                </p>
              )
              : (
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>
                      Article fournisseur
                    </FieldLabel>
                    <Button
                      disabled={
                        !line
                          .supplierArticleTouched
                      }
                      onClick={() =>
                        patch({
                          supplierArticleId:
                            null,
                          supplierArticleTouched:
                            false,
                        })}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <RotateCcw
                        aria-hidden="true"
                        className="size-4"
                      />
                      Actuel
                    </Button>
                  </div>

                  <Select
                    disabled={
                      supplierOptions
                        .length === 0
                    }
                    items={
                      supplierOptions.map(
                        (article) => ({
                          value:
                            article.id,
                          label:
                            supplierLabel(
                              article,
                            ),
                        }),
                      )
                    }
                    onValueChange={(value) =>
                      patch({
                        supplierArticleId:
                          value,
                        supplierArticleTouched:
                          true,
                      })}
                    value={
                      line
                        .supplierArticleTouched
                        ? line
                          .supplierArticleId
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
                            {supplierLabel(
                              article,
                            )}
                            {article.pricing
                              ?.normalizedAmount
                              ? ' · '
                                + formatCurrency(
                                  article.pricing
                                    .normalizedAmount,
                                )
                                + '/'
                                + article.pricing
                                  .normalizedUnit
                              : ''}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              )}
        </section>
      )}

      {activeTool === 'CONSTRAINTS' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <ToolHeader
              description="Ces garde-fous ne pilotent pas l’optimisation : ils définissent seulement jusqu’où la quantité simulée peut évoluer."
              title="Contraintes"
            />
            <Button
              disabled={
                !line.minNetQuantity
                && !line.maxNetQuantity
                && !line.locked
                && !line.localNetQuantity
              }
              onClick={() =>
                patch({
                  minNetQuantity: '',
                  maxNetQuantity: '',
                  locked: false,
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
              Libérer
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel
                htmlFor={
                  'optimizer-min-'
                  + line.lineId
                }
              >
                Minimum autorisé
              </FieldLabel>
              <Input
                id={
                  'optimizer-min-'
                  + line.lineId
                }
                inputMode="decimal"
                onChange={(event) =>
                  patch({
                    minNetQuantity:
                      event.target.value,
                  })}
                placeholder="Libre · plancher ≈ 0"
                value={
                  line.minNetQuantity
                }
              />
            </Field>

            <Field>
              <FieldLabel
                htmlFor={
                  'optimizer-max-'
                  + line.lineId
                }
              >
                Maximum autorisé
              </FieldLabel>
              <Input
                id={
                  'optimizer-max-'
                  + line.lineId
                }
                inputMode="decimal"
                onChange={(event) =>
                  patch({
                    maxNetQuantity:
                      event.target.value,
                  })}
                placeholder="Libre · plafond 2×"
                value={
                  line.maxNetQuantity
                }
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">
                Verrouiller la quantité
              </p>
              <p className="text-xs text-muted-foreground">
                Conserve la quantité de référence.
              </p>
            </div>
            <Switch
              aria-label="Verrouiller la quantité"
              checked={line.locked}
              onCheckedChange={(checked) =>
                patch({
                  locked: checked,
                  economicAdjustmentPercent:
                    checked
                      ? 0
                      : line
                        .economicAdjustmentPercent,
                  localNetQuantity:
                    checked
                      ? ''
                      : line.localNetQuantity,
                })}
            />
          </div>

          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Quantité forcée avancée
            </summary>
            <div className="mt-3">
              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel
                    htmlFor={
                      'optimizer-local-'
                      + line.lineId
                    }
                  >
                    Quantité forcée
                  </FieldLabel>
                  <Button
                    disabled={
                      !line.localNetQuantity
                    }
                    onClick={() =>
                      patch({
                        localNetQuantity:
                          '',
                      })}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <RotateCcw
                      aria-hidden="true"
                      className="size-4"
                    />
                    Reprendre le calcul
                  </Button>
                </div>
                <Input
                  disabled={line.locked}
                  id={
                    'optimizer-local-'
                    + line.lineId
                  }
                  inputMode="decimal"
                  onChange={(event) =>
                    patch({
                      localNetQuantity:
                        event.target.value,
                    })}
                  placeholder={
                    projectionLine
                      .netQuantity
                  }
                  value={
                    line.localNetQuantity
                  }
                />
              </Field>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

export {
  TechnicalSheetOptimizerInspector,
};
