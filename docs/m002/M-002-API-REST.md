# M-002 — Contrat API REST

**Statut : RECADRÉ — cible d'implémentation du workflow sans validation humaine — 2026-09-23**

## 1. Règle générale

M-002 expose des routes métier Produit.

```text
authentification
→ capability commerciale lorsqu'elle s'applique
→ permission
→ tenancy/visibilité
→ validation Zod
→ controller
→ service
→ contraintes DB
```

Une ressource Produit globale n'est pas une ressource Platform.

## 2. Frontière Workspace

Base :

```text
/api/workspaces/:workspaceId/products
```

### GET /metadata

Permission : `product:read`.

Expose catégories, unités, gammes et statuts opérationnels.

### GET /summary

Permission : `product:read`.

Retourne les indicateurs du catalogue Workspace. Aucun compteur de contributions en attente.

### GET /search

Permission : `product:read`.

La portée `REFERENCE` exige `product_reference_access`.

```text
scope=WORKSPACE
→ WorkspaceProduct du Workspace

scope=REFERENCE
→ Produits/déclinaisons ACTIVE globaux
```

### GET /:productId

Permission : `product:read`.

Retourne le Produit et ses déclinaisons opérationnelles visibles.

## 3. Anti-doublon et création Workspace

### POST /duplicate-check

Permission : `product:contribute`.

Capability : `product_contribution`.

Aucune écriture.

### POST /

Permission : `product:contribute`.

Capability : `product_contribution`.

Crée un nouveau Produit global après revue des candidats :

```text
anti-doublon recalculé
→ catégorie ACTIVE obligatoire
→ CanonicalProduct ACTIVE
→ première ProductVariant ACTIVE
→ WorkspaceProduct ACTIVE
→ activité métier
```

### POST /:productId/variants

Permission : `product:contribute`.

Capability : `product_contribution`.

Le Produit parent doit être ACTIVE. La nouvelle déclinaison devient ACTIVE et est rattachée au Workspace.

Les anciennes routes `/contributions` et `/:productId/variants/contributions` sont supprimées.

## 4. Catalogue Workspace

### PUT /catalog/:variantId

Permission : `product:catalog:manage`.

Produit et déclinaison doivent être ACTIVE.

### DELETE /catalog/:variantId

Permission : `product:catalog:manage`.

Archive uniquement `WorkspaceProduct`.

## 5. Import Workspace

Capability principale :

```text
product_catalog_import
```

Le commit calcule les droits selon les mutations effectives :

```text
rattachement existant
→ product:catalog:manage

création Produit/déclinaison
→ product:contribute
→ product_contribution
```

Routes :

- `POST /imports/inspect`
- `POST /imports/:importId/preview`
- `POST /imports/:importId/commit`

Résultats cibles :

```text
ATTACHED_EXISTING
CREATED_PRODUCT
CREATED_VARIANT
SKIPPED
INVALID
```

Les classifications de preview utilisent `CREATE_PRODUCT` et `CREATE_VARIANT`, pas `PROPOSE_*`.

## 6. Frontière Application Global

Base :

```text
/api/product-reference
```

Permissions :

```text
product:reference:read
product:reference:manage
```

Un rôle Platform n'accorde rien implicitement. Une personne de l'équipe Platform peut utiliser cette API si un `ApplicationGlobalMember` lui attribue explicitement les permissions Produit.

### Lecture

- `GET /access`
- `GET /metadata`
- `GET /categories`
- `GET /`
- `GET /:productId`

### Gestion

- `POST /` — créer un Produit global ;
- `POST /:productId/variants` — créer une déclinaison globale ;
- `PATCH /:productId` — corriger ;
- `PATCH /:productId/status` — archiver/réactiver ;
- `PATCH /:productId/variants/:variantId` — corriger une déclinaison ;
- `PATCH /:productId/variants/:variantId/status` — archiver/réactiver ;
- CRUD/lifecycle catégories.

Les routes `approve` et `reject` sont supprimées.

## 7. Import global Produit

L'autorité `product:reference:manage` peut alimenter le référentiel sans contexte Workspace.

Routes cibles :

- `POST /imports/inspect`
- `POST /imports/:importId/preview`
- `POST /imports/:importId/commit`

Caractéristiques :

- même téléversement temporaire sécurisé que l'import Workspace ;
- aucune capability de plan Workspace ;
- aucun `WorkspaceProduct` créé ;
- mêmes contrôles anti-doublon ;
- création immédiate ACTIVE ;
- session d'import explicitement marquée GLOBAL.

## 8. États

États opérationnels V1 :

```text
ACTIVE
ARCHIVED
```

`PENDING_REVIEW` n'est plus produit par aucune route.

Une migration/backfill doit convertir les anciennes données de développement en attente avant la finalisation de M-002.

## 9. Frontière M-003

Les colonnes suivantes restent hors M-002 :

- fournisseur ;
- catalogue fournisseur ;
- référence fournisseur ;
- conditionnement ;
- prix.

Un import fournisseur complet sera traité par M-003 avec une provenance Fournisseur + Catalogue explicite.
