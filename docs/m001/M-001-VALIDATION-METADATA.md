# M-001 — Validation Zod et métadonnées métier backend

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21  
**Périmètre :** validation HTTP M-001, constantes/registries de statuts et exposition des métadonnées métier au frontend

> Ce contrat suit les conventions réellement utilisées par Core 1.1.0 : `z.strictObject()`, validation des params avant le chargement du contexte Workspace, consommation de `req.validated` et vocabulaire métier dérivé du backend.

---

## 1. Principe général

Toute entrée HTTP M-001 est validée avec Zod avant d'être consommée par les middlewares/services concernés.

```text
req.params
req.query
req.body
→ Zod
→ req.validated
→ couches suivantes
```

Le code métier ne doit pas continuer à lire une valeur non validée depuis `req.body`, `req.query` ou `req.params` lorsqu'un schéma existe.

Les objets HTTP utilisent `z.strictObject()` afin de refuser les propriétés inconnues ou contrôlées exclusivement par le backend.

---

## 2. ObjectId

Les identifiants techniques M-001 utilisent le même contrat que Core :

```text
24 caractères hexadécimaux
```

Identifiants concernés :

- `workspaceId` ;
- `dossierId` ;
- `membershipId`.

Un format invalide est rejeté en `400 Bad Request` avant toute requête Mongoose.

La validité syntaxique d'un ObjectId ne constitue jamais une preuve d'existence ni d'autorisation.

---

## 3. Constantes et registries de statuts

Les statuts métier ne sont jamais maintenus sous forme de listes indépendantes dans le frontend.

Pattern cible, analogue aux registries de métadonnées du Core :

```text
DOSSIER_STATUS_REGISTRY
→ value
→ label

DOSSIER_STATUS
→ valeurs runtime dérivées du registre
```

Exemple conceptuel :

```js
DOSSIER_STATUS_REGISTRY = {
  ACTIVE:   { value: 'ACTIVE',   label: 'Actif' },
  PAUSED:   { value: 'PAUSED',   label: 'En pause' },
  ARCHIVED: { value: 'ARCHIVED', label: 'Archivé' },
  DELETED:  { value: 'DELETED',  label: 'Supprimé' },
}
```

Même principe pour les grants :

```js
DOSSIER_ACCESS_GRANT_STATUS_REGISTRY = {
  ACTIVE:  { value: 'ACTIVE',  label: 'Active' },
  REVOKED: { value: 'REVOKED', label: 'Révoquée' },
}
```

Les modèles Mongoose, schémas Zod, services et métadonnées HTTP doivent dériver leurs valeurs de ces constantes/registries.

Interdit :

```text
frontend
→ ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED']

ou

frontend
→ mapping local ACTIVE = "Actif"
```

Le frontend reçoit le vocabulaire métier du backend et gère uniquement sa présentation.

Cette règle est transversale aux futurs modules : tout statut métier persistant doit disposer d'une source backend canonique plutôt qu'une liste statique dupliquée côté client.

---

## 4. Endpoint de métadonnées

Contrat REST :

```text
GET /api/workspaces/:workspaceId/dossiers/metadata
```

Permission :

```text
dossier:read
```

Le backend expose au minimum :

```json
{
  "status": "success",
  "data": {
    "metadata": {
      "dossierStatuses": [
        { "value": "ACTIVE", "label": "Actif" },
        { "value": "PAUSED", "label": "En pause" },
        { "value": "ARCHIVED", "label": "Archivé" },
        { "value": "DELETED", "label": "Supprimé" }
      ],
      "accessGrantStatuses": [
        { "value": "ACTIVE", "label": "Active" },
        { "value": "REVOKED", "label": "Révoquée" }
      ]
    }
  }
}
```

Une fois la matrice lifecycle fermée, cette même métadonnée pourra exposer les transitions structurelles dérivées du backend.

L'exposition d'une transition dans les métadonnées ne remplace jamais l'autorisation serveur de la mutation.

---

## 5. Params

### Workspace seul

```text
{ workspaceId }
```

### Dossier

```text
{ workspaceId, dossierId }
```

### Grant

```text
{ workspaceId, dossierId, membershipId }
```

Tous sont des `z.strictObject()`.

---

## 6. GET /dossiers — query

Schéma conceptuel :

```text
page
→ z.coerce.number()
→ entier >= 1
→ défaut 1

limit
→ z.coerce.number()
→ entier 1..100
→ défaut 20

search
→ string trim
→ 1..120
→ facultatif

status
→ enum dérivé de DOSSIER_STATUS
→ facultatif
```

Sans `status`, le comportement métier reste `ACTIVE + PAUSED`, conformément au contrat REST.

Seules les valeurs numériques provenant naturellement de la query string sont coercées ici.

---

## 7. POST /dossiers — body

Champs métier HTTP validés :

```text
name
brand
location
documentEmail
phone
contactName
```

### name

```text
string
trim
1..120
obligatoire
```

### brand

```text
string trim 1..120
ou null
facultatif
```

### location

Objet facultatif et nullable :

```text
address
→ string trim 1..240 ou null

postalCode
→ string trim 1..20 ou null

city
→ string trim 1..120 ou null
```

Aucune regex française stricte n'est imposée au code postal.

L'identifiant technique éventuel provenant du futur fournisseur d'autocomplétion ne sera ajouté qu'une fois ce contrat technique validé.

### documentEmail

```text
email valide
max 254
ou null
facultatif
```

### phone

```text
string trim 1..40
ou null
facultatif
```

Aucune regex téléphonique nationale stricte n'est imposée.

### contactName

```text
string trim 1..160
ou null
facultatif
```

Le body ne peut jamais fournir :

```text
workspace
status
createdBy
updatedBy
accessGrants
deletedAt
```

Le statut initial `ACTIVE` est imposé par le backend.

---

## 8. PATCH /dossiers/:dossierId — body

Les mêmes champs métier modifiables sont acceptés :

```text
name
brand
location
documentEmail
phone
contactName
```

Sémantique :

```text
champ absent
→ ne pas modifier

champ facultatif = null
→ effacement explicite
```

Le body vide est refusé en `400`.

Le PATCH ne peut jamais recevoir :

```text
workspace
status
createdBy
updatedBy
accessGrants
```

Le lifecycle utilise exclusivement l'endpoint dédié.

---

## 9. PATCH /dossiers/:dossierId/status — body

Schéma conceptuel :

```text
status
→ enum dérivé de DOSSIER_STATUS
→ obligatoire

reason
→ string trim
→ 1..500
→ facultatif syntaxiquement
```

Zod valide uniquement la forme.

Une règle telle que :

```text
telle transition exige un reason
```

appartient au service lifecycle et non au schéma HTTP.

Une demande vers le statut courant reste gérée comme idempotente par le service.

---

## 10. GET /access-grants — query

```text
page
→ entier >= 1
→ défaut 1

limit
→ entier 1..100
→ défaut 20

status
→ enum dérivé de DOSSIER_ACCESS_GRANT_STATUS
→ défaut ACTIVE
```

---

## 11. PUT / DELETE access-grants

Les routes :

```text
PUT    /:dossierId/access-grants/:membershipId
DELETE /:dossierId/access-grants/:membershipId
```

ne nécessitent aucune propriété métier contrôlée par le client.

Le body est vide.

Les valeurs suivantes sont toujours déterminées par le backend :

```text
status
workspace
dossier
workspaceMember
grantedAt
grantedBy
revokedAt
revokedBy
```

---

## 12. Contrat d'erreur de validation

M-001 conserve le contrat HTTP du Core 1.1.0.

Une validation Zod invalide produit :

```text
400 Bad Request
```

avec une erreur opérationnelle Core.

M-001 n'introduit pas, pour ce seul module, un second format global d'erreur ou une structure de codes d'erreur incompatible avec le Core.

Une éventuelle évolution générique du contrat d'erreur devra être traitée dans `saas-core-api` avant intégration produit.

---

## 13. Responsabilité frontend

Le frontend peut utiliser Zod pour l'ergonomie du formulaire, mais :

```text
validation frontend
≠ autorité métier
```

Le backend revalide systématiquement.

Pour les statuts et autres vocabulaires métier :

```text
backend registry/constants
→ endpoint metadata
→ RTK Query
→ composants frontend
```

Le frontend gère :

- labels affichés reçus ;
- ordre/présentation visuelle lorsque le contrat le permet ;
- badges ;
- traductions futures ;
- interactions.

Il ne redéfinit pas le vocabulaire métier.

---

## 14. Prochaine étape

Les validations Zod et le principe de métadonnées backend-driven sont fermés.

Restent à fermer avant implémentation :

```text
audit métier et éventuel prérequis Core
→ lifecycle exact Dossier
→ effets lifecycle sur DossierAccessGrant
→ UX
→ tests / critères d'acceptation / ordre d'implémentation
```
