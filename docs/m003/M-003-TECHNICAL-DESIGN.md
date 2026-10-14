# M-003 — Conception technique

**Statut :** LIVRÉ — baseline PR #22 et complément PR #44 fusionnés sur `main`  
**Contrat fonctionnel :** docs/m003/M-003-FINAL-CONTRACT.md  
**Livraison :** PR #22 (initiale), PR #44 (complément) ; merge `962177905bcc198e439a316d9610b23c60dd53cd`, Core Gate post-merge réussie à la tentative 2

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
- unicité effective de `normalizedName` par portée : globale, ou par couple (Workspace, nom) pour les Fournisseurs privés, avec index uniques partiels ;
- audit des doublons/incohérences avant création de ces index ; les homonymes dans une même portée sont refusés.

SupplierArticle
- Fournisseur + référence fournisseur normalisée ;
- association au `ProductVariant` M-002 facultative à l'import direct (`productVariant=null`), rapprochement requis avant valorisation ;
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
- tarif fournisseur d'origine `CATALOG` (édition) ou `PRICE_LIST` (import autonome sans édition) ;
- corrections versionnées par `revision` / `isCurrent` ;
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

IndicativePrice
- workspace nullable + productVariant ;
- workspace null + dossier null = portée globale ;
- workspace renseigné + dossier null = portée Workspace ;
- workspace + dossier renseignés = surcharge Dossier ;
- sourceAmount/sourceBasis/currency + valeur normalisée ;
- packaging plat lorsque sourceBasis = PACKAGE ;
- sourceOrganization/sourceUrl/observedAt/source pour la provenance ;
- `ACTIVE / ARCHIVED` ;
- un seul `ACTIVE` par portée + productVariant ;
- ne dépend pas obligatoirement d'un SupplierArticle.

DossierSupplierReference
- favori Dossier × Article fournisseur ;
- aucun prix n'est copié dans cette relation.

### Politique et infrastructure

WorkspaceSupplierPricingPolicy
- politique du Prix applicable ;
- absence de document = mode NEGOTIATED_PRICE par défaut ;
- les sources commerciales prévues par le mode restent prioritaires ;
- dernier recours commun : IndicativePrice Dossier puis Workspace puis Global.

Migration d'extension post-clôture :
- `migration:m003-indicative-pricing` ;
- crée/vérifie les indexes M-003 incluant IndicativePrice ;
- backfill idempotent des nouvelles permissions système Owner ;
- dépend de `m003-supplier-catalog` afin de couvrir aussi les bases où la migration M-003 historique avait déjà été exécutée.

SupplierCatalogImportSession
- état temporaire inspect / preview / confirm ;
- TTL MongoDB ;
- aucun stockage documentaire durable.

SupplierArticleImportSession
- session temporaire d'inspection, prévisualisation, confirmation d'Articles ;
- acteur et portée contrôlés à chaque étape, TTL MongoDB ;
- pipeline ClamAV conservé, transaction et verrou Commerce à la confirmation.

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
| IndicativePrice | workspace null | workspace requis | facultatif |
| DossierSupplierReference | non | workspace requis | requis |
| WorkspaceSupplierPricingPolicy | non | workspace requis | non |
| SupplierCatalogImportSession | selon portée | selon portée | non |
| SupplierArticleImportSession | selon portée | selon portée | non |

Les services valident en plus la cohérence des relations. Une ressource globale ne dépend jamais d'une ressource privée.

## 4. Conditionnement

Le sous-document packaging peut porter containerType, unitCount, quantityPerUnit, unit, totalQuantity, netWeight, netWeightUnit, drainedNetWeight, drainedNetWeightUnit et supplierLabel.

Les unités réutilisent le registre M-002. totalQuantity ne sera calculée par le service que lorsque les données sont suffisantes et cohérentes.

La structure V1 est volontairement plate : un seul niveau
`unitCount × quantityPerUnit`. Les niveaux commerciaux supplémentaires restent
dans `supplierLabel`. Lorsque `unit = UNIT`, le libellé métier vient de la
Référence Produit M-002.

### Projections de lecture des conditionnements et des prix (2026-10-13)

`supplierArticlePresentation.service.js` est l'autorité pour les valeurs
de lecture. La réponse Article fournit `packagingPresentation` avec
`mainLabel`, `totalLabel` et `warningLabel`, sans supprimer
`packagingLabel` pour les consommateurs existants. Le total de masse est
exprimé en kg, le volume en L et le décompte M-002 en UNIT. En cas
d'incohérence entre masse calculée et poids net déclaré, les deux
valeurs restent distinctes et le total est clairement indiqué comme
calculé.

La projection Tarif conserve `packagePriceLabel` et `unitPriceLabel`
et ajoute `pieceAmount` / `piecePriceLabel` lorsque le nombre d'éléments
et leur quantité par élément rendent le prix à la pièce calculable.
Le tableau Articles utilise deux popovers propres à la feature M-003,
basés sur les composants communs `Popover`, `PopoverTrigger` et
`PopoverContent` sans les modifier. Les boutons `PackageSearch` et
`Calculator` acceptent survol, activation clavier et toucher
(`openOnHover` Base UI) ; leurs intitulés accessibles incluent la
référence de l'Article. Les valeurs complémentaires sont absentes du
flux de lecture principal tant que le popover est fermé. Une incohérence
de poids reste signalée par la couleur `warning` de l'icône ;
son libellé complet est consultable dans le popover.
Une absence de données rend cette projection nulle. Le tarif et son
`packagingSnapshot` restent les seules sources économiques ; React ne
recalcule ni prix ni quantité.

## 5. Prix et précision

Chaque donnée économique conserve sourceAmount, sourceBasis, currency, normalizedAmount nullable et normalizedUnit nullable.

normalizedAmount null signifie « non calculable », jamais zéro.

## 6. Historisation

- nouvelle édition : nouveau SupplierCatalogEdition ;
- réimport même édition : même édition, réconciliation ;
- ligne modifiée : nouvelle révision SupplierCatalogLine ;
- Tarif fournisseur modifié : nouvelle révision SupplierTariff ;
- Tarif négocié : archivage explicite, jamais réécriture silencieuse ;
- Prix facturé : observation conservée, seules les décisions validation/rejet évoluent ;
- Prix indicatif : remplacement par archivage de l'actif puis création d'une nouvelle réalité.

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
- supplier:indicative-price:read
- supplier:indicative-price:manage
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
- /api/workspaces/:workspaceId/supplier-pricing

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

## 12. État de livraison au 2026-09-28

M-003 est livré sur `main`.

~~~text
PR #22
→ release:check local : vert
→ QA visuelle : validée
→ Core Gate PR #132 : success
→ merge : 2044dbf3c13473d926cfaa8b86f5eb9dbbf259ac
→ Core Gate post-merge #133 : success
~~~

Les surfaces backend, frontend et E2E décrites dans ce document sont donc intégrées. Les retouches UX issues des bêta-testeurs pourront être traitées ultérieurement sans modifier les invariants techniques M-003.

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

## 14. Validation opérationnelle (consignes historiques)

Sur une base locale existante (commandes à exécuter sur l'environnement visé ; le merge ne prouve pas leur exécution sur une base donnée) :

~~~bash
npm run migration:m003-supplier-catalog
npm run seed:m003-governance
~~~

Puis effectuer la validation visuelle et les tests applicables.

La capability \`supplier_catalog_import\` reste indépendante du RBAC. Tant que le mapping commercial final des plans n'est pas validé, l'import privé se teste via un entitlement override explicite.



## 15. UX Fournisseur extensible

Le détail Fournisseur réutilise la primitive partagée `EntityDetailsDrawer` et ne crée aucun système de panneau parallèle.

Surface espace de travail :

~~~text
Informations
→ identité, origine, statut

Articles
→ Articles actifs filtrés par supplierId

Catalogues
→ éditions actives filtrées par supplierId

Utilisation
→ point d'extension pour Dossiers, références favorites/fréquentes
  et futures Fiches techniques
~~~

L'onglet Utilisation ne consolide pas les Tarifs négociés ni les Prix facturés hors contexte Dossier.

Le référentiel global réutilise le même drawer pour Informations / Articles / Catalogues, sans onglet Utilisation propre à l'espace de travail.

Les actions de tableau M-003 utilisent la primitive partagée `ActionIconButton` avec infobulles verbales : Voir, Modifier, Archiver et Réactiver.

Les listes Fournisseurs / Articles / Catalogues réutilisent exclusivement :

~~~text
DataTable
+ DataPagination
+ conteneur de liste standard identique au pattern Dossiers
~~~

Aucun composant tableau métier parallèle ni style structurel de tableau spécifique M-003 n'est créé.

Le `rowClassName` de survol reste temporairement passé par les features conformément à l'état actuel du composant partagé. Sa canonisation dans le Core est enregistrée dans `GMS-CORE-UX-001` et ne justifie pas un micro-versionnement Core.

### 15.1 Recherche et filtres

- les zones de recherche utilisent l'espace restant sur une seule ligne desktop ;
- le bouton Rechercher reste désactivé lorsque le champ est vide ;
- vider une recherche appliquée retire le filtre actif ;
- Fournisseurs démarre avec le filtre `Tous` ;
- `Tous` affiche `ACTIVE + ARCHIVED` ;
- un Fournisseur privé archivé peut être réactivé depuis cette vue ;
- Articles et Catalogues restent sur `ACTIVE | ARCHIVED` ;
- changer d'onglet depuis Fournisseurs avec `Tous` rétablit `ACTIVE` pour Articles/Catalogues.

### 15.2 Catalogue et capability

L'onglet Catalogues est une surface de consultation gouvernée par `supplier:catalog:read` et reste visible sans capability d'import.

L'action d'import respecte :

~~~text
supplier:catalog:import
+ supplier_catalog_import
→ bouton « Importer un catalogue » visible et actif

capability absente
→ bouton absent
~~~

L'import de catalogue fournisseur reste distinct de l'import Produits M-002.

### 15.3 Vocabulaire utilisateur

Les concepts techniques restent présents dans le modèle mais ne sont pas exposés tels quels lorsque ce n'est pas utile :

~~~text
Workspace → espace de travail
Portée   → Origine
GLOBAL_SHARED      → Référentiel partagé
WORKSPACE_PRIVATE  → Cet espace de travail
~~~

Cette traduction UX ne modifie ni la tenancy ni les portées techniques persistées.


### 15.4 Parcours Produit ↔ Fournisseur unifié

Le checkpoint UX du 2026-09-30 confirme qu'il ne doit pas exister deux workflows concurrents pour une même donnée commerciale.

Principe :

~~~text
Produit
→ point d'entrée orienté « ce que j'utilise »

Fournisseur
→ point d'entrée orienté « chez qui / sous quelle forme je l'achète »

mais

Article fournisseur / Prix indicatif
→ une seule donnée métier
→ un seul composant de saisie
→ une seule validation
→ une seule API
→ un seul service backend
~~~

Le drawer Produit peut donc ouvrir le workflow M-003 existant avec la Référence Produit préremplie. La page Fournisseurs conserve le même workflow avec sélection de la Référence Produit. Aucun second formulaire ou modèle parallèle n'est créé.

Pour éviter les requêtes N+1 lors de la projection commerciale d'un Produit, les listes Workspace existantes acceptent un filtre agrégé `productId` :

~~~text
GET /api/workspaces/:workspaceId/supplier-articles?productId=...
GET /api/workspaces/:workspaceId/supplier-pricing/indicative-prices?productId=...
GET /api/workspaces/:workspaceId/supplier-pricing/global-indicative-prices?productId=...
~~~

Chaque endpoint conserve sa propre permission M-003. Le frontend n'agrège donc que les données auxquelles l'utilisateur a effectivement accès.

Dans le drawer Produit :

- `Références (n)` compte les Références Produit visibles ;
- `Favoris (n)` compte uniquement les `WorkspaceProduct ACTIVE` ;
- l'onglet Favoris n'affiche jamais « Favori » comme information redondante ;
- un Prix indicatif Workspace est présenté comme `PU HT estimé` ;
- le Prix repère global est visible en lecture seule, même pour une Référence
  non favorite ;
- les conditionnements proviennent exclusivement de données M-003 : Articles
  fournisseur ou Prix indicatifs `PACKAGE` ;
- plusieurs Articles sont tous présentés, sans sélection automatique d'un fournisseur ou du moins cher ;
- les actions contextuelles réutilisent les workflows Prix indicatif et Article fournisseur existants ;
- retirer un favori reste une action M-002 et ne supprime aucune donnée commerciale M-003.

Dans la liste Fournisseurs, les catégories Produit commercialisées sont projetées dans une colonne dédiée. Aucun « univers commercial » n'est déduit automatiquement des catégories M-002 : une éventuelle taxonomie de spécialités fournisseur devra être cadrée séparément avant ajout au modèle.

---

## Complément technique M-003 — import direct Articles (2026-10-09)

- `SupplierArticle.productVariant` accepte `null` pour le statut métier PENDING.
  L'identité et les index uniques Fournisseur / Référence / portée restent identiques.
- `SupplierArticleImportSession` est un staging séparé de
  `SupplierCatalogImportSession` ; même inspection sécurisée, même parseur et
  normalisation des lignes, sans dépendance à une édition commerciale.
- Endpoints Workspace :
  `POST /workspaces/:workspaceId/supplier-articles/imports/inspect`,
  `POST /workspaces/:workspaceId/supplier-articles/imports/:importId/preview`,
  `POST /workspaces/:workspaceId/supplier-articles/imports/:importId/commit`.
- Endpoints globaux : mêmes suffixes sous `/supplier-reference/articles/imports`.
- Transaction de confirmation idempotente via statut PREVIEWED → COMMITTING → COMMITTED,
  verrou de commerce et vérification à nouveau des références sous transaction.
  La session est actor-scoped et la portée Workspace/global est vérifiée à chaque étape.
- Les accès pricing et fiches conservent la condition ProductVariant ACTIVE et
  interdisent un Article non associé. Une association explicite reste possible via
  `PATCH /workspaces/:workspaceId/supplier-articles/:articleId` ou l'API globale.
- Nouvelle paire d'index de sessions `supplier_article_import_session_ttl` et
  `supplier_article_import_scope_actor_status`, incluse dans la migration M-003.

Le pilote ne procède à aucune suppression de catalogue, aucun changement d'Article
global depuis un Workspace et aucune modification du Core.

---

## Harmonisation visuelle des imports (2026-10-13)

Les trois assistants métier réutilisent les composants situés sous
`frontend/src/features/imports/components/` :

- `ImportWizardHeader` : titre, aide via le `InfoTooltip` existant et
  stepper d'état actif / terminé / futur (avec `aria-current="step"`) ;
- `ImportFilePicker` : input fichier masqué mais accessible, sélection affichée
  en français, formats CSV/XLS/XLSX, nom tronqué de façon responsive ;
- `ImportWizardFooter` : actions cohérentes d'analyse, de prévisualisation,
  de confirmation et de fermeture.

Ces composants sont volontairement **spécifiques aux imports du produit** : ils
ne dupliquent pas les primitives génériques du Core (`Dialog`, `Button`,
`InfoTooltip`, `Field`) et n'altèrent pas la logique des imports ou les APIs.
Les règles de mapping, les erreurs métier, les permissions et les requêtes
RTK Query restent dans leurs fonctionnalités respectives.

Les deux assistants Fournisseurs affichent leur résumé de confirmation avant
fermeture, le toast restant déclenché lors du commit. Les tests RTL et Playwright
couvrent le changement de parcours, l'accessibilité et les libellés francisés.

## Complément technique M-003 — périodes et filtre Fournisseurs (2026-10-14)

Le sélecteur de tarifs `supplierTariffSelection.service.js` projette
`AVAILABLE`, `EXPIRED`, `AMBIGUOUS` ou `UNAVAILABLE` de manière
déterministe. La liste des Articles lit les tarifs courants visibles
sur la page (pas de requête par Article), puis sérialise le tarif
retenu et son état. Le résolveur de prix conserve les priorités
facturé/négocié/fournisseur/indicatif existantes ; en l'absence de
tarif applicable, il sélectionne le dernier expiré si disponible
et expose `validityStatus=EXPIRED`, `fallbackApplied=true`,
`fallbackReason=LAST_KNOWN_SUPPLIER_TARIFF_EXPIRED` et la même
valeur dans `alerts` pour traçabilité M-004. Les conflits actifs
produisent toujours l'erreur `SUPPLIER_TARIFF_AMBIGUOUS`.

`POST /workspaces/:workspaceId/supplier-articles/:articleId/tariffs/:tariffId/period-correction`
utilise le verrou transactionnel Commerce et crée une nouvelle révision.
Le modèle et les index existants ne sont pas modifiés ; l'événement
`SUPPLIER_TARIFF_PERIOD_CORRECTED` trace anciennes et nouvelles bornes.
Le contrôle d'intervalles est partagé avec l'import indépendant.

Frontend : `SupplierArticleSupplierFilter` réutilise Popover et
`useListSuppliersQuery`, avec recherche et pagination côté serveur
limitée à 50 résultats par recherche. `SupplierArticlePeriodCorrectionDialog`
réutilise le DatePicker commun. Aucune primitive Core modifiée.
La présentation des avertissements FT se limite au code d'alerte
existant dans la valorisation, sans calcul M-004 ajouté.

## Drawer Article fournisseur — trois onglets (2026-10-14)

`SupplierArticleDetailsDrawer` utilise le composant commun
`Tabs` (`TabsList`, `TabsTrigger`, `TabsContent`) en variante
`section`, comme `SupplierDetailsDrawer` et `DossierDetailsDrawer`.
Les sous-vues de la feature séparent les responsabilités de
présentation : informations de l'Article, association Produit, prix
et historique. `EntityDetailsDrawer` n'est pas modifié.

Le `key` du groupe d'onglets intègre l'Article et l'état d'ouverture
afin de revenir à `Infos Article` après réouverture et lors du
changement d'Article. Le hook d'historique M-003 conserve son
`skip` RBAC existant ; l'onglet Tarif n'est pas rendu sans permission
de lecture. `InfoTooltip` remplace l'avertissement permanent
pour l'action d'association. Le `Collapsible` historique est fermé
par défaut et sa liste dispose d'une hauteur maximale avec
défilement interne, sans calcul serveur ni mutation des données.

Tests RTL dédiés : sélection initiale, séparation du contenu,
actions, consultation du prix expiré, permissions, historique replié,
retour à l'onglet initial lors de la réouverture, cas Catalogue.


---

## Clôture technique complément M-003 — PR #44 (2026-10-14)

`supplierTariffSelection.service.js` expose les états
`AVAILABLE`, `EXPIRED`, `AMBIGUOUS`, `UNAVAILABLE`.
Les corrections de période de `PRICE_LIST` privé créent une révision
sous verrou Commerce et enregistrent l'événement
`SUPPLIER_TARIFF_PERIOD_CORRECTED`. Les comparaisons de dates
civiles prennent en compte le fuseau métier Europe/Paris.

Les nouvelles sessions d'import et révisions s'appuient sur les index
M-003, tandis que `audit:m003-supplier-names` vérifie la sécurité
des contraintes uniques avant migration. Aucun environnement MongoDB
non exécuté n'est déclaré « migré » du seul fait de la fusion.

La primitive générique `Select` du Core est inchangée.
**Preuves CI :** Core Gate PR `38537453030` success ;
Core Gate post-merge `38539141748` success à la tentative 2
(commit `962177905bcc198e439a316d9610b23c60dd53cd`).
L'intermittence initiale du test M-004 reste suivie par
`docs/DEBT.md`, sans changement de sécurité ni de logique économique.
