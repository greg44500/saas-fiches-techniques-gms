import { ChevronDown } from 'lucide-react';
import { useRef } from 'react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { useListSupplierArticleTariffsQuery } from '@/features/suppliers/api/supplier-api';

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-0 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm sm:text-right">{children ?? 'Non renseigné'}</dd>
    </div>
  );
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'Sans échéance déclarée';
}

function ArticleInformationTab({ article, canManage, onEdit }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <StatusBadge tone={article.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {article.status === 'ACTIVE' ? 'Actif' : 'Archivé'}
        </StatusBadge>
        {canManage && article.status === 'ACTIVE' && (
          <Button onClick={() => onEdit(article)} size="sm" variant="outline">
            Modifier
          </Button>
        )}
      </div>
      <dl className="rounded-lg border border-border px-4">
        <DetailRow label="Réf. fournisseur">{article.supplierReference}</DetailRow>
        <DetailRow label="Fournisseur">{article.supplier?.name}</DetailRow>
        <DetailRow label="Marque">{article.brand || 'Non renseignée'}</DetailRow>
        <DetailRow label="Conditionnement">
          {article.packagingPresentation?.mainLabel || article.packagingLabel}
        </DetailRow>
      </dl>
    </section>
  );
}

function ArticleAssociationTab({ article, canAssociate, onAssociate }) {
  const canEdit = canAssociate && article.status === 'ACTIVE';
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Produit associé</h3>
        {canEdit && (
          <div className="flex items-center gap-1">
            <InfoTooltip
              content="Une modification de l’association peut affecter les valorisations futures. Les données économiques historiques ne sont pas effacées."
              label="Conséquences de la modification de l’association"
            />
            <Button onClick={() => onAssociate(article)} size="sm" variant="outline">
              Modifier l’association
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border px-4 py-3">
        {article.productVariant
          ? <p className="text-sm">{article.productVariant.name}</p>
          : <StatusBadge tone="warning">Non associé</StatusBadge>}
      </div>
    </section>
  );
}

function ArticleTariffHistory({ article, history }) {
  return (
    <Collapsible defaultOpen={false} key={article.id}>
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Historique des tarifs
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-300 group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-in-out data-[starting-style]:h-0 data-[ending-style]:h-0 motion-reduce:transition-none">
        <div className="pt-3">
          {history.isLoading && <p className="text-sm">Chargement de l’historique…</p>}
          {history.isError && (
            <p className="text-sm text-destructive">Historique tarifaire inaccessible.</p>
          )}
          {!history.isLoading && !history.isError && !history.data?.length && (
            <p className="text-sm text-muted-foreground">Aucun historique tarifaire disponible.</p>
          )}
          {history.data?.length > 0 && (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {history.data.map((item) => (
                <div className="rounded-md border border-border p-3 text-sm" key={item.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{item.sourcePriceLabel}</span>
                    <StatusBadge tone={item.isCurrent ? 'success' : 'neutral'}>
                      {item.isCurrent ? 'Version courante' : 'Version remplacée'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Révision {item.revision} · {item.sourceLabel} ·{' '}
                    {dateLabel(item.validFrom)} au {dateLabel(item.validTo)}
                  </p>
                  {item.correctionReason && (
                    <p className="mt-1 text-xs">Motif : {item.correctionReason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArticleTariffTab({
  article, canCorrectTariffs, history, onCorrectPrice, onCorrectPeriod,
}) {
  const price = article.supplierTariff;
  const canCorrect = canCorrectTariffs && price?.sourceKind === 'PRICE_LIST'
    && article.status === 'ACTIVE';

  return (
    <section className="space-y-4">
      <section aria-label="Prix fournisseur HT" className="rounded-lg border border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="font-semibold">Prix fournisseur HT</h3>
            {article.supplierTariffStatus === 'EXPIRED' && (
              <StatusBadge tone="warning">Dernier prix connu — expiré</StatusBadge>
            )}
          </div>
          {canCorrect && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button onClick={() => onCorrectPrice(article)} size="sm" variant="outline">
                Corriger le prix
              </Button>
              <Button onClick={() => onCorrectPeriod(article)} size="sm" variant="outline">
                Modifier la période
              </Button>
            </div>
          )}
        </div>
        <p className="mt-4 font-semibold">
          {price?.packagePriceLabel || price?.sourcePriceLabel || 'Aucun tarif renseigné'}
        </p>
        {price?.piecePriceLabel && (
          <p className="mt-2 text-sm text-muted-foreground">{price.piecePriceLabel}</p>
        )}
        {price?.unitPriceLabel && (
          <p className="mt-1 text-sm text-muted-foreground">{price.unitPriceLabel}</p>
        )}
        {price && (
          <dl className="mt-3 border-t border-border">
            <DetailRow label="Provenance">{price.sourceLabel || 'Catalogue fournisseur'}</DetailRow>
            <DetailRow label="Début de validité">{dateLabel(price.validFrom)}</DetailRow>
            <DetailRow label="Fin de validité">{dateLabel(price.validTo)}</DetailRow>
          </dl>
        )}
      </section>
      {price?.sourceKind === 'CATALOG' && (
        <p className="text-xs text-muted-foreground">
          Ce prix provient d’un catalogue : sa correction relève du parcours Catalogue.
        </p>
      )}
      <ArticleTariffHistory article={article} history={history} />
    </section>
  );
}

function SupplierArticleDetailsDrawer({
  article, canManage = false, canAssociate = false, canReadTariffs = false,
  canCorrectTariffs = false, onAssociate, onClose, onCorrectPrice,
  onCorrectPeriod, onEdit, open, workspaceId,
}) {
  const retained = useRef(null);
  if (article) retained.current = article;
  const current = article ?? retained.current;
  const history = useListSupplierArticleTariffsQuery(
    { workspaceId, articleId: current?.id },
    { skip: !open || !current?.id || !canReadTariffs },
  );

  if (!current && !open) return null;

  return (
    <EntityDetailsDrawer
      description="Données fournisseur, association au référentiel Produits et tarifs."
      onClose={onClose}
      open={open}
      title={current?.supplierDesignation || 'Article fournisseur'}
    >
      {current && (
        <Tabs defaultValue="infos" key={current.id + '-' + String(open)}>
          <TabsList aria-label="Détails de l’Article fournisseur" variant="section">
            <TabsTrigger value="infos" variant="section">Infos Article</TabsTrigger>
            <TabsTrigger value="association" variant="section">Association</TabsTrigger>
            {canReadTariffs && (
              <TabsTrigger value="tariff" variant="section">Tarif fournisseur</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="infos" variant="section">
            <ArticleInformationTab article={current} canManage={canManage} onEdit={onEdit} />
          </TabsContent>

          <TabsContent value="association" variant="section">
            <ArticleAssociationTab
              article={current}
              canAssociate={canAssociate}
              onAssociate={onAssociate}
            />
          </TabsContent>

          {canReadTariffs && (
            <TabsContent value="tariff" variant="section">
              <ArticleTariffTab
                article={current}
                canCorrectTariffs={canCorrectTariffs}
                history={history}
                onCorrectPeriod={onCorrectPeriod}
                onCorrectPrice={onCorrectPrice}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </EntityDetailsDrawer>
  );
}

export { SupplierArticleDetailsDrawer };
