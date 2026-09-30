# M-002 — Autorisation, ownership, capabilities et gouvernance

**Statut : RECADRAGE QA VALIDÉ — 2026-09-24**

## 1. Ownership

`CanonicalProduct`, `ProductVariety`, `ProductCharacteristic`, `ProductVariant`, `ProductCategory` et `ReferenceContribution` restent des primitives du référentiel Produit global. `WorkspaceProduct` est tenant-scoped. Une identité en gouvernance `PROVISIONAL` est cependant visible et exploitable uniquement dans son Workspace d'origine jusqu'à sa résolution Platform ; `contributedFromWorkspace` conserve cette provenance sans devenir un ownership métier.

## 2. Workspace

RBAC : `product:read`, `product:catalog:manage`, `product:contribute`.

Capabilities : `product_reference_access`, `product_catalog_import`, `product_contribution`.

## 3. Application Global

Permissions :

```text
product:reference:read
product:reference:manage
```

Rôle système produit : `product_reference_governor`.

Le bootstrap `npm run seed:m002-governance` attribue explicitement ce rôle au Fondateur actif.

Invariants :

```text
Super Admin Platform ≠ gouverneur Produit automatique
Workspace Owner       ≠ gouverneur Produit
```

## 4. Visibilité Platform

Le Fondateur/Super Admin qui possède aussi `product_reference_governor` doit disposer d'une entrée visible vers la gouvernance Produit depuis l'administration Platform.

Le Core ne doit pas connaître les permissions Produit. Le besoin doit être satisfait par un point d'extension générique de navigation Platform, tandis que la route et l'API Produit continuent d'appliquer leur propre autorisation Application Global.

## 5. Dépendance Core

Le Core stable v1.2.1 ne possède pas encore ce point de composition de navigation Platform.

Traitement obligatoire avant reprise du code M-002 : une branche/PR Core unique, aucun bump de version, aucun tag/release, puis intégration du SHA Core exact dans le produit.

## 6. Gouvernance

`product:reference:manage` couvre création/correction/archivage/réactivation des Produits, catégories, Variétés, Caractéristiques, CUT, variantes, synonymes gouvernés, contributions et import global.

## 7. Gouvernance non bloquante des contributions

Le lifecycle (`ACTIVE` / `ARCHIVED`) est distinct de la gouvernance :

```text
APPROVED
PROVISIONAL
RESOLVED
REJECTED
```

Règles :

- `APPROVED` : valeur canonique visible par tous les Workspaces autorisés ;
- `PROVISIONAL` : vraie entité exploitable immédiatement, visible uniquement dans le Workspace d'origine et dans l'administration Platform ;
- `RESOLVED` : ancienne identité remplacée ou fusionnée, conservée pour traçabilité mais non sélectionnable ;
- `REJECTED` : proposition refusée et non sélectionnable.

Une faute ou proximité lexicale n'est jamais fusionnée silencieusement. Le moteur peut retourner `USER_CONFIRMATION_REQUIRED` avec des candidats ; l'utilisateur choisit une valeur existante ou confirme explicitement la création. Une création forcée devient `PROVISIONAL`.

La gouvernance Platform permet :

- validation canonique ;
- correction puis validation ;
- fusion vers une référence `APPROVED` ;
- rejet uniquement si la valeur n'est pas déjà utilisée, sinon une fusion/remplacement explicite est requise.

Les opérations de résolution sont transactionnelles. Elles peuvent repointer les dépendances opérationnelles courantes, mais ne réécrivent jamais les snapshots validés M-004.
