# SAAS-CORE-API — Guidelines frontend canoniques

**Statut :** référence pratique de développement frontend  
**Dernière mise à jour :** 2026-09-05  
**Périmètre :** frontend du Core et futurs SaaS dérivés

## 1. Rôle du document

Ce document définit **comment développer une interface frontend dans le projet**.

Il complète :

```text
docs/architecture/FRONTEND.md
→ décrit la structure et les responsabilités architecturales

docs/frontend/FRONTEND-GUIDELINES.md
→ décrit les règles pratiques de développement UI/UX
```

Il ne redéfinit ni les contrats HTTP de `docs/contracts/`, ni les barrières de sécurité de `docs/security/SECURITY.md`.

En cas de contradiction, le code et les tests actuels restent prioritaires conformément à `docs/README.md`.

---

## 2. Principe directeur

Le frontend doit rester :

- réutilisable ;
- lisible ;
- professionnel ;
- accessible ;
- responsive ;
- aligné sur les contrats backend ;
- extensible par les futurs modules métier ;
- maintenable lors des futures mises à niveau du Core.

La règle principale est :

```text
même intention UI
→ même famille de composants
→ composition/configuration
→ pas de duplication locale
```

Une différence purement visuelle ne justifie pas la création d'un nouveau composant métier.

---

## 3. Hiérarchie des composants

La hiérarchie de référence est :

```text
components/ui/
→ primitives shadcn/ui et primitives de design de base

components/shared/
→ assemblages transverses réutilisables

components/forms/
→ composants de formulaires réutilisables

components/data-display/
→ tableaux, pagination, cartes de métriques et affichage de données

features/<feature>/components/
→ composants propres à une fonctionnalité

features/<feature>/pages/
→ assemblage de la page et orchestration légère
```

Analogie :

```text
components/ui
→ briques Lego

components/shared
→ assemblages réutilisables dans plusieurs pièces

features/<feature>/components
→ éléments spécifiques à une pièce
```

Une primitive transverse ne doit pas importer un module métier concret.

Une feature peut dépendre des composants partagés ; l'inverse est interdit.

---

## 4. Contrôle obligatoire avant de créer un composant

Avant de créer un composant, vérifier dans cet ordre :

1. une primitive existe-t-elle déjà dans `components/ui` ?
2. un composant équivalent existe-t-il dans `components/shared`, `forms` ou `data-display` ?
3. un composant de feature existant peut-il être généralisé proprement ?
4. la différence demandée est-elle réellement fonctionnelle ?
5. la composition suffit-elle sans produire un composant universel sur-paramétré ?

La bonne cible se situe entre deux extrêmes :

```text
duplication massive ❌

composant universel avec des dizaines de props et branches métier ❌

composition de primitives stables ✅
```

Une duplication UI évitable constitue une dette de maintenance.

---

## 5. DataTable — règle obligatoire

La primitive de tableau commune est :

```text
frontend/src/components/data-display/data-table.jsx
```

Une feature ne recrée pas localement :

```text
<table>
<thead>
<tbody>
<tr>
<th>
<td>
```

lorsque son besoin est compatible avec `DataTable`.

La feature fournit uniquement :

- ses données ;
- ses colonnes ;
- la clé des lignes ;
- le rendu métier des cellules ;
- ses actions autorisées ;
- ses états loading/empty/error ;
- sa pagination et ses filtres.

`DataTable` reste responsable de la structure générique, de la sémantique de table et de la densité commune.

`DataTableActions` doit être réutilisé lorsque plusieurs actions de ligne doivent être groupées.

Les espacements communs restent centralisés dans `data-table-styles.js` et ne doivent pas être recopiés dans chaque feature.

### Pagination

Une liste professionnelle non trivialement bornée utilise par défaut :

```text
pagination serveur
+ recherche serveur si nécessaire
+ filtres serveur
+ tri serveur lorsque prévu
+ RTK Query
```

Les paramètres de pagination, recherche, tri ou filtre doivent être portés par l'URL lorsqu'ils sont destinés à survivre au refresh, à être partageables ou à participer à l'historique de navigation.

### Actions de ligne

Une action n'est affichée que si :

1. l'opération backend existe ;
2. l'utilisateur possède le droit connu nécessaire ;
3. la capability/entitlement nécessaire est disponible si applicable ;
4. l'état courant de la ressource rend l'action pertinente.

Une table informative ne possède pas artificiellement une colonne d'actions vide.

### Exception

Une autre primitive de tableau n'est acceptable que si le besoin est structurellement différent, par exemple une grille massivement virtualisée.

Dans ce cas, étudier d'abord l'évolution de `DataTable`. Une duplication locale reste interdite.

---

## 6. Drawers, dialogs et confirmations

Le choix de surface dépend de la tâche.

### Drawer / panneau latéral

Utiliser `EntityDetailsDrawer` ou une composition partagée équivalente lorsque l'utilisateur doit consulter ou éditer un contenu détaillé **sans perdre le contexte de la liste**.

Cas typiques :

- détails d'une entité ;
- permissions d'un rôle ;
- historique ;
- configuration multi-sections courte à moyenne ;
- informations nécessitant plus de place qu'une modale simple.

Le composant partagé porte la mécanique transverse : ouverture/fermeture, transition, Escape, focus, structure accessible et scroll. La feature fournit le contenu métier.

### Dialog / modale courte

Une modale est réservée à :

- confirmation ;
- formulaire court ;
- choix indépendant et limité.

Une interaction longue ou multi-sections doit être reconsidérée au profit d'un drawer, d'une page ou d'un parcours dédié.

### Confirmation

Les opérations destructrices ou à impact important utilisent `ConfirmationDialog` lorsque son contrat convient.

La confirmation doit présenter :

```text
titre explicite
conséquence réelle
Annuler
action nommée précisément
```

Éviter les boutons vagues `Oui` / `Non`.

Une confirmation renforcée n'est utilisée que pour une opération réellement critique ou irréversible.

---

## 7. Formulaires

Stack actuelle :

```text
React Hook Form
+ Zod frontend
+ @hookform/resolvers
+ composants partagés
+ mutation RTK Query
```

Les valeurs d'un formulaire ne sont pas stockées dans Redux.

Les composants de formulaire existants doivent être réutilisés avant création d'une nouvelle variante. Le dépôt contient notamment des primitives partagées pour `FormField`, `PasswordField`, `DatePicker` et `DateTimePicker`.

### Validation

Le frontend valide pour améliorer l'UX ; le backend reste l'autorité de sécurité et de validation métier.

Les schémas frontend :

- reflètent uniquement les contraintes réellement exposées par le contrat ;
- ne sont pas importés directement depuis le backend ;
- doivent être revus lorsque le contrat observable change.

Une erreur de champ est affichée inline.

Une erreur backend non rattachable de manière fiable à un champ reste une erreur globale de formulaire. Le frontend ne devine pas la cause.

### Soumission

Pendant une mutation :

```text
bouton désactivé
+ feedback local
+ prévention double soumission
```

Après échec, conserver les données saisies lorsque cela est approprié.

Après succès, mettre réellement à jour la donnée affichée via RTK Query/cache ; un toast éventuel ne remplace jamais cette mise à jour.

---

## 8. State management

Chaque état appartient au niveau le plus naturel et le plus restreint capable de le gérer correctement.

Règle canonique :

```text
server state
→ RTK Query

navigation partageable
→ URL / React Router

form state
→ React Hook Form

local UI state
→ useState / useReducer

global client state
→ Redux Toolkit uniquement si réellement transverse

derived state
→ calculé depuis sa source

browser persistence
→ interdite par défaut
```

Une donnée serveur ne doit pas être copiée dans une slice Redux uniquement pour devenir globale.

Flux attendu :

```text
API
→ RTK Query
→ composants
```

et non :

```text
API
→ RTK Query
→ copie Redux
→ composants
```

### Nouvelle slice Redux

Une nouvelle slice doit justifier :

- pourquoi l'état appartient au client ;
- pourquoi plusieurs zones éloignées en ont besoin ;
- pourquoi il doit survivre au démontage d'un composant ;
- pourquoi RTK Query, l'URL, le formulaire ou l'état local ne suffisent pas.

### Persistance navigateur

`localStorage`, `sessionStorage` et IndexedDB ne sont pas utilisés par défaut.

Toute exception doit documenter la donnée, sa durée de vie, son nettoyage, son obsolescence et sa sensibilité.

Aucun secret ne peut y être stocké.

---

## 9. RTK Query et API

Les appels au backend passent par la couche API partagée.

Les composants et pages n'introduisent pas de `fetch()` dispersé pour des endpoints appartenant au backend principal.

Les features peuvent injecter leurs endpoints dans la base API commune, mais partagent :

- la même stratégie d'authentification ;
- la même reauth ;
- la même politique de cache ;
- les mêmes conventions d'erreurs.

Le `baseQueryWithReauth` existant reste la couche de renouvellement de session.

Un 401 récupérable par refresh reste transparent pour l'utilisateur. Un échec définitif termine la session et provoque le nettoyage de l'état d'authentification/cache selon le Core.

Ne pas introduire TanStack Query en parallèle de RTK Query sans décision d'architecture formelle.

---

## 10. Routing, contextes et navigation

Les quatre contextes restent distincts :

```text
Public / Auth
Account
Workspace
Platform
```

Le `workspaceId` de l'URL est la source de vérité du contexte Workspace navigué.

Les pages ne doivent pas conserver un workspace courant concurrent uniquement dans Redux.

Une nouvelle route doit identifier :

- son contexte ;
- son layout ;
- son guard UX ;
- son endpoint/donnée RTK Query ;
- sa permission ;
- sa capability éventuelle ;
- ses comportements 401/403/404 ;
- son chargement lazy lorsque pertinent.

Les guards frontend améliorent l'expérience mais ne constituent jamais une autorisation de sécurité.

---

## 11. Navigation conditionnelle : permission et capability

La navigation doit refléter le produit réellement disponible dans le Workspace.

Le Core possède déjà un registre de navigation composable :

```text
coreWorkspaceNavigation
↓
workspaceNavigation
↓
WorkspaceSidebar
```

Une application dérivée ajoute ses groupes métier au point de composition `app/`, sans modifier le composant Sidebar générique.

Une entrée peut déclarer :

```text
permission
feature
```

La sidebar filtre alors les entrées non accessibles et supprime les groupes devenus vides.

### Règle UX

Une capability complètement absente et sans intérêt informationnel pour l'utilisateur ne doit pas polluer la navigation ou le dashboard avec des blocs permanents `Indisponible`.

Préférer le masquage lorsqu'aucune action utile n'est possible.

Une surface peut toutefois rester visible si elle possède un usage légitime indépendant de la capability d'écriture.

Exemple important :

```text
file_upload
→ contrôle l'action de téléversement

file_read
→ peut continuer à justifier une surface de consultation de fichiers existants
```

Il ne faut donc pas confondre :

```text
feature d'action absente
≠
surface entière nécessairement interdite
```

La décision doit suivre le contrat backend et la valeur UX réelle.

---

## 12. Onboarding et progressive disclosure

L'onboarding Core reste minimal.

Après authentification :

```text
invitation pertinente
→ priorité au workflow d'invitation

workspace existant
→ accès au contexte existant

aucun workspace
→ création du workspace
→ baseline disponible
→ comparaison commerciale facultative
```

Le trial n'est jamais démarré automatiquement par le frontend.

Le frontend ne crée pas de tunnel commercial bloquant lorsque le Core permet l'accès baseline.

Ne pas créer de flag `onboardingCompleted` si l'état est déjà dérivable de la réalité serveur.

La complexité fonctionnelle doit apparaître progressivement, au moment où elle devient utile.

---

## 13. Subscription et surfaces commerciales

La Subscription appartient au Workspace, pas au profil utilisateur.

```text
Account
→ profil, sécurité, apparence, sessions

Workspace
→ plan, subscription, trial, entitlement, limites, usages
```

La page Subscription consomme le DTO backend ; elle ne reconstruit pas les règles commerciales.

Le frontend ne doit jamais inventer :

- fonctionnalités ;
- limites ;
- prix ;
- durée de trial ;
- date d'effet ;
- droit d'upgrade/downgrade.

Le Dashboard peut informer ; la page Subscription administre.

Une barre de progression de trial n'est affichée que si les données serveur permettent réellement de la calculer.

---

## 14. Feedback, erreurs et toasts

Règle de proximité :

```text
erreur de champ
→ inline

erreur de formulaire
→ dans le formulaire

erreur de chargement local
→ état local

succès de mutation
→ UI mise à jour + toast si utile

action destructive
→ confirmation
```

Une infrastructure de toast unique est utilisée. Une feature ne crée pas son propre système de notifications.

Variantes de référence :

```text
success
info
warning
error
```

Ne pas utiliser de toast pour :

- navigation ;
- pagination ;
- filtre ;
- ouverture/fermeture d'un drawer ;
- simple lecture/refetch ;
- chaque micro-interaction.

Une même erreur ne doit pas être dupliquée à la fois inline et en toast sans justification UX réelle.

### Erreurs HTTP

```text
401 récupérable
→ refresh silencieux

401 définitif
→ fin de session / login

403
→ feedback contextualisé ou Forbidden

404
→ NotFound / ressource indisponible sans inventer un diagnostic de permission

500
→ message générique

erreur réseau
→ message réseau + retry lorsque pertinent
```

Les composants n'interprètent pas les erreurs métier en comparant librement le texte exact des messages backend.

---

## 15. UX professionnelle

L'utilisateur cible peut être un professionnel métier non technique.

L'interface doit être :

- claire ;
- directe ;
- sobre ;
- actionnable ;
- sans jargon technique inutile ;
- sans surcharge de cartes ou d'états indisponibles décoratifs.

Les messages contextuels ne sont affichés que si les données nécessaires sont fiables.

Le frontend ne doit jamais inventer une dernière connexion, un KPI, une tendance, un quota ou un état commercial non fourni par le backend.

### Empty states

Distinguer :

```text
aucune donnée créée
aucun résultat de filtre
absence de permission
feature absente
erreur de chargement
```

Lorsque pertinent, proposer un CTA uniquement s'il est réellement disponible.

---

## 16. Design system

La palette de référence reste :

```text
primary    #137C8B
secondary  #709CA7
muted      #B8CBD0
accent     #7A90A4
brand-dark #344D59
```

Les composants métier utilisent les **tokens sémantiques**, pas des valeurs hexadécimales dispersées.

Les états fonctionnels (`success`, `warning`, `info`, `destructive`, etc.) restent distincts de la marque.

Le dark mode reste obligatoire et utilise la même couche de tokens avec des valeurs adaptées.

Police principale : `Inter`.

Une feature ne doit pas créer localement une nouvelle convention de spacing, radius, couleur ou typographie lorsque le design system existant suffit.

---

## 17. Accessibilité

L'accessibilité fait partie du contrat du composant, elle n'est pas ajoutée après coup.

À vérifier selon la surface :

- labels accessibles ;
- navigation clavier ;
- focus visible ;
- focus restauré après fermeture d'un dialogue/drawer ;
- `Escape` lorsque pertinent ;
- piège de focus pour une vraie modale bloquante ;
- `aria-live` / `role="alert"` pour feedback dynamique approprié ;
- icône seule avec nom accessible ;
- état non communiqué uniquement par couleur ;
- animations compatibles `prefers-reduced-motion` lorsque nécessaire.

Les composants partagés doivent centraliser ces mécaniques afin que les features n'aient pas à les réimplémenter.

---

## 18. Responsive

Le responsive se définit par comportement, pas par simple réduction de taille.

Exemples :

```text
DataTable
→ table complète / colonnes priorisées / scroll ou représentation adaptée

Drawer
→ panneau latéral desktop / surface plus large mobile

Sidebar
→ navigation adaptée au viewport
```

Une adaptation responsive ne doit pas supprimer une action essentielle sans alternative accessible.

Les conventions responsives doivent autant que possible vivre dans les composants partagés plutôt que dans chaque feature.

---

## 19. Performance et chargement

Trois problèmes sont distingués :

```text
code à charger
→ lazy loading / code splitting

données volumineuses
→ pagination/recherche/filtres serveur

DOM trop volumineux
→ virtualisation seulement si besoin mesuré
```

Le route-level lazy loading est la stratégie actuelle pour les routes importantes.

Les temps d'attente utilisent la bonne surface :

```text
route
→ PageLoader

structure connue en attente de données
→ Skeleton

mutation locale
→ feedback local
```

Ne pas ajouter de virtualisation, memoization complexe, prefetch agressif ou splitting très fin sans besoin réel ou mesure démontrée.

Lors d'un refetch, conserver les données déjà visibles lorsqu'elles restent exploitables plutôt que provoquer un écran vide inutile.

---

## 20. Pages et logique métier

Une page assemble des composants et orchestre le contexte de route.

Elle ne doit pas devenir un fichier monolithique contenant simultanément :

- logique métier importante ;
- accès API brut ;
- validation métier ;
- structure de tableau répétée ;
- modale complète ;
- règles de permissions dispersées ;
- helpers réutilisables.

La logique métier lourde reste backend.

La logique frontend réutilisable est déplacée au niveau approprié : hook, helper, composant partagé ou composant de feature.

---

## 21. Tests frontend

Toute modification frontend doit choisir les tests selon le risque.

### Unitaires / composants

Vitest + React Testing Library + user-event restent la base installée.

Tester prioritairement les comportements observables :

- rendu conditionnel ;
- permissions/features ;
- formulaires ;
- validations ;
- interactions ;
- loading/error/empty ;
- drawer/dialog ;
- navigation ;
- mutations et feedbacks.

Privilégier les sélecteurs accessibles plutôt que les détails d'implémentation.

### Intégration frontend

Les parcours impliquant plusieurs features ou la coordination router/store/RTK Query doivent recevoir des tests d'intégration lorsque le risque le justifie.

Organisation recommandée :

```text
tests unitaires/composants
→ colocés avec le code

cross-feature integration
→ frontend/tests/integration/
```

### E2E

Playwright reste la cible retenue pour les parcours E2E, mais n'est pas encore une dépendance installée dans le `package.json` frontend au 2026-09-05.

Les parcours critiques à couvrir lors de la finalisation incluront notamment :

- authentification/session ;
- onboarding Workspace ;
- navigation multi-tenant ;
- permissions ;
- subscription/trial ;
- opérations sensibles ;
- principales capabilities du produit dérivé.

Un test E2E ne remplace pas les tests unitaires et d'intégration ciblés.

---

## 22. Checklist de revue d'une nouvelle feature

Avant de considérer une feature frontend terminée, vérifier :

```text
ARCHITECTURE
- feature au bon emplacement ?
- page légère ?
- dépendances Core → métier évitées ?

RÉUTILISABILITÉ
- primitive existante réutilisée ?
- DataTable utilisé si tableau ?
- drawer/dialog/confirmation partagé utilisé si pertinent ?
- composant dupliqué évité ?

STATE
- donnée serveur dans RTK Query ?
- état local resté local ?
- URL utilisée pour l'état navigable ?
- Redux justifié ?

API / CONTRAT
- endpoint réel ?
- schéma frontend aligné ?
- aucune règle backend inventée côté client ?

DROITS / ENTITLEMENT
- permission connue ?
- feature effective connue ?
- navigation/action filtrée correctement ?
- backend reste l'autorité ?

UX
- loading ?
- empty ?
- error ?
- success ?
- confirmation si nécessaire ?
- pas de bruit visuel inutile ?

ACCESSIBILITÉ
- clavier ?
- focus ?
- labels ?
- contrastes/états non couleur seule ?

RESPONSIVE
- desktop ?
- tablette/mobile ?
- actions essentielles conservées ?

TESTS
- tests composants ?
- intégration si nécessaire ?
- scénario manuel critique ?
```

---

## 23. Règle pour les futurs SaaS dérivés

Un module métier dérivé doit **composer** le frontend du Core plutôt que le recopier.

Exemple :

```text
module formation
├── déclare ses routes
├── déclare ses entrées de navigation
├── utilise les composants partagés
├── utilise RTK Query
├── déclare ses capabilities côté logiciel
└── ajoute ses composants métier dans features/formation/
```

Il ne doit pas créer un deuxième design system, une deuxième DataTable, une deuxième stratégie de toast, un deuxième cache serveur ou une deuxième architecture de navigation.

Cette discipline est une condition directe de la future maintenabilité du Core et de la possibilité d'appliquer ses mises à jour aux applications dérivées.


---

## Primitives de choix segmenté et actions warning

Le Design System Core expose désormais :

```text
components/ui/toggle-group.jsx
components/ui/segmented-control.jsx
```

`ToggleGroup` est la primitive Base UI générique. `SegmentedControl` est
l'abstraction recommandée lorsqu'une feature doit proposer un choix exclusif
compact parmi un petit nombre d'options.

Règles :

- le composant reste métier-agnostique ;
- les valeurs et libellés sont fournis par la feature consommatrice ;
- une valeur contrôlée active ne peut pas être désélectionnée en cliquant à
  nouveau dessus ;
- la navigation clavier et l'état `aria-pressed` proviennent de Base UI ;
- les styles utilisent uniquement les tokens sémantiques du Design System ;
- `Button variant="warning"` est réservé aux actions d'attention
  non destructives, distinctes de `destructive`.

Ces primitives doivent être réutilisées par les SaaS dérivés plutôt que
recopiées localement.
