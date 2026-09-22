# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-22  
**Lot actif :** M-002 — Catalogue Produits / Produits canoniques  
**Branche :** `feature/m002-catalogue-produits`

## 1. Ordre d'autorité à reprendre

```text
KB-START-HERE
→ Git réel
→ code / contraintes DB
→ tests réellement exécutés
→ contrats M-002 validés
→ Core v1.1.2 intégré
→ dette / documentation de reprise
```

Ne jamais déclarer un test vert sans exécution réelle.

## 2. Core intégré

`core-origin.json` vérifié :

```text
repository : greg44500/saas-core-api
version    : 1.1.2
tag        : v1.1.2
commit     : 193e632d62cb048f3988e073665759cce8dd379f
```

Le Core fournit notamment : Auth / Users / Workspaces, RBAC Workspace, Platform SaaS, Plans / subscriptions, capabilities / quotas, EntitlementOverrides, Files / stockage / rétention, primitives de téléversement sécurisé, AuditLog et points d'extension applicatifs.

## 3. État Git de référence

Avant le recadrage documentaire, la branche `feature/m002-catalogue-produits` était :

```text
30 commits devant main
0 derrière
```

Dernier commit applicatif avant recadrage :

```text
ca02a1e428e43ec98da4c0ae168585f78d61e5f6
```

Les commits suivants du même lot ne font que réaligner la documentation M-002. Aucune PR M-002 ne doit être créée avant finalisation complète.

## 4. Décision structurante du recadrage

L'implémentation M-002 avait introduit :

```text
platform:products:read
platform:products:manage
/api/platform/products
/platform/products
```

Cette architecture est invalidée.

Décision : **global métier ne signifie pas Platform**.

`CanonicalProduct`, `ProductVariant` et `ProductCategory` sont des données métier globales au produit. Platform reste l'administration générique du SaaS : utilisateurs, clients/workspaces, plans, abonnements, équipe Platform, sécurité et exploitation.

Une personne appartenant à l'équipe Platform peut également recevoir une autorité métier Produit, mais ce droit ne découle jamais implicitement de son rôle Platform.

## 5. Frontière Core / Produit validée

```text
CORE
→ identité / authentification
→ Workspace / membres / équipe
→ RBAC générique
→ Plans / Entitlements / Overrides
→ quotas
→ Files / stockage / sécurité fichier
→ AuditLog générique

PRODUIT M-002
→ Produits canoniques
→ déclinaisons
→ catégories
→ catalogue Workspace
→ contribution
→ import catalogue
→ déduplication
→ gouvernance du référentiel global
→ activité métier
```

Les fonctionnalités Core ne sont pas réimplémentées dans le produit ; le produit les compose.

## 6. Capabilities commerciales M-002

À déclarer via le registre applicatif Core :

```text
product_reference_access
product_catalog_import
product_contribution
```

Exemple commercial initial :

```text
Free
→ accès référentiel global

Premium
→ accès référentiel global
→ import catalogue
→ contribution Produits/déclinaisons
```

Cette matrice reste configurable dans les Plans et compatible avec `EntitlementOverride`.

`file_upload` reste distinct de `product_catalog_import` : le stockage documentaire durable Core et l'import métier temporaire ne sont pas la même fonctionnalité commerciale.

RBAC et capability restent deux contrôles indépendants.

## 7. Import catalogue — décision et anomalie actuelle

Cycle cible :

```text
CSV / XLS / XLSX
→ téléversement temporaire sécurisé
→ mapping
→ normalisation / matching
→ preview
→ décisions
→ commit Produits / WorkspaceProduct
→ suppression du fichier source
```

Les données Produits persistent ; le fichier source n'a pas vocation à devenir un document durable.

Anomalie actuelle :

```text
backend/modules/productCatalog/productCatalogImport.middleware.js
→ multer.memoryStorage()
```

Cette implémentation contourne la chaîne générique Core de quarantaine / checksum / antivirus / nettoyage.

Le Core v1.1.2 possède les primitives basses nécessaires mais son pipeline File durable est configuré pour PDF/JPEG/PNG. La reprise doit d'abord déterminer la composition professionnelle pour CSV/XLS/XLSX.

Si une factory générique configurable manque réellement, ne pas la dupliquer dans M-002 : la traiter dans `saas-core-api` en un seul lot Core cohérent, la versionner, l'intégrer, puis reprendre M-002.

## 8. Éléments M-002 existants à conserver sous réserve des tests

Backend :

- modèles Produit / Variante / Catégorie / WorkspaceProduct ;
- normalisation et anti-doublon ;
- services contribution/catalogue ;
- `ProductReferenceEvent` ;
- import inspect/preview/commit dans son principe ;
- migration indexes ;
- bootstrap versionné ;
- API Workspace M-002 ;
- summary Dashboard.

Frontend Workspace déjà présent :

- routes/navigation ;
- page Produits ;
- Mon catalogue / Tout le référentiel ;
- détail Produit ;
- contribution Produit / déclinaison ;
- import ;
- widget Dashboard ;
- tests RTL partiels.

Ces éléments doivent être revus après recadrage et ne sont pas déclarés verts.

## 9. Éléments à supprimer ou repositionner

```text
backend/modules/productCatalog/productCatalogPlatform.controller.js
backend/modules/productCatalog/productCatalogPlatform.routes.js
backend/modules/productCatalog/productCatalogPlatformPermission.registry.js

frontend Platform Produits
platform-product-catalog-api
platform-products-route/page/dialogs
attentes de tests platform:products:*
```

La logique métier utile de gouvernance peut être conservée/recomposée ; seule la frontière Platform est invalide.

## 10. Deux points techniques à fermer en premier

### A — Autorité métier globale

Le Core v1.1.2 n'expose pas explicitement un RBAC global métier indépendant de Platform.

Déterminer si les primitives existantes suffisent à composer cette autorité proprement. Sinon, formaliser un besoin Core générique minimal. Ne pas inventer un second RBAC local sans cette vérification.

### B — Ingestion temporaire sécurisée

Déterminer comment réutiliser les primitives Core de téléversement/inspection/nettoyage pour CSV/XLS/XLSX sans maintenir un deuxième pipeline Multer métier.

Si le Core doit évoluer, grouper l'évolution en un seul lot Core utile et réutilisable ; aucune micro-version destinée uniquement à réparer un test.

## 11. Phases de reprise M-002

```text
Phase 1 — analyse réelle
→ relire KB
→ vérifier HEAD / main / core-origin
→ relire contrats M-002 recadrés
→ relire Core v1.1.2 nécessaire
→ fermer A et B ci-dessus

Phase 2 — correction backend cohérente
→ retirer dépendance Platform Produits
→ intégrer capabilities produit
→ corriger import sécurisé
→ repositionner gouvernance globale
→ préserver invariants métier existants

Phase 3 — tests backend ciblés puis globaux
→ RBAC
→ entitlements / overrides
→ tenancy
→ doublons
→ gouvernance
→ import sécurisé

Phase 4 — frontend Workspace
→ corriger/finaliser l'existant
→ entitlements visibles sans sécurité frontend-only
→ import/contribution cohérents

Phase 5 — administration métier globale
→ surface hors Platform
→ référentiel / contributions / catégories
→ autorisation globale retenue

Phase 6 — tests frontend + E2E
→ parcours Free/Premium pertinents
→ import
→ contribution
→ approbation
→ isolation PENDING

Phase 7 — finalisation
→ revue architecture / taille des fichiers
→ documentation finale
→ lint / tests / build / E2E / release:check
→ validation visuelle

Phase 8 — livraison
→ UNE PR M-002
→ gate
→ UNE fusion
```

## 12. Discipline Git / PR

Ne pas créer de micro-PR pour correction Platform, capability, import, test ou documentation intermédiaire.

Tout reste dans le même lot M-002 et la même branche jusqu'à validation finale.

Si une évolution Core générique est réellement nécessaire, elle constitue un seul lot Core indépendant et cohérent ; après intégration de la nouvelle release Core dans le produit, M-002 reprend sur sa branche unique.

## 13. Gates finales

À exécuter sur l'état final cohérent du lot, en plus des tests ciblés utiles pendant le développement :

```text
npm run release:verify
npm run lint
npm test
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run test:e2e
npm run release:check
```

Ne pas annoncer la PR prête avant validation réelle de ces gates et de l'UX.
