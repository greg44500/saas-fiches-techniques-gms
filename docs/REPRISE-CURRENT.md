# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-01  
**Lot courant :** correctif et consolidation M-002 — référentiel Produits / gouvernance / revue qualité  
**Branche :** `fix/m002-governance-backfill`  
**Base :** `main@70da4bb1b9c055ee977f685d7de2e326761a75a2`

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats M-001/M-002/M-003/M-004
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. Core actuellement enregistré dans le produit

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = d3b9891bc2a32705a0a99b2ed62bed60caf653ca
~~~

`core-origin.json` reste l'autorité de provenance.

L'intégration ultérieure du commit Core `6581e573c6a6885790b23fe502bd34d8199ea6ba`, qui apporte la primitive générique de navigation `type: 'section'`, reste un lot séparé. Elle ne doit pas être mélangée au présent correctif M-002.

## 3. Pourquoi le lot M-002 a été rouvert

Une régression réelle de visibilité du référentiel a été constatée côté Workspace :

- les Produits historiques du seed M-002 existaient bien en base ;
- les anciens documents ne possédaient pas `governanceStatus` ;
- le filtre MongoDB de gouvernance exigeait explicitement ce champ ;
- les helpers objet considéraient pourtant l'absence du champ comme `APPROVED` ;
- la migration M-002 ne backfillait pas encore cette gouvernance historique.

Comptages observés avant correction :

~~~text
CanonicalProduct sans governanceStatus      : 264
ProductVariant sans governanceStatus        : 265
ProductVariety sans governanceStatus        : 1
ProductCharacteristic sans governanceStatus : 5
~~~

Le lot corrige durablement cette incohérence par migration, tests et compatibilité du filtrage.

## 4. Consolidation fonctionnelle livrée dans ce lot

### 4.1 Migration et gouvernance historique

- backfill idempotent de `governanceStatus` sur les références M-002 historiques ;
- compatibilité avec `sanitizeFilter=true` ;
- migration intégrée à `npm run migration:m002-catalog` ;
- couverture des Produits, Références Produit, Variétés et Caractéristiques historiques.

### 4.2 Création Produit et déduplication

- feedback explicite lorsqu'aucun Produit existant correspondant n'est trouvé ;
- informations secondaires déplacées dans des infobulles `(i)` ;
- moteur de déduplication existant conservé ;
- aucune création silencieuse en cas de candidat exact/proche.

### 4.3 Enrichissement du référentiel

- ajout successif de plusieurs valeurs sans fermer le dialogue ;
- badge `Ajoutée` ;
- aide de confirmation déplacée dans une infobulle ;
- retrait immédiat d'une valeur fraîchement ajoutée avec animation ;
- retrait refusé dès qu'une Référence Produit l'utilise ;
- audit conservé.

### 4.4 Drawer Platform — Dimensions

- `Dimensions (n)` et `Références (n)` ;
- sous-compteurs Variétés / Caractéristiques ;
- recherche compacte avec placeholder `Rechercher une caractéristique` ;
- recherche et bouton `Enrichir le référentiel` sur une même ligne lorsque la largeur le permet ;
- lignes compactes sur une seule rangée ;
- actions Corriger / Archiver / Réactiver sous forme d'icônes avec infobulles.

### 4.5 Revue qualité ligne par ligne

La revue qualité est distincte du lifecycle et de la gouvernance :

~~~text
Lifecycle
ACTIVE | ARCHIVED

Gouvernance
APPROVED | PROVISIONAL | RESOLVED | REJECTED

Revue qualité
NOT_REQUIRED | PENDING | REVIEWED
~~~

Règles :

- une Dimension créée depuis un Workspace devient `PENDING` ;
- une Dimension créée directement par la Platform devient `NOT_REQUIRED` ;
- la migration historique applique la même règle via `contributedFromWorkspace` ;
- le tableau Platform affiche une pastille chiffrée sur les Produits ayant des Dimensions actives à vérifier ;
- un clic ouvre directement le drawer sur `Dimensions > À vérifier` ;
- chaque ligne `PENDING` peut être marquée `REVIEWED` individuellement ;
- une correction Platform d'une ligne `PENDING` vaut revue explicite ;
- aucune action globale ne peut acquitter tout un Produit depuis le tableau.

### 4.6 Suppression contrôlée d'une valeur erronée

Une Dimension erronée peut être retirée du référentiel actif depuis le drawer :

- confirmation utilisateur obligatoire ;
- suppression fonctionnelle auditée ;
- refus si une Référence Produit active ou historique dépend encore de la valeur ;
- message de conflit indiquant le nombre de Références concernées ;
- archivage conservé comme action distincte pour une valeur métier valide mais indisponible.

### 4.7 Compteurs dynamiques Platform

Les onglets affichent désormais :

~~~text
Référentiel (n)
Contributions (n)
Catégories (n)
~~~

- `Référentiel (n)` repose sur le `pagination.total` serveur et suit recherche, catégorie et statut ;
- `Contributions (n)` repose sur le total serveur filtré par statut ;
- `Catégories (n)` correspond aux catégories actuellement exposées par les métadonnées ;
- les onglets inactifs utilisent des requêtes minimales (`limit: 1`) afin de conserver des totaux exacts sans charger une page complète.

## 5. Contrats mis à jour

Documents canoniques concernés :

~~~text
docs/m002/M-002-FINAL-CONTRACT.md
docs/domain/DOMAIN-MODEL.md
~~~

Les modèles `ProductVariety` et `ProductCharacteristic` portent désormais :

~~~text
qualityReviewStatus
qualityReviewedAt
qualityReviewedBy
~~~

Les nouveaux événements métier d'audit sont :

~~~text
PRODUCT_DIMENSION_REVIEWED
PRODUCT_DIMENSION_DELETED
~~~

## 6. Validation du lot

Tests ciblés backend et frontend ont été exécutés au fil du développement et les régressions détectées ont été corrigées.

La preuve finale de clôture reste à produire sur le HEAD final documentaire :

~~~text
npm run migration:m002-catalog
npm run release:check
~~~

Ne pas considérer le lot clôturé avant :

~~~text
migration locale réussie
→ release:check vert
→ une PR
→ Core Gate PR verte
→ merge
→ Core Gate post-merge verte
~~~

## 7. Prochaine séquence après clôture M-002

### Bloc A — intégration Core de la primitive de navigation `section`

Core cible déjà préparé séparément :

~~~text
greg44500/saas-core-api
version = 1.2.1
tag     = v1.2.1
commit  = 6581e573c6a6885790b23fe502bd34d8199ea6ba
~~~

Cette intégration doit être finalisée dans son propre lot/PR Core-update avant toute recomposition de la sidebar Platform.

### Bloc B — Gestion des référentiels Platform

Une fois le Bloc A fusionné et son gate post-merge vert :

~~~text
sidebar Platform
→ une seule entrée « Gestion des référentiels »
→ page dédiée
   [ Produits | Fournisseurs ]
~~~

Règles :

- réutiliser les surfaces/API M-002 et M-003 existantes ;
- conserver les permissions Application Global existantes ;
- ne pas dupliquer les écrans ou systèmes de gouvernance ;
- gérer Produits seul / Fournisseurs seul / les deux / aucun droit ;
- une branche produit dédiée ;
- une PR et un merge pour ce bloc.

## 8. Lots explicitement séparés

- exports/diffusion M-004 : CSV, XLSX, PDF, impression, e-mail ;
- enrichissement massif du seed M-002 : nouvelle version de dataset, jamais modification silencieuse de v6 ;
- dette Core DataTable `GMS-CORE-UX-001` ;
- production : billing, observabilité, stockage, conformité.

## 9. Discipline de reprise

~~~text
un lot cohérent
→ une branche
→ tests
→ une PR
→ une Core Gate
→ un merge
→ une Core Gate post-merge
~~~

Ne pas créer de micro-PR. Ne pas relancer périodiquement les Core Gates : l'utilisateur communique leur résultat.
