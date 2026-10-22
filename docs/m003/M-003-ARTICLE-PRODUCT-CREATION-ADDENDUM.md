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
2. L'action de création n'est affichée qu'après une recherche prédictive
   effectivement aboutie (à partir de 3 caractères) : un résultat manquant est
   signalé visuellement, un résultat proche appelle à examiner la liste.
   Les erreurs de recherche ne sont jamais traitées comme des résultats vides.
   Si aucune suggestion ne convient, la création reste explicitement possible.
   Le formulaire M-002 reçoit la recherche comme proposition modifiable.
   Il rappelle de rechercher d'abord le Produit parent générique avant de
   créer une identité canonique nouvelle.
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

## 4.1. Aide à la saisie et retours de recherche (QA visuelle)

- L'absence d'un Produit parent est signalée de manière contrastée et accessible
  dans le formulaire M-002 après contrôle des doublons.
- Les champs facultatifs Présentation et État / transformation possèdent des
  exemples de saisie et une infobulle accessible par survol ou focus.
- Les infobulles distinguent bien dimensions Produit et conditionnements
  commerciaux fournisseur ; elles ne déduisent pas l'État depuis une Gamme.
- Après QA, aucune numérotation artificielle d'étapes n'est affichée.
  Le conseil de recherche du Produit parent générique se trouve dans une
  infobulle dédiée, sans encadré explicatif permanent.
- La fiche d'identité de l'Article fournisseur associe une désignation
  prioritaire et une référence secondaire dans une zone neutre discrète.
- « Saisissez au moins 3 caractères » apparaît directement sous la recherche,
  comme aide de champ liée par `aria-describedby` ; une recherche réussie,
  vide ou en erreur conserve ses messages contextuels distincts.
- Aucune modification des données persistées ni des invariants de validation.

## 4.2. Recherche prédictive et confirmation proportionnée

Dans le parcours contextuel Article fournisseur, la recherche Produit se
déclenche automatiquement après 350 ms d'inactivité, dès trois caractères.
Les réponses périmées sont ignorées lors d'une saisie ultérieure. L'utilisateur
peut continuer à affiner le nom sans action « Rechercher l'existant ».

Le moteur M-002 conserve ses rapprochements déterministes, sa limite serveur
de huit candidats et le blocage des collisions exactes. L'affichage propose
la réutilisation directe d'un Produit parent actif. Pour proposer un Produit
distinct malgré des candidats proches, une confirmation unique et explicite
porte sur **tous les candidats effectivement affichés**, plutôt qu'une case
par suggestion. Aucune confirmation automatique n'est effectuée.

Lors de la création, le backend réévalue les collisions dans la transaction.
Si la liste des candidats critiques a changé depuis l'affichage, il renvoie
`USER_CONFIRMATION_REQUIRED` sans créer le Produit : une nouvelle revue
explicite est exigée. Le serveur n'infère jamais une revue non transmise par
le client. L'utilisateur peut poursuivre immédiatement avec un Produit
`PROVISIONAL` une fois les contrôles passés ; la validation globale reste
différée et humaine.

Ce lot conserve les anciens formulaires de contribution M-002 hors parcours
Article fournisseur et n'ajoute aucune capability.

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


## Complément de stabilisation E2E du 22/10/2026 — recherche avant création

La création manuelle d'un Article doit pouvoir vérifier les Références Produit
avant même de disposer d'un identifiant Article. Le Workspace disposant
de `supplier:article:manage`, `supplier:catalog:import`, de la capability
`supplier_catalog_import` et d'un accès écriture dispose désormais de
**deux lectures contextuelles de pré-création** :

- `GET /api/workspaces/:workspaceId/supplier-articles/product-contributions/metadata`
- `GET /api/workspaces/:workspaceId/supplier-articles/product-contributions/search`

Ces routes réutilisent la métadonnée et la recherche M-002 avec les
contraintes de visibilité des Références (APPROVED globales ou PROVISIONAL
du Workspace auteur). Elles n'ouvrent pas la capability générale
`product_reference_access` et ne changent aucun endpoint M-002.
Les routes de contribution après création d'un Article conservent
leur contrôle supplémentaire : Article privé, actif, et appartenant
au Workspace. Aucun POST de contribution n'est ajouté avant
l'existence de cet Article : création, déduplication gouvernée,
association et audit restent soumis aux contrôles M-002/M-003.

L'interface de création manuelle utilise les nouvelles lectures uniquement
lorsque le contexte autorise la création de Référence ; dans les autres
cas, elle conserve le parcours et les permissions existants. Une erreur
de recherche ne vaut pas un résultat vide. La création contextuelle
n'est proposée qu'après une recherche réellement terminée.

Le drawer Article est fermé pendant le formulaire de contribution :
le scénario E2E doit retrouver puis rouvrir l'Article après association
pour vérifier les onglets et le formulaire d'édition. Il ne doit pas
présumer qu'un drawer antérieur reste affiché.
Tests HTTP (RBAC, capability, séparation des Workspaces), RTL et E2E
complétés. Résultats locaux / gates non encore vérifiés ; aucune PR.


## Correction de stabilité du choix de création — 22/10/2026

Une recherche contextuelle vide et effectivement réussie permet à l'utilisateur
de choisir « Créer cette Référence ». Ce choix est une **intention explicite** :
il mémorise le nom demandé indépendamment de la saisie sous-jacente de
l'autocomplétion et de son cycle de focus. Le formulaire affiche alors la
Référence en attente et une action « Modifier la recherche ». La recherche
est démontée tant que cette décision est active ; sa fermeture ne peut donc
annuler la décision ou changer le libellé « Créer l’Article et la Référence ».

Une annulation doit être **volontaire** : « Modifier la recherche » rouvre
la recherche, remet à zéro uniquement ce choix, et préserve les données
fournisseur déjà saisies. Le nom de contribution utilisé après création
de l'Article est la valeur **confirmée**, et non une valeur susceptible
d'être altérée par l'autocomplétion.

Le chemin de création reste : validation du Fournisseur et de la référence
commerciale, création d'Article privé sans Produit, contribution M-002
vérifiée contre les doublons, association M-003 soumise au RBAC et à
l'appartenance Workspace, sans publication globale immédiate.
Les contrôles de capability, visibilité et gouvernance sont inchangés.

Régression ajoutée : simulation d'un `onValueChange` tardif, persistance
du mode après saisie commerciale, annulation explicite, et parcours E2E
vérifiant la réponse HTTP de création avant l'ouverture du formulaire M-002.
**Tests locaux et gates non encore exécutés sur le commit de correction.**
