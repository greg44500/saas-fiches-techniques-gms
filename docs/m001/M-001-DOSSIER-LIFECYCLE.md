# M-001 — Lifecycle Dossier et effets sur les affectations

**Statut :** VALIDÉ  
**Date de validation :** 2026-09-21

---

## 1. Statuts

Source backend canonique :

```text
DOSSIER_STATUS_REGISTRY
DOSSIER_STATUS
DOSSIER_STATUS_TRANSITIONS
```

Statuts M-001 :

```text
ACTIVE
PAUSED
ARCHIVED
DELETED
```

Les modèles, validations Zod, services et métadonnées HTTP dérivent de ces valeurs.

Le frontend ne maintient aucune liste statique.

---

## 2. Matrice de transitions

```text
ACTIVE
→ PAUSED
→ ARCHIVED
→ DELETED

PAUSED
→ ACTIVE
→ ARCHIVED
→ DELETED

ARCHIVED
→ PAUSED
→ DELETED

DELETED
→ PAUSED
```

Une demande vers le statut courant est idempotente.

Transitions interdites notamment :

```text
ARCHIVED → ACTIVE
DELETED → ACTIVE
DELETED → ARCHIVED
```

Invariant :

> toute ressource revenant d'un état hors exploitation repasse d'abord par PAUSED.

---

## 3. Sémantique des statuts

### ACTIVE

Dossier opérationnel.

Le travail métier est possible selon permissions, grants, capabilities et invariants des modules concernés.

### PAUSED

Dossier temporairement non opérationnel.

- consultation et administration selon permissions ;
- aucun travail métier nécessitant un contexte actif ;
- les grants existants restent conservés.

### ARCHIVED

Dossier sorti de l'usage courant.

- consultation historique contrôlée ;
- pas d'édition métier courante ;
- pas de contexte actif ;
- les grants existants restent conservés.

### DELETED

Suppression logique forte.

- absent des flux normaux ;
- non utilisable comme contexte ;
- restauration contrôlée seulement ;
- aucun purge automatique M-001 ;
- tous les grants ACTIVE sont révoqués lors de la transition.

---

## 4. Effets sur DossierAccessGrant

### ACTIVE → PAUSED

```text
grants ACTIVE
→ restent ACTIVE
```

Le statut du Dossier rend les actions opérationnelles incompatibles.

### PAUSED → ACTIVE

```text
aucun changement de grant
```

### ACTIVE / PAUSED → ARCHIVED

```text
grants ACTIVE
→ restent ACTIVE
```

Ils continuent à décrire le périmètre autorisé pour la consultation historique.

### ARCHIVED → PAUSED

```text
grants conservés
```

### * → DELETED

```text
tous les grants ACTIVE
→ REVOKED
```

La révocation est exécutée dans la même transaction que le changement de statut.

### DELETED → PAUSED

Les anciens grants restent REVOKED.

```text
restore Dossier
≠ restore permissions
```

Le Workspace Owner retrouve son scope implicite. Les autres membres doivent être réaffectés explicitement.

Un ancien grant REVOKED n'est jamais réactivé ; une nouvelle affectation crée un nouveau grant ACTIVE.

---

## 5. Raisons de révocation

Source backend canonique :

```text
DOSSIER_ACCESS_REVOCATION_REASON_REGISTRY
DOSSIER_ACCESS_REVOCATION_REASON
```

Valeurs M-001 :

```text
MANUAL
WORKSPACE_MEMBER_REMOVED
DOSSIER_DELETED
```

Un grant REVOKED conserve au minimum :

```text
revokedAt
revokedBy
revocationReason
```

Lorsque la révocation est système et qu'aucun acteur humain distinct n'existe, le modèle devra préserver une représentation explicite cohérente plutôt que d'inventer un utilisateur.

---

## 6. Reason du lifecycle

Le champ HTTP `reason` reste syntaxiquement facultatif dans Zod et borné à 500 caractères.

Le service impose :

```text
ACTIVE → PAUSED
→ facultatif

PAUSED → ACTIVE
→ facultatif

ACTIVE / PAUSED → ARCHIVED
→ facultatif

ARCHIVED → PAUSED
→ facultatif

* → DELETED
→ obligatoire

DELETED → PAUSED
→ obligatoire
```

Le caractère obligatoire dépend donc de la transition réelle et reste une règle métier de service.

---

## 7. Transaction DELETED

Une transition effective vers `DELETED` forme une seule transaction métier :

```text
Dossier.status = DELETED
statusChangedAt / statusChangedBy
deletedAt / deletedBy

+
tous les DossierAccessGrant ACTIVE → REVOKED
revocationReason = DOSSIER_DELETED

+
BusinessActivity DOSSIER_ACCESS_REVOKED
pour chaque grant effectivement révoqué

+
BusinessActivity DOSSIER_STATUS_CHANGED
```

Échec d'une étape obligatoire :

```text
→ rollback global
```

---

## 8. WorkspaceMember REMOVED

Le lifecycle Core reste :

```text
WorkspaceMember REMOVED
→ onMemberRemoved produit
→ grants ACTIVE du membership → REVOKED
→ revocationReason = WORKSPACE_MEMBER_REMOVED
→ BusinessActivity DOSSIER_ACCESS_REVOKED
```

Le tout utilise la session MongoDB fournie par Core.

Une réinvitation ne restaure jamais ces grants.

---

## 9. Champs lifecycle du Dossier

Socle recommandé :

```text
status
createdAt
updatedAt
createdBy
updatedBy
statusChangedAt
statusChangedBy
deletedAt
deletedBy
```

M-001 ne duplique pas toute l'histoire dans :

```text
pausedAt
pausedBy
archivedAt
archivedBy
restoredAt
restoredBy
```

L'histoire détaillée appartient au `BusinessActivityEvent`.

---

## 10. Métadonnées HTTP

`GET /api/workspaces/:workspaceId/dossiers/metadata` dérive du backend :

```text
dossierStatuses
statusTransitions
accessGrantStatuses
accessRevocationReasons
businessActivityActions
```

Ces données servent à construire l'UX mais ne constituent jamais une autorisation.

Le service lifecycle demeure l'autorité sur toute transition.
