# D-025 — Centre d’aide sécurisé Workspace / Platform

**Statut :** VALIDÉ — 2026-09-16  
**Périmètre :** Core frontend + backend d’exposition de l’aide + sécurité RBAC/contextuelle + extensibilité des SaaS dérivés  
**Blocage Core 1.0 :** levé pour D-025  
**Dépendances :** Design System D-011 validé, RBAC Workspace/Platform existant, contextes Workspace/Platform existants

---

## 1. Objectif atteint

Le Core fournit désormais une aide fonctionnelle structurée, recherchable, contextualisée et sécurisée, distincte de la documentation technique interne.

Deux centres fonctionnels existent :

```text
contexte Workspace
→ Centre d’aide Workspace

contexte Platform
→ Centre d’aide Platform
```

Ils reposent sur une infrastructure technique commune afin d’éviter toute duplication de logique.

---

## 2. Architecture backend validée

Le corpus d’aide est versionné avec le Core et composé explicitement :

```text
registre Core
+
APPLICATION_HELP_MODULES
→ registre d’aide de l’application
```

Le registre applique une validation stricte des catégories, identifiants, permissions, features et relations entre fiches.

Le backend expose les catalogues et fiches autorisés via :

```text
GET /api/workspaces/:workspaceId/help
GET /api/workspaces/:workspaceId/help/:entryId
GET /api/platform/help
GET /api/platform/help/:entryId
```

### Invariant de sécurité

La projection est effectuée **côté serveur avant sérialisation**.

```text
authentification
+
contexte réel
+
autorisations effectives
→ corpus d’aide exposé
```

Workspace : le filtrage tient compte des permissions effectives, des contraintes owner, des features/entitlements et du mode d’accès/remédiation.

Platform : le filtrage réutilise l’autorisation Platform réelle et ne crée pas une seconde source de vérité RBAC.

Une fiche inexistante et une fiche non autorisée produisent le même comportement générique attendu afin de limiter la divulgation de l’existence d’une procédure protégée.

Les relations `Voir aussi` sont elles-mêmes filtrées sur le corpus réellement visible.

---

## 3. Architecture frontend validée

Le frontend utilise RTK Query pour l’état serveur et une recherche locale uniquement sur le catalogue déjà autorisé.

Principales briques :

```text
components/ui/autocomplete.jsx
→ primitive Base UI réutilisable

features/help/api
→ RTK Query

features/help/lib/help-search.js
→ classement local des entrées autorisées

features/help/components
→ centre, recherche, fiche, drawer et lien d’accès
```

Les routes d’aide Core sont composées avec les routes d’application afin de conserver le même principe d’extensibilité que les autres modules du Core.

Aucun slice Redux dédié n’est nécessaire :

```text
état serveur → RTK Query
recherche / catégorie active → useState local
```

---

## 4. UX validée

### Centres et catégories

Le corpus Core fournit 4 catégories Workspace et 5 catégories Platform.

**Évolution post-validation — 2026-09-30 :** le registre autorise désormais
jusqu’à 10 catégories par contexte pour laisser une capacité explicite aux
SaaS dérivés. La liste des catégories est déjà scrollable horizontalement côté
frontend ; cette extension ne modifie donc pas le principe UX du centre d’aide.

Les modules dérivés restent composés via `APPLICATION_HELP_MODULES`. Une fiche
Platform peut en plus déclarer des `applicationGlobalPermissions`, résolues
séparément des permissions Platform.

Les descriptions d’orientation ne sont pas répétées visuellement : elles sont disponibles via des `InfoTooltip` accessibles et explicitement nommés.

### Recherche prédictive

La recherche propose jusqu’à 5 suggestions classées à partir du corpus autorisé.

Elle exploite notamment titre, questions prédéfinies et mots-clés. La navigation clavier et la sélection souris sont prises en charge par la composition Base UI.

Pendant l’ouverture des suggestions, un spotlight visuel atténue le catalogue derrière sans ajouter une seconde modale applicative.

### Fiches d’aide

Une fiche s’ouvre dans un drawer contextuel à droite tout en conservant le centre d’aide derrière et l’URL profonde correspondante.

Le drawer se ferme par :

```text
croix explicite
clic sur le backdrop
touche Escape
```

Les liens associés permettent de naviguer entre fiches sans abandonner le contexte du centre d’aide.

### Accès depuis les shells

Le centre d’aide est accessible depuis les topbars Workspace et Platform, du côté des actions d’identité utilisateur.

Dans le même travail de cohérence du shell, le contrôle de préférences d’affichage Dashboard reste accessible sur toutes les routes du contexte Workspace ou Platform courant, et non uniquement sur la page Dashboard elle-même.

Le drawer partagé `EntityDetailsDrawer` conserve une ouverture et une fermeture animées cohérentes, avec respect de `prefers-reduced-motion`.

---

## 5. Modèle de fiche

Le format fonctionnel reste cohérent :

```text
Titre
Résumé / objectif
Qui peut réaliser cette action ?
Prérequis
Procédure
Résultat attendu / ce qui se passe ensuite
Cas particuliers / erreurs fréquentes
Conséquences sensibles ou irréversibles lorsque pertinent
Voir aussi
```

Les procédures décrivent uniquement les parcours réellement disponibles dans le Core courant.

---

## 6. Extensibilité

Un SaaS dérivé peut ajouter ses propres catégories/fiches par composition explicite sans modifier le corpus Core.

D-017 a validé ce contrat avec le module métier réel `catalog`, dont les fiches d’aide sont composées via le point d’extension puis conservées après upgrade du Core.

---

## 7. Éléments volontairement hors D-025

D-025 n’introduit pas :

```text
CMS d’aide
collection MongoDB éditable librement
éditeur WYSIWYG
base vectorielle
RAG
LLM / chatbot obligatoire
```

Un futur assistant conversationnel devra, s’il est ajouté, interroger uniquement le corpus autorisé et ne deviendra jamais une autorité de permission.

---

## 8. Validation de clôture

Les validations applicables réalisées pendant le lot ont couvert notamment :

- registre et validation stricte du corpus ;
- projection Workspace / Platform ;
- permissions et non-divulgation des fiches non autorisées ;
- mode remédiation Workspace ;
- routes catalogue / détail ;
- recherche et classement frontend ;
- navigation clavier ;
- deep links et drawer ;
- tooltips et accessibilité ;
- non-régression des shells ;
- persistance d’accès au contrôle de préférences ;
- cycle d’animation/focus du drawer partagé.

Les tests applicables, lint, build et validations fonctionnelles/visuelles ont été exécutés localement et confirmés verts le 2026-09-16.

La couverture E2E de release du centre d’aide reste volontairement portée par D-016.

**Critère de clôture atteint.**
