# M-002 — Autorisation, ownership, capabilities et gouvernance

**Statut : RECADRAGE QA VALIDÉ — 2026-09-24**

## 1. Ownership

`CanonicalProduct`, `ProductVariety`, `ProductCharacteristic`, `ProductVariant`, `ProductCategory` et `ReferenceContribution` sont globaux. `WorkspaceProduct` est tenant-scoped.

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
