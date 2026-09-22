# M-002 — Autorisation, ownership et gouvernance

**Statut : PROPOSÉ — à valider avec le cadrage M-002**

## 1. Ownership

```text
CanonicalProduct
ProductVariant
ProductCategory
→ portée globale SaaS
→ aucun ownership Workspace

WorkspaceProduct
→ ownership Workspace explicite
```

`createdBy`, `updatedBy` et `contributedFromWorkspace` servent à la traçabilité et ne constituent jamais l'ownership d'une ressource globale.

## 2. Permissions Workspace proposées

```text
product:read
product:catalog:manage
product:contribute
```

### product:read

Autorise :

- consultation du catalogue du Workspace ;
- recherche du référentiel global actif ;
- lecture des contributions visibles dans le Workspace.

### product:catalog:manage

Autorise :

- ajout d'une déclinaison ACTIVE au catalogue ;
- archivage/réactivation d'une entrée WorkspaceProduct.

### product:contribute

Autorise :

- proposition d'un nouveau Produit canonique ;
- proposition d'une nouvelle déclinaison d'un Produit existant ;
- uniquement après contrôle anti-doublon.

Le rôle système `owner` reçoit les trois permissions via le point d'extension RBAC produit.

Aucun rôle système Core n'est modifié.

Les rôles personnalisés Workspace pourront recevoir ces permissions selon le besoin métier.

## 3. Permissions Platform proposées

```text
platform:products:read
platform:products:manage
```

`platform:products:read` :
- file de contributions ;
- référentiel global ;
- catégories.

`platform:products:manage` :
- correction d'un Produit ou d'une déclinaison globale ;
- création/modification/archivage d'une catégorie ;
- approbation/rejet ;
- archivage/réactivation ;
- définition d'un remplacement.

La permission de gestion est proposée avec une sensibilité `RESERVED` dans le registre Platform afin d'éviter une délégation accidentelle.

## 4. Contribution Workspace

Un membre ne modifie jamais directement une ressource globale ACTIVE déjà utilisée par d'autres clients.

Flux :

```text
recherche préalable
→ contrôle doublon serveur
→ contribution PENDING_REVIEW
→ rattachement au Workspace contributeur
→ validation Platform
→ ACTIVE global
```

Une correction ultérieure d'une ressource partagée ACTIVE relève de la gouvernance Platform.

## 5. Rejet

Motifs structurés proposés :

```text
DUPLICATE
INVALID_IDENTITY
OUT_OF_SCOPE
INSUFFICIENT_INFORMATION
```

Pour `DUPLICATE`, la gouvernance fournit une ressource de remplacement lorsque celle-ci est connue.

Si une contribution en attente est rejetée comme doublon et qu'une déclinaison de remplacement est fournie, le service peut repointer transactionnellement l'entrée WorkspaceProduct du contributeur vers la déclinaison existante.

Aucun repoint automatique n'est effectué pour un Produit déjà ACTIVE et historiquement référencé.

## 6. Tenancy

Recherche `Mon catalogue` :

```text
Workspace courant
+ WorkspaceProduct du Workspace
+ contribution PENDING du même Workspace
```

Recherche `Tout le référentiel` :

```text
Produits/déclinaisons ACTIVE globaux
+ contributions PENDING du Workspace courant
```

Interdit :

- exposer les contributions PENDING d'un autre Workspace ;
- exposer une donnée privée provenant d'un autre Workspace ;
- utiliser `contributedFromWorkspace` comme information affichée aux autres tenants.

## 7. Capability et quota

Aucune capability commerciale M-002 n'est créée par anticipation.

Aucun quota de nombre de Produits n'est créé en V1.

Si une offre commerciale limite ultérieurement la contribution ou le nombre d'entrées du catalogue, ce besoin devra être démontré et cadré séparément.

## 8. Audit et activité métier

### Actions Workspace

Les événements d'usage du catalogue sont des faits métier Workspace et peuvent étendre `BusinessActivityEvent` :

```text
PRODUCT_CATALOG_ATTACHED
PRODUCT_CATALOG_ARCHIVED
PRODUCT_CATALOG_REACTIVATED
PRODUCT_CONTRIBUTION_SUBMITTED
```

Ils restent Workspace-scoped et transactionnels avec la mutation concernée.

### Gouvernance globale

Le `AuditLog` Core ne peut pas recevoir arbitrairement des actions produit sans modifier son enum générique.

M-002 ne modifie donc pas silencieusement le Core.

La traçabilité de gouvernance globale est portée par une primitive métier dédiée du module, conceptuellement `ProductReferenceEvent`, immuable et globale, couvrant :

```text
PRODUCT_APPROVED
PRODUCT_REJECTED
PRODUCT_UPDATED
PRODUCT_ARCHIVED
PRODUCT_REACTIVATED
VARIANT_APPROVED
VARIANT_REJECTED
VARIANT_UPDATED
VARIANT_ARCHIVED
VARIANT_REACTIVATED
CATEGORY_CREATED
CATEGORY_UPDATED
CATEGORY_ARCHIVED
CATEGORY_REACTIVATED
```

Cette primitive décrit l'historique métier du référentiel et ne remplace pas les logs techniques/sécurité du Core.
