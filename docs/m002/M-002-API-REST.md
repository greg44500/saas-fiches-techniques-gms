# M-002 — Contrat API REST

**Statut : RECADRÉ — API Workspace conservée ; ancienne frontière Platform à supprimer avant PR**

## 1. Règle générale

M-002 expose des routes métier Produit. Une ressource globale Produit n'est pas une ressource Platform.

Les contrôles HTTP doivent distinguer :

```text
authentification
→ entitlement / capability commerciale
→ permission RBAC
→ tenancy / visibilité métier
→ validation Zod
→ controller
→ service
```

Les capabilities sont évaluées côté backend via les mécanismes Core. Le frontend n'est jamais une autorité.

## 2. Frontière Workspace

Base :

```text
/api/workspaces/:workspaceId/products
```

### GET /metadata

Permission : `product:read`.

Expose les vocabulaires backend-driven utiles au frontend : statuts, unités, gammes, motifs de rejet et catégories visibles.

### GET /summary

Permission : `product:read`.

Retourne les indicateurs M-002 nécessaires au Dashboard Workspace.

### GET /search

Permission : `product:read`.

Capability : `product_reference_access` pour la portée `REFERENCE`.

Query :

```text
q
scope=WORKSPACE|REFERENCE
categoryId?
status?
page?
limit?
```

`WORKSPACE` ne sort jamais du catalogue courant.

`REFERENCE` expose les Produits/déclinaisons globaux ACTIVE et les contributions PENDING du Workspace courant uniquement.

### GET /:productId

Permission : `product:read`.

Retourne Produit, catégorie, déclinaisons visibles et état de rattachement au Workspace.

Un PENDING d'un autre Workspace est traité comme inexistant.

## 3. Contrôle doublon et contribution

### POST /duplicate-check

Permission : `product:contribute`.

Capability : `product_contribution`.

Aucune écriture.

### POST /contributions

Permission : `product:contribute`.

Capability : `product_contribution`.

Transaction :

```text
contrôle doublon recalculé
→ CanonicalProduct PENDING_REVIEW
→ ProductVariant PENDING_REVIEW
→ WorkspaceProduct ACTIVE
→ BusinessActivityEvent
```

La contribution reste non opérationnelle pour les modules aval tant que sa déclinaison n'est pas ACTIVE.

### POST /:productId/variants/contributions

Permission : `product:contribute`.

Capability : `product_contribution`.

Le Produit parent doit être ACTIVE.

## 4. Catalogue Workspace

### PUT /catalog/:variantId

Permission : `product:catalog:manage`.

Préconditions : Produit et déclinaison ACTIVE ; création ou réactivation idempotente de `WorkspaceProduct`.

### DELETE /catalog/:variantId

Permission : `product:catalog:manage`.

Archive l'entrée `WorkspaceProduct`. Aucun delete physique.

## 5. Import en masse Produit

L'import est une fonctionnalité métier M-002. Il ne doit pas être confondu avec le stockage documentaire Core.

Capability principale :

```text
product_catalog_import
```

Les actions qui créent une contribution exigent en plus :

```text
product_contribution
+ permission product:contribute
```

Le rattachement de références existantes exige :

```text
permission product:catalog:manage
```

### POST /imports/inspect

Reçoit un CSV / XLS / XLSX temporaire.

Le backend doit :

- utiliser un téléversement temporaire sécurisé fondé sur les primitives Core ;
- appliquer limites, inspection de type, checksum, antivirus et nettoyage ;
- lire uniquement la première feuille Excel ;
- ne pas créer un document `File` durable pour le seul besoin de l'import ;
- ne pas exiger l'activation commerciale d'un espace de stockage documentaire pour utiliser l'import ;
- appliquer uniquement les garde-fous techniques nécessaires au traitement temporaire ;
- persister une session d'import temporaire TTL ;
- retourner `importId`, en-têtes, nombre de lignes et colonnes hors périmètre M-002.

L'implémentation actuelle `multer.memoryStorage()` du module est à remplacer avant la PR finale.

### POST /imports/:importId/preview

Capability : `product_catalog_import`.

Aucune mutation Produit.

Le backend normalise, recherche les correspondances et classe les lignes : exact, proche, nouvelle contribution potentielle, ambiguë ou invalide.

### POST /imports/:importId/commit

Capability : `product_catalog_import`.

Le backend revendique atomiquement la session et revalide la preview contre l'état courant. Un état obsolète retourne 409.

Les décisions qui créent de nouveaux Produits/déclinaisons exigent également `product_contribution` et `product:contribute`.

Les décisions qui rattachent des références existantes exigent `product:catalog:manage`.

Résultats possibles :

```text
ATTACHED_EXISTING
PROPOSED_PRODUCT
PROPOSED_VARIANT
SKIPPED
INVALID
```

Les colonnes fournisseur / référence / conditionnement / tarif restent M-003.

Après traitement, le fichier source temporaire est supprimé selon le cycle prévu ; les données métier structurées persistent. Ce temporaire ne consomme aucun quota commercial de stockage durable du Workspace.

## 6. Gouvernance globale métier — frontière à finaliser

Les anciennes routes suivantes sont invalidées par le recadrage :

```text
/api/platform/products/*
```

Ainsi que les permissions :

```text
platform:products:read
platform:products:manage
```

La gouvernance globale doit rester dans le module Produit mais hors frontière Platform.

Avant de figer ses routes, la reprise doit fermer le mécanisme d'autorisation globale métier conformément à `M-002-AUTHORIZATION-GOVERNANCE.md`.

Fonctions à conserver fonctionnellement :

- liste/détail du référentiel complet ;
- file PENDING ;
- gestion des catégories ;
- correction Produit/déclinaison ;
- approve/reject ;
- archivage/réactivation ;
- historique `ProductReferenceEvent` ;
- import global contrôlé si nécessaire.

Le service de gouvernance existant peut être réutilisé après suppression de sa dépendance conceptuelle à Platform.

## 7. Anti-énumération

Les références globales ACTIVE autorisées par l'entitlement peuvent être lues avec `product:read`.

Les PENDING/REJECTED d'un autre Workspace ne sont jamais révélés par la frontière Workspace.

La future surface de gouvernance globale possède sa propre autorisation métier et n'accorde aucun accès implicite aux données privées des Workspaces.
