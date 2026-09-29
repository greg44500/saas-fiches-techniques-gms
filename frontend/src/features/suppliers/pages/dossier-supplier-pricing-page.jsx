import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Star,
  Trash2,
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
  useGetDossierByIdQuery,
} from '@/features/dossiers/api/dossiers-api';
import {
  useAddDossierSupplierReferenceMutation,
  useArchiveNegotiatedPriceMutation,
  useDecideInvoicedPriceMutation,
  useLazyGetApplicableSupplierPriceQuery,
  useListDossierSupplierReferencesQuery,
  useListInvoicedPricesQuery,
  useListNegotiatedPricesQuery,
  useListSupplierArticlesQuery,
  useListSupplierCatalogsQuery,
  useRemoveDossierSupplierReferenceMutation,
} from '@/features/suppliers/api/supplier-api';
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

function getPricingSourceLabel(source) {
  return {
    SUPPLIER_TARIFF: 'Tarif fournisseur',
    NEGOTIATED_PRICE: 'Tarif négocié',
    INVOICED_PRICE: 'Prix facturé',
  }[source] ?? 'Source non disponible';
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
    return null;
  });
  const [priceDialog, setPriceDialog] = useState(null);
  const [articleToAdd, setArticleToAdd] = useState(NONE);
  const [selectedArticleId, setSelectedArticleId] = useState(NONE);

  const dossierQuery = useGetDossierByIdQuery({
    workspaceId: workspace.id,
    dossierId,
  });
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
  const [loadApplicablePrice, applicablePriceQuery] =
    useLazyGetApplicableSupplierPriceQuery();

  const [addReference, addReferenceState] =
    useAddDossierSupplierReferenceMutation();
  const [removeReference, removeReferenceState] =
    useRemoveDossierSupplierReferenceMutation();
  const [archiveNegotiated, archiveNegotiatedState] =
    useArchiveNegotiatedPriceMutation();
  const [decideInvoice, decideInvoiceState] =
    useDecideInvoicedPriceMutation();

  const references = referencesQuery.data ?? [];
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

  async function chooseApplicableArticle(articleId) {
    setSelectedArticleId(articleId);

    if (articleId === NONE) return;

    try {
      await loadApplicablePrice({
        workspaceId: workspace.id,
        dossierId,
        articleId,
      }).unwrap();
    } catch {
      // L'état d'erreur RTK Query est affiché plus bas.
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
          <Button
            disabled={removeReferenceState.isLoading}
            onClick={() => removeFavorite(reference.supplierArticle.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Retirer
          </Button>
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
      header: 'Prix',
      cell: (price) => formatPrice(price),
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
          <Button
            disabled={archiveNegotiatedState.isLoading}
            onClick={() => archiveNegotiatedPrice(price.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            Archiver
          </Button>
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
      header: 'Prix',
      cell: (price) => formatPrice(price),
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
            <Button
              disabled={decideInvoiceState.isLoading}
              onClick={() => decideInvoicedPrice(price.id, 'VALIDATED')}
              size="sm"
              type="button"
            >
              Valider
            </Button>
            <Button
              disabled={decideInvoiceState.isLoading}
              onClick={() => decideInvoicedPrice(price.id, 'REJECTED')}
              size="sm"
              type="button"
              variant="outline"
            >
              Rejeter
            </Button>
          </DataTableActions>
        ) : null
      ),
    },
  ];

  const applicable = applicablePriceQuery.data;

  if (
    dossierQuery.isLoading
    && dossierQuery.data === undefined
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Chargement du Dossier…
      </p>
    );
  }

  if (dossierQuery.isError || !dossierQuery.data) {
    return (
      <ErrorState
        description="Le Dossier demandé n’est pas accessible ou n’a pas pu être chargé."
        onRetry={dossierQuery.refetch}
        title="Dossier indisponible"
      />
    );
  }

  const dossier = dossierQuery.data;

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Button asChild size="sm" variant="ghost">
          <Link to={'/workspaces/' + workspace.id + '/dossiers/' + dossierId}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Retour au Dossier
          </Link>
        </Button>
        <div className="flex items-start gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {dossier.name} — Fournisseurs et prix
          </h1>
          <InfoTooltip
            content="Les prix affichés et résolus restent strictement limités à ce Dossier."
            label="À propos des Fournisseurs et prix"
          />
        </div>
      </header>

      {can(SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ) && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <h2 className="font-semibold">Vérifier un prix applicable</h2>
              <InfoTooltip
                content="Sélectionnez un Article fournisseur pour voir le prix que l’application utiliserait dans ce Dossier selon la politique de prix définie."
                label="À propos de la vérification du prix applicable"
              />
            </div>

            <div className="w-full lg:max-w-xl">
              <p className="mb-2 text-sm font-medium">Article fournisseur</p>
              <Select
                items={[
                  { value: NONE, label: 'Sélectionner' },
                  ...visibleArticles.map((article) => ({
                    value: article.id,
                    label: article.supplierName + ' · ' + article.supplierReference,
                  })),
                ]}
                onValueChange={chooseApplicableArticle}
                value={selectedArticleId}
              >
                <SelectTrigger aria-label="Article fournisseur à vérifier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sélectionner</SelectItem>
                  {visibleArticles.map((article) => (
                    <SelectItem key={article.id} value={article.id}>
                      {article.supplierName} · {article.supplierReference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {applicablePriceQuery.isFetching && (
            <p className="mt-4 text-sm text-muted-foreground">
              Vérification du prix…
            </p>
          )}

          {applicablePriceQuery.isError && (
            <div className="mt-4">
              <ErrorState
                description="Le prix applicable n’a pas pu être déterminé pour cet Article."
                title="Vérification impossible"
              />
            </div>
          )}

          {applicable && (
            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
              <p className="font-medium">
                {applicable.price
                  ? formatPrice(applicable.price)
                  : 'Aucun prix applicable'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Source retenue : {getPricingSourceLabel(applicable.resolvedSource)}
              </p>
              {applicable.fallbackApplied && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Une source de remplacement a été utilisée car la source prioritaire n’était pas disponible.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {section && (
        <Tabs onValueChange={setSection} value={section}>
          <TabsList aria-label="Données Fournisseurs du Dossier" variant="section">
          {can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_READ) && (
            <TabsTrigger value="references" variant="section">
              Références
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.CATALOG_READ) && (
            <TabsTrigger value="catalogs" variant="section">
              Catalogues
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_READ) && (
            <TabsTrigger value="negotiated" variant="section">
              Tarifs négociés
            </TabsTrigger>
          )}
          {can(SUPPLIER_PERMISSION.INVOICED_PRICE_READ) && (
            <TabsTrigger value="invoiced" variant="section">
              Prix facturés
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
            <div>
              <p className="text-sm font-medium">
                Tarifs fournisseur
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Les tarifs fournisseur proviennent des catalogues. L’import et la gestion des catalogues se font depuis la page Fournisseurs.
              </p>
            </div>
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
            <div>
              <p className="text-sm font-medium">
                Tarifs négociés du Dossier
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prix contractuels spécifiques à cet Article dans ce Dossier et pour une période donnée.
              </p>
            </div>
            {can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_MANAGE) && (
              <ActionIconButton
                Icon={Plus}
                label="Ajouter un Tarif négocié"
                onClick={() => setPriceDialog('negotiated')}
                tooltipLabel="Ajouter un Tarif négocié"
                variant="outline"
              />
            )}
          </div>
          <DataTable
            rowClassName="transition-colors hover:bg-muted/50"
            caption="Tarifs négociés du Dossier"
            columns={negotiatedColumns}
            data={negotiatedQuery.data ?? []}
            emptyContent={(
              <EmptyState
                className="p-0"
                description="Aucun Tarif négocié n’est enregistré pour ce Dossier."
                title="Aucun Tarif négocié"
              />
            )}
            getRowKey={(price) => price.id}
          />
        </section>
      )}

      {section === 'invoiced' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <p className="text-sm font-medium">
                Prix facturés du Dossier
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prix réellement constatés sur facture, soumis à validation avant utilisation par la politique de prix.
              </p>
            </div>
            {can(SUPPLIER_PERMISSION.INVOICED_PRICE_MANAGE) && (
              <ActionIconButton
                Icon={Plus}
                label="Ajouter un Prix facturé"
                onClick={() => setPriceDialog('invoice')}
                tooltipLabel="Ajouter un Prix facturé"
                variant="outline"
              />
            )}
          </div>
          <DataTable
            rowClassName="transition-colors hover:bg-muted/50"
            caption="Prix facturés du Dossier"
            columns={invoicedColumns}
            data={invoicedQuery.data ?? []}
            emptyContent={(
              <EmptyState
                className="p-0"
                description="Aucun Prix facturé n’est enregistré pour ce Dossier."
                title="Aucun Prix facturé"
              />
            )}
            getRowKey={(price) => price.id}
          />
        </section>
      )}

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
