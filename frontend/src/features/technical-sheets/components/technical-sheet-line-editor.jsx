import {
  ArrowDownUp,
  ArrowUpRight,
  Globe2,
  PackageSearch,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { Input } from '@/components/ui/input';
import {
  DialogContent,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ProductSearchAutocomplete,
} from '@/features/products/components/product-search-autocomplete';
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
  'lg:grid-cols-[minmax(0,2fr)_4.5rem_5rem_5.5rem_5.75rem_4.5rem_minmax(0,1.25fr)_10.75rem]',
  'lg:items-center',
].join(' ');

function normalizeDraftLine(line, index) {
  return {
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

function getSupplierArticleActionTooltip({
  canManageSourcing,
  line,
  requiresSave = false,
}) {
  if (!canManageSourcing) return 'Consulter l’Article fournisseur';

  const hasSelectedArticle = Boolean(
    line.selectedSupplierArticleId
    ?? line.valuation?.supplierArticleId
  );
  const label = hasSelectedArticle
    ? 'Modifier l’Article fournisseur'
    : 'Choisir un Article fournisseur';

  return (!line.id || requiresSave)
    ? label + ' — enregistrez d’abord le brouillon'
    : label;
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
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

function ColumnHeading({ children, tooltip }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={tooltip}
        className="w-fit cursor-help text-left text-xs font-semibold text-muted-foreground underline decoration-dotted underline-offset-4"
        type="button"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
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
  requiresSave,
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
              {disabled && canManage && (
                <p className="text-xs text-muted-foreground">
                  {!line.id || requiresSave
                    ? 'Enregistrez le brouillon avant de modifier l’approvisionnement.'
                    : 'L’approvisionnement est momentanément indisponible.'}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
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
  onOpenPricing,
  onSourcingError,
  onSourcingPendingChange,
  onSourcingSelected,
  productMetadata,
  sourcingDisabled = false,
  sourcingRequiresSave = false,
  technicalSheetId,
  workspaceId,
}) {
  const [productScope, setProductScope] = useState(PRODUCT_SOURCE.REFERENCE);
  const [addSearch, setAddSearch] = useState({
    INGREDIENT: '',
    ECONOMAT: '',
  });
  const [editingLineKey, setEditingLineKey] = useState(null);
  const [editSearch, setEditSearch] = useState('');
  const [sourcingLineKey, setSourcingLineKey] = useState(null);
  const [addError, setAddError] = useState('');

  const unitItems = useMemo(
    () => (metadata?.units ?? []).map((unit) => ({
      value: unit.value,
      label: unit.label,
    })),
    [metadata?.units],
  );

  function lineKey(line, index) {
    return line.id ?? line.productVariantId + ':' + index;
  }

  function updateLine(index, patch) {
    onChange(
      lines.map((line, currentIndex) => (
        currentIndex === index
          ? { ...line, ...patch }
          : line
      )),
    );
  }

  function removeLine(index) {
    onChange(
      lines
        .filter((_, currentIndex) => currentIndex !== index)
        .map((line, order) => ({ ...line, order })),
    );
  }

  function moveLine(index) {
    const line = lines[index];
    const presentation = SECTION_PRESENTATION[line.kind];

    updateLine(index, {
      kind: presentation.opposite,
    });
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
    ]);
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

    setAddError('');
    updateLine(index, {
      id: undefined,
      productVariantId: result.variant.id,
      productVariantName:
        result.variant.name
        ?? result.product?.name
        ?? 'Référence Produit',
      productVariant: result.variant,
      referenceUnit: result.variant.referenceUnit,
      inputUnit: result.variant.referenceUnit,
      selectedSupplierArticleId: null,
      calculation: null,
      valuation: null,
    });
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
    );
    const sourceLabel = getPricingSourceLabel(
      line.valuation?.applicableSource,
    );
    const sourcingTooltipLabel = getSupplierArticleActionTooltip({
      canManageSourcing,
      line,
      requiresSave: sourcingRequiresSave,
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
            <div className="flex min-w-0 items-center gap-1">
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
              <ActionIconButton
                Icon={X}
                label="Annuler le remplacement du Produit"
                onClick={() => {
                  setEditingLineKey(null);
                  setEditSearch('');
                }}
                tooltipLabel="Annuler"
                variant="ghost"
              />
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

        <div className="min-w-0">
          <MobileLabel>Quantité nette</MobileLabel>
          <Input
            aria-label={'Quantité nette ligne ' + (index + 1)}
            className="h-8 min-w-0 tabular-nums"
            disabled={disabled}
            inputMode="decimal"
            onChange={(event) => updateLine(index, {
              netQuantity: event.target.value,
            })}
            value={line.netQuantity}
          />
        </div>

        <div className="min-w-0">
          <MobileLabel>Unité</MobileLabel>
          <Select
            disabled={disabled}
            items={unitItems}
            onValueChange={(value) => updateLine(index, { inputUnit: value })}
            value={line.inputUnit}
          >
            <SelectTrigger
              aria-label={'Unité ligne ' + (index + 1)}
              className="h-8 min-h-8 min-w-0 px-2"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <MobileLabel>Prix unitaire hors taxe</MobileLabel>
          <Tooltip>
            <TooltipTrigger
              aria-label={
                sourceLabel
                  ? 'Prix unitaire hors taxe — ' + sourceLabel
                  : 'Prix unitaire hors taxe'
              }
              className="block max-w-full truncate text-left text-sm font-medium tabular-nums"
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
                      ? ' · prix normalisé par ' + line.valuation.normalizedUnit
                      : ''
                  )
                : valuationPresentation.label}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="min-w-0">
          <MobileLabel>Coût matières unitaire hors taxe</MobileLabel>
          <p className="truncate text-sm font-medium tabular-nums">
            {hasValue(line.valuation?.lineCostHt)
              ? formatDecimalCurrency(line.valuation.lineCostHt)
              : '—'}
          </p>
        </div>

        <div className="min-w-0">
          <MobileLabel>Taux de rendement</MobileLabel>
          <p className="truncate text-sm tabular-nums">
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
            onChange={(event) => updateLine(index, {
              note: event.target.value,
            })}
            value={line.note}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          <MobileLabel>Actions</MobileLabel>

          <ActionIconButton
            Icon={PackageSearch}
            label={'Approvisionnement de ' + line.productVariantName}
            onClick={() => setSourcingLineKey(key)}
            tooltipLabel={sourcingTooltipLabel}
            variant="ghost"
          />

          {canOpenPricing && line.valuation?.status === 'NO_PRICE' && (
            <ActionIconButton
              Icon={ArrowUpRight}
              label={'Ouvrir Fournisseurs et prix pour ' + line.productVariantName}
              onClick={() => onOpenPricing?.(line)}
              tooltipLabel="Ouvrir Fournisseurs et prix"
              variant="ghost"
            />
          )}

          <ActionIconButton
            Icon={ArrowDownUp}
            disabled={disabled}
            label={
              'Déplacer '
              + line.productVariantName
              + ' vers '
              + SECTION_PRESENTATION[line.kind].oppositeLabel
            }
            onClick={() => moveLine(index)}
            tooltipLabel={
              'Déplacer vers '
              + SECTION_PRESENTATION[line.kind].oppositeLabel
            }
            variant="ghost"
          />

          <ActionIconButton
            Icon={Trash2}
            disabled={disabled}
            label={'Supprimer ' + line.productVariantName}
            onClick={() => removeLine(index)}
            tooltipLabel="Supprimer la ligne"
            variant="ghost"
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
        <div className="hidden lg:col-span-7 lg:block" />
      </div>
    );
  }

  function renderSection(kind, sectionIndex) {
    const sectionLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.kind === kind);

    return (
      <section key={kind}>
        <div
          className={[
            'flex flex-col gap-1 bg-muted/35 px-2 py-2 sm:flex-row sm:items-center sm:justify-between',
            sectionIndex > 0
              ? 'border-t-2 border-primary/20'
              : '',
            'border-b border-border',
          ].join(' ')}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            {SECTION_PRESENTATION[kind].label}
            <span className="ml-1 text-muted-foreground">
              ({sectionLines.length})
            </span>
          </h3>

          {kind === 'INGREDIENT' && (
            <p className="text-xs text-muted-foreground">
              Sélectionnez une Référence Produit ; la quantité et l’unité restent modifiables dans la ligne.
            </p>
          )}
        </div>

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

  return (
    <div className="space-y-3">
      {!disabled && (
        <div className="flex items-center justify-end gap-2">
          <ActionIconButton
            Icon={Globe2}
            aria-pressed={productScope === PRODUCT_SOURCE.REFERENCE}
            label="Tous les produits"
            onClick={() => setProductScope(PRODUCT_SOURCE.REFERENCE)}
            tooltipLabel="Tous les produits"
            variant={
              productScope === PRODUCT_SOURCE.REFERENCE
                ? 'default'
                : 'outline'
            }
          />
          <ActionIconButton
            Icon={Star}
            aria-pressed={productScope === PRODUCT_SOURCE.FAVORITES}
            label="Favoris"
            onClick={() => setProductScope(PRODUCT_SOURCE.FAVORITES)}
            tooltipLabel="Favoris"
            variant={
              productScope === PRODUCT_SOURCE.FAVORITES
                ? 'default'
                : 'outline'
            }
          />
        </div>
      )}

      {addError && (
        <p className="text-sm text-destructive" role="alert">
          {addError}
        </p>
      )}

      <div className="overflow-hidden border-y border-border">
        <div className={COMPOSITION_GRID_CLASS + ' hidden border-b border-border bg-muted/20 px-2 py-2 lg:grid'}>
          <ColumnHeading tooltip="Produit">Produit</ColumnHeading>
          <ColumnHeading tooltip="Quantité nette">Qté</ColumnHeading>
          <ColumnHeading tooltip="Unité">U</ColumnHeading>
          <ColumnHeading tooltip="Prix unitaire hors taxe">PUHT</ColumnHeading>
          <ColumnHeading tooltip="Coût matières unitaire hors taxe">CMU HT</ColumnHeading>
          <ColumnHeading tooltip="Taux de rendement">%TR</ColumnHeading>
          <ColumnHeading tooltip="Note">Note</ColumnHeading>
          <ColumnHeading tooltip="Actions">Actions</ColumnHeading>
        </div>

        {renderSection('INGREDIENT', 0)}
        {renderSection('ECONOMAT', 1)}
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
        requiresSave={sourcingRequiresSave}
        technicalSheetId={technicalSheetId}
        workspaceId={workspaceId}
      />
    </div>
  );
}

export {
  PRODUCT_SOURCE,
  TechnicalSheetLineEditor,
  getPricingSourceLabel,
  getSupplierArticleActionTooltip,
  normalizeDraftLine,
};
