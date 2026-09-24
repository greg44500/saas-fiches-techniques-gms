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

Expose catégories, unités, statuts et les six Gammes structurées (`value`, `label`, `name`, `processingStates`, `defaultProcessingState`). Le frontend ne définit pas de liste métier parallèle.

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

## 3. Anti-doublon, contribution et création Workspace

### POST /duplicate-check

Permission : `product:contribute`.

Capability : `product_contribution`.

Aucune écriture.

### POST /

Permission : `product:contribute`.

Capability : `product_contribution`.

Soumet une nouvelle identité racine au moteur de contribution. Le payload Workspace n'accepte pas de synonymes métier ni de `reviewedCandidateIds`.

La première déclinaison peut fournir `presentation`, `foodRange`, `processingState`, `referenceUnit`, `yieldPercent`. `presentation` est une commodité de saisie pour la future `ProductCharacteristic(PRESENTATION)`, pas un champ persistant de `ProductVariant`.

Flux :

```text
anti-doublon recalculé
→ catégorie ACTIVE
→ classification contribution
→ nouveau CanonicalProduct : REVIEW_REQUIRED par défaut
→ ReferenceContribution PENDING_REVIEW
→ aucune référence publiée avant décision globale
```

Si un Produit équivalent existe déjà, la réponse peut être `EXISTING` sans créer de contribution.

### POST /contributions

Permission : `product:contribute`.

Capability : `product_contribution`.

Soumet une Variété ou une Caractéristique sous un Produit existant. Réponse déterministe :

```text
EXISTING
AUTO_PUBLISHABLE
REVIEW_REQUIRED
INVALID
```

### GET /:productId/dimensions

Permission : `product:read`.

Retourne les Variétés et Caractéristiques actives nécessaires aux sélecteurs Workspace.

### POST /:productId/variants

Permission : `product:contribute`.

Capability : `product_contribution`.

Le Produit parent doit être ACTIVE. Le payload utilise des identifiants structurés :

```text
varietyId nullable
characteristicIds[]
foodRange
processingState
referenceUnit
yieldPercent
```

La déclinaison est créée ACTIVE uniquement à partir de dimensions déjà gouvernées puis rattachée au Workspace créateur.

## 4. Référentiel Workspace — routes techniques stables

### PUT /catalog/:variantId

Permission : `product:catalog:manage`.

Produit et déclinaison doivent être ACTIVE.

### DELETE /catalog/:variantId

Permission : `product:catalog:manage`.

Archive uniquement `WorkspaceProduct`. Les segments techniques `/catalog` et la permission `product:catalog:manage` restent inchangés pour stabilité contractuelle ; le vocabulaire utilisateur est « Mon référentiel ».

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

Un rôle Platform n'accorde rien implicitement. Une personne de l'équipe Platform peut utiliser cette API uniquement via un `ApplicationGlobalMember` explicite.

### Lecture

- `GET /access`
- `GET /metadata`
- `GET /categories`
- `GET /`
- `GET /:productId`
- `GET /:productId/dimensions`
- `GET /contributions`

### Gestion

- `POST /` — créer directement un Produit global ;
- `POST /:productId/variants` — créer une déclinaison globale structurée ;
- `POST /:productId/varieties` — créer une Variété ;
- `PATCH /:productId/varieties/:varietyId` — corriger une Variété/ses synonymes ;
- `PATCH /:productId/varieties/:varietyId/status` — archiver/réactiver ;
- `POST /:productId/characteristics` — créer une Caractéristique ;
- `PATCH /:productId/characteristics/:characteristicId` — corriger une Caractéristique/ses synonymes ;
- `PATCH /:productId/characteristics/:characteristicId/status` — archiver/réactiver ;
- `POST /contributions/:contributionId/decision` — `APPROVE` ou `REJECT` après revalidation ;
- `PATCH /:productId` — corriger le Produit ;
- `PATCH /:productId/status` — archiver/réactiver ;
- `PATCH /:productId/variants/:variantId` — corriger une déclinaison ;
- `PATCH /:productId/variants/:variantId/status` — archiver/réactiver ;
- CRUD/lifecycle catégories.

L'approbation d'une contribution est atomique : revalidation, éventuelle publication/réutilisation de l'existant, statut `APPROVED` et événement sont dans la même transaction.

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

Références réelles :

```text
ACTIVE
ARCHIVED
```

Contributions :

```text
PENDING_REVIEW
APPROVED
REJECTED
```

`PENDING_REVIEW` n'est jamais un statut de `CanonicalProduct`, `ProductVariant`, `ProductVariety` ou `ProductCharacteristic`. Il appartient uniquement à `ReferenceContribution`.

Le backfill historique conserve la normalisation des anciens statuts de référence issus des premières itérations de développement.

## 9. Frontière M-003

Les colonnes suivantes restent hors M-002 :

- fournisseur ;
- catalogue fournisseur ;
- référence fournisseur ;
- conditionnement ;
- prix.

Un import fournisseur complet sera traité par M-003 avec une provenance Fournisseur + Catalogue explicite.
