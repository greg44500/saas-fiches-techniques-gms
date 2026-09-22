# M-002 — Autorisation, ownership, capabilities et gouvernance

**Statut : VALIDÉ — recadrage Core / Produit / commercial du 2026-09-22**

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

Il ne doit donc plus être administré au travers de :

```text
/api/platform/products
platform:products:read
platform:products:manage
/platform/products
```

Ces contrats présents dans la branche M-002 avant le recadrage sont à supprimer ou repositionner avant la PR finale.

Les personnes autorisées à administrer le référentiel global peuvent être aussi membres de l'équipe Platform, mais leur droit métier Produit ne découle jamais implicitement de leur rôle Platform.

La gouvernance métier globale doit pouvoir :

- consulter les contributions en attente ;
- corriger les données génériques partagées ;
- gérer les catégories ;
- approuver ou rejeter une contribution ;
- archiver ou réactiver un Produit ou une déclinaison globale ;
- alimenter le référentiel global par bootstrap ou import contrôlé.

### 3.1 Point technique à fermer avant reprise des écritures de gouvernance

Le Core v1.1.2 expose un RBAC Workspace et un RBAC Platform, mais aucun contrat canonique n'établit encore un RBAC global métier indépendant de Platform.

La prochaine phase M-002 doit donc déterminer le mécanisme le plus simple et réutilisable pour porter cette autorité sans :

- transformer une donnée métier globale en donnée Platform ;
- accorder automatiquement la gouvernance Produit à tout administrateur Platform ;
- créer un second système d'authentification ;
- inventer une primitive générique Core sans besoin démontré.

Si le besoin révèle une primitive générique réutilisable par d'autres SaaS dérivés, elle doit être traitée dans `saas-core-api` en un seul bloc cohérent avant intégration dans le produit.

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

### 6.2 `file_upload` ne remplace pas `product_catalog_import`

`file_upload` représente le téléversement / stockage documentaire générique du Core.

`product_catalog_import` représente un cas d'usage métier M-002 qui peut utiliser un fichier temporaire puis le supprimer après transformation en données structurées.

Un plan peut donc autoriser l'import catalogue sans autoriser le stockage documentaire durable, ou l'inverse.

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

Le fichier source d'import n'est pas une ressource documentaire durable. Après traitement réussi, les Produits, déclinaisons et relations Workspace persistent ; le fichier peut être supprimé.

### 7.1 Dette d'implémentation actuelle

La branche M-002 utilise actuellement un `multer.memoryStorage()` propre au module d'import. Cette implémentation contourne le pipeline générique de quarantaine / inspection / antivirus du Core et doit être corrigée avant la PR M-002.

Le Core v1.1.2 possède les primitives basses nécessaires mais son pipeline File durable n'accepte actuellement que les formats documentaires configurés par le Core. La reprise doit vérifier si ces primitives peuvent être composées proprement pour un import temporaire CSV/XLS/XLSX sans dupliquer la sécurité générique.

Si une factory générique configurable de téléversement temporaire sécurisé manque réellement, ce manque est candidat Core et doit être traité dans `saas-core-api`, puis intégré au produit. M-002 ne doit pas maintenir un second pipeline Multer de sécurité en parallèle.

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
