# M-002 — Backend handoff

**Statut : BACKEND ALIGNÉ SUR LE CONTRAT RECADRÉ — gates finales requises**

## 1. Modèle

```text
CanonicalProduct
→ identité globale

ProductVariant
→ déclinaison globale
→ presentation
→ foodRange 1..6 backend-driven
→ processingState résolu/validé depuis foodRange
→ referenceUnit
→ yieldPercent
→ aucun champ preservation opérationnel

WorkspaceProduct
→ usage Workspace

ProductCategory
→ taxonomie globale

ProductReferenceEvent
→ historique métier global

ProductImportSession
→ session temporaire WORKSPACE ou GLOBAL
```

Aucune donnée fournisseur/prix/conditionnement M-003 n'est portée par `CanonicalProduct`.

## 2. Lifecycle

États opérationnels :

```text
ACTIVE
ARCHIVED
```

Aucune nouvelle écriture ne produit `PENDING_REVIEW` ou `REJECTED`.

Le script `npm run migration:m002-catalog` normalise les anciennes données de développement vers `ACTIVE/ARCHIVED`.

## 3. Workspace

Frontière :

```text
/api/workspaces/:workspaceId/products
```

Permissions :

```text
product:read
product:catalog:manage
product:contribute
```

Capabilities :

```text
product_reference_access
product_catalog_import
product_contribution
```

Les clés `contribute/contribution` sont conservées pour stabilité, mais signifient désormais création contrôlée dans le référentiel partagé.

## 4. Import Workspace

Classifications :

```text
ATTACH_EXISTING
CREATE_PRODUCT
CREATE_VARIANT
REVIEW_REQUIRED
INVALID
```

Droits calculés :

```text
ATTACH_EXISTING
→ product:catalog:manage

CREATE_PRODUCT / CREATE_VARIANT
→ product:contribute
→ product_contribution
```

Le pipeline fichier réutilise le téléversement temporaire sécurisé Core.

## 5. Autorité globale

Frontière :

```text
/api/product-reference
```

Permissions :

```text
product:reference:read
product:reference:manage
```

Cette autorité est matérialisée par Application Global.

Invariant :

```text
rôle Platform
≠
permission globale Produit
```

Une personne de l'équipe Platform peut abonder le référentiel uniquement si elle reçoit explicitement un membership Application Global Produit.

## 6. Capacités globales

`product:reference:manage` couvre :

- duplicate-check ;
- création Produit ;
- création Déclinaison ;
- import global ;
- correction ;
- archive/réactivation ;
- catégories ;
- maintenance qualité.

L'import global :

- ne dépend d'aucun Workspace ;
- ne dépend d'aucun plan Workspace ;
- ne crée aucun `WorkspaceProduct` ;
- réutilise les mêmes règles anti-doublon.

## 7. Migration

`migration:m002-catalog` :

1. backfill lifecycle legacy ;
2. migration de sémantique ProductVariant (`form → presentation`, suppression Conservation, recalcul état/signature, collision guard) ;
3. indexes ;
4. permissions Workspace système enregistrées.

Règles legacy :

```text
PENDING complet → ACTIVE
PENDING incomplet → ARCHIVED
REJECTED → ARCHIVED
```

Aucune catégorie n'est inventée.

## 8. Fichiers backend structurants

```text
backend/modules/productCatalog/productCatalog.service.js
backend/modules/productCatalog/productVariantSemantics.js
backend/modules/productCatalog/productCatalogGovernance.service.js
backend/modules/productCatalog/productCatalogDedup.service.js
backend/modules/productCatalog/productCatalogImport.service.js
backend/modules/productCatalog/productCatalogImportAccess.service.js
backend/modules/productCatalog/productCatalogGlobal.routes.js
backend/modules/productCatalog/productCatalog.routes.js
backend/migrations/backfillM002LegacyProductLifecycle.migration.js
backend/migrations/migrateM002VariantSemantics.migration.js
backend/migrations/runEnsureM002CatalogMigration.js
```

## 9. Prochaine frontière métier

M-003 traitera séparément :

```text
Fournisseur
Catalogue fournisseur
Article fournisseur
Référence fournisseur
Conditionnement
Prix
```

M-002 ne doit pas absorber ces données.
