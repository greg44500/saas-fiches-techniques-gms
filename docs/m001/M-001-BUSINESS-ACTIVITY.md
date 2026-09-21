# M-001 — Activité métier du produit

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21  
**Périmètre :** séparation Audit Core / activité métier, événements M-001, sécurité de lecture et transactionnalité

---

## 1. Frontière Core / Produit

Le Core conserve son `AuditLog` pour les événements génériques de sécurité, d'administration et de fonctionnement du socle :

```text
authentification
utilisateurs
Workspace
memberships
rôles
abonnement
administration Platform
```

Le produit GMS possède séparément son journal d'activité métier :

```text
BusinessActivityEvent
→ Dossiers
→ Produits
→ Fournisseurs
→ Articles
→ Prix
→ Fiches techniques
→ autres domaines métier futurs
```

M-001 n'ajoute aucune action Dossier dans les constantes Audit Core et ne crée aucun prérequis d'extension Audit dans `saas-core-api`.

---

## 2. Primitive transversale produit

Conceptuellement :

```text
BusinessActivityEvent
├── workspace       obligatoire
├── dossier         nullable
├── actor           nullable pour une action système
├── action          obligatoire
├── entityType      obligatoire
├── entityId        obligatoire
├── metadata        objet contrôlé par le backend
└── createdAt       système
```

Le détail Mongoose sera défini seulement pendant l'implémentation M-001 après validation complète du module.

Un événement décrit un fait métier réalisé. Il est immuable après création.

Il ne constitue pas :

- un journal technique d'erreurs ;
- une copie de la requête HTTP ;
- une copie de la ressource complète ;
- un remplacement de l'AuditLog Core.

---

## 3. Registry backend-driven

Les actions métier utilisent une source backend canonique.

Pattern :

```text
BUSINESS_ACTIVITY_ACTION_REGISTRY
→ constantes runtime
→ validation
→ persistance
→ metadata HTTP
→ RTK Query
→ frontend
```

Le frontend ne maintient aucune liste statique concurrente des actions ou labels.

Actions M-001 :

```text
DOSSIER_CREATED
→ Dossier créé

DOSSIER_UPDATED
→ Dossier modifié

DOSSIER_STATUS_CHANGED
→ Statut du dossier modifié

DOSSIER_ACCESS_GRANTED
→ Accès au dossier accordé

DOSSIER_ACCESS_REVOKED
→ Accès au dossier révoqué
```

Les futurs modules contribuent à la primitive produit sans modifier le Core.

---

## 4. Métadonnées minimales

Les metadata sont construites explicitement par le backend.

Exemples :

```text
DOSSIER_UPDATED
→ changedFields: ['phone', 'documentEmail']

DOSSIER_STATUS_CHANGED
→ fromStatus
→ toStatus
→ reason si renseigné

DOSSIER_ACCESS_GRANTED
→ membershipId

DOSSIER_ACCESS_REVOKED
→ membershipId
→ revocationReason
```

Le body HTTP complet, les secrets et les données inutiles ne sont jamais copiés dans les metadata.

---

## 5. Transactionnalité

Invariant M-001 :

```text
mutation métier significative
+
BusinessActivityEvent associé
→ même transaction MongoDB
```

Exemples :

```text
création Dossier
+ grant automatique éventuel
+ activité métier
→ atomique

transition vers DELETED
+ révocation des grants
+ activités métier
→ atomique
```

Lorsque le hook Core `onMemberRemoved` révoque des grants produit, il utilise la session Core transmise et crée les événements métier associés dans cette même transaction.

---

## 6. Idempotence

Aucun faux événement n'est créé lorsqu'aucun changement métier réel n'a lieu.

```text
ACTIVE → ACTIVE
→ aucun événement

PUT grant déjà ACTIVE
→ aucun nouvel événement

DELETE grant sans ACTIVE
→ aucun nouvel événement

PATCH sans changement effectif
→ aucun nouvel événement
```

---

## 7. Sécurité de lecture

La présence dans le même Workspace ne suffit pas à exposer toute activité métier.

Lecture de base :

```text
DOSSIER_CREATED
DOSSIER_UPDATED
DOSSIER_STATUS_CHANGED
→ dossier:read
+ Dossier dans le scope réel de l'acteur
```

Actions d'affectation :

```text
DOSSIER_ACCESS_GRANTED
DOSSIER_ACCESS_REVOKED
→ dossier:access:read
+ Dossier dans le scope réel de l'acteur
```

Le service de lecture filtre les événements selon les permissions courantes et le scope Dossier courant.

Un événement ne doit jamais révéler l'existence ou l'activité d'un Dossier hors périmètre de l'acteur.

---

## 8. API M-001

Route :

```text
GET /api/workspaces/:workspaceId/dossiers/:dossierId/activity
```

Query :

```text
page
→ défaut 1

limit
→ défaut 20
→ max 100
```

Chaîne :

```text
authenticate
→ validateRequest
→ loadWorkspaceContext
→ authorizePermission(dossier:read)
→ loadAuthorizedDossierContext
→ controller
→ service activité
→ filtrage des actions selon permissions
```

M-001 ne crée pas encore une page globale `Workspace > Activité métier`. Le modèle reste néanmoins Workspace-scoped pour rendre cette évolution possible ultérieurement.

---

## 9. Relation avec le Core

Exemple lors d'un retrait de membre :

```text
Core
→ WorkspaceMember REMOVED
→ AuditLog Core MEMBER_REMOVED

Produit via onMemberRemoved
→ DossierAccessGrant ACTIVE → REVOKED
→ revocationReason = WORKSPACE_MEMBER_REMOVED
→ BusinessActivityEvent DOSSIER_ACCESS_REVOKED
```

Les deux journaux décrivent des niveaux différents et restent indépendants.

---

## 10. Critère directeur

```text
AuditLog Core
→ sécurité / administration générique

BusinessActivityEvent
→ histoire opérationnelle du produit
```

Aucune activité métier Dossier ne doit obliger à enrichir les constantes Audit du Core.
