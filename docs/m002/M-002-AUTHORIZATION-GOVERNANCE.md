# M-002 — Autorisation, ownership, capabilities et gouvernance

**Statut : RECADRÉ — Application Global conservé, validation humaine systématique supprimée — 2026-09-23**

## 1. Ownership

```text
CanonicalProduct
ProductVariant
ProductCategory
→ ressources métier globales du produit
→ aucun ownership Workspace
→ aucune appartenance fonctionnelle à Platform

WorkspaceProduct
→ ownership Workspace explicite
```

`createdBy`, `updatedBy` et `contributedFromWorkspace` sont des informations de provenance/audit, jamais d'ownership.

## 2. Permissions Workspace

Clés techniques conservées :

```text
product:read
product:catalog:manage
product:contribute
```

`product:contribute` signifie désormais : **créer une nouvelle identité ou déclinaison dans le référentiel partagé après contrôle anti-doublon**.

Il ne signifie plus « soumettre à une file de validation ».

Le rôle système Workspace `owner` reçoit ces permissions via le registre applicatif du produit. Aucun rôle système Core n'est modifié.

## 3. Capabilities commerciales

Clés techniques conservées :

```text
product_reference_access
product_catalog_import
product_contribution
```

`product_contribution` est conservée pour compatibilité des plans/entitlements déjà intégrés. Sa sémantique devient :

```text
le plan autorise-t-il la création de nouveaux Produits/déclinaisons
dans le référentiel partagé ?
```

Capability, permission et invariant restent distincts.

## 4. Autorité métier globale

Frontière :

```text
/api/product-reference
```

Permissions Application Global :

```text
product:reference:read
product:reference:manage
```

Guard :

```text
authorizeApplicationGlobalPermission()
```

Invariants :

- Super Admin Platform ≠ gouverneur Produit automatique ;
- Workspace Owner ≠ gouverneur Produit automatique ;
- une personne de l'équipe Platform peut recevoir explicitement l'autorité Produit ;
- cette attribution est matérialisée par `ApplicationGlobalRole` + `ApplicationGlobalMember` ;
- aucune autorisation n'est déduite du nom d'un rôle Platform ;
- aucun second moteur RBAC n'est créé.

Le bootstrap initial continue d'attribuer explicitement `product_reference_governor` au Fondateur actif. Cette attribution est un membership Application Global, pas un héritage Platform.

## 5. Création Workspace

Flux :

```text
permission product:contribute
+ capability product_contribution
+ Workspace actif
+ contrôle anti-doublon
+ catégorie ACTIVE
→ création globale ACTIVE
→ rattachement Workspace
```

La création est immédiatement visible dans le référentiel commun.

Le Workspace créateur n'acquiert aucun droit exclusif sur l'identité globale.

La modification ultérieure d'une identité partagée reste réservée à `product:reference:manage`.

## 6. Création et import par l'autorité globale

`product:reference:manage` autorise :

- création unitaire d'un Produit global ;
- création d'une déclinaison globale ;
- import CSV/XLS/XLSX générique ;
- correction ;
- gestion des catégories ;
- archivage/réactivation ;
- maintenance qualité du référentiel.

Ces actions ne dépendent d'aucun plan Workspace.

Un membre Platform dédié peut donc alimenter le référentiel commun **s'il possède explicitement ce membership Application Global**.

## 7. Suppression de la file de validation

Le flux suivant est supprimé :

```text
PENDING_REVIEW
→ approve
→ reject
```

Conséquences :

- plus de file « À valider » ;
- plus de boutons Valider/Rejeter ;
- plus de routes approve/reject ;
- plus d'état utilisateur « En validation » ;
- plus de dépendance opérationnelle à une intervention humaine centrale.

La gouvernance globale devient un outil de qualité et de maintenance, pas un goulot d'étranglement quotidien.

## 8. Tenancy et confidentialité

Le référentiel M-002 ne contient que des identités Produit génériques partageables.

Les données commerciales privées restent M-003 et ne sont jamais rendues globales par la création M-002.

Un rôle Application Global Produit ne donne aucun accès implicite :

- aux dossiers ;
- aux tarifs négociés ;
- aux prix facturés ;
- aux autres données privées d'un Workspace.

## 9. Audit

Workspace :

- rattachement/retrait catalogue ;
- création Produit depuis le Workspace ;
- création déclinaison depuis le Workspace ;
- import Workspace.

Global :

- création globale ;
- correction ;
- archivage/réactivation ;
- catégories ;
- import global.

`ProductReferenceEvent` porte l'historique métier global. `AuditLog` Core conserve les faits génériques de sécurité/administration.
