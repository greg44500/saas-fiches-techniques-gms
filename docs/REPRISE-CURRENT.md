# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-23  
**Lot actif :** M-002 — Catalogue Produits / Produits canoniques  
**Branche :** `feature/m002-catalogue-produits`

## 1. Ordre d'autorité à reprendre

```text
KB-START-HERE
→ Git réel
→ code / contraintes DB
→ tests réellement exécutés
→ contrats M-002 validés
→ Core 1.2.0 + commit c428fbec1edfa21a8860fcf8283072e45719832b intégré
→ dette / documentation de reprise
```

Ne jamais déclarer un test vert sans exécution réelle.

## 2. Core intégré

`core-origin.json` vérifié :

```text
repository : greg44500/saas-core-api
version    : 1.2.0
tag        : v1.2.0
commit     : c428fbec1edfa21a8860fcf8283072e45719832b
```

Le tag `v1.2.0` reste la dernière release stable. Le commit `c428fbec1edfa21a8860fcf8283072e45719832b`, postérieur au tag, inclut la primitive générique de téléversement temporaire sécurisé ainsi que le correctif d'idempotence de sa politique de types, validé par la PR Core #40 / Core Gate #75, sans nouvelle release ni nouveau tag.

Le SHA complet enregistré dans `core-origin.json` constitue l'autorité exacte de provenance du code Core intégré.

Le Core fournit notamment : Auth / Users / Workspaces, RBAC Workspace, Platform SaaS, autorisation métier globale applicative indépendante de Platform et Workspace, Plans / subscriptions, capabilities / quotas, EntitlementOverrides, Files / stockage / rétention, téléversement durable sécurisé, téléversement temporaire sécurisé configurable, checksum SHA-256, antivirus fail-closed, quarantaine / nettoyage des temporaires, AuditLog et points d'extension applicatifs.

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

Le produit ne doit pas commercialiser deux capacités de stockage.

`product_catalog_import` est la capability métier de l'import. Le CSV/XLS/XLSX est un temporaire d'exécution : il peut utiliser les primitives File du Core sans activer un espace documentaire durable et sans consommer un quota commercial de stockage utilisateur.

La capability générique Core `file_upload` peut rester disponible pour un futur besoin réel de fichiers persistants, mais elle n'est pas une précondition commerciale de M-002.

Décision transverse supplémentaire : les futurs DRAFTS de Fiches techniques et les Fiches techniques VALIDATED seront limitables commercialement par **deux quotas métier de comptage distincts**. Ils utiliseront le moteur Core de metrics / limits / entitlements / overrides et non `storage_bytes`. Valeurs et règles exactes seront cadrées en M-004.

RBAC et capability restent deux contrôles indépendants.

## 7. Import catalogue — décision et adaptation restante

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

Le stockage temporaire nécessaire à l'analyse est un coût d'exécution technique, pas un espace invisible de stockage gratuit.

Adaptation produit restante :

```text
backend/modules/productCatalog/productCatalogImport.middleware.js
→ multer.memoryStorage()
```

Cette implémentation était provisoire et contourne encore la chaîne Core de quarantaine / checksum / antivirus / nettoyage.

Le prérequis Core est désormais résolu. Le produit dispose notamment de :

```text
createSecureTemporaryUploadService()
createMulterUpload()
createUploadedFileTypeInspector()
politique de types configurable
contentInspector spécialisé
```

M-002 doit maintenant remplacer `multer.memoryStorage()` par cette primitive Core.

Le fichier CSV/XLS/XLSX reste un temporaire d'exécution :

```text
upload
→ quarantaine temporaire
→ inspection réelle du contenu
→ checksum
→ antivirus
→ parsing métier
→ suppression du temporaire
```

Il ne crée aucun document `File`, ne consomme pas le quota `storage_bytes` et ne nécessite pas la capability générique `file_upload`.

Les règles spécifiques CSV/XLS/XLSX restent dans le produit :

- XLSX : inspection exploitable via signature OOXML ;
- CSV : inspection métier du contenu obligatoire ;
- XLS historique : inspection spécialisée nécessaire, la signature CFB/OLE seule n'étant pas suffisamment discriminante.

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

## 10. Prérequis Core M-002 — RÉSOLUS

### A — Autorité métier globale — RÉSOLU

Core 1.2.0 fournit désormais une autorité métier globale indépendante de Platform et Workspace :

```text
ApplicationGlobalRole
ApplicationGlobalMember
resolveApplicationGlobalAuthorization()
authorizeApplicationGlobalPermission()
```

M-002 doit composer ses permissions métier globales dans le registre applicatif du produit et utiliser ces primitives. Aucun second RBAC produit ne doit être créé.

### B — Ingestion temporaire sécurisée — RÉSOLU

Le commit Core :

```text
c428fbec1edfa21a8860fcf8283072e45719832b
```

fournit la primitive générique configurable nécessaire.

M-002 doit :

```text
retirer multer.memoryStorage()
→ définir sa politique CSV/XLS/XLSX
→ fournir les contentInspectors métier nécessaires
→ utiliser createSecureTemporaryUploadService()
→ parser le contenu inspecté
→ garantir le nettoyage du temporaire
```

Aucun deuxième pipeline Multer métier ne doit être maintenu.

## 11. Phases de reprise M-002

```text
Phase 1 — analyse réelle
→ relire KB
→ vérifier HEAD / main / core-origin
→ relire contrats M-002 recadrés
→ relire Core 1.2.0 + commit c428fbe nécessaire
→ appliquer les prérequis A et B désormais résolus

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

Si une évolution Core générique devient de nouveau nécessaire, elle constitue un seul lot Core indépendant et cohérent. L'intégration peut viser une release stable ou, lorsqu'une décision explicite l'autorise comme pour le commit `1504151`, un SHA Core précis validé sans inventer de nouvelle version. M-002 reprend ensuite sur sa branche unique.

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
