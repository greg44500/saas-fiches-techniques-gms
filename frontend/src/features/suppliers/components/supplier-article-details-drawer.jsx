import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useRef } from 'react';

import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useListSupplierArticleTariffsQuery } from '@/features/suppliers/api/supplier-api';

function Line({ title, children }) {
  return (
    <div className="space-y-1 border-b border-border py-3 last:border-0">
      <dt className="text-xs text-muted-foreground">{title}</dt>
      <dd className="text-sm">{children ?? 'Non renseigné'}</dd>
    </div>
  );
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'Sans échéance déclarée';
}

function SupplierArticleDetailsDrawer({
  article, canManage = false, canAssociate = false, canReadTariffs = false,
  canCorrectTariffs = false, onAssociate, onClose, onCorrectPrice,
  onCorrectPeriod,
  onEdit, open, workspaceId,
}) {
  const retained = useRef(null);
  if (article) retained.current = article;
  const current = article ?? retained.current;
  const price = current?.supplierTariff;
  const history = useListSupplierArticleTariffsQuery(
    { workspaceId, articleId: current?.id },
    { skip: !open || !current?.id || !canReadTariffs },
  );
  const canCorrect = canCorrectTariffs && price?.sourceKind === 'PRICE_LIST'
    && current?.status === 'ACTIVE';

  if (!current && !open) return null;

  return (
    <EntityDetailsDrawer
      description="Données fournisseur, association au référentiel Produits et tarifs."
      onClose={onClose}
      open={open}
      title={current?.supplierDesignation || 'Article fournisseur'}
    >
      <div className="space-y-5">
        <div className="flex justify-end">
          <StatusBadge tone={current?.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {current?.status === 'ACTIVE' ? 'Actif' : 'Archivé'}
          </StatusBadge>
        </div>
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h3 className="font-semibold">Informations de l’article</h3>
              <span className="text-xs text-muted-foreground">
                Réf. fournisseur : {current?.supplierReference}
              </span>
            </div>
            {canManage && current?.status === 'ACTIVE' && (
              <Button onClick={() => onEdit(current)} size="sm" variant="outline">
                Modifier
              </Button>
            )}
          </div>
          <dl>
            <Line title="Désignation">{current?.supplierDesignation || 'Sans désignation'}</Line>
            <Line title="Marque">{current?.brand || 'Non renseignée'}</Line>
            <Line title="Conditionnement">{current?.packagingLabel}</Line>
          </dl>
        </section>
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Produit associé</h3>
            {canAssociate && current?.status === 'ACTIVE' && (
              <Button onClick={() => onAssociate(current)} size="sm" variant="outline">
                Modifier l’association
              </Button>
            )}
          </div>
          {current?.productVariant ? (
            <p className="mt-3 text-sm">{current.productVariant.name}</p>
          ) : (
            <div className="mt-3"><StatusBadge tone="warning">Non associé</StatusBadge></div>
          )}
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning" role="note">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Une modification du Produit associé peut affecter les valorisations futures.
              Les données économiques historiques ne sont pas effacées.
            </p>
          </div>
        </section>
        {canReadTariffs && (
          <section className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Tarif fournisseur HT</h3>
              {canCorrect && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => onCorrectPrice(current)} size="sm" variant="outline">
                    Corriger le prix
                  </Button>
                  <Button onClick={() => onCorrectPeriod(current)} size="sm" variant="outline">
                    Modifier la période
                  </Button>
                </div>
              )}
            </div>
            <p className="mt-3 font-medium">
              {price?.packagePriceLabel || price?.sourcePriceLabel || 'Aucun tarif renseigné'}
            </p>
            {current?.supplierTariffStatus === 'EXPIRED' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge tone="warning">Dernier prix connu — expiré</StatusBadge>
                <span className="text-xs text-muted-foreground">
                  Échéance : {dateLabel(price?.validTo)}
                </span>
              </div>
            )}
            {price?.piecePriceLabel && (
              <p className="mt-1 text-sm text-muted-foreground">{price.piecePriceLabel}</p>
            )}
            {price?.unitPriceLabel && (
              <p className="mt-1 text-sm text-muted-foreground">{price.unitPriceLabel}</p>
            )}
            <Collapsible defaultOpen={false} key={current?.id}>
              <CollapsibleTrigger className="group mt-4 flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Informations tarifaires et historique
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-300 group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
              </CollapsibleTrigger>
              <CollapsibleContent className="h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-300 ease-in-out data-[starting-style]:h-0 data-[ending-style]:h-0 motion-reduce:transition-none">
                <div className="pt-3">
                  {price && (
                    <dl>
                      <Line title="Provenance">{price.sourceLabel || 'Catalogue fournisseur'}</Line>
                      <Line title="Début de validité">{dateLabel(price.validFrom)}</Line>
                      <Line title="Fin de validité">{dateLabel(price.validTo)}</Line>
                    </dl>
                  )}
                  {history.isLoading && <p className="mt-3 text-sm">Chargement de l’historique…</p>}
                  {history.isError && (
                    <p className="mt-3 text-sm text-destructive">
                      Historique tarifaire inaccessible.
                    </p>
                  )}
                  {history.data?.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold">Historique des listes tarifaires</h4>
                      {history.data.map((item) => (
                        <div className="rounded-md border border-border p-3 text-sm" key={item.id}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{item.sourcePriceLabel}</span>
                            <StatusBadge tone={item.isCurrent ? 'success' : 'neutral'}>
                              {item.isCurrent ? 'Version courante' : 'Version remplacée'}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Révision {item.revision} · {item.sourceLabel} ·
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
            {price?.sourceKind === 'CATALOG' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ce prix provient d’un catalogue : sa correction relève du parcours Catalogue.
              </p>
            )}
          </section>
        )}
      </div>
    </EntityDetailsDrawer>
  );
}

export { SupplierArticleDetailsDrawer };
