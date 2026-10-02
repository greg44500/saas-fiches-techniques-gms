import {
  ArrowDownUp,
  ArrowUpRight,
  Globe2,
  MoreHorizontal,
  PackageSearch,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ProductSearchAutocomplete,
} from '@/features/products/components/product-search-autocomplete';
import {
  getReferenceUnitLabel,
} from '@/features/products/lib/product-presentation';
import {
  useListSupplierArticlesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  formatPackaging,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  TechnicalSheetSourcingSelect,
} from '@/features/technical-sheets/components/technical-sheet-sourcing-select';
import {
  formatDecimalCurrency,
  getLineValuationPresentation,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

const PRODUCT_SOURCE = Object.freeze({
  REFERENCE: 'REFERENCE',
  FAVORITES: 'WORKSPACE',
});

const PRICING_SOURCE_LABEL = Object.freeze({
  SUPPLIER_TARIFF: 'Tarif fournisseur',
  NEGOTIATED_PRICE: 'Tarif négocié',
  INVOICED_PRICE: 'Prix facturé',
  INDICATIVE_DOSSIER: 'Prix indicatif Dossier',
  INDICATIVE_WORKSPACE: 'Prix indicatif espace de travail',
});

const SECTION_PRESENTATION = Object.freeze({
  INGREDIENT: Object.freeze({
    label: 'Ingrédients',
    opposite: 'ECONOMAT',
    oppositeLabel: 'Économat',
  }),
  ECONOMAT: Object.freeze({
    label: 'Économat',
    opposite: 'INGREDIENT',
    oppositeLabel: 'Ingrédients',
  }),
});

const COMPOSITION_GRID_CLASS = [
  'grid gap-x-2 gap-y-2',
  'lg:grid-cols-[minmax(0,2fr)_4.25rem_3.5rem_5rem_5.25rem_5.5rem_4.25rem_minmax(0,1.25fr)_3.25rem]',
  'lg:items-center',
].join(' ');

let localLineSequence = 0;

function createLocalLineClientKey() {
  localLineSequence += 1;
  return 'technical-sheet-line-' + localLineSequence;
}

function normalizeDraftLine(line, index) {
  return {
    clientKey:
      line.clientKey
      ?? line.id
      ?? 'technical-sheet-existing-' + line.productVariantId + '-' + index,
    id: line.id,
    kind: line.kind ?? 'INGREDIENT',
    productVariantId:
      line.productVariantId
      ?? line.productVariant?.id,
    productVariantName:
      line.productVariant?.name
      ?? line.productVariantName
      ?? 'Référence Produit',
    productVariant:
      line.productVariant ?? (
        line.productVariantId
          ? {
              id: line.productVariantId,
              name: line.productVariantName ?? 'Référence Produit',
              referenceUnit: line.referenceUnit ?? line.inputUnit,
              yieldPercent: line.yieldPercent ?? null,
            }
          : null
      ),
    referenceUnit:
      line.productVariant?.referenceUnit
      ?? line.referenceUnit
      ?? line.inputUnit,
    netQuantity:
      line.netQuantity ?? '1',
    inputUnit:
      line.inputUnit
      ?? line.productVariant?.referenceUnit,
    order: index,
    note:
      line.note ?? '',
    selectedSupplierArticleId:
      line.selectedSupplierArticleId
      ?? line.valuation?.supplierArticleId
      ?? null,
    calculation: line.calculation ?? null,
    valuation: line.valuation ?? null,
  };
}

function getPricingSourceLabel(source) {
  return PRICING_SOURCE_LABEL[source] ?? null;
}

function getReferenceUnitDefinition(metadata, unit) {
  return (metadata?.referenceUnits ?? [])
    .find((definition) => definition.value === unit)
    ?? null;
}

function convertDecimalQuantity({
  value,
  fromFactor,
  toFactor,
}) {
  const normalized =
    String(value).trim().replace(',', '.');
  const match =
    /^(\d+)(?:\.(\d+))?$/.exec(normalized);

  if (
    !match
    || !Number.isInteger(fromFactor)
    || !Number.isInteger(toFactor)
    || fromFactor <= 0
    || toFactor <= 0
  ) {
    return null;
  }

  const fractionDigits =
    match[2] ?? '';
  const scale =
    10n ** BigInt(fractionDigits.length);
  const numeric =
    BigInt(match[1] + fractionDigits);
  const numerator =
    numeric * BigInt(fromFactor);
  const denominator =
    scale * BigInt(toFactor);
  const integerPart =
    numerator / denominator;
  let remainder =
    numerator % denominator;

  if (remainder === 0n) {
    return integerPart.toString();
  }

  let decimals = '';

  for (
    let index = 0;
    index < 12 && remainder !== 0n;
    index += 1
  ) {
    remainder *= 10n;
    decimals += (
      remainder / denominator
    ).toString();
    remainder %= denominator;
  }

  const trimmed =
    decimals.replace(/0+$/, '');

  return trimmed
    ? integerPart.toString() + '.' + trimmed
    : integerPart.toString();
}

function adaptQuantityToReplacementUnit({
  metadata,
  netQuantity,
  previousUnit,
  nextUnit,
}) {
  if (!previousUnit || previousUnit === nextUnit) {
    return {
      netQuantity,
      reviewRequired: false,
    };
  }

  const previousDefinition =
    getReferenceUnitDefinition(metadata, previousUnit);
  const nextDefinition =
    getReferenceUnitDefinition(metadata, nextUnit);

  if (
    !previousDefinition
    || !nextDefinition
    || previousDefinition.dimension
      !== nextDefinition.dimension
  ) {
    return {
      netQuantity,
      reviewRequired: true,
    };
  }

  return {
    netQuantity:
      convertDecimalQuantity({
        value: netQuantity,
        fromFactor:
          previousDefinition.factorToBase,
        toFactor:
          nextDefinition.factorToBase,
      })
      ?? netQuantity,
    reviewRequired: false,
  };
}


function getSupplierArticleActionTooltip({
  canManageSourcing,
  line,
}) {
  if (!canManageSourcing) return 'Consulter l’Article fournisseur';

  const hasSelectedArticle = Boolean(
    line.selectedSupplierArticleId
    ?? line.valuation?.supplierArticleId
  );
  const label = hasSelectedArticle
    ? 'Modifier l’Article fournisseur'
    : 'Choisir un Article fournisseur';

  return label;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function formatMaterialCostSharePercent(line) {
  if (line.kind !== 'INGREDIENT') return '—';

  const value = line.valuation?.materialCostSharePercent;
  if (!hasValue(value)) return '—';

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';

  return parsed.toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  }) + ' %';
}

function formatYieldPercent(line) {
  const value = (
    line.calculation?.yieldPercentUsed
    ?? line.productVariant?.yieldPercent
  );

  if (!hasValue(value)) return '—';

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';

  return parsed.toLocaleString('fr-FR', {
    maximumFractionDigits: 2,
  }) + ' %';
}

function ColumnHeading({ align = 'left', children, tooltip }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={tooltip}
        className={
          'w-fit cursor-help text-xs font-semibold text-muted-foreground underline decoration-dotted underline-offset-4'
          + (align === 'center' ? ' mx-auto text-center' : ' text-left')
        }
        type="button"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function TechnicalSheetProductScopeControls({
  onChange,
  productScope,
}) {
  return (
    <div
      aria-label="Source des Produits"
      className="flex items-center gap-1 rounded-lg border border-border bg-card/70 p-1"
      role="group"
    >
      <ActionIconButton
        Icon={Globe2}
        aria-pressed={productScope === PRODUCT_SOURCE.REFERENCE}
        label="Tous les produits"
        onClick={() => onChange(PRODUCT_SOURCE.REFERENCE)}
        tooltipLabel="Tous les produits"
        variant={
          productScope === PRODUCT_SOURCE.REFERENCE
            ? 'default'
            : 'ghost'
        }
      />
      <ActionIconButton
        Icon={Star}
        aria-pressed={productScope === PRODUCT_SOURCE.FAVORITES}
        label="Favoris"
        onClick={() => onChange(PRODUCT_SOURCE.FAVORITES)}
        tooltipLabel="Favoris"
        variant={
          productScope === PRODUCT_SOURCE.FAVORITES
            ? 'default'
            : 'ghost'
        }
      />
    </div>
  );
}

function MobileLabel({ children }) {
  return (
    <span className="mb-1 block text-[11px] font-medium text-muted-foreground lg:hidden">
      {children}
    </span>
  );
}

function ProductDetailsTrigger({
  line,
  onEdit,
  workspaceId,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const articlesQuery = useListSupplierArticlesQuery(
    {
      workspaceId,
      productVariantId: line.productVariantId,
      status: 'ACTIVE',
      page: 1,
      limit: 100,
    },
    {
      skip: !line.productVariantId || !detailsOpen,
    },
  );
  const articles = articlesQuery.data?.articles ?? [];
  const selectedArticleId = (
    line.selectedSupplierArticleId
    ?? line.valuation?.supplierArticleId
  );
  const selectedArticle = articles.find(
    (article) => article.id === selectedArticleId,
  );
  const pricingSource = getPricingSourceLabel(
    line.valuation?.applicableSource,
  );

  return (
    <div className="min-w-0">
      <Tooltip
        onOpenChange={setDetailsOpen}
        open={detailsOpen}
      >
        <TooltipTrigger
          aria-label={
            onEdit
              ? 'Modifier le produit ' + line.productVariantName
              : 'Détails du produit ' + line.productVariantName
          }
          className="block max-w-full truncate text-left text-sm font-semibold underline decoration-dotted underline-offset-4"
          onClick={() => onEdit?.()}
          type="button"
        >
          {line.productVariantName}
        </TooltipTrigger>
        <TooltipContent
          align="start"
          className="max-w-sm space-y-1"
          side="top"
        >
          <p className="font-semibold">{line.productVariantName}</p>

          {articlesQuery.isLoading && (
            <p>Chargement des informations fournisseur…</p>
          )}

          {!articlesQuery.isLoading && selectedArticle && (
            <>
              <p>
                Fournisseur : {selectedArticle.supplier?.name ?? 'Non renseigné'}
              </p>
              <p>
                Référence fournisseur : {selectedArticle.supplierReference ?? 'Non renseignée'}
              </p>
              <p>
                Article : {selectedArticle.supplierDesignation ?? 'Non renseigné'}
              </p>
              <p>
                Conditionnement : {formatPackaging(selectedArticle.packaging)}
              </p>
            </>
          )}

          {!articlesQuery.isLoading && !selectedArticle && (
            <p>
              {articles.length === 0
                ? 'Aucun Article fournisseur disponible.'
                : articles.length + ' Article(s) fournisseur disponible(s).'}
            </p>
          )}

          {pricingSource && (
            <p>Source du prix : {pricingSource}</p>
          )}

          {onEdit && (
            <p>Cliquez sur le Produit pour le remplacer.</p>
          )}
        </TooltipContent>
      </Tooltip>

    </div>
  );
}

function SupplierArticleDialog({
  canManage,
  disabled,
  dossierId,
  draftRevision,
  line,
  onClose,
  onError,
  onPendingChange,
  onSelected,
  technicalSheetId,
  workspaceId,
}) {
  return (
    <DialogRoot
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open={Boolean(line)}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>Article fournisseur</DialogTitle>
              <ActionIconButton
                Icon={X}
                label="Fermer le choix de l’Article fournisseur"
                onClick={onClose}
                tooltipLabel="Fermer"
                variant="ghost"
              />
            </div>
          </DialogHeader>

          {line && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {line.productVariantName}
              </p>
              <TechnicalSheetSourcingSelect
                canManage={canManage}
                disabled={disabled}
                dossierId={dossierId}
                draftRevision={draftRevision}
                line={line}
                onError={onError}
                onPendingChange={onPendingChange}
                onSelected={(updatedDraft) => {
                  onSelected?.(updatedDraft);
                  onClose();
                }}
                technicalSheetId={technicalSheetId}
                workspaceId={workspaceId}
              />
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  );
}

function LineActionsMenu({
  canOpenPricing,
  disabled,
  line,
  onMove,
  onOpenPricing,
  onOpenSourcing,
  onRemove,
  sourcingDisabled,
  sourcingLabel,
}) {
  const [open, setOpen] = useState(false);

  function runAction(action) {
    setOpen(false);
    action?.();
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={(
          <Button
            aria-label={'Actions pour ' + line.productVariantName}
            size="icon"
            type="button"
            variant="ghost"
          />
        )}
      >
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-1">
        <div className="space-y-1">
          <Button
            className="w-full justify-start"
            disabled={sourcingDisabled}
            onClick={() => runAction(onOpenSourcing)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PackageSearch aria-hidden="true" className="size-4" />
            {sourcingLabel}
          </Button>

          {canOpenPricing && line.valuation?.status === 'NO_PRICE' && (
            <Button
              className="w-full justify-start"
              onClick={() => runAction(onOpenPricing)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ArrowUpRight aria-hidden="true" className="size-4" />
              Ouvrir Fournisseurs et prix
            </Button>
          )}

          <Button
            className="w-full justify-start"
            disabled={disabled}
            onClick={() => runAction(onMove)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowDownUp aria-hidden="true" className="size-4" />
            Déplacer vers {SECTION_PRESENTATION[line.kind].oppositeLabel}
          </Button>

          <Button
            className="w-full justify-start text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={() => runAction(onRemove)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Supprimer la ligne
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TechnicalSheetLineEditor({
  canManageSourcing = false,
  canOpenPricing = false,
  disabled,
  dossierId,
  draftRevision,
  lines,
  metadata,
  onChange,
  onFieldBlur,
  onOpenPricing,
  onSourcingError,
  onSourcingPendingChange,
  onUnitChangeWarning,
  onSourcingSelected,
  productMetadata,
  productScope = PRODUCT_SOURCE.REFERENCE,
  sourcingDisabled = false,
  technicalSheetId,
  workspaceId,
}) {
  const [addSearch, setAddSearch] = useState({
    INGREDIENT: '',
    ECONOMAT: '',
  });
  const [editingLineKey, setEditingLineKey] = useState(null);
  const [editSearch, setEditSearch] = useState('');
  const [sourcingLineKey, setSourcingLineKey] = useState(null);
  const [addError, setAddError] = useState('');

  function lineKey(line, index) {
    return line.clientKey ?? line.id ?? line.productVariantId + ':' + index;
  }

  function updateLine(index, patch, { immediate = false } = {}) {
    onChange(
      lines.map((line, currentIndex) => (
        currentIndex === index
          ? { ...line, ...patch }
          : line
      )),
      { immediate },
    );
  }

  function removeLine(index) {
    onChange(
      lines
        .filter((_, currentIndex) => currentIndex !== index)
        .map((line, order) => ({ ...line, order })),
      { immediate: true },
    );
  }

  function moveLine(index) {
    const line = lines[index];
    const presentation = SECTION_PRESENTATION[line.kind];

    updateLine(index, {
      kind: presentation.opposite,
    }, { immediate: true });
  }

  function addProduct(kind, result) {
    if (!result?.variant?.id) {
      setAddError(
        'Cette référence doit être enrichie avant de pouvoir être utilisée dans une Fiche technique.',
      );
      return;
    }

    setAddError('');
    onChange([
      ...lines,
      {
        clientKey: createLocalLineClientKey(),
        id: undefined,
        kind,
        productVariantId: result.variant.id,
        productVariantName:
          result.variant.name
          ?? result.product?.name
          ?? 'Référence Produit',
        productVariant: result.variant,
        referenceUnit: result.variant.referenceUnit,
        netQuantity: '1',
        inputUnit: result.variant.referenceUnit,
        order: lines.length,
        note: '',
        selectedSupplierArticleId: null,
        calculation: null,
        valuation: null,
      },
    ], { immediate: true });
    setAddSearch((current) => ({
      ...current,
      [kind]: '',
    }));
  }

  function startEditing(line, index) {
    setEditingLineKey(lineKey(line, index));
    setEditSearch(line.productVariantName);
  }

  function replaceProduct(index, result) {
    const line = lines[index];

    if (!result?.variant?.id) {
      setAddError(
        'Cette référence doit être enrichie avant de pouvoir être utilisée dans une Fiche technique.',
      );
      return;
    }

    if (result.variant.id === line.productVariantId) {
      setEditingLineKey(null);
      setEditSearch('');
      return;
    }

    const previousUnit =
      line.referenceUnit
      ?? line.inputUnit;
    const nextUnit =
      result.variant.referenceUnit;
    const adaptedQuantity =
      adaptQuantityToReplacementUnit({
        metadata: productMetadata,
        netQuantity: line.netQuantity,
        previousUnit,
        nextUnit,
      });

    setAddError('');
    updateLine(index, {
      clientKey: createLocalLineClientKey(),
      id: undefined,
      productVariantId: result.variant.id,
      productVariantName:
        result.variant.name
        ?? result.product?.name
        ?? 'Référence Produit',
      productVariant: result.variant,
      referenceUnit: nextUnit,
      netQuantity:
        adaptedQuantity.netQuantity,
      inputUnit: nextUnit,
      selectedSupplierArticleId: null,
      calculation: null,
      valuation: null,
    }, { immediate: true });

    if (adaptedQuantity.reviewRequired) {
      onUnitChangeWarning?.({
        previousUnit:
          getReferenceUnitLabel(
            productMetadata,
            previousUnit,
          ),
        nextUnit:
          getReferenceUnitLabel(
            productMetadata,
            nextUnit,
          ),
      });
    }

    setEditingLineKey(null);
    setEditSearch('');
  }

  const sourcingLine = lines.find(
    (line, index) => lineKey(line, index) === sourcingLineKey,
  ) ?? null;

  function renderLine(line, index) {
    const key = lineKey(line, index);
    const editing = editingLineKey === key;
    const valuationPresentation = getLineValuationPresentation(
      line.valuation?.status,
      metadata?.lineValuationStatusDefinitions,
    );
    const sourceLabel = getPricingSourceLabel(
      line.valuation?.applicableSource,
    );
    const sourcingTooltipLabel = getSupplierArticleActionTooltip({
      canManageSourcing,
      line,
    });

    return (
      <div
        className={
          COMPOSITION_GRID_CLASS
          + ' border-b border-border px-2 py-2 transition-colors hover:bg-muted/20'
        }
        key={key}
      >
        <div className="min-w-0">
          <MobileLabel>Produit</MobileLabel>
          {editing ? (
            <div className="flex min-w-0 items-center gap-2 transition-all duration-200 ease-out">
              <div className="min-w-0 flex-1">
                <ProductSearchAutocomplete
                  ariaLabel={'Modifier le produit ' + line.productVariantName}
                  compact
                  metadata={productMetadata}
                  onSelect={(result) => replaceProduct(index, result)}
                  onValueChange={setEditSearch}
                  placeholder="Rechercher un produit…"
                  scope={productScope}
                  showWorkspaceFavorite={productScope === PRODUCT_SOURCE.REFERENCE}
                  status="ACTIVE"
                  value={editSearch}
                  workspaceId={workspaceId}
                />
              </div>
              <Button
                className="h-8 shrink-0 px-2 text-xs"
                onClick={() => {
                  setEditingLineKey(null);
                  setEditSearch('');
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Annuler
              </Button>
            </div>
          ) : (
            <ProductDetailsTrigger
              line={line}
              onEdit={
                disabled
                  ? undefined
                  : () => startEditing(line, index)
              }
              workspaceId={workspaceId}
            />
          )}
        </div>

        <div className="min-w-0 lg:text-center">
          <MobileLabel>Quantité nette</MobileLabel>
          <Input
            aria-label={'Quantité nette ligne ' + (index + 1)}
            className="h-8 min-w-0 text-center tabular-nums"
            disabled={disabled}
            inputMode="decimal"
            onBlur={onFieldBlur}
            onChange={(event) => updateLine(index, {
              netQuantity: event.target.value,
            })}
            value={line.netQuantity}
          />
        </div>

        <div className="min-w-0 lg:text-center">
          <MobileLabel>Unité</MobileLabel>
          <p
            aria-label={'Unité ligne ' + (index + 1)}
            className="truncate text-sm font-medium text-muted-foreground lg:text-center"
          >
            {getReferenceUnitLabel(
              productMetadata,
              line.referenceUnit
              ?? line.inputUnit,
            )}
          </p>
        </div>

        <div className="min-w-0 lg:text-center">
          <MobileLabel>Prix unitaire hors taxe</MobileLabel>
          <Tooltip>
            <TooltipTrigger
              aria-label={
                sourceLabel
                  ? 'Prix unitaire hors taxe — ' + sourceLabel
                  : 'Prix unitaire hors taxe'
              }
              className="block max-w-full truncate text-left text-sm font-medium tabular-nums lg:mx-auto lg:text-center"
              type="button"
            >
              {hasValue(line.valuation?.normalizedAmount)
                ? formatDecimalCurrency(line.valuation.normalizedAmount)
                : '—'}
            </TooltipTrigger>
            <TooltipContent>
              {sourceLabel
                ? sourceLabel
                  + (
                    line.valuation?.normalizedUnit
                      ? ' · prix normalisé par '
                        + getReferenceUnitLabel(
                          productMetadata,
                          line.valuation.normalizedUnit,
                        )
                      : ''
                  )
                : valuationPresentation.label}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="min-w-0 lg:text-center">
          <MobileLabel>Coût matières unitaire hors taxe</MobileLabel>
          <p className="truncate text-sm font-medium tabular-nums lg:text-center">
            {hasValue(line.valuation?.lineCostHt)
              ? formatDecimalCurrency(line.valuation.lineCostHt)
              : '—'}
          </p>
        </div>

        <div className="min-w-0 lg:text-center">
          <MobileLabel>Part du coût matière</MobileLabel>
          <p className="truncate text-sm font-medium tabular-nums lg:text-center">
            {formatMaterialCostSharePercent(line)}
          </p>
        </div>

        <div className="min-w-0 lg:text-center">
          <MobileLabel>Taux de rendement</MobileLabel>
          <p className="truncate text-sm tabular-nums lg:text-center">
            {formatYieldPercent(line)}
          </p>
        </div>

        <div className="min-w-0">
          <MobileLabel>Note</MobileLabel>
          <Input
            aria-label={'Note ligne ' + (index + 1)}
            className="h-8 min-w-0"
            disabled={disabled}
            maxLength={500}
            onBlur={onFieldBlur}
            onChange={(event) => updateLine(index, {
              note: event.target.value,
            })}
            value={line.note}
          />
        </div>

        <div className="flex items-center justify-center">
          <MobileLabel>Actions</MobileLabel>
          <LineActionsMenu
            canOpenPricing={canOpenPricing}
            disabled={disabled}
            line={line}
            onMove={() => moveLine(index)}
            onOpenPricing={() => onOpenPricing?.(line)}
            onOpenSourcing={() => setSourcingLineKey(key)}
            onRemove={() => removeLine(index)}
            sourcingDisabled={sourcingDisabled}
            sourcingLabel={sourcingTooltipLabel}
          />
        </div>
      </div>
    );
  }

  function renderAddRow(kind, sectionLineCount) {
    return (
      <div
        className={
          COMPOSITION_GRID_CLASS
          + ' bg-muted/10 px-2 py-2'
        }
        key={'add-' + kind}
      >
        <div className="min-w-0">
          <ProductSearchAutocomplete
            ariaLabel={'Ajouter un produit aux ' + SECTION_PRESENTATION[kind].label}
            clearOnSelect
            compact
            key={'add-product-' + kind + '-' + sectionLineCount}
            metadata={productMetadata}
            onSelect={(result) => addProduct(kind, result)}
            onValueChange={(value) => setAddSearch((current) => ({
              ...current,
              [kind]: value,
            }))}
            placeholder="Ajouter un produit"
            scope={productScope}
            showWorkspaceFavorite={productScope === PRODUCT_SOURCE.REFERENCE}
            status="ACTIVE"
            value={addSearch[kind]}
            workspaceId={workspaceId}
          />
        </div>
        <div className="hidden lg:col-span-8 lg:block" />
      </div>
    );
  }

  function renderSection(kind) {
    const sectionLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.kind === kind);

    return (
      <section key={kind}>
        {kind === 'ECONOMAT' && (
          <div className="border-y-2 border-primary/35 bg-muted/45 px-2 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Économat
              <span className="ml-1 text-muted-foreground">
                ({sectionLines.length})
              </span>
            </h3>
          </div>
        )}

        {sectionLines.map(({ line, index }) => renderLine(line, index))}
        {!disabled && renderAddRow(kind, sectionLines.length)}
        {disabled && sectionLines.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            Aucun produit.
          </p>
        )}
      </section>
    );
  }

  const ingredientCount = lines.filter(
    (line) => line.kind === 'INGREDIENT',
  ).length;

  return (
    <div>
      {addError && (
        <p className="text-sm text-destructive" role="alert">
          {addError}
        </p>
      )}

      <div className="overflow-hidden border-y border-border">
        <div className={COMPOSITION_GRID_CLASS + ' hidden border-b border-border bg-muted/20 px-2 py-2 lg:grid'}>
          <ColumnHeading tooltip="Produits ingrédients">
            INGRÉDIENTS <span className="text-muted-foreground">({ingredientCount})</span>
          </ColumnHeading>
          <ColumnHeading align="center" tooltip="Quantité nette">Qté</ColumnHeading>
          <ColumnHeading align="center" tooltip="Unité">U</ColumnHeading>
          <ColumnHeading align="center" tooltip="Prix unitaire hors taxe">PUHT</ColumnHeading>
          <ColumnHeading align="center" tooltip="Coût matières unitaire hors taxe">CMU HT</ColumnHeading>
          <ColumnHeading
            align="center"
            tooltip="Part de cette ligne Ingrédient dans le coût matière HT total de la Fiche. Disponible après valorisation complète."
          >
            %CM
          </ColumnHeading>
          <ColumnHeading align="center" tooltip="Taux de rendement">%TR</ColumnHeading>
          <ColumnHeading tooltip="Note">Note</ColumnHeading>
          <ColumnHeading align="center" tooltip="Actions">Actions</ColumnHeading>
        </div>

        {renderSection('INGREDIENT')}
        {renderSection('ECONOMAT')}
      </div>

      <SupplierArticleDialog
        canManage={canManageSourcing}
        disabled={
          sourcingDisabled
          || !sourcingLine?.id
          || draftRevision === null
          || draftRevision === undefined
        }
        dossierId={dossierId}
        draftRevision={draftRevision}
        line={sourcingLine}
        onClose={() => setSourcingLineKey(null)}
        onError={onSourcingError}
        onPendingChange={onSourcingPendingChange}
        onSelected={onSourcingSelected}
        technicalSheetId={technicalSheetId}
        workspaceId={workspaceId}
      />
    </div>
  );
}

export {
  PRODUCT_SOURCE,
  TechnicalSheetLineEditor,
  TechnicalSheetProductScopeControls,
  getPricingSourceLabel,
  getSupplierArticleActionTooltip,
  normalizeDraftLine,
};
