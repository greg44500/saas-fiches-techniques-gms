# M-001 — Handoff d'implémentation

**Statut :** PRÊT POUR IMPLÉMENTATION après fusion de la PR documentaire #9 et Core Gate post-merge verte  
**Date :** 2026-09-21  
**Produit :** `greg44500/saas-fiches-techniques-gms`

---

## 1. Règle de reprise

Avant toute modification de code :

1. lire `KB-START-HERE.md` / la base de connaissance projet ;
2. vérifier l'état réel de GitHub ;
3. vérifier `core-origin.json` ;
4. vérifier que la PR documentaire #9 est fusionnée ;
5. vérifier que la Core Gate post-merge de `main` est verte ;
6. lire les contrats M-001 listés ci-dessous ;
7. créer la branche `feature/m001-dossiers-access` depuis `main` à jour.

Si la PR #9 n'est pas fusionnée ou si la gate post-merge n'est pas verte, ne pas démarrer les modèles métier.

---

## 2. Core intégré

Source de vérité :

```json
{
  "repository": "greg44500/saas-core-api",
  "version": "1.1.0",
  "tag": "v1.1.0",
  "commit": "8326fb48856dcef151b5ab01495c934951050d6d"
}
```

Le Core 1.1.0 fournit notamment :

- RBAC Workspace extensible via `applicationRolePermission.registry.js` ;
- routes backend applicatives via `applicationRoutes.registry.js` ;
- routes frontend via `application-routes.js` ;
- navigation Workspace via `workspace-navigation.js` ;
- lifecycle transactionnel `WorkspaceMember → REMOVED` via `applicationWorkspaceMemberLifecycle.registry.js` ;
- primitives UI partagées ;
- RTK Query / Redux / WorkspaceContext ;
- gate canonique `npm run release:check`.

---

## 3. Frontière Core / Produit

Invariant :

```text
Core
→ mécanismes génériques

Produit GMS
→ vocabulaire, données, règles et UX métier
```

Ne jamais ajouter au Core :

- Dossier ;
- DossierAccessGrant ;
- BusinessActivityEvent ;
- rôles métier GMS ;
- statuts Dossier ;
- règles de prix/fiches futures.

Les besoins génériques découverts pendant l'implémentation doivent être traités séparément dans `saas-core-api`, versionnés, puis intégrés par une branche `core-update/vX.Y.Z`.

---

## 4. Documents canoniques M-001

Lire avant de coder :

```text
docs/PRODUCT-SCOPE.md
docs/domain/DOMAIN-MODEL.md
docs/domain/GLOSSARY.md
docs/domain/INITIAL-DATA-BOOTSTRAP.md

docs/m001/M-001-API-REST.md
docs/m001/M-001-MIDDLEWARES-AUTHORIZATION.md
docs/m001/M-001-VALIDATION-METADATA.md
docs/m001/M-001-BUSINESS-ACTIVITY.md
docs/m001/M-001-DOSSIER-LIFECYCLE.md
docs/m001/M-001-UX-DOSSIERS.md
docs/m001/M-001-ADDRESS-AUTOCOMPLETE.md
docs/m001/M-001-TEST-STRATEGY.md
docs/m001/M-001-ACCEPTANCE-IMPLEMENTATION.md
```

`docs/REPRISE-CURRENT.md` résume l'état courant mais ne remplace pas ces contrats.

---

## 5. Périmètre M-001

M-001 couvre :

```text
Dossiers / magasins
DossierAccessGrant
activité métier Dossier
lifecycle Dossier
liste / recherche / filtres
création / édition
affectations
vraie page de travail Dossier
autocomplétion adresse facultative
```

Hors périmètre :

```text
Produits
Fournisseurs
Articles
Prix
Fiches techniques
Fiches process
OCR / IA
optimiseur
purge physique du graphe Dossier
presets métier finaux M-002/M-003/M-004
```

---

## 6. Modèle fonctionnel Dossier

Règle V1 :

```text
1 Dossier = 1 magasin
1 Dossier appartient exactement à 1 Workspace
```

Création :

- seul `name` est obligatoire ;
- `brand`, localisation, email documents, téléphone et contact sont facultatifs ;
- statut initial imposé par le backend : `ACTIVE`.

Ownership :

```text
Dossier.workspace
→ ownership

createdBy / updatedBy
→ traçabilité uniquement
```

---

## 7. RBAC et rôles

Le Core conserve ses rôles système génériques.

Le produit déclare les permissions M-001 :

```text
dossier:read
dossier:create
dossier:update
dossier:lifecycle:update
dossier:access:read
dossier:access:manage
```

Le descriptor produit :

- ajoute ces permissions au registre actif ;
- attribue les six permissions au rôle système `owner` dans le dérivé ;
- n'attribue par défaut aucune permission Dossier aux autres rôles système Core en M-001.

Les profils :

```text
Acheteur
Économe
Responsable FT
Contributeur FT
Lecteur métier
```

sont des profils/presets produit destinés à créer des rôles Workspace personnalisés. Ils ne sont pas des rôles système Core et leur provisioning final est différé jusqu'aux modules qui définissent réellement leurs permissions.

---

## 8. Role vs DossierAccessGrant

Invariant :

```text
Role
→ QUOI peut faire le membre ?

DossierAccessGrant
→ OÙ peut-il le faire ?
```

Un non-owner doit réunir :

```text
WorkspaceMember ACTIVE
+ permission métier requise
+ Dossier même Workspace
+ DossierAccessGrant ACTIVE
+ statut Dossier compatible
+ capability éventuelle
+ invariants métier
```

Owner :

- aucun grant individuel ;
- accès implicite à tous les Dossiers de son Workspace ;
- permissions métier reçues via composition RBAC produit.

PlatformRole :

- aucun accès implicite aux données métier Workspace.

---

## 9. DossierAccessGrant

Concept :

```text
workspace
dossier
workspaceMember
status
grantedAt
grantedBy
revokedAt
revokedBy
revocationReason
```

Statuts :

```text
ACTIVE
REVOKED
```

Raisons de révocation M-001 :

```text
MANUAL
WORKSPACE_MEMBER_REMOVED
DOSSIER_DELETED
```

Règles :

- ancien REVOKED jamais réactivé ;
- nouvelle affectation = nouvelle ligne ACTIVE ;
- un seul ACTIVE courant par membre + Dossier ;
- Owner jamais matérialisé par un grant.

---

## 10. Lifecycle Dossier

Transitions exactes :

```text
ACTIVE   → PAUSED | ARCHIVED | DELETED
PAUSED   → ACTIVE | ARCHIVED | DELETED
ARCHIVED → PAUSED | DELETED
DELETED  → PAUSED
```

Retour d'un état hors exploitation :

```text
ARCHIVED → PAUSED
DELETED  → PAUSED
```

Jamais directement vers ACTIVE.

Effets grants :

```text
PAUSED
→ grants conservés

ARCHIVED
→ grants conservés

DELETED
→ tous les grants ACTIVE deviennent REVOKED
→ même transaction

restauration
→ anciens grants restent REVOKED
```

Reason :

- obligatoire vers `DELETED` ;
- obligatoire pour `DELETED → PAUSED` ;
- facultatif ailleurs.

---

## 11. Lifecycle WorkspaceMember

Core 1.1.0 fournit `onMemberRemoved` avec la session MongoDB active.

Produit M-001 :

```text
WorkspaceMember SUSPENDED
→ grants conservés
→ membership rend l'accès inopérant

WorkspaceMember REMOVED
→ grants ACTIVE → REVOKED
→ reason WORKSPACE_MEMBER_REMOVED
→ BusinessActivityEvent
→ même transaction Core
```

Erreur handler produit :

```text
→ rollback retrait WorkspaceMember
```

Réinvitation :

```text
→ anciens grants restent REVOKED
```

---

## 12. BusinessActivityEvent

Distinct de l'`AuditLog` Core.

Actions M-001 :

```text
DOSSIER_CREATED
DOSSIER_UPDATED
DOSSIER_STATUS_CHANGED
DOSSIER_ACCESS_GRANTED
DOSSIER_ACCESS_REVOKED
```

Principes :

- immutable ;
- Workspace obligatoire ;
- Dossier lorsque pertinent ;
- action registry backend ;
- metadata minimales construites par le backend ;
- aucune copie du body complet ;
- même transaction que la mutation sensible ;
- aucun faux événement sur no-op/idempotence.

Lecture :

- activités générales : `dossier:read` ;
- événements d'affectation : `dossier:access:read` supplémentaire.

---

## 13. API REST M-001

Surface validée :

```text
GET    /api/workspaces/:workspaceId/dossiers
GET    /api/workspaces/:workspaceId/dossiers/metadata
POST   /api/workspaces/:workspaceId/dossiers
GET    /api/workspaces/:workspaceId/dossiers/:dossierId
GET    /api/workspaces/:workspaceId/dossiers/:dossierId/activity
PATCH  /api/workspaces/:workspaceId/dossiers/:dossierId
PATCH  /api/workspaces/:workspaceId/dossiers/:dossierId/status
GET    /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants
PUT    /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants/:membershipId
DELETE /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants/:membershipId
```

`workspaceId` de l'URL est l'autorité de tenancy.

Anti-énumération :

```text
Dossier absent
Dossier autre Workspace
Dossier hors scope non-owner
→ même famille 404
```

---

## 14. Middleware / services

Utiliser :

```text
authenticate
→ validateRequest
→ loadWorkspaceContext
→ authorizePermission
→ enforceWorkspaceAccessMode si mutation
→ capability si réellement définie
→ loadAuthorizedDossierContext
→ enforceDossierStatePolicy si applicable
→ controller
→ service
```

Ne pas créer un second RBAC.

`loadAuthorizedDossierContext` :

- charge tenant-safe ;
- applique Owner/grant ;
- anti-énumération ;
- ne décide pas le lifecycle.

Les services gardent :

- transitions ;
- transactions ;
- mutations ;
- activité métier ;
- contrôles race-safe.

---

## 15. Validation et metadata

Zod :

- `strictObject()` ;
- ObjectIds 24 hex ;
- page défaut 1 ;
- limit défaut 20, max 100 ;
- PATCH vide refusé ;
- absent = inchangé ;
- null = effacement champ facultatif ;
- champs système refusés.

Metadata backend :

```text
dossierStatuses
statusTransitions
accessGrantStatuses
accessRevocationReasons
businessActivityActions
```

Frontend :

```text
aucune liste statique concurrente
```

---

## 16. UX

Surfaces :

```text
Liste
→ trouver / filtrer

Drawer
→ Informations / Accès / Activité

Dialog
→ création / modification

Page Dossier
→ véritable espace de travail
```

Route de travail :

```text
/workspaces/:workspaceId/dossiers/:dossierId
```

Seul `ACTIVE` est un contexte opérationnel.

Pas de :

```text
backend currentDossier
Redux activeDossierId comme autorité
localStorage activeDossierId comme autorité
```

Le drawer ne devient jamais l'espace de travail principal.

---

## 17. Autocomplétion adresse

Fournisseur initial :

```text
Géoplateforme / IGN
→ données BAN
```

UX :

```text
3 caractères minimum
debounce ~300 ms
StreetAddress
max 8 suggestions
AbortController
fallback manuel permanent
```

Architecture :

```text
DossierForm
→ hook local
→ provider/adapter
→ service externe
```

Persistance M-001 :

```text
address
postalCode
city
```

Pas de payload fournisseur, coordonnées ou identifiant BAN stocké.

Tests : provider mocké, jamais le réseau réel.

---

## 18. Bootstrap / données initiales

M-001 :

```text
aucune migration historique
aucun seed Dossier
```

Le premier bêta Workspace peut tester M-001 comme Owner.

M-002 :

- bootstrap Produits canoniques initiaux.

M-003 :

- bootstrap Fournisseurs / Articles / catalogues de référence.

Les bootstraps futurs sont versionnés, idempotents, testés et traçables.

---

## 19. Infrastructure tests à corriger en premier

Le dépôt dérivé utilise encore certains noms de DB hérités du Core.

Première modification de la branche M-001 :

```text
Vitest / Supertest
→ saas_fiches_techniques_gms_test

Playwright
→ saas_fiches_techniques_gms_e2e_test
```

Conserver impérativement la garde E2E `_e2e_test`.

---

## 20. Stratégie de tests

Voir :

```text
docs/m001/M-001-TEST-STRATEGY.md
```

4 E2E M-001 :

```text
1. Owner → création → drawer → page Dossier
2. affectation membre autorisé
3. membre sans grant → liste/URL refusées
4. suppression → grants révoqués → restauration PAUSED sans restauration des accès
```

Avant PR prête :

```bash
npm run format:check
npm run release:check
```

Ne jamais annoncer une gate verte sans résultat réel.

---

## 21. Ordre d'implémentation

Autorité :

```text
docs/m001/M-001-ACCEPTANCE-IMPLEMENTATION.md
```

Résumé :

```text
0. préconditions Git / PR #9 / gate
1. isolation DB tests produit
2. descriptors / registries
3. modèles
4. Zod / DTO
5. BusinessActivity
6. middleware scope/state
7. services Dossier
8. services grants
9. onMemberRemoved
10. routes/controllers
11. RTK Query/routes frontend
12. liste
13. DossierForm/Dialog
14. Drawer
15. page de travail
16. autocomplétion
17. tests frontend
18. E2E
19. gates
20. docs + PR
```

---

## 22. Granularité Git

Branche :

```text
feature/m001-dossiers-access
```

Une seule PR M-001.

Des commits intermédiaires cohérents sont attendus, mais aucune micro-PR par modèle, middleware ou écran.

Ne pas mélanger M-002/M-003/M-004 dans ce lot.

---

## 23. Premier objectif de la prochaine conversation

Après vérification Git :

### Si PR #9 n'est pas encore fusionnée

- vérifier sa gate ;
- ne pas coder M-001 ;
- finaliser/merger la PR documentaire selon l'état réel.

### Si PR #9 est fusionnée et la gate post-merge verte

1. synchroniser `main` ;
2. créer `feature/m001-dossiers-access` ;
3. corriger les noms des DB de tests produit ;
4. ajouter les registries/descriptors M-001 et leurs tests ;
5. seulement ensuite commencer les modèles métier.

À chaque étape :

```text
expliquer
→ implémenter
→ tester
→ vérifier
→ documenter
```

Le code réel et les tests réellement exécutés priment toujours sur ce handoff.
