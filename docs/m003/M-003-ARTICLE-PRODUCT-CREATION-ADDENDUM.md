# M-002/M-003 — Création et association d'une Référence Produit depuis un Article

**Statut :** cadrage validé ; implémenté sur
`feature/m002-m003-supplier-product-creation` ; QA locale en attente.
**Date :** 2026-10-14.
**Contrats parents :** `docs/m002/M-002-FINAL-CONTRACT.md` et
`docs/m003/M-003-FINAL-CONTRACT.md`.
**Core :** inchangé (v1.2.1).

## 1. Objectif et frontière métier

Après import, un Article fournisseur peut exister sans `productVariant`.
L'utilisateur doit pouvoir compléter son association sans quitter le module
Fournisseurs, même si la Référence Produit manque au référentiel.

- M-002 demeure propriétaire des identités `CanonicalProduct` et
  `ProductVariant`, des contributions, des doublons et de la gouvernance.
- M-003 demeure propriétaire de `SupplierArticle`, du Fournisseur, des Tarifs
  et des associations.
- Aucune identité privée dupliquée, collection, migration ou entité fictive
  de remplacement n'est introduite.
- Les données commerciales BRIDOR, conditionnements et tarifs ne sont
  pas copiés dans l'identité Produit.

## 2. Parcours accepté

1. Depuis l'onglet Association d'un Article fournisseur privé actif, rechercher
   une Référence existante. La recherche directe reste possible.
2. L'action « Créer une Référence Produit » ouvre le formulaire M-002 existant,
   avec la désignation saisie comme proposition modifiable.
3. Le contrôle de doublons M-002 reste obligatoire. Une Référence exacte peut
   être utilisée directement ; un Produit parent exact ou proche peut être
   réutilisé avant de créer uniquement la Référence manquante.
4. Si aucun parent pertinent ne convient, créer un Produit et sa première
   Référence selon la validation métier M-002 ; correction et rapprochement
   ultérieurs relèvent de la gouvernance.
5. La Référence nouvelle porte `PROVISIONAL` et est immédiatement sélectionnable
   par le Workspace contributeur ; elle est invisible aux autres Workspaces tant
   qu'elle n'est pas approuvée.
6. Après la création, tenter une association directe à l'Article fournisseur.
   Si elle échoue, afficher une action de réessai avec le même identifiant :
   **ne jamais recréer la contribution lors du réessai**.
7. Le gestionnaire Application Global pourra approuver, corriger ou fusionner.
   La réconciliation des associations actuelles relève des services M-002
   existants ; les snapshots validés M-004 ne sont pas réécrits.

## 3. Accès et autorisation

Le nouveau parcours contextuel exige, côté backend :
- membership Workspace autorisé et mode d'accès écriture ;
- `supplier:article:manage` ;
- `supplier:catalog:import` ;
- capability `supplier_catalog_import` activée dans l'entitlement effectif ;
- Article `WORKSPACE_PRIVATE`, `ACTIVE`, appartenant au Workspace.

Il **n'exige pas** en plus `product_contribution` ou
`product_reference_access` pour ses endpoints contextuels.
Les parcours M-002 généraux conservent leurs contrôles originels.
La gouvernance globale reste strictement Application Global.
L'accès à l'import sans permissions RBAC suffisantes ne suffit pas pour agir.

Les utilisateurs sans import conservent leurs anciennes actions d'association,
lorsqu'elles sont autorisées ; l'action de création contextuelle est absente.

## 4. APIs contextuelles M-003

Toutes sous
`/api/workspaces/:workspaceId/supplier-articles/:articleId/product-contributions` :

| Méthode | Suffixe | Autorité réutilisée |
|---|---|---|
| GET | `/metadata` | métadonnées M-002 |
| GET | `/search` | recherche M-002 |
| GET | `/:productId/dimensions` | dimensions M-002 |
| POST | `/duplicate-check` | contrôle de doublons M-002 |
| POST | `/` | contribution Produit M-002 |
| POST | `/:productId/variants` | contribution Référence M-002 |

Chaque endpoint applique préalablement le même contrôle Article privé actif,
permission de gestion + import et capability d'import. Les schémas Zod existants
M-002 sont réutilisés. La modification de l'association conserve son PATCH
M-003 historique et sa journalisation existante.

## 5. Validation et non-régression

- HTTP Supertest : import refusé, isolation Workspace, création provisoire,
  contrôle doublons, association et création sous un parent.
- React Testing Library : action conditionnelle, création et association,
  sélection existante, réutilisation parent, reprise après erreur sans
  duplication.
- Playwright : parcours import Article → association → création Produit
  provisoire → Article associé.
- Gates locales : `npm run lint`, `npm test`,
  `npm --prefix frontend run lint`, `npm --prefix frontend run test`,
  `npm --prefix frontend run build`, `npm run test:e2e` et
  `npm run release:check` selon le contrôle de qualité retenu.

**À la rédaction, aucun test ni gate de cette branche n'a été exécuté.**
Le commit et la présence des tests ne constituent pas une preuve de réussite.

## 6. Hors périmètre

Pas de publication automatique globale, de nouvelle capability payante,
de suppression d'import, de refonte des Tarifs, de modification des snapshots,
de nouveau modèle Mongoose, de migration ni d'évolution Core.

## 7. Critères d'acceptation

Le parcours n'est clos qu'après démonstration locale : import activé sans
capability M-002 indépendante ; création liée à l'Article ; provisoire visible
uniquement au Workspace ; gestionnaire capable de résoudre sans casser le lien ;
échecs et retry non destructifs ; aucune régression M-002/M-003/M-004 ;
gates réellement exécutées et communiquées, puis PR unique approuvée.
