# M-002 — Autorisation, ownership, capabilities et gouvernance

**Statut : ALIGNÉ SUR CONTRIBUTION SEMI-AUTOMATIQUE — 2026-09-24**

## 1. Ownership

```text
CanonicalProduct
ProductVariety
ProductCharacteristic
ProductVariant
ProductCategory
ReferenceContribution
→ ressources métier globales du produit
→ aucun ownership Workspace
```

`WorkspaceProduct` reste tenant-scoped.

`createdBy`, `updatedBy` et `contributedFromWorkspace` sont des informations d'audit/provenance, jamais d'ownership.

## 2. Workspace RBAC et capability

Clés :

```text
product:read
product:catalog:manage
product:contribute
product_reference_access
product_catalog_import
product_contribution
```

La séparation reste stricte :

```text
RBAC       → qui peut proposer ?
Capability → le plan autorise-t-il la contribution ?
Politique  → que peut publier automatiquement le moteur ?
```

Un plan payant ne confère jamais directement `product:reference:manage`.

## 3. Classification de contribution

Le moteur retourne exclusivement :

```text
EXISTING
AUTO_PUBLISHABLE
REVIEW_REQUIRED
INVALID
```

Exemples :

- nouvelle Variété non conflictuelle d'un Produit existant → `AUTO_PUBLISHABLE` possible ;
- nouvelle Présentation simple non conflictuelle → `AUTO_PUBLISHABLE` possible ;
- faute proche d'une référence existante → `EXISTING` ;
- caractéristique ambiguë → `REVIEW_REQUIRED` ;
- nouveau CanonicalProduct → `REVIEW_REQUIRED` par défaut.

Aucun score opaque n'est utilisé.

## 4. ReferenceContribution

`ReferenceContribution` est créée uniquement lorsqu'une proposition nécessite une revue ou une traçabilité de gouvernance adaptée.

Elle ne remplace jamais les ressources de référence.

Une référence réelle conserve seulement :

```text
ACTIVE ↔ ARCHIVED
```

La contribution trace notamment origine Workspace, auteur, Produit parent éventuel, dimension ciblée, payload, classification, raisons, reviewer et dates.

## 5. Autorité Application Global

Permissions :

```text
product:reference:read
product:reference:manage
```

Autorité :

```text
ApplicationGlobalRole
ApplicationGlobalMember
```

Invariants :

```text
Super Admin Platform ≠ gouverneur Produit automatique
Workspace Owner       ≠ gouverneur Produit automatique
```

Le rôle `product_reference_governor` reste attribué explicitement.

## 6. Gouvernance

`product:reference:manage` autorise notamment :

- créer/corriger/archiver/réactiver un Produit ;
- créer/corriger/archiver/réactiver une Variété ;
- créer/corriger/archiver/réactiver une Caractéristique ;
- gérer les vrais synonymes métier ;
- examiner une `ReferenceContribution` ;
- publier ou refuser une proposition après revalidation ;
- administrer les catégories ;
- gérer l'import global.

Cette autorité ne donne aucun accès implicite aux données privées d'un Workspace.

## 7. Publication automatique

`AUTO_PUBLISHABLE` n'est autorisé que pour des cas explicitement codés et testés.

Le moteur revalide exact match, proximité et invariants dans la même transaction que la publication/réutilisation de l'existant et la décision `APPROVED`.

Une nouvelle identité racine `CanonicalProduct` n'est pas auto-publiée par défaut pendant la bêta.

## 8. Audit

Workspace :

- ajout/retrait de Mon référentiel ;
- contribution ;
- import.

Global :

- création/correction/archivage/réactivation ;
- maintenance Variétés/Caractéristiques ;
- revue de contributions ;
- import global.

`ProductReferenceEvent` conserve l'historique métier publié et la provenance `WORKSPACE_CONTRIBUTION` lorsqu'une identité racine est approuvée depuis un Workspace. `AuditLog` Core conserve les faits génériques de sécurité/administration.