# SAAS-CORE-API — Contrat Core canonique

**Statut :** canonique — actif  
**Dernière mise à jour :** 2026-09-16  
**Périmètre :** frontière HTTP du Core, sécurité d’accès, multi-tenant, comptes, workspaces, membres, rôles, invitations, fichiers, audit, aide sécurisée et administration Platform  
**Sources d’autorité :** code et tests du dépôt `main`

---

## 1. Objet

Ce document est le contrat de référence du **Core générique** de `saas-core-api`.

Il remplace progressivement les anciens contrats frontend/backend dispersés. Tant que ces anciens fichiers n’ont pas été explicitement supprimés, ils restent des sources historiques de travail, mais **ils ne prévalent plus sur le présent contrat lorsqu’une règle y est consolidée et vérifiée contre le code courant**.

Le contrat s’appuie sur plusieurs documents canoniques complémentaires :

```text
CORE-CONTRACT.md
→ contrat transversal du Core et de ses frontières HTTP

COMMERCIAL.md
→ Plans, Subscription, Trial, entitlement, quotas et overrides

COMMERCIAL-INVITATIONS.md
→ invitations commerciales et offres privées D-020

CAPABILITIES.md
→ registre des capabilities et extension par les SaaS dérivés

PLATFORM-TEAM.md
→ équipe interne, rôles, permissions et invitations Platform

RETENTION.md
→ moteur générique de rétention / purge
```

Le présent document ne décrit pas les choix de design visuel ni les détails d’implémentation interne de chaque composant frontend.

---

## 2. Hiérarchie d’autorité

En cas de contradiction :

1. code courant et contraintes de base de données ;
2. tests automatisés validés ;
3. présent contrat et contrats canoniques spécialisés ;
4. architecture et sécurité canoniques ;
5. documentation historique ;
6. `REPRISE-CURRENT.md`.

Le frontend n’est jamais une source d’autorité pour l’authentification, l’autorisation, les droits commerciaux, les quotas, la validation finale ou la frontière multi-tenant.

---

## 3. Frontières du Core

Le Core fournit les mécanismes génériques suivants :

```text
User / Account
Auth / AuthSession
Workspace
WorkspaceMember
WorkspaceInvitation
Role / Permissions
Plan
Subscription / TrialEligibility
Entitlement / UsageMetric
EntitlementOverride
Files
AuditLog
Retention / Purge
Help Registry / Help Center
Platform Admin / Platform Team
Capability Registry
```

Les modules métier d’un SaaS dérivé consomment ces mécanismes mais ne doivent pas être importés par le Core.

Dépendance attendue :

```text
MODULE MÉTIER
     ↓
    CORE
```

et jamais :

```text
CORE
 ↓
MODULE MÉTIER
```

---

## 4. Conventions HTTP générales

### 4.1 Base API

Les routes applicatives sont exposées sous :

```text
/api
```

Préfixes principaux :

```text
/api/auth
/api/users
/api/plans
/api/workspaces
/api/invitations
/api/platform
/api/health
```

Les ressources tenant-scoped utilisent explicitement `workspaceId` dans leur chemin.

### 4.2 Réponse de succès avec données

Convention générale :

```json
{
  "status": "success",
  "data": {}
}
```

La propriété interne de `data` dépend du domaine : `user`, `workspace`, `workspaces`, `members`, `roles`, `plans`, `subscription`, `files`, etc.

### 4.3 Réponse 204

Une réponse `204 No Content` ne contient aucun JSON. Le frontend ne doit jamais tenter de parser un body après un `204`.

### 4.4 Erreurs opérationnelles

Une erreur contrôlée expose :

```json
{
  "status": "fail",
  "message": "..."
}
```

ou une autre valeur de `status` contrôlée par l’erreur opérationnelle.

Le client doit s’appuyer d’abord sur :

```text
status HTTP
+
contexte de l’endpoint
```

et ne doit pas construire une machine métier en analysant le texte libre de `message`.

### 4.5 Erreurs inattendues

En production, une erreur non opérationnelle retourne :

```json
{
  "status": "error",
  "message": "Une erreur interne est survenue"
}
```

Les détails techniques et stacks ne font pas partie du contrat de production.

### 4.6 Validation des requêtes

Les routes utilisant `validateRequest` valident `body`, `params` et/ou `query` avant le controller. Les couches suivantes consomment les données validées via `req.validated`.

Les schémas de domaine doivent rester stricts lorsque le contrat l’exige. Une propriété HTTP supplémentaire ne doit jamais être utilisée pour piloter implicitement un champ interne sensible.

---

## 5. Authentification et sessions

Préfixe :

```text
/api/auth
```

### 5.1 Endpoints actuels

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/change-password
GET  /api/auth/me
```

### 5.2 Access token / refresh token

Le Core sépare :

```text
access token
→ retourné au client
→ utilisé avec Authorization: Bearer <token>

refresh token
→ cookie HttpOnly
→ non accessible au JavaScript du frontend
```

Le frontend ne doit jamais chercher à lire, stocker ou reconstruire le refresh token.

### 5.3 Refresh

`POST /api/auth/refresh` n’utilise pas `authenticate`, car l’access token peut précisément être expiré.

Le frontend doit centraliser le mécanisme de réauthentification et coordonner les requêtes concurrentes afin d’éviter plusieurs rotations simultanées du même refresh token.

Un User `deletion_requested`, `closed` ou administrativement `disabled` ne peut pas obtenir une nouvelle session par refresh.

### 5.4 Logout

`POST /api/auth/logout` utilise le refresh cookie et reste exploitable même lorsque l’access token est expiré.

`POST /api/auth/logout-all` nécessite une authentification valide et révoque toutes les sessions de l’utilisateur.

### 5.5 Changement et réinitialisation du mot de passe

Après changement ou reset réussi du mot de passe, les sessions existantes sont invalidées conformément au backend.

Le frontend doit considérer la session courante comme terminée lorsque le workflow serveur le confirme.

Un compte `deletion_requested` ou `closed` ne peut pas être réactivé indirectement par le reset de mot de passe. Le workflow `forgot-password` conserve sa réponse neutre anti-énumération sans émettre de mécanisme de récupération utilisable pour ces états.

### 5.6 Anti-énumération

Le workflow `forgot-password` conserve une réponse qui ne doit pas permettre au client de révéler si un compte existe.

---

## 6. Compte utilisateur global

Le compte utilisateur est global et n’appartient à aucun Workspace particulier.

### 6.1 Lecture

```text
GET /api/auth/me
```

### 6.2 Modification du profil

```text
PATCH /api/users/me
```

La route actuelle permet uniquement la modification des champs de profil autorisés par le schéma de validation.

Le client ne peut pas piloter par cette route :

```text
email
platformRole
status
champs internes d’authentification
```

Le changement d’email nécessite un futur workflow dédié avec vérification de la nouvelle adresse.

### 6.3 Fermeture de compte

Le Core expose :

```text
GET  /api/users/me/closure-impact
POST /api/users/me/closure
```

`GET /closure-impact` est une prévisualisation en lecture seule. Elle calcule depuis MongoDB les conséquences actuellement connues : Workspaces possédés, Workspaces qui seraient archivés, autres membres actifs impactés, appartenances qui seraient retirées et Subscriptions commerciales concernées.

Cette prévisualisation n’est jamais une autorité de mutation. `POST /closure` recalcule la situation réelle au moment de la fermeture et n’accepte aucune liste de Workspaces fournie par le frontend comme source de vérité.

Le payload de fermeture exige une confirmation forte :

```text
currentPassword
confirmationEmail
confirmAccountClosure = true
```

Le schéma Zod est strict.

Workflow nominal :

```text
User ACTIVE
↓ confirmation forte
backend recalcule ownership + memberships
↓
Workspaces encore possédés et archivables
→ ARCHIVED
↓
appartenances du User
→ retirées
↓
invitations pendantes reçues
→ révoquées
↓
User
ACTIVE → DELETION_REQUESTED → CLOSED
↓
AuthSessions
→ révoquées avec motif de fermeture
↓
AuditLog
→ traces de fermeture
```

Un Workspace transféré avant la demande n’est plus possédé par le User fermant son compte : il reste actif et seule l’appartenance du User fermant est retirée.

Le workflow est transactionnel pour les écritures MongoDB coordonnées. Une fermeture fonctionnelle ne signifie pas une purge physique immédiate des données : les politiques de rétention, anonymisation et suppression restent définies par D-006 selon le produit dérivé.

### 6.4 États User de fermeture et suspension

```text
disabled
→ suspension administrative / sécurité
→ sessions révoquées
→ authentification refusée
→ memberships et Workspaces conservés
→ réactivation possible

deletion_requested
→ état intermédiaire de fermeture
→ authentification, access token, refresh et reset refusés

closed
→ compte fonctionnellement fermé
→ authentification, access token, refresh et reset refusés
```

Une suspension administrative ne doit jamais être traitée comme une fermeture volontaire du compte.

---

## 7. Frontière multi-tenant Workspace

Un `User` peut appartenir à plusieurs Workspaces.

Le frontend ne doit donc jamais considérer le premier Workspace retourné comme une identité globale ou supposer qu’un utilisateur ne possède qu’un seul tenant.

Pour toute ressource tenant-scoped :

```text
workspaceId
→ sélectionne le tenant

membership actif + permissions
→ autorisent l’action utilisateur

entitlement effectif
→ détermine les capacités commerciales disponibles
```

Un identifiant MongoDB n’est jamais une preuve d’autorisation.

Les requêtes sensibles qui utilisent un identifiant de ressource doivent vérifier que cette ressource appartient au Workspace courant.

Le Core V1 est techniquement multi-workspace mais n’impose aucune quantité commerciale de Workspaces par User. Une politique telle que « un seul Workspace » ou « N Workspaces par offre » appartient au SaaS dérivé ou à une future couche commerciale supérieure, pas à cet invariant Core.

---

## 8. Workspaces

### 8.1 Endpoints

```text
POST  /api/workspaces
GET   /api/workspaces
GET   /api/workspaces/:workspaceId
PATCH /api/workspaces/:workspaceId
POST  /api/workspaces/:workspaceId/archive
```

La fermeture terminale Platform est séparée :

```text
PATCH /api/platform/workspaces/:workspaceId/close
```

### 8.2 Création

La création est authentifiée. Le backend reste l’autorité pour l’initialisation du Workspace, de son owner, de ses rôles système et de sa baseline commerciale.

Le frontend ne doit jamais créer manuellement les documents internes associés.

Le Core n’impose pas de limite générique de nombre de Workspaces par User. Un SaaS dérivé peut restreindre ce comportement via ses propres règles produit sans modifier la signification du Workspace comme frontière tenant.

### 8.3 Lecture et modification

La lecture unitaire passe par le contexte Workspace et la permission `workspace:read`.

La modification passe par `workspace:update` et le contrôle du mode d’accès du Workspace.

Une mutation ordinaire peut être refusée lorsque le Workspace est dans un état nécessitant une remédiation.

### 8.4 Archivage volontaire par l’owner

```text
POST /api/workspaces/:workspaceId/archive
```

Ce workflow est owner-only et ne repose pas sur une permission personnalisée délégable.

Le payload strict exige :

```text
currentPassword
confirmationName
```

Le backend revérifie l’ownership courant, le mot de passe et le nom exact du Workspace dans le workflow sécurisé.

L’archivage volontaire :

```text
ACTIVE → ARCHIVED
```

Il neutralise les Subscriptions **commerciales** encore concernées, révoque les invitations pendantes du Workspace et produit les AuditLogs associés. La baseline est conservée comme historique/fallback structurel et n’est pas annulée par l’archivage owner.

`ARCHIVED` représente un retrait volontaire/opérationnel sans accès courant ; il ne signifie ni purge physique immédiate ni fermeture terminale.

### 8.5 Fermeture terminale Platform

```text
PATCH /api/platform/workspaces/:workspaceId/close
```

La fermeture `CLOSED` reste une décision Platform / administrative. Elle peut partir des états autorisés par le service, notamment `ACTIVE`, `SUSPENDED` ou `ARCHIVED`.

Un owner ne doit jamais pouvoir transformer directement son Workspace en `CLOSED`.

### 8.6 ARCHIVED et CLOSED

```text
ARCHIVED
→ retrait volontaire / opérationnel
→ plus d’accès courant
→ historique conservé
→ traitements futurs de rétention encore possibles

CLOSED
→ fermeture fonctionnelle terminale
→ aucune réactivation normale
→ données toujours soumises aux politiques de D-006
```

---

## 9. Membres et gestion d’équipe

### 9.1 Listing

```text
GET /api/workspaces/:workspaceId/members
```

La lecture nécessite `member:read` et la capability commerciale `team_management`.

La pagination serveur utilise les conventions communes `page` / `limit`.

### 9.2 Mutations

```text
PATCH  /api/workspaces/:workspaceId/members/:memberId/role
POST   /api/workspaces/:workspaceId/members/:memberId/suspend
DELETE /api/workspaces/:workspaceId/members/:memberId
```

Permissions :

```text
member:update
member:suspend
member:remove
```

Ces actions nécessitent également `team_management`.

Le changement de rôle passe en plus par le contrôle de délégation afin d’empêcher une élévation de privilèges indirecte.

La suppression d’un membre est autorisée pendant une remédiation lorsqu’elle constitue une action corrective, mais elle ne contourne pas la permission ni la capability commerciale.

### 9.3 Owner

Le owner n’est pas administré comme un membre ordinaire pour les opérations sensibles qui possèdent un workflow métier dédié.

---

## 10. Invitations

### 10.1 Gestion dans le Workspace

```text
POST   /api/workspaces/:workspaceId/invitations
GET    /api/workspaces/:workspaceId/invitations
POST   /api/workspaces/:workspaceId/invitations/:invitationId/resend
DELETE /api/workspaces/:workspaceId/invitations/:invitationId
```

Ces routes nécessitent :

```text
member:invite
+
team_management
```

La création passe également par le contrôle de délégation du rôle cible.

### 10.2 Acceptation

```text
POST /api/invitations/accept
```

Cette route est authentifiée mais ne charge volontairement pas un contexte Workspace existant : l’utilisateur n’est précisément pas encore membre du Workspace au moment de l’acceptation.

Le service doit revalider dans sa transaction les conditions nécessaires avant de créer ou réactiver le membership.

Le token brut d’invitation ne doit jamais être exposé dans les listes administratives.

---

## 11. Rôles et permissions Workspace

Préfixe :

```text
/api/workspaces/:workspaceId/roles
```

Endpoints :

```text
GET    /
POST   /
PATCH  /:roleId
DELETE /:roleId
```

Permissions :

```text
role:read
role:create
role:update
role:delete
```

Toutes ces routes nécessitent la capability `team_management`.

Les mutations nécessitent également un mode d’accès autorisant les modifications.

### 11.1 Rôles système

Les rôles système sont protégés. Les commandes génériques ne doivent pas permettre de transformer un rôle système en rôle personnalisé ni de contourner les invariants d’ownership.

### 11.2 Anti-escalade

Une permission attribuable à un rôle personnalisé doit appartenir au registre actif et respecter les règles de délégation du Core.

Un rôle personnalisé ne doit jamais servir de moyen indirect pour obtenir une permission réservée à une gouvernance dédiée.

### 11.3 Soft delete

La suppression d’un rôle personnalisé est logique afin de préserver les références historiques et l’audit.

---

## 12. Transfert d’ownership

Endpoint :

```text
PATCH /api/workspaces/:workspaceId/ownership
```

Permission dédiée :

```text
workspace:ownership:transfer
```

Ce workflow est distinct de la mutation générique d’un membership.

Le backend exige les données de confirmation prévues par son schéma, dont le mot de passe courant, afin de renforcer cette opération sensible.

Le transfert d’ownership ne doit pas être reconstitué côté frontend comme une simple succession de changements de rôles.

Un transfert réalisé avant une fermeture de compte permet au Workspace concerné de rester `ACTIVE` : le workflow Account recalcule toujours l’ownership réel au moment de la demande.

---

## 13. Fichiers

Préfixe :

```text
/api/workspaces/:workspaceId/files
```

Endpoints :

```text
GET    /
GET    /storage
GET    /trash
GET    /:fileId
GET    /:fileId/download
POST   /
POST   /:fileId/restore
DELETE /:fileId
DELETE /:fileId/permanent
```

### 13.1 Lectures

Les fichiers actifs, leur détail, leur téléchargement et l’état de stockage courant utilisent `file:read`.

Ces lectures restent possibles en remédiation et **ne dépendent pas de `file_upload`** : un plan qui interdit de nouveaux dépôts ne doit pas masquer les fichiers actifs déjà détenus par le Workspace.

La consultation de la corbeille est une surface d’administration distincte et nécessite `file:trash:read`.

### 13.2 Upload

L’upload nécessite simultanément :

```text
authentification
contexte Workspace
permission file:upload
mode d’accès autorisant la mutation
capability file_upload
pipeline de validation/sécurité fichier
quotas applicables
```

La validation et les contrôles serveur restent l’autorité. Masquer un bouton Upload côté frontend n’est jamais un contrôle de sécurité suffisant.

### 13.3 Suppression logique

La suppression logique nécessite `file:delete`.

Elle peut être autorisée pendant une remédiation car elle prépare la réduction de consommation. La suppression logique retire le fichier du listing actif mais ne signifie pas purge physique immédiate.

### 13.4 Corbeille, restauration et suppression définitive

```text
GET    /api/workspaces/:workspaceId/files/trash
POST   /api/workspaces/:workspaceId/files/:fileId/restore
DELETE /api/workspaces/:workspaceId/files/:fileId/permanent
```

Permissions dédiées :

```text
file:trash:read
file:restore
file:delete:permanent
```

La restauration reste autorisée en remédiation lorsqu’elle ne crée pas de nouvelle consommation : le fichier supprimé reste comptabilisé jusqu’à sa suppression définitive.

La suppression définitive détruit le contenu physique, libère réellement le stockage et constitue une action irréversible distincte du soft delete.

---

## 14. AuditLog Workspace

Endpoint de consultation :

```text
GET /api/workspaces/:workspaceId/audit-logs
```

La consultation nécessite :

```text
audit:read
+
audit_logs
```

`audit_logs` est une capability commerciale de consultation.

La **production** des traces AuditLog nécessaires à la sécurité et à la traçabilité reste un invariant du Core et ne doit pas être désactivée parce qu’un plan n’autorise pas leur consultation.

Les transitions de fermeture Account et de cycle de vie Workspace produisent les événements AuditLog définis par les services concernés ; leur historique n’est pas effacé par l’archivage fonctionnel.

---

## 15. Contrat commercial et entitlement

Les détails normatifs sont consolidés dans :

```text
docs/contracts/COMMERCIAL.md
```

Règle transversale :

```text
RBAC
→ l’utilisateur peut-il effectuer l’action ?

Entitlement
→ le Workspace possède-t-il commercialement la capability ?
```

Ces deux contrôles sont distincts et peuvent être nécessaires simultanément.

Le frontend ne doit jamais calculer seul l’entitlement effectif à partir du nom, du prix ou de la clé interne d’un Plan.

---

## 16. Capability Registry

Le contrat du registre applicatif est consolidé dans :

```text
docs/contracts/CAPABILITIES.md
```

Règle transversale : une capability existe parce que le logiciel sait réellement l’exécuter. Elle n’est jamais créée par une saisie libre dans l’administration Platform.

---

## 17. Administration Platform

Préfixe :

```text
/api/platform
```

Le routeur Platform racine exige l’authentification. Les sous-routeurs appliquent ensuite leurs autorisations Platform réelles et leurs validations propres.

Le RBAC Platform courant est défini par `PlatformTeamMember`, `PlatformRole` et les `PlatformPermission` effectives. Le rôle système `super_admin` possède toutes les permissions Platform connues ; les autres rôles reçoivent uniquement les permissions autorisées par leur rôle et par les règles de sensibilité/délégation définies dans `docs/contracts/PLATFORM-TEAM.md`.

Aucune route d’administration ne doit déduire une autorisation suffisante d’un simple rôle affiché côté frontend.

### 17.1 Contexte Platform courant

```text
GET /api/platform/me
```

Cette route décrit le contexte Platform du User authentifié. Elle peut notamment retourner l’absence d’accès Platform ou un état suspendu sans attribuer d’autorisation supplémentaire.

### 17.2 Overview

```text
GET /api/platform/overview
```

Permission :

```text
platform:overview:read
```

Le cockpit est analytique. Il ne devient jamais une autorité transactionnelle.

### 17.3 Users

```text
GET    /api/platform/users
GET    /api/platform/users/:userId
PATCH  /api/platform/users/:userId/disable
PATCH  /api/platform/users/:userId/enable
PATCH  /api/platform/users/:userId/close
POST   /api/platform/users/:userId/revoke-sessions
```

Permissions granulaires :

```text
platform:users:read
platform:users:disable
platform:users:enable
platform:users:close
platform:users:revoke_sessions
```

L’ancien endpoint de mutation directe `/:userId/role` n’appartient plus au contrat : les rôles d’administration sont gérés par `PlatformTeamMember` + `PlatformRole`.

### 17.4 Workspaces

```text
GET    /api/platform/workspaces
GET    /api/platform/workspaces/:workspaceId
GET    /api/platform/workspaces/:workspaceId/ownership-transfer-authorization
POST   /api/platform/workspaces/:workspaceId/ownership-transfer-authorization
DELETE /api/platform/workspaces/:workspaceId/ownership-transfer-authorization
PATCH  /api/platform/workspaces/:workspaceId/suspend
PATCH  /api/platform/workspaces/:workspaceId/reactivate
PATCH  /api/platform/workspaces/:workspaceId/close
```

Permissions granulaires :

```text
platform:workspaces:read
platform:workspaces:ownership_transfer_authorize
platform:workspaces:suspend
platform:workspaces:reactivate
platform:workspaces:close
```

`close` représente la fermeture terminale Platform et reste distinct de l’archivage volontaire owner.

L’autorisation temporaire de transfert d’ownership Platform ne réalise pas elle-même le transfert : elle autorise le workflow Workspace concerné pendant sa fenêtre de validité.

### 17.5 Plans

```text
GET    /api/platform/plans/capabilities
GET    /api/platform/plans
POST   /api/platform/plans
PATCH  /api/platform/plans/:planId
PATCH  /api/platform/plans/:planId/archive
```

Permissions granulaires :

```text
platform:capabilities:read
platform:plans:read
platform:plans:create
platform:plans:update
platform:plans:archive
```

### 17.6 Subscriptions

```text
GET    /api/platform/subscriptions
POST   /api/platform/subscriptions/grant-trial
GET    /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId
PATCH  /api/platform/subscriptions/:subscriptionId/cancel
PATCH  /api/platform/subscriptions/:subscriptionId/resume
```

Permissions granulaires :

```text
platform:subscriptions:read
platform:subscriptions:grant_trial
platform:subscriptions:update
platform:subscriptions:cancel
platform:subscriptions:resume
```

### 17.7 Entitlement Overrides

```text
GET    /api/platform/entitlement-overrides
GET    /api/platform/entitlement-overrides/workspaces/:workspaceId/context
GET    /api/platform/entitlement-overrides/feature-groups/:overrideId
POST   /api/platform/entitlement-overrides/feature-groups
PATCH  /api/platform/entitlement-overrides/feature-groups/:overrideId
PATCH  /api/platform/entitlement-overrides/feature-groups/:overrideId/revoke
GET    /api/platform/entitlement-overrides/:overrideId
POST   /api/platform/entitlement-overrides
PATCH  /api/platform/entitlement-overrides/:overrideId
PATCH  /api/platform/entitlement-overrides/:overrideId/revoke
```

Permissions granulaires :

```text
platform:entitlement_overrides:read
platform:entitlement_overrides:create
platform:entitlement_overrides:update
platform:entitlement_overrides:revoke
```

Les groupes FEATURE + LIMIT(s) possèdent un lifecycle groupé protégé ; les mutations unitaires ne doivent pas contourner ce contrat.

### 17.8 Audit Logs Platform

```text
GET /api/platform/audit-logs
GET /api/platform/audit-logs/metadata
```

Permission :

```text
platform:audit_logs:read
```

### 17.9 Rétention / purge

Préfixe :

```text
/api/platform/retention
```

Endpoints actuels :

```text
GET  /api/platform/retention
GET  /api/platform/retention/:targetKey
GET  /api/platform/retention/:targetKey/executions
POST /api/platform/retention/:targetKey/preview
POST /api/platform/retention/:targetKey/policy-versions
POST /api/platform/retention/:targetKey/executions
```

Permissions :

```text
platform:retention:read
platform:retention:preview
platform:retention:update
platform:retention:execute
```

Le contrat détaillé est `docs/contracts/RETENTION.md`.

### 17.10 Invitations commerciales

Le domaine D-020 est exposé sous :

```text
/api/platform/commercial-invitations
```

Il utilise ses permissions `platform:commercial_invitations:*` et reste distinct des invitations de l’équipe Platform. Le contrat détaillé est `docs/contracts/COMMERCIAL-INVITATIONS.md`.

### 17.11 Équipe et rôles Platform

Les routes d’équipe, invitations internes et rôles Platform sont exposées sous les préfixes :

```text
/api/platform/team
/api/platform/team/roles
```

Leur modèle d’autorité, leurs protections Fondateur / Super administrateur et leurs règles de délégation sont définis dans `docs/contracts/PLATFORM-TEAM.md`.

---

## 18. Centre d’aide sécurisé Workspace / Platform

Le Core expose deux corpus d’aide fonctionnellement distincts.

### 18.1 Workspace

```text
GET /api/workspaces/:workspaceId/help
GET /api/workspaces/:workspaceId/help/:entryId
```

Les routes sont authentifiées, validées et chargent le contexte Workspace réel avant projection du corpus.

### 18.2 Platform

```text
GET /api/platform/help
GET /api/platform/help/:entryId
```

Le routeur parent impose l’authentification Platform ; le domaine Help applique ensuite son autorité et son filtrage propres.

### 18.3 Invariant de sécurité

Le backend **projette et filtre avant sérialisation**. Il ne doit jamais envoyer au frontend un corpus ou une fiche non autorisée uniquement pour la masquer ensuite côté client.

Selon le contexte, la projection peut tenir compte notamment :

```text
contexte Workspace ou Platform
permissions effectives
ownership
entitlements / capabilities
état ou mode d’accès
remédiation
```

La recherche frontend s’exécute uniquement sur le corpus déjà autorisé reçu du serveur.

Une fiche absente et une fiche non autorisée ne doivent pas permettre au client de déduire l’existence d’un contenu protégé.

Le registre Help du Core est extensible par composition afin qu’un SaaS dérivé puisse ajouter ses fiches métier sans réécrire le corpus Core.

Point de composition :

```text
backend/config/applicationHelp.registry.js
→ APPLICATION_HELP_MODULES
→ ACTIVE_HELP_REGISTRY
```

Le même centre d’aide peut donc présenter un corpus Core et un corpus applicatif.
La séparation reste une responsabilité du code source, pas une séparation
visible imposée à l’utilisateur final.

Pour les fiches Platform, deux autorités peuvent être requises simultanément :

```text
audience.permissions
→ permissions Platform

audience.applicationGlobalPermissions
→ permissions Application Global du produit dérivé
```

Les permissions Application Global ne sont autorisées que pour les fiches du
contexte Platform. Elles sont validées contre le registre actif
`applicationGlobalPermission.registry.js` puis résolues séparément par
`resolveApplicationGlobalAuthorization()`.

Invariant :

```text
permission Platform
≠
permission Application Global
```

Un Fondateur ou Super administrateur Platform ne reçoit donc jamais
implicitement le droit de lire une procédure métier globale. Inversement, une
permission Application Global ne crée aucun droit Platform.

Le Core fournit actuellement 4 catégories Workspace et 5 catégories Platform.
Le registre autorise jusqu’à 10 catégories par contexte afin de laisser une
capacité réelle aux modules dérivés ; le frontend conserve une liste de
catégories scrollable horizontalement.

### 18.4 Recherche et accès rapide dans les shells

Le shell Workspace ne fournit pas de recherche globale générique. Les recherches
de données restent dans les pages fonctionnelles qui connaissent réellement
leurs filtres, permissions et contrats API.

La topbar Platform fournit un accès rapide aux **vues d’administration
autorisées** à partir de la navigation composée. Elle ne recherche pas les
données métier ou administratives elles-mêmes.

```text
recherche Platform
→ destinations de navigation autorisées
→ Core + modules applicatifs visibles

recherche de données
→ page concernée
→ filtres / API / permissions propres au domaine
```

Les destinations d’un SaaS dérivé deviennent donc automatiquement
recherchables dans l’accès rapide lorsqu’elles sont réellement visibles selon
leurs permissions Platform ou Application Global.

---

## 19. Sécurité : ordre conceptuel des contrôles

Selon le domaine, une mutation tenant-scoped peut nécessiter :

```text
authentification
→ validation stricte
→ chargement du contexte Workspace
→ permission RBAC
→ mode d’accès Workspace
→ capability / entitlement
→ quota
→ service métier
→ contraintes base de données / transaction
→ AuditLog
```

Tous les maillons ne sont pas présents sur toutes les routes, mais aucune couche frontend ne remplace les contrôles nécessaires côté backend.

Le document `docs/security/SECURITY.md` détaille ces mécanismes.

---

## 20. Responsabilités frontend

Le frontend doit :

- consommer les données serveur via RTK Query ;
- conserver `useState` pour l’état local strictement UI ;
- ne pas dupliquer une ressource serveur dans Redux Toolkit classique ;
- masquer ou désactiver les actions manifestement indisponibles pour améliorer l’UX ;
- accepter qu’une mutation soit malgré tout refusée par le serveur si l’état a changé ;
- invalider/refetch les données serveur après les mutations concernées ;
- ne jamais utiliser une route cachée, un composant masqué ou une permission calculée localement comme barrière de sécurité.

Les opérations de fermeture Account et d’archivage Workspace réutilisent la primitive partagée de confirmation mais restent deux workflows métier distincts. La fermeture Account consomme la prévisualisation serveur ; l’archivage Workspace owner n’invente aucun impact chiffré non exposé par le backend.

Les règles de composants réutilisables, DataTable, Drawer, formulaires, toasts et navigation sont consolidées dans `docs/frontend/FRONTEND-GUIDELINES.md`.

---

## 21. Hors périmètre actuel du contrat Core

Ne sont pas encore des contrats Core complets :

```text
changement d’email avec vérification
MFA / passkeys / SSO
Billing / Payment réel
facturation / TVA / remboursements
observabilité technique de production
API keys / webhooks génériques
modules métier des SaaS dérivés
```

Les sujets actifs sont suivis dans `docs/DEBT.md` lorsque nécessaire.

---

## 22. Documents historiques absorbés progressivement

Ce contrat absorbe les règles encore valides de plusieurs documents existants, notamment :

```text
frontend-backend-integration-contract.md
frontend-backend-account-security-contract.md
frontend-backend-roles-permissions-contract.md
frontend-platform-admin-contract.md
```

Les détails spécialisés sont consolidés par `COMMERCIAL.md`, `COMMERCIAL-INVITATIONS.md`, `CAPABILITIES.md`, `PLATFORM-TEAM.md` et `RETENTION.md`.

Aucun de ces anciens fichiers ne doit être supprimé avant validation explicite du lot de nettoyage correspondant.

---

## 23. Règle de maintenance

Toute évolution qui modifie une surface HTTP observable, une règle d’autorisation, une frontière tenant, un DTO public ou un invariant transversal doit vérifier dans le même lot si ce contrat doit être mis à jour.

Une synthèse de reprise ou un rapport de milestone ne doit jamais devenir le lieu où une nouvelle règle contractuelle est figée durablement.
