# M-001 — Contrat API REST Dossiers / Magasins + affectations

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21  
**Périmètre :** surface HTTP publique du module M-001 ; les schémas Zod détaillés, codes d'erreur métier et ordre exact des middlewares sont cadrés dans les étapes suivantes.

> Ce contrat fixe la surface REST M-001. Il ne doit pas être rouvert pendant l'implémentation sauf contradiction démontrée par le code réel, un invariant métier validé ou un contrat Core plus récent.

---

## 1. Racine et tenancy

Toutes les routes M-001 sont explicitement rattachées au Workspace :

```text
/api/workspaces/:workspaceId/dossiers
```

`workspaceId` est dérivé de l'URL et n'est jamais accepté depuis le body comme autorité de tenancy.

---

## 2. Surface REST validée

```text
GET    /api/workspaces/:workspaceId/dossiers
POST   /api/workspaces/:workspaceId/dossiers

GET    /api/workspaces/:workspaceId/dossiers/:dossierId
PATCH  /api/workspaces/:workspaceId/dossiers/:dossierId

PATCH  /api/workspaces/:workspaceId/dossiers/:dossierId/status

GET    /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants
PUT    /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants/:membershipId
DELETE /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants/:membershipId
```

Aucun autre endpoint M-001 n'est nécessaire.

---

## 3. GET /dossiers

Permission :

```text
dossier:read
```

Projection de sécurité :

```text
Owner
→ tous les Dossiers autorisés du Workspace selon le filtre demandé

non-owner
→ Dossiers du Workspace
∩ DossierAccessGrant ACTIVE
```

La restriction doit être portée par la requête de données et non par un filtrage frontend ou un post-filtrage applicatif après chargement de tous les Dossiers.

Query params M-001 :

```text
page
limit
search
status
```

Pagination :

```text
page  : défaut 1
limit : défaut 20
limit : maximum 100
```

Sans filtre `status`, la liste normale contient `ACTIVE` et `PAUSED`.

Filtres unitaires supportés :

```text
?status=ACTIVE
?status=PAUSED
?status=ARCHIVED
?status=DELETED
```

Le multi-status n'est pas introduit en M-001.

`ARCHIVED` est accessible explicitement. `DELETED` n'appartient jamais au flux normal et exige en plus l'autorité lifecycle nécessaire pour consulter les ressources supprimées.

`search` reste une recherche métier simple sur les champs pertinents : nom, enseigne, ville et code postal lorsqu'ils sont disponibles.

---

## 4. POST /dossiers

Permission :

```text
dossier:create
```

Le Dossier n'existant pas encore, aucun grant ne peut être exigé avant la création.

Statut initial imposé par le backend :

```text
ACTIVE
```

Le client ne choisit pas le statut initial.

Workspace Owner :

```text
création du Dossier
→ aucun DossierAccessGrant individuel
```

Non-owner explicitement autorisé à créer :

```text
transaction MongoDB
├── création Dossier ACTIVE
└── création DossierAccessGrant ACTIVE pour le créateur
```

La création de la ressource et du grant est atomique.

Réponse de création : `201 Created`.

---

## 5. GET /dossiers/:dossierId

Permission :

```text
dossier:read
```

Conditions : même Workspace + Owner ou grant ACTIVE pour un non-owner + statut compatible.

Comportement par statut :

- `ACTIVE` : consultation normale ;
- `PAUSED` : consultation autorisée ;
- `ARCHIVED` : consultation historique contrôlée ;
- `DELETED` : aucune consultation métier normale, uniquement accès administratif/lifecycle nécessaire à une restauration contrôlée.

Anti-énumération :

```text
Dossier inexistant
OU Dossier autre Workspace
OU Dossier hors scope de l'acteur
→ même famille de réponse 404
```

---

## 6. PATCH /dossiers/:dossierId

Permission :

```text
dossier:update
```

Cet endpoint modifie uniquement les informations générales du Dossier, par exemple : nom, enseigne, localisation/adresse, e-mail documents, téléphone et responsable/interlocuteur.

Il ne modifie jamais :

```text
status
workspace
createdBy
updatedBy fourni par le client
affectations
```

États modifiables :

```text
ACTIVE → oui
PAUSED → oui
ARCHIVED → non
DELETED → non
```

Réponse : `200 OK`.

---

## 7. PATCH /dossiers/:dossierId/status

Permission :

```text
dossier:lifecycle:update
```

Cet endpoint est l'unique surface publique M-001 pour les transitions de lifecycle.

Body conceptuel :

```json
{
  "status": "PAUSED"
}
```

Un champ `reason` peut être accepté par le contrat de validation lorsqu'une transition le justifie ; son caractère obligatoire ou facultatif par transition sera fermé dans le cadrage lifecycle.

Un seul service métier de lifecycle reste l'autorité :

```text
état courant
+ état demandé
+ acteur
+ invariants
→ transition autorisée ou refusée
```

Une demande vers le même statut est idempotente : `200 OK`, aucune nouvelle transition métier ni audit artificiel.

Une transition lifecycle interdite retourne `409 Conflict`.

Il n'existe pas d'endpoints `/pause`, `/archive`, `/delete` ou `/restore` séparés.

---

## 8. Pas de DELETE physique du Dossier

Il n'existe pas :

```text
DELETE /api/workspaces/:workspaceId/dossiers/:dossierId
```

Dans M-001, l'action utilisateur « supprimer » est une transition vers `DELETED` via l'endpoint de statut.

```text
suppression logique
≠
destruction physique
```

La purge physique reste hors M-001.

---

## 9. GET /access-grants

Route :

```text
GET /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants
```

Permission :

```text
dossier:access:read
```

Cette route expose les affectations explicites du Dossier. Le Workspace Owner n'est pas représenté par un grant.

Filtres M-001 :

```text
?status=ACTIVE
?status=REVOKED
défaut = ACTIVE
```

Pagination : page 1 par défaut, limit 20 par défaut, maximum 100.

---

## 10. PUT /access-grants/:membershipId

Route :

```text
PUT /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants/:membershipId
```

Permission :

```text
dossier:access:manage
```

Sémantique : le `WorkspaceMember` ciblé doit disposer d'une affectation ACTIVE à ce Dossier.

Cas :

```text
aucun grant ACTIVE
→ nouveau DossierAccessGrant ACTIVE
→ 201 Created

grant ACTIVE déjà présent
→ aucun doublon
→ retour du grant courant
→ 200 OK

ancien grant REVOKED uniquement
→ conserver l'historique REVOKED
→ créer un nouveau grant ACTIVE
→ 201 Created
```

Invariant tenancy :

```text
membership.workspace
=
dossier.workspace
=
workspaceId de l'URL
```

Une nouvelle affectation exige un `WorkspaceMember ACTIVE`. `SUSPENDED` et `REMOVED` ne reçoivent pas de nouveau grant.

Le Workspace Owner ne reçoit jamais de `DossierAccessGrant` individuel.

---

## 11. DELETE /access-grants/:membershipId

Route :

```text
DELETE /api/workspaces/:workspaceId/dossiers/:dossierId/access-grants/:membershipId
```

Permission :

```text
dossier:access:manage
```

La suppression de relation est logique :

```text
DossierAccessGrant ACTIVE
→ REVOKED
→ revokedAt
→ revokedBy
```

Aucun `deleteOne()` physique du grant n'est exécuté.

L'opération est idempotente : en absence de grant ACTIVE, la réponse reste `204 No Content`.

---

## 12. Compatibilité des endpoints avec le statut Dossier

| Endpoint / action | ACTIVE | PAUSED | ARCHIVED | DELETED |
| --- | --- | --- | --- | --- |
| GET détail | oui | oui | oui, contrôlé | admin/lifecycle uniquement |
| PATCH informations | oui | oui | non | non |
| GET grants | oui | oui | oui | admin contrôlé |
| PUT grant | oui | oui | non | non |
| DELETE grant | oui | oui | non | non |
| PATCH status | selon matrice lifecycle | selon matrice | selon matrice | restauration contrôlée |

La matrice exacte des transitions reste à fermer dans le bloc lifecycle sans modifier cette surface REST.

---

## 13. Contexte Dossier frontend

Il n'existe aucun endpoint :

```text
/open
/activate
/current-dossier
```

`Ouvrir le dossier` est une opération de navigation frontend. Chaque requête backend reste responsable de vérifier le vrai scope d'autorisation.

---

## 14. Réutilisation des ressources Core

Il n'existe pas de top-level :

```text
/api/dossier-access-grants
```

Les grants restent imbriqués sous le Dossier.

Il n'existe pas non plus de route :

```text
/dossiers/:id/available-members
```

La liste des membres affectables est obtenue en composant les `WorkspaceMember` fournis par le Core avec les grants métier du Dossier.

---

## 15. Formats de réponse

Ressource :

```json
{
  "status": "success",
  "data": {
    "dossier": {}
  }
}
```

Liste :

```json
{
  "status": "success",
  "data": {
    "dossiers": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Liste de grants :

```json
{
  "status": "success",
  "data": {
    "accessGrants": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

Les erreurs réutilisent le contrat général du Core ; les codes métier précis seront fixés dans le bloc dédié.

---

## 16. Codes HTTP validés

| Situation | HTTP |
| --- | ---: |
| lecture / modification réussie | `200` |
| Dossier créé | `201` |
| nouveau grant créé | `201` |
| grant déjà actif après PUT | `200` |
| révocation idempotente réussie | `204` |
| body / query invalide | `400` |
| non authentifié | `401` |
| permission Workspace insuffisante | `403` |
| Dossier inexistant, autre Workspace ou hors scope | `404` |
| membership cible inexistant dans le Workspace | `404` |
| transition lifecycle impossible | `409` |
| membership cible non ACTIVE pour affectation | `409` |

---

## 17. Exclusions M-001

```text
pas de DELETE physique Dossier
pas de /purge
pas de /open
pas de /activate-context
pas de top-level /dossier-access-grants
pas de /available-members
pas d'affectations batch
pas d'endpoints Produits / Prix / Fiches techniques
```

---

## 18. Articulation avec le contrat d'autorisation

Le contrat REST est fermé.

L'ordre exact des middlewares et la frontière middleware/service sont désormais validés dans :

```text
docs/m001/M-001-MIDDLEWARES-AUTHORIZATION.md
```

La prochaine étape de cadrage porte sur les validations Zod, les contrats d'erreur puis l'audit métier.
