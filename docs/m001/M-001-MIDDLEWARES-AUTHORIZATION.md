# M-001 — Contrat middlewares, autorisation et frontière service

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21  
**Périmètre :** ordre des protections HTTP M-001, scope Dossier et séparation middleware/controller/service

> Ce document complète `docs/m001/M-001-API-REST.md`. Il fixe la façon dont le contrat de sécurité validé est appliqué sans créer un second système RBAC parallèle au Core.

---

## 1. Principes

M-001 réutilise les primitives Core existantes :

```text
authenticate
validateRequest
loadWorkspaceContext
authorizePermission
enforceWorkspaceAccessMode
```

Le produit ajoute uniquement les contrôles métier nécessaires au périmètre Dossier.

Invariant :

```text
Workspace
→ frontière de tenancy

Role / permission
→ QUOI l'acteur peut faire

DossierAccessGrant
→ OÙ un non-owner peut le faire

statut Dossier
→ SI l'action est compatible avec l'état courant
```

Aucun middleware produit ne doit réimplémenter `authorizePermission`.

---

## 2. Ordre général retenu

Pour une route portant `:dossierId` :

```text
authenticate
→ validateRequest
→ loadWorkspaceContext
→ authorizePermission
→ enforceWorkspaceAccessMode        [mutations uniquement lorsque requis par le Core]
→ capability éventuelle             [uniquement si une capability M-001 est réellement définie]
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy          [si l'endpoint a une compatibilité d'état statique]
→ controller
→ service métier
```

M-001 ne définit actuellement aucune capability commerciale spécifique au Dossier. Le slot est conservé architecturalement mais aucun `enforcePlanFeature` ne doit être ajouté sans contrat commercial validé.

L'ordre réel des routes Core v1.1.0 sert de référence lorsque la documentation générique et le code divergent.

---

## 3. loadAuthorizedDossierContext

### 3.1 Objectif

Le produit doit centraliser dans une seule primitive la résolution tenant-safe du Dossier et le contrôle du périmètre Dossier de l'acteur.

Préconditions :

- utilisateur authentifié ;
- `workspaceId` validé ;
- `req.workspace`, `req.membership`, `req.role` et `req.permissions` fiabilisés par le Core ;
- `dossierId` validé.

### 3.2 Résolution

Le Dossier est recherché avec une contrainte tenant explicite :

```text
_id = dossierId
AND
workspace = req.workspace._id
```

Puis :

```text
Workspace Owner
→ périmètre implicite sur tous les Dossiers de CE Workspace
→ aucun grant requis

non-owner
→ DossierAccessGrant ACTIVE requis
→ workspace = Workspace courant
→ dossier = Dossier courant
→ workspaceMember = membership courant
```

L'Owner est identifié par le rôle Workspace système fiable, pas par `createdBy` ni par un PlatformRole.

### 3.3 Anti-énumération

Les cas suivants appartiennent à la même famille de réponse `404` :

```text
Dossier inexistant
OU Dossier d'un autre Workspace
OU Dossier hors périmètre du non-owner
```

Le middleware ne doit pas révéler lequel de ces cas s'est produit.

### 3.4 Responsabilités exclues

`loadAuthorizedDossierContext` :

- ne remplace pas `authorizePermission` ;
- ne décide pas des transitions lifecycle ;
- ne crée ni ne révoque de grant ;
- n'ouvre pas de transaction métier ;
- n'écrit pas l'audit métier ;
- ne prend aucune décision commerciale de capability.

Il prépare un contexte fiable, par exemple `req.dossier`, pour les couches suivantes.

---

## 4. enforceDossierStatePolicy

Cette primitive vérifie uniquement la compatibilité **statique de l'état courant** avec la famille d'endpoint.

Exemples :

```text
PATCH informations
→ ACTIVE / PAUSED

PUT/DELETE grant
→ ACTIVE / PAUSED

GET grants
→ ACTIVE / PAUSED / ARCHIVED
→ DELETED seulement avec autorité lifecycle adaptée
```

Elle ne décide jamais si une transition `source → cible` est légale.

La transition lifecycle reste une responsabilité de service.

---

## 5. Ordre par endpoint

### 5.1 GET /dossiers/metadata

```text
authenticate
→ validateRequest(params)
→ loadWorkspaceContext
→ authorizePermission(dossier:read)
→ controller
→ dossierMetadataService.get
```

Cette route ne charge aucun Dossier individuel et n'utilise aucun `DossierAccessGrant`.

Les valeurs exposées sont dérivées des registries/constants backend ; le frontend ne maintient aucune liste statique de statuts.

### 5.2 GET /dossiers

```text
authenticate
→ validateRequest(params + query)
→ loadWorkspaceContext
→ authorizePermission(dossier:read)
→ contrôle lifecycle supplémentaire si status=DELETED
→ controller
→ dossierService.listDossiers
```

Le filtrage de scope est porté par la requête de données :

```text
Owner
→ workspace + filtres

non-owner
→ workspace
∩ grants ACTIVE du membership
∩ filtres
```

Interdit :

```text
charger tous les Dossiers du Workspace
→ filtrer ensuite en JavaScript
```

### 5.3 POST /dossiers

```text
authenticate
→ validateRequest(params + body)
→ loadWorkspaceContext
→ authorizePermission(dossier:create)
→ enforceWorkspaceAccessMode
→ capability éventuelle si définie
→ controller
→ dossierService.create
```

Le service porte la transaction :

```text
Owner
→ création Dossier ACTIVE

non-owner autorisé
→ création Dossier ACTIVE
+ création grant ACTIVE du créateur
→ atomique
```

### 5.4 GET /dossiers/:dossierId

```text
authenticate
→ validateRequest(params)
→ loadWorkspaceContext
→ authorizePermission(dossier:read)
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy(READ)
→ controller
```

Compatibilité :

- ACTIVE : oui ;
- PAUSED : oui ;
- ARCHIVED : lecture historique contrôlée ;
- DELETED : autorité lifecycle supplémentaire.

### 5.5 PATCH /dossiers/:dossierId

```text
authenticate
→ validateRequest(params + body)
→ loadWorkspaceContext
→ authorizePermission(dossier:update)
→ enforceWorkspaceAccessMode
→ capability éventuelle si définie
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy(UPDATE)
→ controller
→ dossierService.update
```

Le middleware vérifie l'état observé, mais le service répète les contraintes critiques dans la requête d'écriture afin de rester sûr face aux courses :

```text
_id
+ workspace
+ status compatible
```

### 5.6 PATCH /dossiers/:dossierId/status

```text
authenticate
→ validateRequest(params + body)
→ loadWorkspaceContext
→ authorizePermission(dossier:lifecycle:update)
→ enforceWorkspaceAccessMode
→ capability éventuelle si définie
→ loadAuthorizedDossierContext
→ controller
→ dossierService.transitionDossierStatus
```

Il n'y a pas de middleware décidant la légalité `source → cible`.

Le service lifecycle reste l'autorité sur :

- état courant ;
- état demandé ;
- acteur ;
- invariants ;
- idempotence ;
- raison éventuelle ;
- effets sur les grants ;
- audit ;
- transaction ;
- restauration ;
- `409 Conflict`.

### 5.7 GET /access-grants

```text
authenticate
→ validateRequest(params + query)
→ loadWorkspaceContext
→ authorizePermission(dossier:access:read)
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy(GRANT_READ)
→ controller
→ dossierAccessService.list
```

Le service filtre toujours par Workspace et Dossier.

Le Workspace Owner n'est pas représenté par un grant.

### 5.8 PUT /access-grants/:membershipId

```text
authenticate
→ validateRequest(params)
→ loadWorkspaceContext
→ authorizePermission(dossier:access:manage)
→ enforceWorkspaceAccessMode
→ capability éventuelle si définie
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy(GRANT_MANAGE)
→ controller
→ dossierAccessService.grantAccess
```

La membership cible n'est pas chargée dans un middleware de sécurité générique.

Le service transactionnel vérifie :

- membership cible du même Workspace ;
- membership cible ACTIVE ;
- cible non Owner ;
- grant ACTIVE existant ou non ;
- historique REVOKED préservé ;
- création d'un nouveau grant après révocation ;
- idempotence et course concurrente ;
- audit.

### 5.9 DELETE /access-grants/:membershipId

Même chaîne que le PUT jusqu'au service :

```text
authenticate
→ validateRequest(params)
→ loadWorkspaceContext
→ authorizePermission(dossier:access:manage)
→ enforceWorkspaceAccessMode
→ capability éventuelle si définie
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy(GRANT_MANAGE)
→ controller
→ dossierAccessService.revokeAccess
```

Le service effectue une révocation logique :

```text
ACTIVE
→ REVOKED
→ revokedAt
→ revokedBy
```

Aucun effacement physique.

L'absence de grant ACTIVE reste idempotente et produit `204 No Content`.

---

## 6. Frontière middleware / controller / service

### Middleware

Responsabilités autorisées :

- authentification ;
- validation HTTP Zod ;
- construction du contexte Workspace Core ;
- RBAC Core ;
- blocage commercial Core applicable ;
- contrôle du scope Dossier ;
- compatibilité statique de l'état courant.

Le middleware peut lire la base pour construire le contexte d'autorisation.

Il ne doit pas :

- appliquer une règle métier complexe ;
- écrire une mutation métier ;
- gérer une transaction métier ;
- produire l'audit métier d'une action ;
- décider une transition lifecycle ;
- créer/révoquer un grant.

### Controller

Le controller :

- lit `req.validated` et les contextes préparés ;
- appelle le service ;
- sérialise la réponse HTTP.

Il ne contient pas de logique métier lourde.

### Service

Le service est l'autorité sur :

- transactions ;
- mutations ;
- invariants DB ;
- contrôles race-safe ;
- lifecycle ;
- idempotence métier ;
- création/révocation de grants ;
- membership cible ;
- audit métier ;
- effets de bord métier autorisés.

Même lorsqu'un middleware a déjà contrôlé le scope, toute requête d'écriture doit conserver explicitement la contrainte Workspace et les invariants nécessaires.

---

## 7. Structure applicative cible

Sans créer de code avant validation finale M-001, l'organisation visée reste :

```text
backend/modules/dossier/
├── dossier.routes.js
├── dossier.controller.js
├── dossier.service.js
├── dossier.model.js
├── dossier.validation.js
├── dossierAccess.middleware.js
└── dossierState.middleware.js
```

Le module sera monté via :

```text
backend/config/applicationRoutes.registry.js
```

sur :

```text
/api/workspaces/:workspaceId/dossiers
```

Le produit ne modifie pas directement `backend/app.js` pour une route métier ordinaire.

---

## 8. Invariants de sécurité

Les modules M-002 et suivants devront réutiliser cette frontière lorsqu'ils manipulent des données contextualisées par Dossier.

En particulier :

```text
cross-workspace
→ toujours refusé

grant REVOKED
→ jamais autorisant

activeDossierId frontend
→ jamais une preuve d'autorisation

PlatformRole
→ aucun accès implicite aux données métier Workspace

Dossier A et Dossier B
→ leurs prix / historiques locaux ne sont jamais mélangés
```

---

## 9. Prochaine étape

Le contrat middleware/service est fermé.

La prochaine étape M-001 est :

```text
validations Zod
→ contrats d'erreur
→ audit métier
```
