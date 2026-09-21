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

La matrice exacte des transitions lifecycle reste à fermer séparément.

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

Les 8 endpoints M-001, leur sémantique, les filtres/pagination, les réponses, les règles de grants, l'absence de suppression physique et l'absence d'endpoint backend d'activation du contexte sont fermés.

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

---

## 9. Ce qu'il reste à fermer avant le premier modèle métier

1. validations Zod ;
2. contrats d'erreur ;
3. audit métier ;
4. matrice exacte des transitions `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
5. effets lifecycle sur les `DossierAccessGrant` ;
6. drawer/liste/gestion des affectations/contexte actif ;
7. source technique d'autocomplétion avec fallback manuel ;
8. migrations/seeds uniquement si besoin démontré ;
9. stratégie de tests ;
10. critères d'acceptation ;
11. ordre d'implémentation ;
12. validation finale M-001.

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
