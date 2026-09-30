import {
  Archive,
  ArrowUpRight,
  Check,
  CircleMinus,
  Euro,
  Pencil,
  Plus,
  Star,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useAddDossierSupplierReferenceMutation,
  useArchiveNegotiatedPriceMutation,
  useDecideInvoicedPriceMutation,
  useListDossierSupplierReferencesQuery,
  useListDossierIndicativePricesQuery,
  useListInvoicedPricesQuery,
  useListWorkspaceIndicativePricesQuery,
  useListNegotiatedPricesQuery,
  useListSupplierArticlesQuery,
  useListSupplierCatalogsQuery,
  useRemoveDossierSupplierReferenceMutation,
} from '@/features/suppliers/api/supplier-api';
import {
  IndicativePriceDialog,
} from '@/features/suppliers/components/indicative-price-dialog';
import {
  SupplierPriceFormDialog,
} from '@/features/suppliers/components/supplier-price-form-dialog';
import {
  SUPPLIER_PERMISSION,
} from '@/features/suppliers/constants/supplier-permissions';
import {
  formatPrice,
  getApiErrorMessage,
  getSupplierOriginLabel,
  getSupplierStatusLabel,
  getSupplierStatusTone,
} from '@/features/suppliers/lib/supplier-presentation';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

const NONE = '__NONE__';

function normalizeArticle(article) {
  return {
    id: article.id,
    supplierId: article.supplier?.id ?? article.supplierId,
    supplierName: article.supplier?.name ?? article.supplierName ?? 'Fournisseur',
    supplierReference: article.supplierReference,
    productVariantName:
      article.productVariant?.name
      ?? article.productVariantName
      ?? 'Référence Produit',
  };
}

function UnitPriceHeader() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>PU HT</span>
      <InfoTooltip
        content="Prix Unitaire HT en €"
        label="À propos du Prix Unitaire HT"
      />
    </span>
  );
}

function DossierSupplierPricingPage() {
  const { dossierId } = useParams();
  const { can, workspace } = useWorkspaceContext();
  const { toast } = useToast();
  const [section, setSection] = useState(() => {
    if (can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ)) return 'references';
    if (can(SUPPLIER_PERMISSION.CATALOG_READ)) return 'catalogs';
    if (can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ)) return 'negotiated';
    if (can(SUPPLIER_PERMISSION.INVOICED_PRICE_READ)) return 'invoiced';
    if (can(SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ)) return 'indicative';
    return null;
  });
  const [priceDialog, setPriceDialog] = useState(null);
  const [articleToAdd, setArticleToAdd] = useState(NONE);
  const [indicativeDialogOpen, setIndicativeDialogOpen] = useState(false);
  const [indicativeVariant, setIndicativeVariant] = useState(null);

  const referencesQuery = useListDossierSupplierReferencesQuery(
    { workspaceId: workspace.id, dossierId },
    { skip: !can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ) },
  );
  const articlesQuery = useListSupplierArticlesQuery(
    { workspaceId: workspace.id, limit: 100 },
    { skip: !can(SUPPLIER_PERMISSION.ARTICLE_READ) },
  );
  const catalogsQuery = useListSupplierCatalogsQuery(
    {
      workspaceId: workspace.id,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: !can(SUPPLIER_PERMISSION.CATALOG_READ),
    },
  );
  const negotiatedQuery = useListNegotiatedPricesQuery(
    { workspaceId: workspace.id, dossierId },
    { skip: !can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ) },
  );
  const invoicedQuery = useListInvoicedPricesQuery(
    { workspaceId: workspace.id, dossierId },
    { skip: !can(SUPPLIER_PERMISSION.INVOICED_PRICE_READ) },
  );
  const indicativeQuery = useListDossierIndicativePricesQuery(
    {
      workspaceId: workspace.id,
      dossierId,
      status: 'ACTIVE',
    },
    { skip: !can(SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ) },
  );
  const workspaceIndicativeQuery = useListWorkspaceIndicativePricesQuery(
    {
      workspaceId: workspace.id,
      status: 'ACTIVE',
    },
    { skip: !can(SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ) },
  );
  const [addReference, addReferenceState] =
    useAddDossierSupplierReferenceMutation();
  const [removeReference, removeReferenceState] =
    useRemoveDossierSupplierReferenceMutation();
  const [archiveNegotiated, archiveNegotiatedState] =
    useArchiveNegotiatedPriceMutation();
  const [decideInvoice, decideInvoiceState] =
    useDecideInvoicedPriceMutation();

  const references = useMemo(
    () => referencesQuery.data ?? [],
    [referencesQuery.data],
  );
  const negotiatedPrices = negotiatedQuery.data ?? [];
  const invoicedPrices = invoicedQuery.data ?? [];
  const dossierIndicativePrices = useMemo(
    () => indicativeQuery.data ?? [],
    [indicativeQuery.data],
  );
  const workspaceIndicativePrices = useMemo(
    () => workspaceIndicativeQuery.data ?? [],
    [workspaceIndicativeQuery.data],
  );
  const indicativePrices = useMemo(() => {
    const byProductVariant = new Map();

    workspaceIndicativePrices.forEach((price) => {
      const productVariantId = (
        price.productVariant?.id
        ?? price.productVariantId
      );
      if (!productVariantId) return;

      byProductVariant.set(productVariantId, {
        ...price,
        priceScope: 'WORKSPACE',
      });
    });

    dossierIndicativePrices.forEach((price) => {
      const productVariantId = (
        price.productVariant?.id
        ?? price.productVariantId
      );
      if (!productVariantId) return;

      byProductVariant.set(productVariantId, {
        ...price,
        priceScope: 'DOSSIER',
      });
    });

    return Array.from(byProductVariant.values());
  }, [dossierIndicativePrices, workspaceIndicativePrices]);
  const catalogCount = (
    catalogsQuery.data?.pagination?.total
    ?? catalogsQuery.data?.catalogs?.length
    ?? 0
  );
  const negotiatedCount = negotiatedPrices.length;
  const invoicedCount = invoicedPrices.length;
  const indicativeCount = indicativePrices.length;

  const visibleArticles = useMemo(
    () => (
      can(SUPPLIER_PERMISSION.ARTICLE_READ)
        ? (articlesQuery.data?.articles ?? []).map(normalizeArticle)
        : references.map(({ supplierArticle }) => normalizeArticle(supplierArticle))
    ),
    [
      articlesQuery.data?.articles,
      can,
      references,
    ],
  );

  const referenceIds = new Set(
    references.map(({ supplierArticle }) => supplierArticle.id),
  );

  const availableToAdd = visibleArticles.filter(
    ({ id }) => !referenceIds.has(id),
  );

  async function addFavorite() {
    if (articleToAdd === NONE) return;

    try {
      await addReference({
        workspaceId: workspace.id,
        dossierId,
        articleId: articleToAdd,
      }).unwrap();
      setArticleToAdd(NONE);
      toast({
        title: 'Référence ajoutée au Dossier',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Ajout impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function removeFavorite(articleId) {
    try {
      await removeReference({
        workspaceId: workspace.id,
        dossierId,
        articleId,
      }).unwrap();
      toast({
        title: 'Référence retirée du Dossier',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Retrait impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function archiveNegotiatedPrice(priceId) {
    try {
      await archiveNegotiated({
        workspaceId: workspace.id,
        dossierId,
        priceId,
      }).unwrap();
      toast({
        title: 'Tarif négocié archivé',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Archivage impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  async function decideInvoicedPrice(priceId, status) {
    try {
      await decideInvoice({
        workspaceId: workspace.id,
        dossierId,
        priceId,
        status,
      }).unwrap();
      toast({
        title: status === 'VALIDATED'
          ? 'Prix facturé validé'
          : 'Prix facturé rejeté',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Décision impossible',
        description: getApiErrorMessage(error),
        variant: 'destructive',
      });
    }
  }

  const referenceColumns = [
    {
      id: 'article',
      header: 'Référence',
      cell: (reference) => (
        <div>
          <p className="font-medium">
            {reference.supplierArticle.supplierReference}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {reference.supplierArticle.productVariantName}
          </p>
        </div>
      ),
    },
    {
      id: 'supplier',
      header: 'Fournisseur',
      cell: (reference) => reference.supplierArticle.supplierName,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (reference) => (
        can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_MANAGE) ? (
          <ActionIconButton
            Icon={CircleMinus}
            disabled={removeReferenceState.isLoading}
            label={
              'Retirer '
              + reference.supplierArticle.supplierReference
              + ' du Dossier'
            }
            onClick={() => removeFavorite(reference.supplierArticle.id)}
            tooltipLabel="Retirer du Dossier"
            variant="outline"
          />
        ) : null
      ),
    },
  ];

  const negotiatedColumns = [
    {
      id: 'article',
      header: 'Article',
      cell: (price) => (
        <div>
          <p className="font-medium">
            {price.supplierArticle?.supplierReference ?? 'Article fournisseur'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {price.supplierArticle?.supplierName ?? 'Fournisseur'}
          </p>
        </div>
      ),
    },
    {
      id: 'period',
      header: 'Période',
      cell: (price) => (
        <span>
          {new Date(price.validFrom).toLocaleDateString('fr-FR')}
          {' → '}
          {price.validTo
            ? new Date(price.validTo).toLocaleDateString('fr-FR')
            : 'sans fin'}
        </span>
      ),
    },
    {
      id: 'price',
      header: <UnitPriceHeader />,
      cell: (price) => formatPrice(price, {
        hideDefaultCurrency: true,
      }),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (price) => (
        <StatusBadge tone={price.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {price.status === 'ACTIVE' ? 'Actif' : 'Archivé'}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (price) => (
        price.status === 'ACTIVE'
        && can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_MANAGE) ? (
          <ActionIconButton
            Icon={Archive}
            disabled={archiveNegotiatedState.isLoading}
            label="Archiver le tarif négocié"
            onClick={() => archiveNegotiatedPrice(price.id)}
            tooltipLabel="Archiver le tarif négocié"
            variant="outline"
          />
        ) : null
      ),
    },
  ];

  const catalogColumns = [
    {
      id: 'name',
      header: 'Catalogue',
      cell: (catalog) => (
        <div>
          <p className="font-medium">{catalog.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(catalog.supplierName || 'Fournisseur non disponible')
              + ' · '
              + getSupplierOriginLabel(catalog.scope)}
          </p>
        </div>
      ),
    },
    {
      id: 'period',
      header: 'Période',
      cell: (catalog) => (
        <span>
          {catalog.validFrom
            ? new Date(catalog.validFrom).toLocaleDateString('fr-FR')
            : 'Début non renseigné'}
          {' → '}
          {catalog.validTo
            ? new Date(catalog.validTo).toLocaleDateString('fr-FR')
            : 'sans fin'}
        </span>
      ),
    },
    {
      id: 'source',
      header: 'Provenance',
      cell: (catalog) => catalog.source || 'Non renseignée',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (catalog) => (
        <StatusBadge tone={getSupplierStatusTone(catalog.status)}>
          {getSupplierStatusLabel(catalog.status)}
        </StatusBadge>
      ),
    },
  ];

  const indicativeColumns = [
    {
      id: 'product',
      header: 'Produit',
      cell: (price) => (
        <div>
          <p className="font-medium">
            {price.productVariant?.productName
              ?? price.productVariant?.name
              ?? 'Référence Produit'}
          </p>
          {price.productVariant?.name
          && price.productVariant?.name !== price.productVariant?.productName && (
            <p className="mt-1 text-xs text-muted-foreground">
              {price.productVariant.name}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'price',
      header: <UnitPriceHeader />,
      cell: (price) => formatPrice(price, {
        hideDefaultCurrency: true,
      }),
    },
    {
      id: 'origin',
      header: 'Origine',
      cell: (price) => (
        price.priceScope === 'DOSSIER'
          ? 'Dossier'
          : 'Espace de travail'
      ),
    },
    {
      id: 'source',
      header: 'Note / provenance',
      cell: (price) => price.source || 'Non renseignée',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (price) => {
        if (!can(SUPPLIER_PERMISSION.INDICATIVE_PRICE_MANAGE)) return null;

        const isDossierPrice = price.priceScope === 'DOSSIER';

        return (
          <ActionIconButton
            Icon={isDossierPrice ? Pencil : Euro}
            label={
              isDossierPrice
                ? 'Modifier le prix indicatif du Dossier'
                : 'Définir un prix indicatif pour ce Dossier'
            }
            onClick={() => {
              setIndicativeVariant(price.productVariant);
              setIndicativeDialogOpen(true);
            }}
            tooltipLabel={
              isDossierPrice
                ? 'Modifier le prix indicatif du Dossier'
                : 'Définir un prix indicatif pour ce Dossier'
            }
            variant="outline"
          />
        );
      },
    },
  ];

  const invoicedColumns = [
    {
      id: 'article',
      header: 'Article',
      cell: (price) => (
        <div>
          <p className="font-medium">
            {price.supplierArticle?.supplierReference ?? 'Article fournisseur'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {price.supplierArticle?.supplierName ?? 'Fournisseur'}
          </p>
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date de facture',
      cell: (price) => new Date(price.invoiceDate).toLocaleDateString('fr-FR'),
    },
    {
      id: 'price',
      header: <UnitPriceHeader />,
      cell: (price) => formatPrice(price, {
        hideDefaultCurrency: true,
      }),
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (price) => (
        <StatusBadge
          tone={price.status === 'VALIDATED'
            ? 'success'
            : price.status === 'REJECTED'
              ? 'destructive'
              : 'warning'}
        >
          {price.status}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (price) => (
        price.status === 'PENDING_VALIDATION'
        && can(SUPPLIER_PERMISSION.INVOICED_PRICE_VALIDATE) ? (
          <DataTableActions>
            <ActionIconButton
              Icon={Check}
              disabled={decideInvoiceState.isLoading}
              label="Valider le prix facturé"
              onClick={() => decideInvoicedPrice(price.id, 'VALIDATED')}
              tooltipLabel="Valider le prix facturé"
            />
            <ActionIconButton
              Icon={X}
              disabled={decideInvoiceState.isLoading}
              label="Rejeter le prix facturé"
              onClick={() => decideInvoicedPrice(price.id, 'REJECTED')}
              tooltipLabel="Rejeter le prix facturé"
              variant="outline"
            />
          </DataTableActions>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Fournisseurs et prix
        </h2>
        <InfoTooltip
          content="Les prix affichés et résolus restent strictement limités à ce Dossier."
          label="À propos des Fournisseurs et prix"
        />
      </div>

      {section && (
        <Tabs onValueChange={setSection} value={section}>
          <TabsList aria-label="Données Fournisseurs du Dossier" variant="section">
          {can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ) && (
            <TabsTrigger value="references" variant="section">
              Références ({references.length})
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.CATALOG_READ) && (
            <TabsTrigger value="catalogs" variant="section">
              Catalogues ({catalogCount})
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ) && (
            <TabsTrigger value="negotiated" variant="section">
              Tarifs négociés ({negotiatedCount})
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.INVOICED_PRICE_READ) && (
            <TabsTrigger value="invoiced" variant="section">
              Prix facturés ({invoicedCount})
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.INDICATIVE_PRICE_READ) && (
            <TabsTrigger value="indicative" variant="section">
              Prix indicatifs ({indicativeCount})
            </TabsTrigger>
          )}
          </TabsList>
        </Tabs>
      )}

      {section === 'references' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          {can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_MANAGE)
          && can(SUPPLIER_PERMISSION.ARTICLE_READ) && (
            <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row">
              <Select
                items={[
                  { value: NONE, label: 'Sélectionner un Article' },
                  ...availableToAdd.map((article) => ({
                    value: article.id,
                    label: article.supplierName + ' · ' + article.supplierReference,
                  })),
                ]}
                onValueChange={setArticleToAdd}
                value={articleToAdd}
              >
                <SelectTrigger aria-label="Référence à ajouter au Dossier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sélectionner un Article</SelectItem>
                  {availableToAdd.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.supplierName} · {article.supplierReference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={articleToAdd === NONE || addReferenceState.isLoading}
                onClick={addFavorite}
                type="button"
              >
                <Star aria-hidden="true" className="size-4" />
                Ajouter
              </Button>
            </div>
          )}

          {referencesQuery.isError ? (
            <div className="p-4">
              <ErrorState
                description="Les références du Dossier n’ont pas pu être chargées."
                onRetry={referencesQuery.refetch}
                title="Références indisponibles"
              />
            </div>
          ) : (
            <DataTable
              rowClassName="transition-colors hover:bg-muted/50"
              caption="Références fournisseur favorites du Dossier"
              columns={referenceColumns}
              data={references}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description="Aucune référence fournisseur favorite n’est enregistrée pour ce Dossier."
                  title="Aucune référence"
                />
              )}
              getRowKey={(reference) => reference.id}
            />
          )}
        </section>
      )}

      {section === 'catalogs' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                Tarifs fournisseur
              </p>
              <InfoTooltip
                content="Les tarifs fournisseur proviennent des catalogues. L’import et la gestion des catalogues se font depuis la page Fournisseurs."
                label="À propos des Tarifs fournisseur"
              />
            </div>
            {can(SUPPLIER_PERMISSION.SUPPLIER_READ) && (
              <Button asChild size="sm" variant="outline">
                <Link
                  to={
                    '/workspaces/' + workspace.id
                    + '/suppliers?section=catalogs'
                  }
                >
                  Gérer les catalogues
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            )}
          </div>

          {catalogsQuery.isError ? (
            <div className="p-4">
              <ErrorState
                description="Les catalogues accessibles à cet espace de travail n’ont pas pu être chargés."
                onRetry={catalogsQuery.refetch}
                title="Catalogues indisponibles"
              />
            </div>
          ) : (
            <DataTable
              rowClassName="transition-colors hover:bg-muted/50"
              caption="Catalogues fournisseur accessibles depuis ce Dossier"
              columns={catalogColumns}
              data={catalogsQuery.data?.catalogs ?? []}
              emptyContent={(
                <EmptyState
                  className="p-0"
                  description="Aucun catalogue fournisseur actif n’est accessible."
                  title="Aucun catalogue"
                />
              )}
              getRowKey={(catalog) => catalog.id}
            />
          )}
        </section>
      )}

      {section === 'negotiated' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                Tarifs négociés du Dossier
              </p>
              <InfoTooltip
                content="Prix contractuels spécifiques à un Article fournisseur dans ce Dossier et pour une période donnée."
                label="À propos des Tarifs négociés"
              />
            </div>
            {can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_MANAGE) && (
              <Button
                onClick={() => setPriceDialog('negotiated')}
                size="sm"
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Ajouter un tarif négocié
              </Button>
            )}
          </div>
          <DataTable
            rowClassName="transition-colors hover:bg-muted/50"
            caption="Tarifs négociés du Dossier"
            columns={negotiatedColumns}
            data={negotiatedPrices}
            emptyContent={(
              <p className="p-5 text-sm text-muted-foreground">
                Aucun tarif négocié n’est enregistré pour ce Dossier.
              </p>
            )}
            getRowKey={(price) => price.id}
          />
        </section>
      )}

      {section === 'invoiced' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                Prix facturés du Dossier
              </p>
              <InfoTooltip
                content="Prix réellement constatés sur facture, soumis à validation avant utilisation par la politique de prix."
                label="À propos des Prix facturés"
              />
            </div>
            {can(SUPPLIER_PERMISSION.INVOICED_PRICE_MANAGE) && (
              <Button
                onClick={() => setPriceDialog('invoice')}
                size="sm"
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Ajouter un prix facturé
              </Button>
            )}
          </div>
          <DataTable
            rowClassName="transition-colors hover:bg-muted/50"
            caption="Prix facturés du Dossier"
            columns={invoicedColumns}
            data={invoicedPrices}
            emptyContent={(
              <p className="p-5 text-sm text-muted-foreground">
                Aucun prix facturé n’est enregistré pour ce Dossier.
              </p>
            )}
            getRowKey={(price) => price.id}
          />
        </section>
      )}

      {section === 'indicative' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">
                Prix indicatifs du Dossier
              </p>
              <InfoTooltip
                content="Estimations internes propres à ce Dossier. Elles servent uniquement de dernier recours lorsqu’aucun Tarif négocié, Prix facturé admissible ou Tarif fournisseur n’est applicable."
                label="À propos des Prix indicatifs"
              />
            </div>
            {can(SUPPLIER_PERMISSION.INDICATIVE_PRICE_MANAGE) && (
              <Button
                onClick={() => {
                  setIndicativeVariant(null);
                  setIndicativeDialogOpen(true);
                }}
                size="sm"
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Ajouter un prix indicatif
              </Button>
            )}
          </div>

          {indicativeQuery.isError || workspaceIndicativeQuery.isError ? (
            <div className="p-4">
              <ErrorState
                description="Les Prix indicatifs du Dossier n’ont pas pu être chargés."
                onRetry={() => {
                  indicativeQuery.refetch();
                  workspaceIndicativeQuery.refetch();
                }}
                title="Prix indicatifs indisponibles"
              />
            </div>
          ) : (
            <DataTable
              rowClassName="transition-colors hover:bg-muted/50"
              caption="Prix indicatifs du Dossier"
              columns={indicativeColumns}
              data={indicativePrices}
              emptyContent={(
                <p className="p-5 text-sm text-muted-foreground">
                  Aucun prix indicatif n’est enregistré pour ce Dossier.
                </p>
              )}
              getRowKey={(price) => price.id}
            />
          )}
        </section>
      )}

      <IndicativePriceDialog
        dossierId={dossierId}
        onClose={() => {
          setIndicativeDialogOpen(false);
          setIndicativeVariant(null);
        }}
        onSaved={(result) => {
          setIndicativeDialogOpen(false);
          setIndicativeVariant(null);
          toast({
            title: result?.removed
              ? 'Prix indicatif retiré'
              : 'Prix indicatif enregistré',
            variant: 'success',
          });
        }}
        open={indicativeDialogOpen}
        variant={indicativeVariant}
        workspaceId={workspace.id}
      />

      <SupplierPriceFormDialog
        articles={visibleArticles}
        dossierId={dossierId}
        mode={priceDialog === 'invoice' ? 'invoice' : 'negotiated'}
        onClose={() => setPriceDialog(null)}
        onSaved={() => {
          setPriceDialog(null);
          toast({
            title: 'Prix enregistré',
            variant: 'success',
          });
        }}
        open={priceDialog !== null}
        workspaceId={workspace.id}
      />
    </div>
  );
}

export { DossierSupplierPricingPage, normalizeArticle };
