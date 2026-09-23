# M-002 — Référentiel Produits / Produits canoniques

**Statut : IMPLÉMENTATION RECALÉE SUR LA SÉMANTIQUE PRÉSENTATION/GAMME — gates finales requises**  
**Branche :** `feature/m002-catalogue-produits`

## 1. Objectif

M-002 fournit :

```text
SaaS
→ Référentiel global de Produits canoniques et déclinaisons

Workspace
→ Mon référentiel
→ sélection de ProductVariant via WorkspaceProduct

Dossier
→ consomme Mon référentiel
→ aucune identité Produit Dossier-owned
```

Le terme **catalogue** est réservé aux catalogues fournisseurs de M-003.

## 2. Acteurs et autorisations

Un membre Workspace autorisé peut rechercher, rattacher, créer et importer selon RBAC + capabilities.

L'autorité globale Produit repose sur Application Global :

```text
product:reference:read
product:reference:manage
```

Un rôle Platform — y compris Super Admin — ne confère jamais implicitement cette autorité.

## 3. Modèle métier

### CanonicalProduct

Identité globale partageable : nom, alias, recherche, catégorie, lifecycle et audit. Aucun Fournisseur, conditionnement ou prix.

### ProductVariant

Déclinaison globale :

```text
presentation
foodRange
processingState
referenceUnit
yieldPercent
status
```

Contrat V1 :

- **Présentation** remplace l'ancien champ Forme ;
- **Conservation** est supprimée ;
- **Gamme** est une nomenclature backend-driven 1..6 ;
- **État / transformation** dépend de la Gamme ;
- unité obligatoire ;
- rendement facultatif.

Nomenclature :

| Gamme | Nom | État initial |
| --- | --- | --- |
| 1 | Frais | Produit frais |
| 2 | Conserves | Conserve |
| 3 | Surgelés | Surgelé |
| 4 | Sous-vide cru / épluchés | Sous-vide cru / épluché |
| 5 | Sous-vide cuit | Sous-vide cuit |
| 6 | PAI / PAE | PAI / PAE |

La signature unique combine Produit + Présentation + Gamme + État / transformation.

### WorkspaceProduct

Relation tenant-scoped entre Workspace et ProductVariant. Elle matérialise **Mon référentiel** sans copier l'identité globale.

### ProductCategory

Taxonomie globale plate. Une catégorie ACTIVE est obligatoire à la création d'un Produit ACTIVE.

## 4. Recherche et affichage

Avant création : normalisation, exact match, alias, proximité, revue explicite des candidats.

Les listes sont triées **alphabétiquement par Produit avant pagination**.

Page Workspace :

```text
Référentiel global | Mon référentiel

Produit | Présentation | Gamme | Actions
```

La colonne Statut n'est pas affichée dans ces vues opérationnelles : elles ne présentent que les références utilisables selon leur scope.

## 5. Création depuis un Workspace

```text
recherche anti-doublon
→ catégorie ACTIVE
→ Présentation
→ Gamme
→ État / transformation proposé par le backend
→ unité
→ rendement éventuel
→ CanonicalProduct ACTIVE
→ ProductVariant ACTIVE
→ WorkspaceProduct ACTIVE
```

## 6. Lifecycle

```text
ACTIVE ↔ ARCHIVED
```

Le workflow PENDING_REVIEW / approve / reject n'appartient plus au parcours courant.

## 7. Imports

Deux scopes M-002 réutilisent le pipeline temporaire sécurisé Core :

- WORKSPACE : rattachement ou création contrôlée + WorkspaceProduct ;
- GLOBAL : alimentation du Référentiel global sans WorkspaceProduct.

L'import M-002 accepte Présentation, Gamme, État/transformation, unité et rendement. Il n'absorbe jamais Fournisseur, référence fournisseur, conditionnement ou prix.

## 8. Migration de sémantique

`npm run migration:m002-catalog` exécute notamment `migrateM002VariantSemantics` :

- `form → presentation` ;
- suppression de `preservation` et des champs normalisés historiques ;
- recalcul de l'État depuis la Gamme lorsqu'elle existe ;
- recalcul de la signature ;
- aucune Gamme inventée pour une ancienne donnée qui n'en possède pas ;
- arrêt explicite si deux déclinaisons actives deviendraient identiques.

Aucune fusion silencieuse n'est autorisée.

## 9. Frontière M-003

M-003 porte exclusivement Fournisseur, Catalogue fournisseur, Article, référence, conditionnement et prix. Ces données ne doivent jamais être injectées dans `CanonicalProduct` ou `ProductVariant` M-002.