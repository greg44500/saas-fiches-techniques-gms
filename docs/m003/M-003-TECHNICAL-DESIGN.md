# M-003 — Conception technique

**Statut :** baseline technique d'implémentation  
**Contrat fonctionnel :** docs/m003/M-003-FINAL-CONTRACT.md  
**Branche :** feature/m003-suppliers-catalogs-pricing

## 1. Principes

Cette conception ne modifie pas le Core et ne recrée aucune identité Produit.

Invariants techniques :

- Workspace est la frontière de tenancy ;
- GLOBAL_SHARED ne porte jamais de Workspace ;
- WORKSPACE_PRIVATE appartient exactement à un Workspace ;
- Tarif négocié, Prix facturé et favori portent toujours workspace + dossier ;
- aucun fallback de prix ne peut interroger un autre Dossier ;
- les montants et quantités calculables utilisent Decimal128 pour éviter les arrondis prématurés ;
- l'historique économique n'est jamais écrasé silencieusement ;
- le backend reste l'autorité du Prix applicable.

## 2. Collections

### Référentiel fournisseur

Supplier
- Fournisseur global ou privé ;
- les homonymes restent autorisés ;
- normalizedName sert à la recherche, pas à une unicité métier non validée.

SupplierArticle
- Fournisseur + référence fournisseur normalisée ;
- relie l'Article à ProductVariant M-002 ;
- une ressource privée peut référencer un Fournisseur global sans modifier le global ;
- replacedBy assure la traçabilité d'un changement de référence.

SupplierCatalogEdition
- édition historique d'un Fournisseur ;
- identityKey stable calculée par le service ;
- une édition privée est partagée par les Dossiers du Workspace.

SupplierCatalogLine
- ligne importée, éventuellement non rapprochée ;
- corrections versionnées par revision / isCurrent.

SupplierTariff
- Tarif fournisseur Article × édition ;
- corrections versionnées par revision / isCurrent ;
- montant source et montant normalisé restent distincts.

### Données strictement Dossier

NegotiatedPrice
- workspace + dossier + supplierArticle + période ;
- les chevauchements actifs sont refusés par le service ;
- les corrections économiques créent une nouvelle réalité historisée.

InvoicedPrice
- workspace + dossier + supplier + supplierArticle + invoiceDate ;
- seul VALIDATED est éligible à la résolution ;
- la fraîcheur de 12 mois calendaires est calculée au runtime.

DossierSupplierReference
- favori Dossier × Article fournisseur ;
- aucun prix n'est copié dans cette relation.

### Politique et infrastructure

WorkspaceSupplierPricingPolicy
- politique du Prix applicable ;
- absence de document = mode NEGOTIATED_PRICE par défaut.

SupplierCatalogImportSession
- état temporaire inspect / preview / confirm ;
- TTL MongoDB ;
- aucun stockage documentaire durable.

SupplierCommerceLock
- verrou technique par clé déterministe ;
- sérialise les invariants non exprimables par un index, notamment les chevauchements de périodes et les confirmations concurrentes d'une même édition.

## 3. Ownership

| Collection | GLOBAL_SHARED | WORKSPACE_PRIVATE | Dossier |
| --- | --- | --- | --- |
| Supplier | workspace null | workspace requis | non |
| SupplierArticle | workspace null | workspace requis | non |
| SupplierCatalogEdition | workspace null | workspace requis | non |
| SupplierCatalogLine | workspace null | workspace requis | non |
| SupplierTariff | workspace null | workspace requis | non |
| NegotiatedPrice | non | workspace requis | requis |
| InvoicedPrice | non | workspace requis | requis |
| DossierSupplierReference | non | workspace requis | requis |
| WorkspaceSupplierPricingPolicy | non | workspace requis | non |
| SupplierCatalogImportSession | selon portée | selon portée | non |

Les services valident en plus la cohérence des relations. Une ressource globale ne dépend jamais d'une ressource privée.

## 4. Conditionnement

Le sous-document packaging peut porter containerType, unitCount, quantityPerUnit, unit, totalQuantity, netWeight, netWeightUnit, drainedNetWeight, drainedNetWeightUnit et supplierLabel.

Les unités réutilisent le registre M-002. totalQuantity ne sera calculée par le service que lorsque les données sont suffisantes et cohérentes.

## 5. Prix et précision

Chaque donnée économique conserve sourceAmount, sourceBasis, currency, normalizedAmount nullable et normalizedUnit nullable.

normalizedAmount null signifie « non calculable », jamais zéro.

## 6. Historisation

- nouvelle édition : nouveau SupplierCatalogEdition ;
- réimport même édition : même édition, réconciliation ;
- ligne modifiée : nouvelle révision SupplierCatalogLine ;
- Tarif fournisseur modifié : nouvelle révision SupplierTariff ;
- Tarif négocié : archivage explicite, jamais réécriture silencieuse ;
- Prix facturé : observation conservée, seules les décisions validation/rejet évoluent.

## 7. Concurrence

Indexes uniques :
- Article par portée + Fournisseur + référence normalisée ;
- édition par portée + Fournisseur + identityKey ;
- révision courante de ligne ;
- révision courante de Tarif fournisseur ;
- favori Dossier ;
- politique Workspace ;
- clé de verrou métier.

Les plages temporelles sont protégées par transaction MongoDB + SupplierCommerceLock.

## 8. Permissions Workspace

- supplier:read
- supplier:manage
- supplier:article:read
- supplier:article:manage
- supplier:catalog:read
- supplier:catalog:import
- supplier:catalog:manage
- supplier:negotiated-price:read
- supplier:negotiated-price:manage
- supplier:invoiced-price:read
- supplier:invoiced-price:manage
- supplier:invoiced-price:validate
- supplier:dossier-reference:read
- supplier:dossier-reference:manage
- supplier:applicable-price:read
- supplier:price-policy:manage

Le rôle système owner reçoit toutes ces permissions. Les autres rôles Workspace restent configurables.

## 9. Autorité Application Global

- supplier:reference:read
- supplier:reference:manage

Ces permissions couvrent la gouvernance GLOBAL_SHARED sans héritage Platform ou Workspace.

## 10. Capability

supplier_catalog_import
- contrôle l'import WORKSPACE_PRIVATE ;
- ne remplace jamais supplier:catalog:import ;
- un Owner sans capability reste refusé.

Aucun quota métier supplémentaire n'est créé.

## 11. Routes prévues

Workspace :
- /api/workspaces/:workspaceId/suppliers
- /api/workspaces/:workspaceId/supplier-articles
- /api/workspaces/:workspaceId/supplier-catalogs
- /api/workspaces/:workspaceId/dossiers/:dossierId/supplier-pricing

Administration globale :
- /api/supplier-reference

Import : inspect → preview → confirm.

## 12. Migration M-003

migration:m003-supplier-catalog :
1. crée et vérifie les indexes M-003 ;
2. réutilise le backfill générique des permissions système ;
3. ne modifie aucune donnée M-001/M-002 ;
4. reste idempotente.

## 13. Suite backend

1. services Fournisseurs / Articles ;
2. services Catalogues / import ;
3. services prix Dossier ;
4. résolveur Prix applicable ;
5. Zod ;
6. controllers/routes ;
7. tests d'intégration tenancy/RBAC/capability.

## 12. État d'implémentation au 2026-09-27

La conception ci-dessus est matérialisée sur :

~~~text
feature/m003-suppliers-catalogs-pricing
~~~

HEAD de référence au moment de cette mise à jour :

~~~text
ad873a3264fea026ba717da09428ba85ab0001cb
~~~

Les surfaces backend, frontend et E2E sont présentes. Aucune exécution de gate n'est revendiquée dans cette session.

## 13. Gouvernance Application Global M-003

L'Application Global n'autorise qu'un membership courant par utilisateur. M-003 ne crée donc pas un second membership indépendant pour le Fondateur.

Le bootstrap :

~~~bash
npm run seed:m003-governance
~~~

crée/synchronise le rôle système :

~~~text
business_reference_governor
~~~

avec les permissions Produits M-002 et Fournisseurs M-003.

Si le Fondateur possède encore le rôle système M-002 \`product_reference_governor\`, son membership actif existant est migré vers le rôle combiné. Un rôle personnalisé ou un membership suspendu n'est jamais remplacé silencieusement.

## 14. Validation opérationnelle avant PR

Sur une base locale existante :

~~~bash
npm run migration:m003-supplier-catalog
npm run seed:m003-governance
~~~

Puis effectuer la validation visuelle et les tests applicables.

La capability \`supplier_catalog_import\` reste indépendante du RBAC. Tant que le mapping commercial final des plans n'est pas validé, l'import privé se teste via un entitlement override explicite.

