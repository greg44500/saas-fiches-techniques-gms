# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : bootstrap technique validé — cadrage global produit VALIDÉ — cadrage détaillé M-001 EN COURS**
>
> **Dernière mise à jour : 2026-09-21**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.
>
> **Aucun module métier GMS n'a encore été implémenté. Aucun modèle métier Mongoose n'a été créé.**

---

## 1. Autorité

Ordre d'autorité :

1. code réel + contraintes DB ;
2. tests/gates réellement exécutés ;
3. contrats fonctionnels validés ;
4. contrats Core correspondant à la version intégrée ;
5. architecture/sécurité/guidelines ;
6. dette active ;
7. documentation opérationnelle ;
8. présente reprise.

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

---

## 2. État Git / Core de référence

Dépôt produit : `greg44500/saas-fiches-techniques-gms`.

Main vérifié au début de cette phase :

```text
3f7de181b63e896c0066d175c644b38f46b4c228
Merge pull request #8 from greg44500/docs/m001-post-core-1.1.0-handoff
```

Core intégré :

```text
repository : greg44500/saas-core-api
version    : 1.1.0
tag        : v1.1.0
commit     : 8326fb48856dcef151b5ab01495c934951050d6d
```

`core-origin.json` est l'autorité de provenance.

Le détail de l'upgrade, des merges et des gates est conservé dans `docs/m001/M-001-REPRISE-APRES-CORE-1.1.0.md` et dans Git.

---

## 3. Prérequis Core M-001 — RÉSOLU

Core 1.1.0 fournit le point d'extension transactionnel `onMemberRemoved` via :

```text
backend/config/applicationWorkspaceMemberLifecycle.registry.js
```

Le produit peut donc révoquer ses relations métier liées à un `WorkspaceMember` dans la même transaction MongoDB que le passage à `REMOVED`, en utilisant la session transmise par Core.

Pour M-001 :

```text
WorkspaceMember SUSPENDED
→ grants conservés ACTIVE
→ accès inopérant car membership non ACTIVE

WorkspaceMember REMOVED
→ grants ACTIVE révoqués dans la transaction Core

REMOVED puis réinvité
→ anciens grants restent REVOKED
→ nouvelle affectation explicite requise
```

Aucun modèle `Dossier` ou `DossierAccessGrant` ne doit être ajouté au Core.

---

## 4. Contrats M-001 déjà validés

### 4.1 Organisation

```text
Workspace
→ plusieurs Dossiers
→ 1 Dossier = exactement 1 magasin en V1
```

Seul le nom du Dossier est obligatoire à la création.

Enseigne, localisation/adresse, e-mail documents, téléphone et responsable/interlocuteur sont facultatifs.

L'autocomplétion d'adresse fait partie de l'UX M-001 mais reste facultative, non bloquante et compatible avec une saisie manuelle.

### 4.2 Invitation et affectation

```text
invitation Core
→ email + roleId
→ acceptation
→ WorkspaceMember
→ affectation Dossier explicite ensuite
```

Aucun magasin n'est préparé dans l'invitation.

Un membre ACTIVE peut temporairement avoir zéro Dossier.

### 4.3 Role et périmètre

Frontière validée :

```text
Core
→ rôles système génériques
→ moteur Role / Permission générique

Produit GMS
→ permissions métier
→ profils/presets Acheteur, Économe, Responsable FT, Contributeur FT, Lecteur
```

Aucun profil métier n'est ajouté aux rôles système du Core. Les profils métier sont des rôles personnalisés définis/provisionnés par le produit en utilisant la primitive générique Core.

Le Workspace Owner reste le rôle système générique `owner`, mais le produit le reconnaît comme autorité métier complète dans son Workspace ; il n'a pas besoin d'un profil métier supplémentaire.



```text
Role
→ QUOI le membre peut faire

DossierAccessGrant
→ OÙ il peut le faire
```

Le Workspace Owner possède implicitement tous les Dossiers de son Workspace et ne nécessite pas de grant individuel.

Un PlatformRole ne donne aucun accès implicite aux données métier d'un Workspace.

### 4.4 Permissions M-001 VALIDÉES

```text
dossier:read
dossier:create
dossier:update
dossier:lifecycle:update
dossier:access:read
dossier:access:manage
```

Administration du Dossier et des affectations reste Owner-only par défaut dans les profils métier nommés. La possibilité de délégation via rôle personnalisé reste ouverte si un besoin métier réel est démontré.

### 4.5 Matrice technique d'autorisation VALIDÉE

Non-owner :

```text
authenticate
→ Workspace courant valide
→ WorkspaceMember ACTIVE
→ permission requise
→ Dossier du même Workspace
→ DossierAccessGrant ACTIVE
→ statut Dossier compatible
→ capability éventuelle
→ invariants métier
```

Owner : même pipeline sans grant individuel, grâce à son périmètre implicite.

Invariants :

- cross-workspace toujours refusé ;
- grant REVOKED jamais autorisant ;
- frontend `activeDossierId` = UX uniquement, jamais preuve de sécurité ;
- un non-owner disposant explicitement de `dossier:create` reçoit atomiquement un grant ACTIVE sur le Dossier qu'il crée.

### 4.6 Statut du Dossier dans l'autorisation

```text
ACTIVE
→ travail métier possible

PAUSED
→ consultation / administration selon permissions
→ pas de contexte de travail métier

ARCHIVED
→ consultation historique contrôlée
→ pas de travail ni édition courante

DELETED
→ absent des flux normaux
→ restauration contrôlée uniquement
```

La matrice lifecycle est validée : `ACTIVE → PAUSED|ARCHIVED|DELETED`, `PAUSED → ACTIVE|ARCHIVED|DELETED`, `ARCHIVED → PAUSED|DELETED`, `DELETED → PAUSED`. Une transition vers `DELETED` révoque atomiquement tous les grants ACTIVE ; une restauration ne les réactive jamais.

---

## 5. Isolation stricte des magasins

Un accès à plusieurs Dossiers permet de changer de contexte, jamais de mélanger les données.

Les futurs prix négociés, prix facturés, références magasin, historiques et valorisations restent strictement contextualisés.

Une copie future de Fiche technique A → B pourra copier la composition mais jamais les prix ni l'historique économique du magasin source.

---

## 6. Stockage, corbeille et exports — VALIDÉ

Contrat canonique : `docs/domain/STORAGE-RETENTION.md`.

### 6.1 Portée du stockage

```text
Workspace
→ capacité / quota de stockage

Dossier
→ consomme la capacité du Workspace
→ aucun quota dur individuel en V1
```

Tant que le Workspace dispose de la capacité et des droits applicables, ses Dossiers peuvent créer leurs ressources métier.

Une ventilation de consommation par Dossier peut servir au pilotage, sans devenir une limite bloquante.

### 6.2 Corbeille métier

```text
standard : 30 jours
minimum  : 7 jours
maximum  : 90 jours
```

La personnalisation éventuelle reste bornée par le backend. L'échéance de purge d'une ressource est figée lors de sa suppression et n'est pas recalculée rétroactivement après un changement de configuration.

### 6.3 Fiches techniques futures

- DRAFT actif : jamais purgé par simple ancienneté ;
- DRAFT supprimé : corbeille puis purge à l'échéance ;
- VALIDATED : conservation historique, aucune purge automatique liée à l'âge ;
- archivage = mécanisme normal de sortie de l'usage courant pour une fiche validée.

### 6.4 Dossiers

Dans M-001, un Dossier `DELETED` reste une suppression logique restaurable et n'est pas purgé automatiquement.

Sa purge physique reste différée jusqu'au cadrage du graphe complet de ses descendants métier.

### 6.5 Exports générés

Les exports reproductibles ne sont pas persistés :

- CSV / XLS(X) : génération à la demande puis destruction du temporaire ;
- PDF : génération uniquement comme pièce jointe temporaire lors de l'envoi d'un document par e-mail, puis destruction après traitement.

La Fiche technique/version structurée reste la source de vérité.

---

## 7. API REST et autorisation M-001 — VALIDÉS

Contrats canoniques :

```text
docs/m001/M-001-API-REST.md
docs/m001/M-001-MIDDLEWARES-AUTHORIZATION.md
```

Les 10 endpoints M-001, leur sémantique, les filtres/pagination, les réponses, les règles de grants, l'absence de suppression physique et l'absence d'endpoint backend d'activation du contexte sont fermés.

L'ordre des middlewares et la frontière middleware/controller/service sont également fermés.

Principes structurants :

```text
authenticate
→ validateRequest
→ loadWorkspaceContext
→ authorizePermission
→ contrôles commerciaux Core applicables aux mutations
→ scope Dossier produit
→ compatibilité statique du statut si nécessaire
→ controller
→ service
```

`loadAuthorizedDossierContext` centralise la résolution tenant-safe du Dossier et le contrôle Owner/grant sans créer un second RBAC. Les transitions lifecycle, transactions, mutations, audit métier et contrôles race-safe restent dans les services.

Ces décisions ne doivent pas être rouvertes sans contradiction démontrée.

### 7.1 Validation Zod et métadonnées métier — VALIDÉES

Contrat canonique :

```text
docs/m001/M-001-VALIDATION-METADATA.md
```

Principes fermés :

- `z.strictObject()` pour params/query/body ;
- ObjectId syntaxiquement invalides rejetés avant Mongoose ;
- pagination `page=1`, `limit=20`, maximum 100 ;
- body Dossier limité aux champs métier autorisés ;
- PATCH vide refusé ;
- champ facultatif absent = inchangé, `null` = effacement explicite ;
- statut initial Dossier imposé par le backend ;
- statut lifecycle validé depuis les constantes backend ;
- body de grant vide, champs système jamais acceptés depuis le client ;
- contrat d'erreur HTTP Core conservé.

Les statuts Dossier et DossierAccessGrant sont définis par registries/constants backend et exposés via :

```text
GET /api/workspaces/:workspaceId/dossiers/metadata
```

Le frontend consomme ces métadonnées via RTK Query et ne maintient aucune liste statique de statuts.

---

## 8. Correction transversale du modèle Produit — VALIDÉE

Le cadrage historique « catalogue Produit propre au Workspace » a été corrigé avant toute implémentation de M-002.

Fondation retenue :

```text
SaaS
→ référentiel Produit canonique partagé

Workspace
→ catalogue d'usage
→ références vers les Produits canoniques
→ aucune copie de l'identité Produit

Dossier
→ utilise le catalogue du Workspace
→ contextualise références commerciales, prix et historiques locaux
```

Même réalité Produit canonique = une seule identité de référence dans le SaaS.

Les variantes de casse, singulier/pluriel et fautes reconnues ne doivent pas créer de doublons. M-002 devra combiner normalisation, alias et recherche de proximité avant création.

Les formes/états/conservations qui modifient réellement l'usage ou le rendement doivent être structurés autour du Produit canonique, par exemple `Carotte → râpée → prête à l'emploi → fraîche`.

Aucune donnée commerciale ou confidentielle tenant ne doit être stockée dans le Produit canonique partagé.

Le schéma Mongoose final, la politique de contribution/modération/fusion et la frontière exacte entre déclinaison et Produit réellement distinct restent à fermer dans M-002.

### 8.1 Catalogues fournisseur partagés et recherche unifiée — VALIDÉS conceptuellement

Les éditions de catalogue fournisseur peuvent être :

```text
GLOBAL_SHARED
→ référence partageable et non confidentielle

WORKSPACE_PRIVATE
→ import privé à un Workspace
```

Un import Workspace reste privé par défaut.

Une ligne de catalogue n'est jamais transformée automatiquement en Produit canonique. Les mappings déjà validés `Fournisseur + référence Article → Produit/déclinaison` sont réutilisés dans les éditions suivantes.

Un catalogue global peut être référencé par plusieurs Workspaces sans copie de ses milliers de lignes.

La recherche métier est unifiée :

```text
portée
→ Mon Workspace
→ Tout le référentiel autorisé

source
→ Toutes
→ Produits canoniques
→ Catalogues fournisseurs
→ Références / Articles fournisseur
```

Les données privées d'un autre Workspace, les tarifs négociés, prix facturés et historiques locaux n'entrent jamais dans la recherche globale.

---

## 8.2 Activité métier et lifecycle Dossier — VALIDÉS

Contrats canoniques :

```text
docs/m001/M-001-BUSINESS-ACTIVITY.md
docs/m001/M-001-DOSSIER-LIFECYCLE.md
```

La séparation est désormais explicite :

```text
AuditLog Core
→ sécurité / administration générique

BusinessActivityEvent produit
→ faits métier GMS
```

Actions M-001 :

```text
DOSSIER_CREATED
DOSSIER_UPDATED
DOSSIER_STATUS_CHANGED
DOSSIER_ACCESS_GRANTED
DOSSIER_ACCESS_REVOKED
```

Les événements métier sont immuables, backend-driven, permission-scoped et transactionnels avec les mutations correspondantes.

API ajoutée :

```text
GET /api/workspaces/:workspaceId/dossiers/:dossierId/activity
```

Le lifecycle est fermé :

```text
ACTIVE   → PAUSED | ARCHIVED | DELETED
PAUSED   → ACTIVE | ARCHIVED | DELETED
ARCHIVED → PAUSED | DELETED
DELETED  → PAUSED
```

`DELETED` révoque tous les grants ACTIVE dans la même transaction. Les anciens grants restent REVOKED après restauration.

Raisons de révocation M-001 :

```text
MANUAL
WORKSPACE_MEMBER_REMOVED
DOSSIER_DELETED
```

Aucune extension du registre Audit Core n'est requise pour ces événements métier.

---

## 8.3 UX Dossier — VALIDÉE

Contrat canonique :

```text
docs/m001/M-001-UX-DOSSIERS.md
```

Surfaces retenues :

```text
Liste
→ recherche / filtres

Drawer
→ Informations / Accès / Activité

Dialog
→ création / modification

Page Dossier
→ véritable espace de travail métier
```

Seul un Dossier ACTIVE peut être ouvert comme contexte de travail.

La route `/workspaces/:workspaceId/dossiers/:dossierId` porte le contexte UX. Aucun `activeDossierId` persistant frontend ni endpoint backend `currentDossier` n'est source d'autorité.

Le formulaire Dossier est réutilisable entre création et édition et s'appuie sur les primitives Dialog Base UI/shadcn déjà présentes dans le Core.

---

## 8.4 Autocomplétion d'adresse — VALIDÉE

Contrat canonique :

```text
docs/m001/M-001-ADDRESS-AUTOCOMPLETE.md
```

Décisions :

```text
Géoplateforme / IGN
→ fournisseur initial

3 caractères minimum
→ debounce ~300 ms
→ StreetAddress
→ max 8 suggestions

fallback manuel
→ permanent
→ jamais bloquant
```

Le formulaire passe par un adapter frontend et ne dépend pas du payload brut du fournisseur.

M-001 persiste uniquement :

```text
address
postalCode
city
```

Aucun identifiant BAN/Géoplateforme, coordonnées ou payload complet n'est stocké.

Aucun seed BAN, table de villes ou proxy backend anticipé n'est créé.

---

## 9. Ce qu'il reste à fermer avant le premier modèle métier

1. migrations/seeds uniquement si besoin démontré ;
2. stratégie de tests ;
3. critères d'acceptation ;
4. ordre d'implémentation ;
5. validation finale M-001.

Après seulement :

```text
branche d'implémentation
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E critiques
→ gate
→ PR
→ documentation
```

---

## 10. Points différés non bloquants

- marge semi-nette ;
- Fiches process ;
- OCR / IA ;
- imports avancés ;
- optimiseur détaillé ;
- purge physique des Dossiers et de leur graphe métier ;
- historique administratif complet des invitations Core ;
- modules Produits / Fournisseurs / Tarifs / Fiches techniques tant que M-001 n'est pas validé.

---

## 11. Règle de reprise

À la prochaine conversation :

```text
Git réel
→ code réel
→ tests/gates réellement validés
→ contrats produit
→ docs/m001/M-001-REPRISE-APRES-CORE-1.1.0.md
→ docs/domain/STORAGE-RETENTION.md
→ présente reprise
```

Ne créer aucun modèle métier Mongoose avant validation détaillée complète de M-001.
