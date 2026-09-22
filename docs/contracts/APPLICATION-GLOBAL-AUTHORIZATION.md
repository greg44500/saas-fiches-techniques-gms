# SAAS-CORE-API — Contrat canonique de l’autorisation globale applicative

**Statut :** canonique — actif à partir de Core 1.2.0
**Date :** 2026-09-22
**Périmètre :** autorisation métier globale d’un SaaS dérivé, indépendante de Platform et des Workspaces

## 1. Objet

Le Core expose une troisième frontière d’autorisation pour les ressources métier qui sont globales à l’application dérivée et qui n’appartiennent ni à la Plateforme interne ni à un Workspace client.

Exemples génériques :

- référentiel métier partagé ;
- taxonomie globale ;
- modération globale ;
- validation de contributions ;
- administration d’un catalogue partagé.

Ces exemples décrivent des usages possibles. Ils ne deviennent pas des concepts métier du Core.

## 2. Trois autorités indépendantes

    Platform authorization
    → administration interne de la plateforme SaaS

    Application-global authorization
    → gouvernance métier globale de l’application dérivée

    Workspace authorization
    → actions d’un membre dans un tenant

Une même identité User peut cumuler les trois autorités. Aucune ne confère automatiquement les deux autres.

Un Super administrateur Platform ne reçoit donc aucun droit métier global implicite. Un rôle global applicatif ne donne aucun droit Platform ou Workspace. Un Owner Workspace ne reçoit aucun droit global applicatif implicite.

## 3. Modèle de données

La primitive persistante est composée de :

    ApplicationGlobalRole
    → groupe de permissions globales applicatives

    ApplicationGlobalMember
    → appartenance d’un User à cette autorité globale
    → référence un ApplicationGlobalRole

ApplicationGlobalRole est distinct de Role, qui reste strictement Workspace-scoped, et de PlatformRole, qui reste réservé à l’équipe interne de la Plateforme.

ApplicationGlobalMember est distinct de WorkspaceMember et PlatformTeamMember.

États du rôle :

    active
    archived

États du membership :

    active
    suspended
    revoked

Un rôle archivé n’accorde aucun droit. Un membre suspendu ou révoqué n’accorde aucun droit.

## 4. Registre de permissions code-owned

Le point de composition applicatif est :

    backend/config/applicationGlobalPermission.registry.js

Le Core fournit volontairement :

    APPLICATION_GLOBAL_PERMISSION_MODULES = []

Il ne déclare aucune permission métier globale.

Un SaaS dérivé ajoute explicitement les descriptors de ses modules. Une définition contient :

    key
    label
    category
    categoryLabel
    description
    reserved

reserved signifie qu’une permission peut être portée par un rôle système piloté par le code mais ne peut pas être ajoutée à un rôle personnalisé.

Les permissions restent code-owned. Aucune interface d’administration ne crée librement une nouvelle permission technique.

## 5. Collisions de scope interdites

La composition échoue au démarrage lorsqu’une permission globale applicative :

- duplique une autre permission globale déclarée ;
- utilise le namespace platform: ;
- collisionne avec une permission Workspace active ;
- collisionne avec une permission Platform active.

Cette règle garantit qu’une clé ne peut pas avoir deux significations d’autorisation concurrentes.

## 6. Résolution runtime

L’autorité est résolue par :

    resolveApplicationGlobalAuthorization()

Flux :

    User authentifié
    → ApplicationGlobalMember courant
    → ApplicationGlobalRole courant
    → validation contre le registre actif
    → permissions effectives

La résolution recharge MongoDB. Le JWT, le frontend ou un rôle affiché côté client ne constituent jamais l’autorité.

Cas fermés :

    aucun membership courant → aucune permission
    membership suspended → aucune permission
    membership revoked → aucune permission
    rôle archived → aucune permission
    permission persistée inconnue → refus fermé
    permission reserved dans un rôle personnalisé → refus fermé

User.platformRole n’est jamais interprété par ce resolver.

## 7. Guard backend

Le middleware générique est :

    authorizeApplicationGlobalPermission(...permissions)

Il doit être monté après authenticate.

Le guard vérifie au montage que les permissions demandées existent, exige req.user, recharge l’autorisation persistée, exige toutes les permissions demandées puis expose le résultat dans req.applicationGlobalAuthorization.

## 8. Administration des rôles

Le Core expose des services génériques pour créer, modifier et archiver les rôles personnalisés ainsi que synchroniser les rôles système depuis le code du SaaS dérivé.

Les rôles système sont pilotés par le code. La synchronisation d’un rôle système est la seule primitive autorisant des permissions reserved.

Un rôle personnalisé ne peut contenir que des permissions connues, non réservées et déjà possédées par l’acteur qui le crée ou le modifie.

## 9. Attribution et lifecycle des membres

Le Core expose des services pour assigner un rôle global, suspendre, réactiver, révoquer et bootstrapper le premier membre.

La permission qui protège l’administration est fournie par le module dérivé sous la forme governancePermission. Le Core ne connaît donc aucune clé métier spécifique de gouvernance.

Le service recharge toujours l’autorité de l’acteur depuis MongoDB. L’acteur ne peut administrer ou attribuer un rôle contenant une permission qu’il ne possède pas lui-même.

Le workflow d’administration ordinaire interdit à un acteur de modifier sa propre autorité globale.

## 10. Bootstrap

Le Core fournit deux primitives de déploiement explicites :

    syncApplicationGlobalSystemRole()
    bootstrapApplicationGlobalMember()

Elles sont destinées aux seeds ou migrations du SaaS dérivé et ne doivent pas être exposées telles quelles par une route publique.

Le bootstrap refuse un rôle non système, le remplacement d’un membership courant différent, la réactivation implicite d’un membre suspendu et le contournement d’un historique révoqué.

## 11. Audit

Les mutations sensibles écrivent des AuditLogs transactionnels :

    APPLICATION_GLOBAL_ROLE_CREATED
    APPLICATION_GLOBAL_ROLE_UPDATED
    APPLICATION_GLOBAL_ROLE_ARCHIVED
    APPLICATION_GLOBAL_MEMBER_ASSIGNED
    APPLICATION_GLOBAL_MEMBER_SUSPENDED
    APPLICATION_GLOBAL_MEMBER_REACTIVATED
    APPLICATION_GLOBAL_MEMBER_REVOKED

Entités :

    ApplicationGlobalRole
    ApplicationGlobalMember

## 12. Index et migration Core

En production, autoIndex est désactivé.

Core 1.2.0 ajoute donc la migration :

    npm run migration:application-global-authorization-indexes

Elle garantit notamment l’unicité de la clé d’un rôle global et un seul membership courant active/suspended par User.

Cette migration doit être exécutée avant d’exposer des routes produit utilisant cette primitive en production.

## 13. Frontend

Core 1.2.0 n’ajoute aucune surface frontend générique.

Les noms de rôles, workflows de gouvernance, écrans et actions appartiennent au SaaS dérivé. Le frontend du produit consomme ses propres routes métier, montées via applicationRoutes.registry.js et protégées par les primitives Core.

## 14. Intégration dans un SaaS dérivé

Flux recommandé :

    1. déclarer les permissions globales du module métier
    2. les composer dans applicationGlobalPermission.registry.js
    3. créer les rôles système du produit par seed/migration
    4. bootstrapper le premier gouverneur si nécessaire
    5. créer les routes métier via applicationRoutes.registry.js
    6. monter authenticate
    7. monter authorizeApplicationGlobalPermission()
    8. appeler les services métier
    9. réutiliser les services Core pour les rôles/memberships
    10. tester les trois frontières séparément

Le produit ne doit pas ajouter ses permissions à platformPermissions.constants.js, rattacher cette gouvernance à PlatformTeamMember, utiliser WorkspaceMember pour une ressource globale, créer une seconde authentification ni réimplémenter un moteur RBAC parallèle.

## 15. Migration des données produit

La migration Core ne crée aucun rôle métier et n’attribue aucun utilisateur.

Chaque SaaS dérivé qui active cette primitive fournit son propre seed ou sa propre migration applicative pour synchroniser ses rôles système et choisir explicitement son ou ses premiers membres globaux.

## 16. Invariants de sécurité

Toujours :

    authenticate
    → résolution persistée de l’autorité globale
    → permissions effectives
    → guard backend
    → service métier

Toujours refuser :

    permission inconnue
    rôle archivé
    membership suspendu
    membership révoqué
    tentative d’escalade
    collision de scope
    autorité déduite de Platform
    autorité déduite du Workspace
    autorité déduite uniquement du frontend ou du JWT

Le statut User reste contrôlé par authenticate conformément au contrat Account existant.

## 17. Versionnement

Cette frontière est ajoutée de manière rétrocompatible dans Core 1.2.0.

Un dérivé qui ne compose aucune permission globale conserve un registre vide et ne reçoit aucun comportement métier supplémentaire.
