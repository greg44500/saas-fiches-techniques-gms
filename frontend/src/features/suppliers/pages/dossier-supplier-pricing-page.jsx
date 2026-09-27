import { ArrowLeft, Plus, Star, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import {
  DataTable,
  DataTableActions,
} from '@/components/data-display/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useGetPricingPolicyQuery,
  useLazyGetApplicableSupplierPriceQuery,
  useListDossierSupplierReferencesQuery,
  useListInvoicedPricesQuery,
  useListNegotiatedPricesQuery,
  useListSupplierArticlesQuery,
  useListSupplierCatalogsQuery,
  useRemoveDossierSupplierReferenceMutation,
  useUpdatePricingPolicyMutation,
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
  getSupplierScopeLabel,
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
  const policyQuery = useGetPricingPolicyQuery(
    workspace.id,
    { skip: !can(SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ) },
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
  const [updatePolicy, updatePolicyState] =
    useUpdatePricingPolicyMutation();

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

  async function changePolicy(mode) {
    try {
      await updatePolicy({
        workspaceId: workspace.id,
        mode,
      }).unwrap();
      toast({
        title: 'Politique de prix mise à jour',
        variant: 'success',
      });
      if (selectedArticleId !== NONE) {
        loadApplicablePrice({
          workspaceId: workspace.id,
          dossierId,
          articleId: selectedArticleId,
        });
      }
    } catch (error) {
      toast({
        title: 'Modification impossible',
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
            {catalog.supplierName || 'Fournisseur non disponible'}
          </p>
        </div>
      ),
    },
    {
      id: 'scope',
      header: 'Portée',
      cell: (catalog) => getSupplierScopeLabel(catalog.scope),
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
        <div>
          <p className="text-sm font-medium text-primary">{workspace.name}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {dossier.name} — Fournisseurs et prix
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les prix affichés et résolus restent strictement limités à ce Dossier.
          </p>
        </div>
      </header>

      {can(SUPPLIER_PERMISSION.APPLICABLE_PRICE_READ) && (
        <Card>
          <CardHeader>
            <CardTitle>Prix applicable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Politique Workspace</p>
                <Select
                  disabled={
                    !can(SUPPLIER_PERMISSION.PRICE_POLICY_MANAGE)
                    || updatePolicyState.isLoading
                  }
                  items={[
                    { value: 'SUPPLIER_TARIFF', label: 'Tarif fournisseur' },
                    { value: 'NEGOTIATED_PRICE', label: 'Tarif négocié' },
                    { value: 'INVOICED_PRICE', label: 'Prix facturé' },
                  ]}
                  onValueChange={changePolicy}
                  value={policyQuery.data?.mode ?? 'NEGOTIATED_PRICE'}
                >
                  <SelectTrigger aria-label="Politique du Prix applicable">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPPLIER_TARIFF">Tarif fournisseur</SelectItem>
                    <SelectItem value="NEGOTIATED_PRICE">Tarif négocié</SelectItem>
                    <SelectItem value="INVOICED_PRICE">Prix facturé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Article à résoudre</p>
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
                  <SelectTrigger aria-label="Article pour le Prix applicable">
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
              <p className="text-sm text-muted-foreground">Résolution du prix…</p>
            )}

            {applicablePriceQuery.isError && (
              <ErrorState
                description="Le Prix applicable n’a pas pu être résolu pour cet Article."
                title="Résolution impossible"
              />
            )}

            {applicable && (
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium">
                  {applicable.price
                    ? formatPrice(applicable.price)
                    : 'Aucun prix applicable'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Source : {applicable.resolvedSource ?? 'aucune'}
                  {applicable.fallbackApplied ? ' · fallback appliqué' : ''}
                </p>
                {applicable.fallbackReason && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Motif : {applicable.fallbackReason}
                  </p>
                )}
                {applicable.alerts?.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Alertes : {applicable.alerts.join(' · ')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
        <section className="space-y-4">
          {can(SUPPLIER_PERMISSION.DOSSIER_REFERENCE_MANAGE)
          && can(SUPPLIER_PERMISSION.ARTICLE_READ) && (
            <div className="flex flex-col gap-2 sm:flex-row">
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
            <ErrorState
              description="Les références du Dossier n’ont pas pu être chargées."
              onRetry={referencesQuery.refetch}
              title="Références indisponibles"
            />
          ) : (
            <DataTable
              caption="Références fournisseur favorites du Dossier"
              columns={referenceColumns}
              data={references}
              emptyContent={(
                <EmptyState
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
        <section>
          {catalogsQuery.isError ? (
            <ErrorState
              description="Les catalogues accessibles à ce Workspace n’ont pas pu être chargés."
              onRetry={catalogsQuery.refetch}
              title="Catalogues indisponibles"
            />
          ) : (
            <DataTable
              caption="Catalogues fournisseur accessibles depuis ce Dossier"
              columns={catalogColumns}
              data={catalogsQuery.data?.catalogs ?? []}
              emptyContent={(
                <EmptyState
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
        <section className="space-y-4">
          {can(SUPPLIER_PERMISSION.NEGOTIATED_PRICE_MANAGE) && (
            <Button onClick={() => setPriceDialog('negotiated')} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Ajouter un Tarif négocié
            </Button>
          )}
          <DataTable
            caption="Tarifs négociés du Dossier"
            columns={negotiatedColumns}
            data={negotiatedQuery.data ?? []}
            emptyContent={(
              <EmptyState
                description="Aucun Tarif négocié n’est enregistré pour ce Dossier."
                title="Aucun Tarif négocié"
              />
            )}
            getRowKey={(price) => price.id}
          />
        </section>
      )}

      {section === 'invoiced' && (
        <section className="space-y-4">
          {can(SUPPLIER_PERMISSION.INVOICED_PRICE_MANAGE) && (
            <Button onClick={() => setPriceDialog('invoice')} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Ajouter un Prix facturé
            </Button>
          )}
          <DataTable
            caption="Prix facturés du Dossier"
            columns={invoicedColumns}
            data={invoicedQuery.data ?? []}
            emptyContent={(
              <EmptyState
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
