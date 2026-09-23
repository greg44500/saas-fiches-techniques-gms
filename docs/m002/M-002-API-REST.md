# M-002 — Contrat API REST

**Statut : BACKEND RECADRÉ ET IMPLÉMENTÉ — frontend à aligner ; tests d'autorisation récents à exécuter**

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

Permission de base : `product:read`.

Capability : `product_catalog_import`.

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

Le backend utilise désormais le pipeline temporaire sécurisé configurable du Core. Aucun `File` durable n'est créé.

### POST /imports/:importId/preview

Permission de base : `product:read`.

Capability : `product_catalog_import`.

Aucune mutation Produit.

Le backend normalise, recherche les correspondances et classe les lignes : exact, proche, nouvelle contribution potentielle, ambiguë ou invalide.

### POST /imports/:importId/commit

Permission de base : `product:read`.

Capability principale : `product_catalog_import`.

Le backend revendique atomiquement la session et revalide la preview contre l'état courant. Un état obsolète retourne 409.

Le contrôle final est dynamique, à partir de la preview persistée et des décisions de la requête :

- une ligne ignorée n'ajoute aucun droit de mutation ;
- un rattachement à une référence existante exige `product:catalog:manage` ;
- une création de Produit/déclinaison exige `product:contribute` et la capability `product_contribution` ;
- une ligne ambiguë applique les exigences de l'action explicitement choisie.

Le commit n'exige donc plus systématiquement les deux permissions `product:catalog:manage` et `product:contribute`.

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

## 6. Gouvernance globale métier

La frontière backend retenue est indépendante de Platform :

```text
/api/product-reference
```

Permissions Application Global :

```text
product:reference:read
product:reference:manage
```

Le guard utilisé est `authorizeApplicationGlobalPermission()`.

Un rôle Platform, y compris Super Admin, ne confère aucun droit Produit implicite. Un Owner Workspace non plus.

Routes backend disponibles sous cette frontière :

- `GET /metadata` ;
- `GET /categories` ;
- `POST /categories` ;
- `PATCH /categories/:categoryId` ;
- `PATCH /categories/:categoryId/status` ;
- `GET /` ;
- `GET /:productId` ;
- correction Produit/déclinaison ;
- approve/reject Produit/déclinaison ;
- archivage/réactivation.

Les services de gouvernance restent des services métier Produit. Les anciens contrats backend `/api/platform/products/*` et `platform:products:*` ont été retirés.

Le premier gouverneur peut être initialisé explicitement avec `npm run seed:m002-governance`.

Le frontend d'administration doit encore être déplacé hors `PlatformLayout` et aligné sur cette nouvelle API.

## 7. Anti-énumération

Les références globales ACTIVE autorisées par l'entitlement peuvent être lues avec `product:read`.

Les PENDING/REJECTED d'un autre Workspace ne sont jamais révélés par la frontière Workspace.

La future surface de gouvernance globale possède sa propre autorisation métier et n'accorde aucun accès implicite aux données privées des Workspaces.
