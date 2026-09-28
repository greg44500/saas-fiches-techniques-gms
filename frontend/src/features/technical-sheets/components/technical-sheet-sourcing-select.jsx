import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useListSupplierArticlesQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  useSelectTechnicalSheetSupplierArticleMutation,
} from '@/features/technical-sheets/api/technical-sheets-api';
import {
  getTechnicalSheetApiErrorMessage,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

const NO_SELECTION = '__NONE__';

function articleLabel(article) {
  return [
    article.supplier?.name,
    article.supplierReference,
    article.supplierDesignation,
  ].filter(Boolean).join(' · ');
}

function TechnicalSheetSourcingSelect({
  canManage,
  dossierId,
  draftRevision,
  line,
  onError,
  onSelected,
  technicalSheetId,
  workspaceId,
}) {
  const articlesQuery = useListSupplierArticlesQuery({
    workspaceId,
    productVariantId: line.productVariantId,
    status: 'ACTIVE',
    page: 1,
    limit: 100,
  });
  const [selectArticle, selectState] =
    useSelectTechnicalSheetSupplierArticleMutation();

  const articles = articlesQuery.data?.articles ?? [];
  const items = [
    { value: NO_SELECTION, label: 'Choisir un Article fournisseur' },
    ...articles.map((article) => ({
      value: article.id,
      label: articleLabel(article),
    })),
  ];
  const selectedArticleId =
    line.selectedSupplierArticleId
    ?? line.valuation?.supplierArticleId
    ?? NO_SELECTION;

  if (articlesQuery.isLoading && !articlesQuery.data) {
    return (
      <p className="text-xs text-muted-foreground">
        Chargement des Articles…
      </p>
    );
  }

  if (articlesQuery.isError) {
    return (
      <p className="text-xs text-destructive">
        Articles fournisseur indisponibles.
      </p>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="text-xs text-destructive">
        Aucun Article fournisseur exploitable pour cette Référence Produit.
      </p>
    );
  }

  if (!canManage) {
    const selected = articles.find(({ id }) => id === selectedArticleId);

    return (
      <p className="text-xs text-muted-foreground">
        {selected ? articleLabel(selected) : 'Sélection automatique lors de la valorisation'}
      </p>
    );
  }

  async function choose(value) {
    if (value === NO_SELECTION) return;

    try {
      const draft = await selectArticle({
        workspaceId,
        dossierId,
        technicalSheetId,
        expectedRevision: draftRevision,
        lineId: line.id,
        supplierArticleId: value,
      }).unwrap();
      onSelected?.(draft);
    } catch (error) {
      onError?.(
        getTechnicalSheetApiErrorMessage(
          error,
          'L’Article fournisseur n’a pas pu être sélectionné.',
        ),
      );
    }
  }

  return (
    <Select
      disabled={selectState.isLoading}
      items={items}
      onValueChange={choose}
      value={selectedArticleId}
    >
      <SelectTrigger aria-label={'Article fournisseur pour ' + line.productVariant?.name}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem
            disabled={item.value === NO_SELECTION}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { TechnicalSheetSourcingSelect };
