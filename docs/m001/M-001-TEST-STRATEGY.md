# M-001 — Stratégie de tests

**Statut :** VALIDÉ — exécution finale locale réussie le 2026-09-21  
**Date de validation :** 2026-09-21  
**Périmètre :** Dossiers, DossierAccessGrant, BusinessActivityEvent, autorisation, lifecycle, frontend et E2E

---

## 1. Principe

Les tests Core restent obligatoires mais ne remplacent jamais les tests métier M-001.

La couverture M-001 suit le risque :

```text
unitaires / services
→ règles métier

intégration backend
→ MongoDB / transactions / tenancy / RBAC / routes

frontend Vitest + RTL
→ comportements utilisateur et consommation des contrats backend

Playwright
→ quelques parcours critiques réellement transversaux
```

Les tests automatisés ne doivent jamais dépendre d'une API externe réelle.

---

## 2. Checkpoint backend exécuté

Le checkpoint backend M-001 a été exécuté localement le 2026-09-21 sur :

```text
feature/m001-dossiers-access
c8e8f676dfaeebd69180cae6030d1304627ee088
```

Résultats communiqués :

```text
npm run release:verify → vert
npm run lint           → vert
npm test               → vert
```

Cette preuve autorise le passage au frontend. Elle ne remplace pas les tests frontend, les E2E ni `release:check` complet avant PR.

### Gate locale finale exécutée

Après implémentation complète du frontend et des E2E M-001, l'utilisateur a confirmé le 2026-09-21 :

```text
npm test
→ vert

npm run test:e2e
→ 11/11 verts
→ 7 parcours Core hérités
→ 4 parcours métier M-001

npm run release:check
→ vert
```

Le premier lancement de `npm test` après modification du `.env` de développement a été bloqué volontairement par la garde `_test`. La configuration locale a été corrigée avec un `.env.test` ignoré par Git pointant vers :

```text
mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_test?replicaSet=rs0
```

Ce garde-fou doit rester intact : les tests backend ne doivent jamais vider la base de développement.

---

## 3. Isolation des bases de tests

Le produit doit utiliser ses propres bases logiques :

```text
Vitest / Supertest
→ saas_fiches_techniques_gms_test

Playwright
→ saas_fiches_techniques_gms_e2e_test
```

La branche M-001 a aligné les configurations concernées sur ces noms produit avant l'ajout des tests métier.

La garde E2E imposant le suffixe `_e2e_test` reste obligatoire et est conservée.

Aucun test M-001 ne peut viser la base de développement.

---

## 4. Registry RBAC produit

Tests obligatoires :

- les six permissions M-001 sont enregistrées dans le registre actif ;
- aucune constante Core n'est modifiée ;
- le descriptor produit enrichit le rôle système `owner` avec les six permissions M-001 ;
- aucun autre rôle système Core ne reçoit automatiquement une permission Dossier en M-001 ;
- une permission métier inconnue est refusée par les mécanismes Core existants ;
- les rôles personnalisés peuvent recevoir les permissions métier lorsque l'acteur possède lui-même ces permissions.

Permissions M-001 :

```text
dossier:read
dossier:create
dossier:update
dossier:lifecycle:update
dossier:access:read
dossier:access:manage
```

---

## 5. Registries et metadata métier

Tester les sources backend canoniques :

```text
DOSSIER_STATUS_REGISTRY
DOSSIER_STATUS_TRANSITIONS
DOSSIER_ACCESS_GRANT_STATUS_REGISTRY
DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY
BUSINESS_ACTIVITY_ACTION_REGISTRY
```

Vérifications :

- valeurs attendues ;
- absence de doublon ;
- transitions exactes ;
- labels exposés par metadata ;
- réponse metadata dérivée des registries ;
- aucune liste métier indépendante nécessaire côté frontend.

---

## 6. Validation Zod

Cas minimum :

### Params

- `workspaceId` ObjectId valide ;
- `dossierId` ObjectId valide ;
- `membershipId` ObjectId valide ;
- syntaxe invalide → 400 avant Mongoose.

### Liste

- page par défaut 1 ;
- limit par défaut 20 ;
- limit > 100 refusée ;
- status inconnu refusé ;
- search trimé ;
- objets stricts et paramètres inconnus refusés selon le contrat.

### Création

- nom seul accepté ;
- nom vide refusé ;
- longueurs maximales ;
- email invalide refusé ;
- téléphone permissif mais borné ;
- localisation nullable/facultative ;
- champs système client refusés :
  - workspace ;
  - status ;
  - createdBy ;
  - updatedBy ;
  - deletedAt ;
  - accessGrants.

### PATCH

- body vide refusé ;
- absent = inchangé ;
- null = effacement d'un champ facultatif ;
- status refusé sur PATCH général.

### Lifecycle

- status dérivé du registry ;
- reason trimé, max 500 ;
- obligation métier du reason vérifiée dans le service selon la transition.

---

## 7. Modèle Dossier

Tester au minimum :

- ownership Workspace obligatoire et immutable ;
- statut initial ACTIVE imposé par le backend ;
- createdBy / updatedBy présents ;
- champs lifecycle conformes ;
- validation des longueurs ;
- indexes nécessaires aux requêtes de liste/recherche réellement implémentés ;
- aucune suppression physique exposée par le module.

Le modèle ne doit pas contenir d'historique lifecycle redondant de type `pausedAt`, `archivedAt`, etc. sans contrat supplémentaire.

---

## 8. DossierAccessGrant

Tests de modèle/service :

```text
aucun grant
+ PUT
→ nouveau ACTIVE
→ 201

ACTIVE existant
+ PUT
→ grant courant
→ 200
→ aucun doublon

ancien REVOKED uniquement
+ PUT
→ nouveau ACTIVE
→ ancien conservé

ACTIVE
+ DELETE
→ REVOKED
→ 204

aucun ACTIVE
+ DELETE
→ 204
→ aucun faux changement
```

Invariants :

- même Workspace entre grant, Dossier et WorkspaceMember ;
- cible WorkspaceMember ACTIVE ;
- cible Owner interdite ;
- un seul grant ACTIVE courant par couple membre + Dossier ;
- historique REVOKED préservé ;
- une nouvelle affectation ne réactive jamais une ligne REVOKED ;
- appels concurrents ne créent jamais plusieurs grants ACTIVE.

---

## 9. Autorisation et tenancy

Tests d'intégration obligatoires :

### Workspace

- acteur Workspace A → Dossier Workspace B : 404 anti-énumération ;
- PlatformRole seul → aucun accès métier implicite ;
- WorkspaceMember non ACTIVE → accès refusé selon Core.

### Scope Dossier

- non-owner sans grant ACTIVE → même famille 404 que Dossier inexistant ;
- grant REVOKED → aucun accès ;
- grant ACTIVE d'un autre Dossier → aucun accès ;
- Owner → scope Dossier implicite ;
- frontend / URL ne devient jamais une preuve d'autorisation.

### Permissions

Un rôle personnalisé de test doit permettre de vérifier séparément :

- read ;
- create ;
- update ;
- lifecycle ;
- access read ;
- access manage.

Une permission manquante doit être refusée même avec un grant ACTIVE.

---

## 10. Liste Dossiers

Tester :

- Owner → tous les Dossiers autorisés du Workspace selon filtres ;
- non-owner → intersection Workspace + grants ACTIVE ;
- aucune post-filtration JavaScript de sécurité ;
- défaut ACTIVE + PAUSED ;
- filtre explicite ARCHIVED ;
- DELETED hors flux normal et contrôlé ;
- recherche nom / enseigne / ville / code postal ;
- pagination stable ;
- aucune ressource d'un autre Workspace.

---

## 11. Création Dossier

### Owner

```text
POST
→ Dossier ACTIVE
→ aucun DossierAccessGrant Owner
→ DOSSIER_CREATED
```

### Non-owner disposant explicitement de dossier:create

```text
POST
→ Dossier ACTIVE
+ grant ACTIVE créateur
+ BusinessActivityEvent
→ une seule transaction
```

Rollback obligatoire si une écriture indispensable échoue.

---

## 12. Mise à jour des informations

Tester :

- ACTIVE accepté ;
- PAUSED accepté ;
- ARCHIVED refusé ;
- DELETED refusé ;
- changedFields calculés côté backend ;
- aucun événement lorsque le PATCH ne change effectivement rien ;
- `DOSSIER_UPDATED` créé lorsque changement réel ;
- metadata activité minimale, sans body complet.

---

## 13. Lifecycle Dossier

Transitions autorisées :

```text
ACTIVE   → PAUSED | ARCHIVED | DELETED
PAUSED   → ACTIVE | ARCHIVED | DELETED
ARCHIVED → PAUSED | DELETED
DELETED  → PAUSED
```

Transitions explicitement refusées :

```text
ARCHIVED → ACTIVE
DELETED  → ACTIVE
DELETED  → ARCHIVED
```

Tester également :

- même statut → 200 idempotent ;
- même statut → aucun faux événement ;
- suppression exige reason ;
- restauration exige reason ;
- reason facultatif pour les autres transitions ;
- statut incompatible → 409.

---

## 14. Effets lifecycle sur les grants

Tester :

```text
ACTIVE → PAUSED
→ grants conservés

PAUSED → ACTIVE
→ grants conservés

ACTIVE/PAUSED → ARCHIVED
→ grants conservés

ARCHIVED → PAUSED
→ grants conservés

* → DELETED
→ tous grants ACTIVE REVOKED
→ reason DOSSIER_DELETED

DELETED → PAUSED
→ anciens grants restent REVOKED
```

La suppression forme une transaction unique :

```text
status Dossier
+ champs deleted*
+ révocation grants
+ activités de révocation
+ activité de changement de statut
```

Une erreur obligatoire doit rollback l'ensemble.

---

## 15. Lifecycle WorkspaceMember REMOVED

Test d'intégration réel via le point Core `onMemberRemoved`.

Précondition :

```text
WorkspaceMember ACTIVE
+ plusieurs DossierAccessGrant ACTIVE
```

Après retrait :

```text
WorkspaceMember REMOVED
+ grants REVOKED
+ reason WORKSPACE_MEMBER_REMOVED
+ BusinessActivityEvent par révocation réelle
```

Le tout dans la session MongoDB Core.

Test fail-closed :

```text
handler produit échoue
→ retrait WorkspaceMember rollback
→ grants restent cohérents
```

Une réinvitation ultérieure ne restaure aucun ancien grant.

---

## 16. BusinessActivityEvent

Tests :

- Workspace obligatoire ;
- Dossier nullable ;
- actor nullable pour une action système lorsque le contrat l'autorise ;
- action uniquement depuis le registry ;
- entityType/entityId complets ;
- document immuable ;
- metadata objet contrôlé et borné selon l'implémentation retenue ;
- événements écrits dans la transaction métier correspondante ;
- aucun événement sur no-op/idempotence sans changement réel.

Lecture :

- `dossier:read` permet les activités générales du Dossier ;
- les événements d'affectation exigent en plus `dossier:access:read` ;
- aucune activité d'un Dossier hors scope ;
- aucune lecture de l'AuditLog Core par l'endpoint métier.

---

## 17. Contrat HTTP / Supertest

Les 10 endpoints M-001 doivent être couverts au niveau HTTP :

```text
GET    /dossiers
GET    /dossiers/metadata
POST   /dossiers
GET    /dossiers/:dossierId
GET    /dossiers/:dossierId/activity
PATCH  /dossiers/:dossierId
PATCH  /dossiers/:dossierId/status
GET    /dossiers/:dossierId/access-grants
PUT    /dossiers/:dossierId/access-grants/:membershipId
DELETE /dossiers/:dossierId/access-grants/:membershipId
```

À couvrir :

- 200 / 201 / 204 attendus ;
- 400 validation ;
- 401 non authentifié ;
- 403 permission Workspace manquante ;
- 404 anti-énumération Dossier / membership hors Workspace ;
- 409 lifecycle impossible / membership cible non ACTIVE.

La route `/metadata` doit être déclarée avant `/:dossierId`.

---

## 18. Frontend — RTK Query

Tester :

- endpoints alignés avec le contrat backend ;
- paramètres page/search/status ;
- invalidation après création/modification/lifecycle/grant ;
- metadata chargées depuis le backend ;
- aucun mapping de statuts ou actions métier concurrent dans le frontend.

Le frontend ne reconstruit jamais une règle d'autorisation backend à partir des seules metadata.

---

## 19. Frontend — liste Dossiers

RTL couvre :

- loading ;
- erreur + retry ;
- état vide ;
- données ;
- recherche ;
- filtre de statut ;
- pagination ;
- boutons selon permissions ;
- labels de statut issus des metadata ;
- `Voir` ouvre le drawer ;
- `Ouvrir` navigue uniquement lorsqu'ACTIVE.

---

## 20. Frontend — Dialog Dossier

Tester :

- création nom seul ;
- champs facultatifs ;
- édition ;
- null / effacement ;
- erreurs frontend ;
- erreurs API ;
- pending state ;
- succès → fermeture + toast + invalidation/refetch ;
- aucun auto-open obligatoire après création.

Le même formulaire métier est réutilisé entre création et édition.

---

## 21. Frontend — Drawer

Tester :

```text
Informations
Accès
Activité
```

et :

- ouverture/fermeture ;
- ouverture du drawer ne change pas l'URL du contexte de travail ;
- Owner affiché comme accès implicite, sans faux grant ;
- gestion grants selon permissions ;
- actions lifecycle issues des metadata ;
- confirmations sensibles ;
- activité filtrée selon la réponse backend.

---

## 22. Frontend — page de travail Dossier

Tester :

- route `/workspaces/:workspaceId/dossiers/:dossierId` ;
- ACTIVE → page de travail ;
- PAUSED / ARCHIVED / DELETED → aucun contexte opérationnel ;
- retour Dashboard Workspace ;
- changement de Dossier par navigation explicite ;
- aucun `activeDossierId` localStorage/Redux utilisé comme autorité.

---

## 23. Autocomplétion d'adresse

Les tests utilisent un provider mocké/fake.

Aucun test automatisé ne dépend du réseau IGN.

Cas :

```text
< 3 caractères
→ aucun appel

>= 3
→ appel après debounce

nouvelle saisie
→ requête précédente annulée

suggestion choisie
→ address/postalCode/city renseignés

provider indisponible
→ saisie manuelle toujours utilisable

aucun résultat
→ saisie manuelle

submit manuel
→ fonctionne
```

Le payload brut fournisseur n'est jamais envoyé au backend.

---

## 24. E2E Playwright M-001

Playwright reste volontairement ciblé.

### E2E 1 — Owner / création / travail

```text
login Owner
→ Workspace
→ Dossiers
→ créer un Dossier
→ Dossier visible
→ drawer consultable
→ ouvrir la vraie page Dossier
```

### E2E 2 — Affectation réelle

```text
Owner
→ affecte un WorkspaceMember à un Dossier

membre avec rôle personnalisé autorisé
→ voit le Dossier
→ peut l'ouvrir selon permissions
```

### E2E 3 — Isolation Dossier

```text
membre sans grant
→ Dossier absent de sa liste
→ URL directe du Dossier refusée
```

### E2E 4 — Suppression / restauration

```text
Owner
→ Dossier DELETED
→ disparaît du flux normal
→ grants révoqués
→ restauration
→ PAUSED
→ ancien membre ne récupère pas son accès
```

L'autocomplétion externe n'est pas une dépendance de ces parcours ; la saisie manuelle suffit.

---

## 25. Commandes et gates

Pendant l'implémentation, exécuter les tests ciblés du lot après chaque bloc cohérent.

Avant la PR fonctionnelle M-001, la gate canonique a été exécutée localement et déclarée verte par l'utilisateur :

```bash
npm run release:check
```

Les contrôles locaux demandés ont été confirmés OK le 2026-09-21. La PR M-001 peut donc être ouverte ; la Core Gate de PR puis la Core Gate post-merge restent obligatoires.

### Note sur `format:check`

Au checkpoint backend, `npm run format:check` échoue sur des fichiers Core inchangés, dont `backend/app.js`, indépendamment du choix LF/CRLF. Cette commande n'est actuellement pas incluse dans `release:check` ni dans la Core Gate canonique.

Ce point doit être traité séparément comme besoin générique Core/tooling. Il ne doit pas être corrigé silencieusement dans M-001.

La gate canonique `release:check` exécute actuellement :

```text
release:verify
backend/tooling/E2E lint
backend Vitest
frontend lint
frontend Vitest
frontend build Vite
Playwright E2E
```

La Core Gate GitHub Actions doit être verte sur :

1. le head de la PR ;
2. le merge final sur `main`.

La séquence de readiness est donc :

```text
tests automatisés
→ release:check complet
→ pull local VS Code
→ lancement application
→ validation fonctionnelle + visuelle utilisateur
→ corrections éventuelles
→ relance des gates
→ PR
→ Core Gate PR
→ merge
→ Core Gate post-merge
```

Aucun test vert et aucune validation visuelle ne sont annoncés sans exécution réelle.
