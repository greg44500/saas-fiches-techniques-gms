# M-002 — Handoff backend courant

**Date :** 2026-09-23  
**Branche :** `feature/m002-catalogue-produits`  
**Dernier commit backend/tests avant documentation :** `a0da34a5a4be383dab2f936e16ec252e6a77d8c5`  
**État Git avant le commit documentaire :** 60 commits devant `main`, 0 derrière.

## 1. Core intégré

`core-origin.json` :

```text
repository : greg44500/saas-core-api
version    : 1.2.0
tag        : v1.2.0
commit     : c428fbec1edfa21a8860fcf8283072e45719832b
```

Le SHA Core est postérieur au tag `v1.2.0` et a été intégré volontairement sans nouvelle release.

Les deux prérequis génériques M-002 sont disponibles :

```text
Application Global authorization
Secure configurable temporary upload
```

## 2. Import sécurisé M-002

Le pipeline `multer.memoryStorage()` a été supprimé.

```text
CSV / XLS / XLSX
→ quarantaine Core
→ inspection réelle
→ checksum SHA-256
→ antivirus fail-closed
→ parsing métier
→ ProductImportSession
→ preview / décisions / commit
→ suppression du temporaire
```

Aucun document `File`, aucun `storage_bytes`, aucune capability `file_upload`.

Les quatre fichiers ciblés du pipeline import sécurisé ont été exécutés localement et confirmés verts avant le bloc d'autorisation.

## 3. Capabilities M-002

```text
product_reference_access
product_catalog_import
product_contribution
```

Elles sont composées dans `backend/config/applicationCapability.registry.js`.

La matrice Free/Premium n'est pas codée dans le métier. Plans / Entitlements / EntitlementOverrides Core restent l'autorité commerciale.

## 4. RBAC Workspace et import

Permissions :

```text
product:read
product:catalog:manage
product:contribute
```

Import :

```text
inspect / preview
→ product:read
→ product_catalog_import

commit
→ product:read
→ product_catalog_import
→ exigences dynamiques selon les mutations
```

```text
ATTACH_EXISTING
→ product:catalog:manage

PROPOSE_PRODUCT / PROPOSE_VARIANT
→ product:contribute
→ product_contribution
```

Le précédent AND systématique `product:catalog:manage + product:contribute` a été supprimé.

Fichiers principaux :

```text
backend/modules/productCatalog/productCatalogImportAccess.service.js
backend/modules/productCatalog/productCatalogAccess.middleware.js
backend/modules/productCatalog/productCatalog.routes.js
```

## 5. Gouvernance globale Produit

Ancienne frontière backend supprimée :

```text
/api/platform/products
platform:products:read
platform:products:manage
productCatalogPlatform.routes/controller/permission
```

Nouvelle frontière :

```text
/api/product-reference
product:reference:read
product:reference:manage
```

Autorité :

```text
ApplicationGlobalRole
ApplicationGlobalMember
authorizeApplicationGlobalPermission()
```

Un Super Admin Platform ou un Owner Workspace ne reçoit aucun droit global Produit implicitement.

## 6. Bootstrap du premier gouverneur

```text
npm run seed:m002-governance
```

Le seed synchronise `product_reference_governor` avec `product:reference:read` et `product:reference:manage`, puis crée explicitement le membership Application Global du Fondateur actif.

Le rôle Platform sert uniquement à identifier le compte initial dans le runner ; il n'accorde jamais l'autorisation métier au runtime.

## 7. Tests ajoutés mais non encore exécutés après les derniers commits

```text
backend/tests/plans/applicationCapability.registry.test.js
backend/tests/config/applicationGlobalPermission.registry.test.js
backend/tests/config/applicationPlatformPermission.registry.test.js
backend/tests/config/applicationRoutes.registry.test.js
backend/tests/modules/productCatalog/productCatalogGlobal.http.test.js
backend/tests/modules/productCatalog/productCatalog.http.test.js
backend/tests/modules/productCatalog/productCatalogImportAccess.service.test.js
backend/tests/modules/productCatalog/productCatalogGovernanceBootstrap.test.js
```

Ces tests couvrent la séparation Platform/Application Global, les capabilities, les overrides, le contrôle dynamique du commit import et l'idempotence du bootstrap.

Aucune CI n'a été déclenchée automatiquement sur le dernier HEAD. Ne pas les déclarer verts avant exécution locale.

## 8. Frontend restant à traiter

Le frontend contient encore l'ancienne surface Platform Produit, notamment :

```text
frontend/src/features/products/api/platform-product-catalog-api.js
frontend/src/features/products/components/platform-*.jsx
frontend/src/features/products/pages/platform-products-page.jsx
frontend/src/features/products/products-routes.js
frontend/src/features/products/products-composition.test.js
```

La prochaine phase doit :

1. finaliser le frontend Workspace avec les capabilities effectives ;
2. retirer/recomposer les anciennes attentes Platform Produits ;
3. créer une administration métier globale hors `PlatformLayout` ;
4. appeler `/api/product-reference` ;
5. déterminer l'accès frontend depuis l'autorisation Application Global, jamais depuis le seul rôle Platform ;
6. corriger RTL puis E2E.

## 9. Validation backend à faire au prochain démarrage

D'abord les tests ciblés du §7.

S'ils sont verts :

```text
npm test
```

une seule fois pour le checkpoint backend cohérent avant d'engager la phase frontend.

Ne pas lancer les gates frontend/E2E tant que le frontend n'a pas été repositionné.

## 10. Git / livraison

Tout reste dans `feature/m002-catalogue-produits`.

Pas de micro-PR. M-002 sera livré avec une seule PR après frontend, tests, E2E, gates et validation visuelle.
