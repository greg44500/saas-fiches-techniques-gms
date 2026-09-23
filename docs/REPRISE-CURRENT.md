# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-23  
**Lot actif :** M-002 — Catalogue Produits / Produits canoniques  
**Branche :** `feature/m002-catalogue-produits`  
**Checkpoint backend/tests avant documentation :** `a0da34a5a4be383dab2f936e16ec252e6a77d8c5`

## 1. Autorité de reprise

```text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ contrats M-002
→ Core exact intégré
→ documentation de reprise
```

Ne jamais déclarer un test vert sans exécution réelle.

## 2. Core intégré

```text
repository : greg44500/saas-core-api
version    : 1.2.0
tag        : v1.2.0
commit     : c428fbec1edfa21a8860fcf8283072e45719832b
```

Ce SHA post-tag fournit Application Global authorization, le téléversement temporaire sécurisé configurable et le correctif d'idempotence `contentInspector: null`.

Aucune nouvelle release Core n'a été créée pour ces commits post-tag.

## 3. État Git

Avant le commit documentaire de ce checkpoint :

```text
feature/m002-catalogue-produits
→ 60 commits devant main
→ 0 derrière
```

Ne pas repartir de `main`, ne pas recréer M-002 et ne pas créer de micro-PR.

## 4. Backend M-002 courant

### Modèle métier

Conservé : `CanonicalProduct`, `ProductVariant`, `ProductCategory`, `WorkspaceProduct`, `ProductReferenceEvent`, `ProductImportSession`, normalisation/anti-doublon/matching, contributions `PENDING_REVIEW` et séparation M-003.

### Import sécurisé

```text
CSV / XLS / XLSX
→ secure temporary upload Core
→ inspection réelle
→ checksum
→ antivirus
→ parsing
→ preview
→ commit
→ cleanup
```

Le flux ne crée pas de `File`, ne consomme pas `storage_bytes` et n'exige pas `file_upload`.

Les quatre fichiers ciblés import sécurisé ont été confirmés verts localement avant les derniers travaux d'autorisation.

### Capabilities

```text
product_reference_access
product_catalog_import
product_contribution
```

### Workspace RBAC

```text
product:read
product:catalog:manage
product:contribute
```

Inspect/preview exigent `product:read + product_catalog_import`.

Le commit calcule dynamiquement :

```text
rattachement existant
→ product:catalog:manage

nouvelle contribution
→ product:contribute
→ product_contribution
```

### Gouvernance globale

Ancienne frontière backend Platform supprimée.

```text
API         : /api/product-reference
permissions : product:reference:read
              product:reference:manage
```

Autorité Core : `ApplicationGlobalRole`, `ApplicationGlobalMember`, `authorizeApplicationGlobalPermission()`.

Ni Super Admin Platform ni Owner Workspace n'héritent de cette autorité.

### Bootstrap gouvernance

```text
npm run seed:m002-governance
```

Le seed synchronise `product_reference_governor` et crée explicitement le membership Application Global du Fondateur actif.

## 5. Tests : vérité actuelle

Confirmé vert par l'utilisateur avant les derniers commits :

```text
productCatalogImportUpload.service.test.js
productCatalogImport.integration.test.js
productCatalogImport.parser.test.js
productCatalog.http.test.js
```

Ces exécutions validaient le pipeline sécurisé avant les changements ultérieurs de capabilities/autorisation.

Nouveaux tests ajoutés depuis : NON ENCORE EXÉCUTÉS dans cette conversation après les derniers commits.

À lancer en premier :

```text
npx vitest run backend/tests/plans/applicationCapability.registry.test.js backend/tests/config/applicationGlobalPermission.registry.test.js backend/tests/config/applicationPlatformPermission.registry.test.js backend/tests/config/applicationRoutes.registry.test.js backend/tests/modules/productCatalog/productCatalogGlobal.http.test.js backend/tests/modules/productCatalog/productCatalog.http.test.js backend/tests/modules/productCatalog/productCatalogImportAccess.service.test.js backend/tests/modules/productCatalog/productCatalogGovernanceBootstrap.test.js
```

Si verts, lancer une seule fois :

```text
npm test
```

pour fermer le checkpoint backend avant frontend.

## 6. Frontend restant

Le frontend contient encore les anciennes surfaces Platform Produits :

```text
platform-product-catalog-api.js
platform-products-route/page
platform-category-dialog
platform-product-details-drawer
platform-product-edit-dialog
platform-reject-product-dialog
platform-variant-edit-dialog
tests associés
```

Prochaine phase :

```text
frontend Workspace
→ vérifier capabilities/guards
→ import/contribution/catalogue

frontend gouvernance globale
→ retirer /platform/products
→ surface métier hors PlatformLayout
→ API /api/product-reference
→ autorisation Application Global
```

Ne pas implémenter de sécurité uniquement frontend.

## 7. Documentation canonique M-002

```text
docs/m002/M-002-AUTHORIZATION-GOVERNANCE.md
docs/m002/M-002-API-REST.md
docs/m002/M-002-ACCEPTANCE-IMPLEMENTATION.md
docs/m002/M-002-BOOTSTRAP-MIGRATIONS.md
docs/m002/M-002-BACKEND-HANDOFF.md
docs/contracts/SECURE-TEMPORARY-UPLOAD.md
```

## 8. Finalisation M-002

Après frontend :

```text
tests RTL ciblés
→ E2E critiques
→ npm run release:verify
→ npm run lint
→ npm test
→ frontend lint/test/build
→ npm run test:e2e
→ npm run release:check
→ validation visuelle utilisateur
→ UNE PR M-002
→ UNE fusion
```

Ne pas créer de PR intermédiaire pour ce checkpoint.
