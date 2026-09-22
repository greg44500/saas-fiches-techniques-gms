# M-002 — Contrat API REST proposé

**Statut : PROPOSÉ — aucun endpoint à implémenter avant validation globale du cadrage**

## 1. Frontière Workspace

Base :

```text
/api/workspaces/:workspaceId/products
```

Toutes les routes :

```text
authenticate
→ validateRequest
→ loadWorkspaceContext
→ authorizePermission M-002
→ enforceWorkspaceAccessMode pour les mutations
→ controller
→ service
```

Aucune autorisation ne repose sur les données du frontend.

## 2. Métadonnées

### GET /metadata

Permission : `product:read`

Expose au minimum :

- statuts Produit ;
- statuts Déclinaison ;
- statuts WorkspaceProduct ;
- unités de référence et dimensions ;
- gammes alimentaires ;
- motifs de rejet affichables ;
- catégories ACTIVE.

## 3. Recherche

### GET /search

Permission : `product:read`

Query :

```text
q
scope=WORKSPACE|REFERENCE
categoryId?
status?
page?
limit?
```

M-002 retourne uniquement des sources Produit.

Le format de réponse réserve un champ `source` afin que M-003 puisse ultérieurement participer à une recherche unifiée sans casser le contrat :

```json
{
  "source": "CANONICAL_PRODUCT",
  "product": {},
  "variant": {},
  "workspaceEntry": null
}
```

`WORKSPACE` ne sort jamais du catalogue courant.

`REFERENCE` expose les références globales ACTIVE et les contributions PENDING du Workspace courant.

## 4. Détail

### GET /:productId

Permission : `product:read`

Retourne :

- Produit ;
- catégorie ;
- déclinaisons visibles ;
- état de rattachement de chaque déclinaison au Workspace.

Un Produit PENDING d'un autre Workspace est traité comme inexistant pour ce contrat.

## 5. Contrôle doublon

### POST /duplicate-check

Permission : `product:contribute`

Body :

```text
name
aliases?
```

Retourne exact match et candidats proches.

Aucune écriture.

## 6. Contribution d'un nouveau Produit

### POST /contributions

Permission : `product:contribute`

Body conceptuel :

```json
{
  "name": "Carotte",
  "aliases": ["Carottes"],
  "reviewedCandidateIds": [],
  "variant": {
    "form": "râpée",
    "processingState": "prête à l'emploi",
    "preservation": "fraîche",
    "foodRange": 1,
    "referenceUnit": "KG",
    "yieldPercent": 100
  }
}
```

Transaction :

```text
contrôle doublon recalculé
→ CanonicalProduct PENDING_REVIEW
→ ProductVariant PENDING_REVIEW
→ WorkspaceProduct ACTIVE
→ BusinessActivityEvent contribution
```

La contribution reste non opérationnelle pour les modules aval tant que sa déclinaison n'est pas ACTIVE.

## 7. Contribution d'une déclinaison

### POST /:productId/variants/contributions

Permission : `product:contribute`

Produit parent obligatoire : ACTIVE.

Crée une déclinaison PENDING_REVIEW et son WorkspaceProduct.

## 8. Rattachement catalogue

### PUT /catalog/:variantId

Permission : `product:catalog:manage`

Préconditions :

- variant ACTIVE ;
- product ACTIVE ;
- même requête Workspace ;
- création ou réactivation idempotente de WorkspaceProduct.

### DELETE /catalog/:variantId

Permission : `product:catalog:manage`

Archive l'entrée WorkspaceProduct.

Aucun delete physique.

## 9. Frontière Platform

Base :

```text
/api/platform/products
```

Les routes sont montées par le registre applicatif du produit, sans modifier `platform.routes.js` du Core.

Barrières :

```text
authenticate
→ authorizePlatformPermission
→ validateRequest
→ controller
→ service
```

## 10. Lecture Platform

### GET /

Permission : `platform:products:read`

Filtres :

- status ;
- categoryId ;
- q ;
- page/limit.

### GET /:productId

Permission : `platform:products:read`

Inclut toutes les déclinaisons et l'historique métier du référentiel.

## 11. Gouvernance des catégories

### GET /categories

Permission : `platform:products:read`

### POST /categories

Permission : `platform:products:manage`

### PATCH /categories/:categoryId

Permission : `platform:products:manage`

### PATCH /categories/:categoryId/status

Permission : `platform:products:manage`

Archivage refusé si des Produits ACTIVE utilisent encore la catégorie.

## 12. Gouvernance Produit

### PATCH /:productId

Permission : `platform:products:manage`

Corrige les données globales autorisées.

Toute modification de nom/alias repasse par les contrôles de clés uniques et de proximité.

### POST /:productId/approve

Permission : `platform:products:manage`

Préconditions :

- PENDING_REVIEW ;
- catégorie ACTIVE renseignée ;
- au moins une déclinaison cohérente ;
- aucun exact duplicate courant.

### POST /:productId/reject

Permission : `platform:products:manage`

Body :

```text
reason
replacementProductId?
replacementVariantId?
comment?
```

`replacementVariantId` requis pour un rejet DUPLICATE lorsque l'entrée Workspace doit être repointée.

### PATCH /:productId/status

Permission : `platform:products:manage`

Transitions ACTIVE ↔ ARCHIVED.

## 13. Gouvernance Déclinaison

### PATCH /:productId/variants/:variantId
### POST /:productId/variants/:variantId/approve
### POST /:productId/variants/:variantId/reject
### PATCH /:productId/variants/:variantId/status

Permission : `platform:products:manage`

Même principe que le Produit racine.

## 14. Anti-énumération

Les identifiants globaux ACTIVE sont des données de référence autorisées à la lecture avec `product:read`.

Les ressources PENDING/REJECTED d'un autre Workspace ne sont jamais révélées par la frontière Workspace.

Une route Platform reste protégée par l'autorisation Platform effective et ne réutilise pas une permission Workspace.
