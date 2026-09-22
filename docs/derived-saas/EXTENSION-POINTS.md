# SAAS-CORE-API — Points d’extension des SaaS dérivés

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-10  
**Périmètre :** RBAC, capabilities, routing, navigation, widgets Dashboard et lifecycle transactionnel WorkspaceMember

---

## 1. Objectif

Un SaaS dérivé doit pouvoir ajouter un module métier sans modifier les longues listes centrales du Core.

Le contrat d’extension V1 reste volontairement explicite :

```text
module métier
→ fournit ses descriptors
→ l’application dérivée les compose dans les points prévus
→ le Core reste générique
```

Il n’existe pas de découverte automatique de modules, de système de plugins dynamique ou de chargement depuis `.env`.

Cette simplicité est intentionnelle : la composition reste lisible, déterministe, testable et compatible avec les futures mises à niveau du Core.

---

## 2. Frontière entre capability et permission

Ces deux notions ne sont jamais interchangeables.

```text
capability
→ la fonctionnalité existe-t-elle dans le logiciel et est-elle disponible commercialement ?

permission RBAC
→ ce membre du Workspace peut-il exécuter cette action ?
```

Exemple :

```text
price_history
→ capability commerciale

product:price:read
→ permission RBAC Workspace
```

Une route métier protégée peut donc devoir vérifier les deux couches : entitlement effectif puis permission utilisateur.

---

## 3. Point d’extension des capabilities

Fichier applicatif :

```text
backend/config/applicationCapability.registry.js
```

Collection de composition :

```text
APPLICATION_PLAN_CAPABILITY_MODULES
```

Un module métier peut déclarer :

```text
features
metrics
featureDefinitions
metricDefinitions
metricPresentations
featureMetrics
```

`featureMetrics` associe explicitement une feature aux métriques qui configurent son usage dans les surfaces data-driven.

Exemple conceptuel :

```js
{
    features: ['price_history'],
    metrics: ['price_history_entries_monthly'],
    featureDefinitions: {
        price_history: {
            label: 'Historique des prix',
            category: 'products',
            categoryLabel: 'Produits',
        },
    },
    metricDefinitions: {
        price_history_entries_monthly: {
            periodType: 'calendar_month',
            behavior: 'consumption',
            remediationRequired: false,
        },
    },
    metricPresentations: {
        price_history_entries_monthly: {
            label: 'Consultations mensuelles',
            category: 'products',
            categoryLabel: 'Produits',
            unit: 'count',
        },
    },
    featureMetrics: {
        price_history: ['price_history_entries_monthly'],
    },
}
```

La relation feature → métriques sert à la composition et à la présentation. Elle n’accorde aucun entitlement et ne remplace jamais les contrôles de quota.

L’endpoint Platform des capabilities expose les `metricKeys` associés à chaque définition de feature afin que l’interface n’ait pas à reconstruire cette relation avec des conditions React codées en dur.

---

## 4. Point d’extension RBAC Workspace

Fichier applicatif :

```text
backend/config/applicationRolePermission.registry.js
```

Collection de composition :

```text
APPLICATION_ROLE_PERMISSION_MODULES
```

Un descriptor RBAC métier peut déclarer :

```text
permissions
reservedPermissions
systemRolePermissions
```

Exemple conceptuel :

```js
{
    permissions: [
        'catalog:item:read',
        'catalog:item:update',
    ],
    systemRolePermissions: {
        owner: [
            'catalog:item:read',
            'catalog:item:update',
        ],
        admin: [
            'catalog:item:read',
            'catalog:item:update',
        ],
        member: [
            'catalog:item:read',
        ],
    },
}
```

Le Core conserve `CORE_PERMISSION` pour ses propres droits.

L’application dérivée ne modifie pas `permissions.constants.js` pour ajouter ses permissions métier.

`createSystemRoleDefinitions()` reçoit les extensions déclarées par le registre actif et enrichit les rôles système lors de leur création.

Les rôles personnalisés persistés dans un Workspace restent un sujet distinct : ils ne sont pas définis dans ce descriptor applicatif.

---

## 5. Point d’extension des routes backend

Fichier applicatif :

```text
backend/config/applicationRoutes.registry.js
```

Collection de composition :

```text
APPLICATION_BACKEND_ROUTE_MODULES
```

Descriptor :

```js
{
    key: 'catalog',
    mountPath: '/api/workspaces/:workspaceId/catalog',
    router: catalogRouter,
}
```

`backend/app.js` monte automatiquement cette collection avant le router Workspace générique.

Un module métier ordinaire ne doit donc plus ajouter directement son import et son `app.use()` dans `backend/app.js`.

Le descriptor ne remplace aucune protection de sécurité. Le router métier conserve la responsabilité d’ordonner explicitement :

```text
authenticate
→ validation des paramètres
→ contexte Workspace
→ entitlement si nécessaire
→ permission RBAC
→ validation Zod
→ controller
```

Les collisions de clé de module ou de chemin de montage sont refusées au démarrage.

---

## 6. Point d’extension des routes frontend

Fichier applicatif :

```text
frontend/src/app/application-routes.js
```

Collection de composition :

```text
APPLICATION_FRONTEND_ROUTE_MODULES
```

Quatre surfaces sont prévues :

```text
publicRoutes
authenticatedRoutes
workspaceRoutes
platformRoutes
```

Exemple conceptuel pour une route Workspace lazy :

```js
{
    workspaceRoutes: [
        {
            path: 'catalog',
            lazy: async () => {
                const { CatalogRoute } = await import(
                    '@/features/catalog/components/catalog-route'
                );
                return { Component: CatalogRoute };
            },
        },
    ],
}
```

`createAppRoutes()` compose ensuite ces routes avec les arbres Core existants.

Le module métier ne modifie pas la longue liste de `frontend/src/app/router.jsx` uniquement pour ajouter une route ordinaire.

Les guards Core restent les frontières de surface :

```text
authenticatedRoutes
→ sous AuthGuard

workspaceRoutes
→ sous WorkspaceGuard + WorkspaceLayout

platformRoutes
→ sous PlatformGuard + PlatformLayout
```

Une route métier peut ajouter un guard ou un composant de contrôle supplémentaire lorsqu’une capability ou permission spécifique est requise.

---

## 7. Point d’extension de la navigation Workspace

Fichier applicatif :

```text
frontend/src/app/workspace-navigation.js
```

Le Core fournit :

```text
coreWorkspaceNavigation
```

L’application dérivée compose les groupes de navigation de ses modules dans `workspaceNavigation`.

Le composant Sidebar reste générique et ne doit pas importer directement un module métier.

Les entrées sont filtrées selon les permissions et capabilities effectives lorsque le domaine le nécessite.

---

## 8. Point d’extension du Dashboard Workspace

D-011.C ajoute un point d’extension explicite pour les KPI, cartes et widgets métier affichés sur le Dashboard d’un Workspace.

Fichier applicatif :

```text
frontend/src/app/application-dashboard.js
```

Le Core fournit ses propres descriptors et compose explicitement les modules Dashboard applicatifs.

Principe :

```text
widgets Core
+
widgets des modules métier explicitement déclarés
→ registre Dashboard applicatif
```

Un descriptor de widget déclare notamment :

```text
id stable
label
description
component
slot
order
configurable
requiredFeatures
requiredPermissions
```

L’identifiant doit rester stable dans le temps. Il sert à persister la préférence utilisateur dans :

```text
User.preferences.dashboard.hiddenWidgetIds
```

### 8.1 Invariant d’autorisation

Le registre Dashboard ne constitue jamais une autorité de sécurité.

Ordre obligatoire :

```text
Plan / entitlement effectif
+
permissions utilisateur
→ widgets réellement accessibles

widgets réellement accessibles
+
préférences personnelles
→ widgets visibles
```

Conséquences :

- une préférence ne crée jamais une feature ;
- une préférence ne crée jamais une permission ;
- un widget non accessible n’est pas proposé dans le panneau de personnalisation ;
- un widget non accessible n’est généralement pas monté ;
- les endpoints backend restent responsables de leur propre sécurité ;
- les données sensibles ne doivent jamais être chargées sous prétexte qu’un widget est seulement caché visuellement.

### 8.2 Extension par un module métier

Exemple conceptuel :

```js
{
    id: 'catalog.price-alerts',
    label: 'Alertes prix',
    description: 'Nombre de produits nécessitant une vérification.',
    component: CatalogPriceAlertsWidget,
    slot: 'summary',
    order: 1000,
    configurable: true,
    requiredFeatures: ['price_history'],
    requiredPermissions: ['catalog:item:read'],
}
```

Le module métier fournit son descriptor et l’application dérivée l’ajoute à la collection de composition prévue. Le Core ne doit pas importer directement le module métier.

### 8.3 UX de personnalisation

La V1 validée prend en charge uniquement :

```text
afficher / masquer
```

Le switch produit un aperçu immédiat du Dashboard. La préférence n’est persistée qu’après `Enregistrer`. `Annuler` restaure l’état sauvegardé.

Les grilles de Dashboard doivent conserver un équilibre visuel lorsque des widgets sont retirés. La composition doit donc dépendre du nombre réel de cartes visibles et ne pas réserver artificiellement l’espace d’un widget masqué.

Le Core n’ajoute pas par anticipation :

```text
drag-and-drop arbitraire
réordonnancement utilisateur libre
resize
constructeur de Dashboard
styles personnalisables par widget
```

Ces capacités ne seront introduites que si une application dérivée démontre un besoin produit réel.

### 8.4 Widgets Core et widgets métier

Les widgets Workspace actuels du Core — par exemple statut du workspace, rôle, abonnement ou activité — servent principalement à fournir un Dashboard générique avant dérivation.

Ils ne constituent pas le modèle fonctionnel du futur Dashboard métier.

Dans un SaaS dérivé, les modules applicatifs sont destinés à déclarer les KPI et données opérationnelles pertinentes pour le métier via ce point d’extension.

Le Dashboard Platform est un cas distinct : il constitue déjà une surface métier d’administration de la plateforme. Sa projection d’autorisation reste définie côté backend ; la préférence personnelle ne peut que réduire cette projection.

---

## 9. Point d’extension du lifecycle transactionnel WorkspaceMember

Le Core expose un point de composition pour les relations métier qui dépendent
durablement d’un `WorkspaceMember` et doivent être invalidées lorsqu’il est
retiré définitivement du Workspace.

Fichier applicatif :

```text
backend/config/applicationWorkspaceMemberLifecycle.registry.js
```

Collections / runtime :

```text
APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_MODULES
ACTIVE_APPLICATION_WORKSPACE_MEMBER_LIFECYCLE_REGISTRY
runApplicationWorkspaceMemberRemovedLifecycle()
```

La V1 expose uniquement l’événement démontré :

```text
onMemberRemoved
```

Descriptor conceptuel :

```js
{
    key: 'dossier-access',
    onMemberRemoved: async ({
        workspaceId,
        membershipId,
        userId,
        actorId,
        session,
        ipAddress,
        userAgent,
    }) => {
        // Écritures MongoDB métier avec la session reçue.
    },
}
```

Le Core appelle ce lifecycle sur les transitions définitives vers
`WorkspaceMember.status = removed` actuellement réalisées par :

```text
retrait d’un membre du Workspace
fermeture du compte utilisateur
```

Le handler est exécuté après la mutation du membership dans la transaction,
mais avant la libération du quota membre et l’AuditLog Core de succès. Tous les
handlers sont attendus séquentiellement dans l’ordre de déclaration.

Invariant :

```text
handler métier échoue
→ erreur propagée
→ transaction MongoDB rollbackée
→ membership / relations métier / quota / audit restent cohérents
```

Le contrat est strictement transactionnel. Un handler doit donc être
déterministe et/ou idempotent face aux retries du callback transactionnel et ne
doit pas produire d’effet externe irréversible :

```text
pas d’email immédiat
pas d’appel API externe
pas de paiement
pas de webhook non idempotent
```

Les écritures MongoDB utilisant la `session` fournie sont le cas d’usage
attendu.

`SUSPENDED` ne déclenche pas `onMemberRemoved`. Une réactivation ultérieure
d’un membership historique `REMOVED` par le workflow d’invitation ne réactive
aucune relation métier dérivée : cette décision appartient explicitement au
produit.

---

## 10. Règle de composition d’un module métier

Un module métier complet peut donc fournir conceptuellement :

```text
backend/modules/catalog/
→ routes / controller / service / model / validation
→ catalog.permissions.js ou descriptor RBAC
→ catalog.capabilities.js

frontend/src/features/catalog/
→ api RTK Query
→ composants / pages
→ catalog.routes.js
→ catalog.navigation.js
→ catalog.dashboard.js
```

Puis l’application dérivée compose uniquement les descriptors dans :

```text
backend/config/applicationCapability.registry.js
backend/config/applicationRolePermission.registry.js
backend/config/applicationRoutes.registry.js
backend/config/applicationWorkspaceMemberLifecycle.registry.js
frontend/src/app/application-routes.js
frontend/src/app/workspace-navigation.js
frontend/src/app/application-dashboard.js
```

Ces fichiers `app/` et `config/` sont les points de jonction assumés entre le Core et le produit dérivé.

---

## 11. Ce que les points d’extension V1 ne mettent pas en place

Le Core n’introduit pas :

```text
plugins npm dynamiques
autodécouverte du filesystem
modules activables depuis .env
chargement de code depuis la base de données
création de permissions techniques depuis Platform
création de capabilities techniques depuis Platform
second router ou second design system
dashboard builder arbitraire
```

Ces mécanismes augmenteraient la complexité sans besoin démontré pour le Core V1.

---

## 12. Tests obligatoires d’un module dérivé

Un module métier qui utilise ces points d’extension doit au minimum tester :

```text
RBAC
→ permissions enregistrées
→ enrichissement des rôles système attendu
→ refus des permissions inconnues

capabilities
→ descriptor composé
→ feature/métriques présentes
→ relation feature → métriques valide
→ entitlement réellement contrôlé

backend routing
→ router monté sur le chemin attendu
→ authentification / Workspace / permission / validation réellement appliqués

frontend routing
→ route injectée dans la bonne surface
→ guard attendu conservé

navigation
→ entrée présente seulement lorsque l’utilisateur peut réellement l’utiliser

dashboard
→ widget composé dans le registre attendu
→ feature et permissions réellement filtrées
→ préférence appliquée seulement après le contrôle d’accès
→ identifiant stable
→ composant non autorisé non monté lorsque le contrat le prévoit

lifecycle WorkspaceMember
→ descriptor explicitement composé
→ même session MongoDB reçue
→ exécution déterministe
→ échec propagé pour rollback
→ aucune exécution sur SUSPENDED
→ aucune restauration automatique des relations métier après réinvitation
```

Les suites de tests du Core et du module métier restent complémentaires.

---

## 13. Validation des points d’extension

D-014 a été validée le 2026-09-05 après confirmation locale des suites ciblées, des suites globales et du build frontend.

D-011.C a été validée le 2026-09-10 après validation manuelle, tests ciblés et globaux, lint et build applicables.

Les tests démontrent que les points de composition permettent à un module métier de référence de :

- enregistrer ses permissions ;
- enrichir les rôles système selon une configuration explicite ;
- déclarer ses capabilities et métriques ;
- associer explicitement les métriques à leurs features lorsque nécessaire ;
- monter ses routes backend ;
- ajouter ses routes frontend ;
- composer sa navigation Workspace ;
- déclarer des widgets Dashboard filtrés par capability/permission puis par préférence personnelle ;
- exécuter ses tests ;

sans modifier les longues listes centrales du Core hors points de composition applicatifs explicitement prévus.

D-017 a validé la dérivation et l’upgrade sur un dépôt pilote réel sans remettre en cause les contrats D-014/D-011.C ; les points de composition applicatifs prévus ont permis de conserver le module métier `catalog`.

Le statut canonique des dettes est porté par `docs/DEBT.md`.

---

## 14. Fichiers de référence

```text
backend/config/applicationCapability.registry.js
backend/config/applicationRolePermission.registry.js
backend/config/applicationRoutes.registry.js
backend/config/applicationWorkspaceMemberLifecycle.registry.js
backend/modules/workspaceMember/workspaceMemberLifecycle.registry.js
backend/modules/plan/planCapability.registry.js
backend/modules/role/rolePermission.registry.js
backend/constants/role.constants.js
frontend/src/app/application-routes.js
frontend/src/app/router.jsx
frontend/src/app/workspace-navigation.js
frontend/src/app/application-dashboard.js
frontend/src/features/workspace/dashboard/core-dashboard-widgets.js
frontend/src/components/shared/dashboard-display-preferences.jsx
docs/contracts/CAPABILITIES.md
docs/derived-saas/DERIVED-SAAS.md
```

Toute modification de ces points de composition doit vérifier si le présent contrat doit être mis à jour.


---

## Application-global authorization

### Point de composition

    backend/config/applicationGlobalPermission.registry.js

Le Core laisse APPLICATION_GLOBAL_PERMISSION_MODULES vide.

Un module dérivé déclare des définitions contenant key, label, category, categoryLabel, description et reserved, puis les compose explicitement dans ce fichier.

### Règles

- aucune découverte automatique de modules ;
- aucune permission métier ajoutée aux constantes Core ;
- collision avec Workspace ou Platform refusée ;
- namespace platform: interdit ;
- permissions reserved réservées aux rôles système code-owned ;
- rôles et memberships persistés dans les modèles Core dédiés ;
- protection HTTP via authorizeApplicationGlobalPermission() après authenticate ;
- services de gouvernance Core réutilisés plutôt qu’un RBAC parallèle.

### Bootstrap

Le dérivé initialise ses rôles et son premier gouverneur avec :

    syncApplicationGlobalSystemRole()
    bootstrapApplicationGlobalMember()

Ces primitives sont destinées aux seeds ou migrations du produit et non à des endpoints publics.
