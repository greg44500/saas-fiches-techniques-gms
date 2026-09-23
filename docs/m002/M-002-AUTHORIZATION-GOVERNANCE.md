# M-002 — Autorisation, ownership, capabilities et gouvernance

**Statut : VALIDÉ — backend Application Global / capabilities / import sécurisé implémenté ; frontend à finaliser — 2026-09-23**

## 1. Ownership

```text
CanonicalProduct
ProductVariant
ProductCategory
→ portée métier globale au produit
→ aucun ownership Workspace
→ aucune appartenance à Platform

WorkspaceProduct
→ ownership Workspace explicite
```

`createdBy`, `updatedBy` et `contributedFromWorkspace` servent à la traçabilité et ne constituent jamais l'ownership d'une ressource globale.

Invariant : **global métier ne signifie pas Platform**.

## 2. Permissions Workspace

```text
product:read
product:catalog:manage
product:contribute
```

### product:read

Autorise :

- consultation du catalogue du Workspace ;
- recherche du référentiel global accessible au plan ;
- lecture des contributions visibles dans le Workspace.

### product:catalog:manage

Autorise :

- ajout d'une déclinaison ACTIVE au catalogue ;
- archivage/réactivation d'une entrée `WorkspaceProduct`.

### product:contribute

Autorise :

- proposition d'un nouveau Produit canonique ;
- proposition d'une nouvelle déclinaison d'un Produit existant ;
- uniquement après contrôle anti-doublon.

Le rôle système `owner` reçoit ces permissions via le point d'extension RBAC du produit. Aucun rôle système Core n'est modifié.

Les rôles personnalisés Workspace pourront recevoir ces permissions selon le besoin métier.

## 3. Gouvernance métier globale

Le référentiel partagé reste une ressource métier de `saas-fiches-techniques-gms`.

Les anciens contrats backend suivants ont été supprimés :

```text
/api/platform/products
platform:products:read
platform:products:manage
```

La frontière backend retenue est :

```text
/api/product-reference
```

Permissions Application Global déclarées par M-002 :

```text
product:reference:read
product:reference:manage
```

Le guard utilisé est `authorizeApplicationGlobalPermission()`.

Invariants :

- un Super Admin Platform ne reçoit aucun droit Produit implicite ;
- un Owner Workspace ne reçoit aucun droit Produit global implicite ;
- les permissions sont persistées via `ApplicationGlobalRole` et `ApplicationGlobalMember` ;
- les services Produit restent dans le module `productCatalog` ;
- aucun second RBAC produit n'est créé.

La gouvernance métier globale peut :

- consulter les contributions en attente ;
- corriger les données génériques partagées ;
- gérer les catégories ;
- approuver ou rejeter une contribution ;
- archiver ou réactiver un Produit ou une déclinaison globale ;
- exploiter l'historique `ProductReferenceEvent`.

Le premier gouverneur est initialisé explicitement par :

```text
npm run seed:m002-governance
```

Ce seed synchronise le rôle système produit `product_reference_governor` puis crée le membership Application Global du Fondateur actif.

Cette attribution est explicite et persistée : elle ne constitue jamais un héritage automatique du rôle Platform.

## 4. Contribution Workspace

Un membre ne modifie jamais directement une ressource globale ACTIVE déjà utilisée par d'autres clients.

Flux :

```text
recherche préalable
→ contrôle doublon serveur
→ contribution PENDING_REVIEW
→ rattachement au Workspace contributeur
→ examen par la gouvernance métier globale
→ ACTIVE global
```

Une correction ultérieure d'une ressource partagée ACTIVE relève de la gouvernance métier globale.

## 5. Rejet

Motifs structurés :

```text
DUPLICATE
INVALID_IDENTITY
OUT_OF_SCOPE
INSUFFICIENT_INFORMATION
```

Pour `DUPLICATE`, la gouvernance fournit une ressource de remplacement lorsque celle-ci est connue.

Si une contribution en attente est rejetée comme doublon et qu'une déclinaison de remplacement est fournie, le service peut repointer transactionnellement l'entrée `WorkspaceProduct` du contributeur vers la déclinaison existante.

Aucun repoint automatique n'est effectué pour un Produit déjà ACTIVE et historiquement référencé.

## 6. Capabilities commerciales M-002

Les fonctionnalités métier sont déclarées par le produit et évaluées par le moteur de Plans / Entitlements / EntitlementOverrides du Core.

Capabilities à introduire dans le registre applicatif M-002 :

```text
product_reference_access
→ accès au référentiel Produit global

product_catalog_import
→ import CSV / XLS / XLSX dans le catalogue du Workspace

product_contribution
→ proposition de nouveaux Produits ou déclinaisons au référentiel global
```

La matrice commerciale peut alors évoluer sans modifier le métier. Exemple initial :

```text
Free
→ product_reference_access = oui
→ product_catalog_import = non
→ product_contribution = non

Premium
→ product_reference_access = oui
→ product_catalog_import = oui
→ product_contribution = oui
```

Cette matrice est un exemple de configuration commerciale, pas une constante métier codée en dur.

Les dérogations Core restent applicables : une capability métier enregistrée peut être activée ou désactivée par l'entitlement effectif selon les contrats Core existants.

### 6.1 Capability ≠ permission

Exemple import :

```text
capability product_catalog_import
→ le plan autorise-t-il la fonctionnalité ?

permission product:catalog:manage / product:contribute
→ ce membre du Workspace peut-il exécuter l'action ?
```

Les deux contrôles sont indépendants et backend-enforced.

### 6.2 Primitive File Core ≠ fonctionnalité commerciale d'import

Le Core peut conserver une capability générique `file_upload` pour les SaaS qui exposent réellement un stockage documentaire durable.

Le produit GMS n'a pas à activer ni commercialiser cette capability uniquement parce que M-002 reçoit temporairement un fichier.

`product_catalog_import` représente la valeur métier vendable : analyser un catalogue CSV/XLS/XLSX et transformer son contenu en données Produit.

Le fichier temporaire nécessaire à ce traitement :

- n'est pas un document utilisateur durable ;
- ne crée pas un espace de type Drive ;
- ne consomme pas un quota commercial de stockage persistant ;
- peut utiliser les primitives internes File du Core même si la fonctionnalité de stockage documentaire durable n'est pas incluse dans le plan.

Les garde-fous de taille, TTL ou concurrence restent des limites techniques d'exécution, distinctes d'un quota de stockage.

Si un futur module veut conserver durablement des documents, ce besoin sera commercialisé et quota-é séparément.

## 7. Fichiers d'import — frontière Core / Produit

Le produit reste responsable de :

- comprendre CSV / XLS / XLSX ;
- mapper les colonnes ;
- normaliser ;
- rapprocher les Produits ;
- produire la preview ;
- appliquer les décisions utilisateur ;
- persister les données Produit.

Le Core reste responsable des primitives génériques de sécurité fichier :

- réception multipart bornée ;
- quarantaine temporaire ;
- contrôle de type ;
- checksum ;
- antivirus ;
- nettoyage des temporaires.

Le fichier source d'import n'est pas une ressource documentaire durable. Après traitement réussi, les Produits, déclinaisons et relations Workspace persistent ; le fichier est supprimé selon le cycle temporaire prévu.

Son occupation disque transitoire relève de l'infrastructure d'exécution et non d'une capacité de stockage vendue au Workspace.

### 7.1 Implémentation sécurisée actuelle

Le pipeline parallèle `multer.memoryStorage()` a été supprimé.

M-002 utilise désormais `createSecureTemporaryUploadService()` avec une politique Produit dédiée :

- CSV : inspection réelle du contenu texte ;
- XLS : signature CFB/OLE + validation comme véritable classeur ;
- XLSX : détection OOXML générique ;
- checksum SHA-256 et antivirus fail-closed fournis par le Core ;
- suppression du temporaire après consommation ou erreur.

L'import ne crée aucun document `File`, ne consomme pas `storage_bytes` et n'exige pas `file_upload`.

Le Core intégré jusqu'au commit exact `c428fbec1edfa21a8860fcf8283072e45719832b` inclut également le correctif d'idempotence des politiques de téléversement temporaire.

Les quatre fichiers de tests ciblés du pipeline import sécurisé ont été exécutés localement et confirmés verts le 2026-09-23 avant la poursuite du bloc d'autorisation.

## 8. Tenancy

Recherche `Mon catalogue` :

```text
Workspace courant
+ WorkspaceProduct du Workspace
+ contribution PENDING du même Workspace
```

Recherche `Tout le référentiel` :

```text
Produits/déclinaisons ACTIVE globaux autorisés par l'entitlement
+ contributions PENDING du Workspace courant
```

Interdit :

- exposer les contributions PENDING d'un autre Workspace ;
- exposer une donnée privée provenant d'un autre Workspace ;
- utiliser `contributedFromWorkspace` comme information affichée aux autres tenants.

## 9. Audit et activité métier

### Actions Workspace

Les événements d'usage du catalogue sont des faits métier Workspace portés par `BusinessActivityEvent` :

```text
PRODUCT_CATALOG_ATTACHED
PRODUCT_CATALOG_ARCHIVED
PRODUCT_CATALOG_REACTIVATED
PRODUCT_CONTRIBUTION_SUBMITTED
PRODUCT_CATALOG_IMPORT_COMMITTED
```

Ils restent Workspace-scoped et transactionnels avec la mutation concernée.

### Gouvernance globale

Le `AuditLog` Core conserve les faits génériques de sécurité et d'administration du SaaS.

La traçabilité du référentiel Produit est portée par `ProductReferenceEvent`, immuable et globale :

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

Cette primitive métier ne remplace pas les logs techniques/sécurité du Core.

## 10. Invariants de reprise

```text
Core
→ primitives génériques
→ Plans / Entitlements / Overrides
→ RBAC générique
→ Files / sécurité fichier
→ équipe Workspace
→ AuditLog générique

Produit M-002
→ Produits / déclinaisons / catégories
→ catalogue Workspace
→ contributions
→ import catalogue
→ activité métier
→ gouvernance du référentiel global
```

Aucune correction M-002 ne doit réintroduire `Produit` comme responsabilité fonctionnelle de Platform.
