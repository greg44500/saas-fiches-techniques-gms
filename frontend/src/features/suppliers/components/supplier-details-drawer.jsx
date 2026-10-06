import { Pencil } from 'lucide-react';
import { useRef } from 'react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { EmptyState } from '@/components/shared/empty-state';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useListGlobalSupplierArticlesQuery,
  useListGlobalSupplierCatalogsQuery,
  useListSupplierArticlesQuery,
  useListSupplierCatalogsQuery,
} from '@/features/suppliers/api/supplier-api';
import {
  formatPackaging,
  getSupplierOriginLabel,
  getSupplierStatusLabel,
  getSupplierStatusTone,
} from '@/features/suppliers/lib/supplier-presentation';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[150px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium sm:text-right">
        {value || 'Non renseigné'}
      </dd>
    </div>
  );
}

function formatPeriod(catalog) {
  const from = catalog.validFrom
    ? new Date(catalog.validFrom).toLocaleDateString('fr-FR')
    : 'début non renseigné';
  const to = catalog.validTo
    ? new Date(catalog.validTo).toLocaleDateString('fr-FR')
    : 'sans fin';

  return from + ' → ' + to;
}

function SupplierDetailsDrawer({
  canManage = false,
  canReadArticles = true,
  canReadCatalogs = true,
  mode = 'workspace',
  onClose,
  onEdit,
  open,
  supplier,
  workspaceId,
}) {
  const retainedSupplierRef = useRef(null);

  if (supplier) retainedSupplierRef.current = supplier;
  const detailSupplier = supplier ?? retainedSupplierRef.current;
  const supplierId = detailSupplier?.id;
  const isGlobal = mode === 'global';

  const workspaceArticles = useListSupplierArticlesQuery(
    {
      workspaceId,
      supplierId,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: (
        !open
        || !supplierId
        || isGlobal
        || !canReadArticles
      ),
    },
  );
  const workspaceCatalogs = useListSupplierCatalogsQuery(
    {
      workspaceId,
      supplierId,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: (
        !open
        || !supplierId
        || isGlobal
        || !canReadCatalogs
      ),
    },
  );
  const globalArticles = useListGlobalSupplierArticlesQuery(
    {
      supplierId,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: (
        !open
        || !supplierId
        || !isGlobal
        || !canReadArticles
      ),
    },
  );
  const globalCatalogs = useListGlobalSupplierCatalogsQuery(
    {
      supplierId,
      status: 'ACTIVE',
      limit: 100,
    },
    {
      skip: (
        !open
        || !supplierId
        || !isGlobal
        || !canReadCatalogs
      ),
    },
  );

  const articleQuery = isGlobal ? globalArticles : workspaceArticles;
  const catalogQuery = isGlobal ? globalCatalogs : workspaceCatalogs;
  const articles = articleQuery.data?.articles ?? [];
  const catalogs = catalogQuery.data?.catalogs ?? [];

  if (!detailSupplier && !open) return null;

  const canEdit = (
    canManage
    && (
      isGlobal
      || detailSupplier?.scope === 'WORKSPACE_PRIVATE'
    )
  );

  return (
    <EntityDetailsDrawer
      description={
        isGlobal
          ? 'Identité partagée, Articles et catalogues du Fournisseur.'
          : 'Identité, Articles, catalogues et usages du Fournisseur dans cet espace de travail.'
      }
      onClose={onClose}
      open={open}
      title={detailSupplier?.name ?? 'Fournisseur'}
    >
      {detailSupplier ? (
        <Tabs defaultValue="infos">
          <TabsList aria-label="Détails du Fournisseur" variant="section">
            <TabsTrigger value="infos" variant="section">
              Informations
            </TabsTrigger>
            {canReadArticles && (
              <TabsTrigger value="articles" variant="section">
                Articles
              </TabsTrigger>
            )}
            {canReadCatalogs && (
              <TabsTrigger value="catalogs" variant="section">
                Catalogues
              </TabsTrigger>
            )}
            {!isGlobal && (
              <TabsTrigger value="usage" variant="section">
                Utilisation
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="infos" variant="section">
            <div className="space-y-3">
              {canEdit && onEdit && (
                <div className="flex justify-end">
                  <ActionIconButton
                    Icon={Pencil}
                    label={'Modifier ' + detailSupplier.name}
                    onClick={() => onEdit(detailSupplier)}
                    tooltipLabel="Modifier"
                    variant="outline"
                  />
                </div>
              )}

              <div className="rounded-lg border border-border px-4">
                <dl>
                  <DetailRow label="Nom" value={detailSupplier.name} />
                  <DetailRow
                    label="Code Fournisseur"
                    value={detailSupplier.supplierCode}
                  />
                  <DetailRow
                    label="Raison sociale"
                    value={detailSupplier.legalName}
                  />
                  <DetailRow
                    label="Site web"
                    value={detailSupplier.website}
                  />
                  <DetailRow
                    label="Catégories"
                    value={(detailSupplier.categories ?? [])
                      .map(({ name }) => name)
                      .filter(Boolean)
                      .join(', ')}
                  />
                  <DetailRow
                    label="Origine"
                    value={getSupplierOriginLabel(detailSupplier.scope)}
                  />
                  <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]">
                    <dt className="text-sm text-muted-foreground">Statut</dt>
                    <dd className="sm:text-right">
                      <StatusBadge tone={getSupplierStatusTone(detailSupplier.status)}>
                        {getSupplierStatusLabel(detailSupplier.status)}
                      </StatusBadge>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </TabsContent>

          {canReadArticles && (
            <TabsContent value="articles" variant="section">
              {articleQuery.isLoading && articleQuery.data === undefined ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des Articles…
                </p>
              ) : articleQuery.isError ? (
                <ErrorState
                  className="p-0"
                  description="Les Articles du Fournisseur n’ont pas pu être chargés."
                  onRetry={articleQuery.refetch}
                  title="Articles indisponibles"
                />
              ) : articles.length === 0 ? (
                <EmptyState
                  description="Aucun Article actif n’est rattaché à ce Fournisseur."
                  title="Aucun Article"
                />
              ) : (
                <ul className="space-y-3">
                  {articles.map((article) => (
                    <li
                      className="rounded-lg border border-border p-4"
                      key={article.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {article.supplierReference}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {article.supplierDesignation
                              || article.productVariant?.name
                              || 'Sans désignation'}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {formatPackaging(
                              article.packaging,
                              { productVariant: article.productVariant },
                            )}
                          </p>
                        </div>
                        <StatusBadge tone={getSupplierStatusTone(article.status)}>
                          {getSupplierStatusLabel(article.status)}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          )}

          {canReadCatalogs && (
            <TabsContent value="catalogs" variant="section">
              {catalogQuery.isLoading && catalogQuery.data === undefined ? (
                <p className="text-sm text-muted-foreground">
                  Chargement des catalogues…
                </p>
              ) : catalogQuery.isError ? (
                <ErrorState
                  className="p-0"
                  description="Les catalogues du Fournisseur n’ont pas pu être chargés."
                  onRetry={catalogQuery.refetch}
                  title="Catalogues indisponibles"
                />
              ) : catalogs.length === 0 ? (
                <EmptyState
                  description="Aucun catalogue actif n’est rattaché à ce Fournisseur."
                  title="Aucun catalogue"
                />
              ) : (
                <ul className="space-y-3">
                  {catalogs.map((catalog) => (
                    <li
                      className="rounded-lg border border-border p-4"
                      key={catalog.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{catalog.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatPeriod(catalog)}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Provenance : {catalog.source || 'non renseignée'}
                          </p>
                        </div>
                        <StatusBadge tone={getSupplierStatusTone(catalog.status)}>
                          {getSupplierStatusLabel(catalog.status)}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          )}

          {!isGlobal && (
            <TabsContent value="usage" variant="section">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold">
                  Utilisation du Fournisseur
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cet espace accueillera les usages du Fournisseur dans les
                  Dossiers, les références favorites ou fréquentes et les
                  futures fiches techniques associées aux Références Produit.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Les Tarifs négociés et Prix facturés restent volontairement
                  consultés dans leur Dossier afin de préserver l’isolation des
                  conditions commerciales.
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      ) : null}
    </EntityDetailsDrawer>
  );
}

export { DetailRow, SupplierDetailsDrawer };
