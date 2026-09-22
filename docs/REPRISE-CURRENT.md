# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : M-001 clôturé — Core 1.2.0 + commit `1504151` en cours d’intégration produit — reprise M-002 après validation de cette intégration**
>
> **Dernière mise à jour : 2026-09-22**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.
>
> **M-001 est fusionné dans `main` via la PR #10. Le head final de PR `91bab9f80bce3b4095f5c806bc45e166729f33b8` a passé la Core Gate #104 avec succès, puis le commit de merge `8a10a859f567d7f038e5fc5e7b436580d3471b89` a passé la Core Gate post-merge #105 selon le résultat signalé par l'utilisateur. Le socle technique M-001 est donc clôturé. Les éventuels ajustements purement visuels découverts ultérieurement seront traités comme un lot UX M-001 post-merge sans rouvrir le cadrage fonctionnel ni l'architecture.**

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

État `main` de référence avant le présent raccord Core :

```text
main
d09ed80e8843e0e3418bf2efc9eec51ff846ef26
Merge pull request #16 from greg44500/core-update/v1.2.0
```

Branche d’intégration Core courante :

```text
core-update/secure-temporary-upload-1504151
```

La branche métier `feature/m002-catalogue-produits` reste le lot fonctionnel actif et devra être réalignée sur `main` après validation puis fusion de cette intégration Core.

Historique M-001 clôturé :

```text
feature/m001-dossiers-access
→ PR #10
→ head final : 91bab9f80bce3b4095f5c806bc45e166729f33b8
→ Core Gate #104 : success
→ merge : 8a10a859f567d7f038e5fc5e7b436580d3471b89
→ Core Gate post-merge #105 : terminée avec succès selon le résultat signalé par l'utilisateur
```

Core ciblé par cette intégration :

```text
repository : greg44500/saas-core-api
version    : 1.2.0
tag        : v1.2.0
commit     : 150415173c973fe39c90b87e8fb9c0f055cce31f
```

Le tag `v1.2.0` reste la dernière release stable. Le commit `1504151…`, postérieur à ce tag, ajoute la primitive générique de téléversement temporaire sécurisé sans nouvelle release ni nouveau tag. Le SHA complet enregistré dans `core-origin.json` est donc l’autorité exacte sur le code Core intégré ; `version` et `tag` décrivent le baseline stable et ne doivent pas être artificiellement incrémentés.

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

Le Workspace Owner reste le rôle système générique `owner`. Le produit déclare ses permissions métier via le point d'extension RBAC applicatif et les compose dans `owner` sans modifier les constantes ou rôles système du dépôt Core. Les profils métier nommés restent exclusivement dans le produit.



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
→ permission métier issue du Role générique Core
→ Dossier du même Workspace
→ DossierAccessGrant ACTIVE
→ statut Dossier compatible
→ capability éventuelle
→ invariants métier
```

Owner :

```text
authenticate
→ Workspace courant valide
→ WorkspaceMember ACTIVE
→ permission métier issue du descriptor produit composé dans le rôle owner
→ aucun grant Dossier individuel
→ statut Dossier compatible
→ capability éventuelle
→ invariants métier
```

Aucun profil métier n'est ajouté au Core. Le rôle `owner` conserve son identité système générique ; seules les permissions applicatives du produit sont composées par le dérivé via le point d'extension prévu.

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
→ Infos / Accès / Activités / Administration

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

## 8.5 Bootstrap métier et profils de rôles — VALIDÉS

Contrat canonique :

```text
docs/domain/INITIAL-DATA-BOOTSTRAP.md
```

Frontière figée :

```text
Core
→ rôles système génériques
→ moteur Role / Permission
→ points d'extension

Produit GMS
→ permissions métier
→ profils/presets métier
→ données de référence
→ bootstrap métier
```

Les rôles métier ne sont jamais ajoutés comme rôles système Core.

Le produit compose ses permissions dans le RBAC actif via le point d'extension applicatif ; le rôle système `owner` conserve son identité Core générique tout en recevant, dans le dérivé, les permissions métier nécessaires.

Les presets Acheteur, Économe, Responsable FT, Contributeur FT et Lecteur métier seront provisionnés progressivement lorsque leurs matrices de permissions seront suffisamment complètes. M-001 ne fige pas artificiellement des permissions futures.

Pour les données initiales :

```text
M-001
→ aucune migration historique
→ aucun seed Dossier

M-002
→ bootstrap Produits canoniques

M-003
→ bootstrap Fournisseurs / Articles / catalogues partageables
```

Le premier bêta M-001 peut être exercé intégralement par un Workspace Owner.

---

## 8.6 Stratégie de tests M-001 — VALIDÉE

Contrat canonique :

```text
docs/m001/M-001-TEST-STRATEGY.md
```

Couverture obligatoire :

```text
backend Vitest / Supertest
→ registries
→ Zod
→ modèles
→ services
→ transactions
→ tenancy
→ permissions
→ lifecycle
→ hook WorkspaceMember REMOVED
→ BusinessActivityEvent
→ 10 endpoints HTTP

frontend Vitest + RTL
→ RTK Query
→ liste
→ Dialog
→ Drawer
→ page Dossier
→ metadata backend-driven
→ autocomplétion mockée

Playwright
→ 4 parcours métier critiques
```

Les tests automatisés ne dépendent jamais du réseau Géoplateforme réel.

La branche d'implémentation doit d'abord remplacer les noms de bases tests hérités du Core par :

```text
saas_fiches_techniques_gms_test
saas_fiches_techniques_gms_e2e_test
```

La garde `_e2e_test` est conservée.

---

## 8.7 Critères d'acceptation et ordre d'implémentation — VALIDÉS

Contrat canonique :

```text
docs/m001/M-001-ACCEPTANCE-IMPLEMENTATION.md
```

Le lot d'implémentation est unique :

```text
feature/m001-dossiers-access
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E métier
→ gates
→ documentation
→ une PR fonctionnelle M-001
```

Aucune migration historique M-001 et aucun seed Dossier ne sont requis.

M-001 ne provisionne pas artificiellement les presets métier dépendant de M-002/M-003/M-004.

---

## 9. Implémentation M-001 — VALIDATION TECHNIQUE FINALE ACQUISE

Le cadrage M-001 reste complet et validé. L'implémentation a commencé sur la branche unique :

```text
feature/m001-dossiers-access
```

M-001 implémente désormais notamment :

- isolation des bases de tests produit ;
- permissions et registries métier ;
- `Dossier` ;
- `DossierAccessGrant` ;
- `BusinessActivityEvent` ;
- validation Zod ;
- metadata backend-driven ;
- autorisation tenant-safe / anti-énumération ;
- services Dossier, lifecycle et grants ;
- hook transactionnel `WorkspaceMember → REMOVED` ;
- 10 endpoints REST M-001 ;
- migration idempotente des indexes M-001.

Le checkpoint backend intermédiaire `c8e8f676dfaeebd69180cae6030d1304627ee088` avait déjà validé localement `release:verify`, le lint et les tests backend.

Validation finale communiquée par l'utilisateur le 2026-09-21 après correction de l'environnement de test local :

```text
npm test
→ vert

npm run test:e2e
→ 11/11 parcours Playwright verts
→ 7 parcours Core hérités + 4 parcours métier M-001

npm run release:check
→ vert
```

La base Vitest/Supertest locale utilise `saas_fiches_techniques_gms_test` via un `.env.test` local ignoré par Git. Playwright conserve sa base isolée `saas_fiches_techniques_gms_e2e_test`.

Les tests backend incluent les tests Core hérités et les tests métier M-001. Les E2E M-001 ne consomment pas le quota d'inscription publique : leurs fixtures provisionnent les identités/workspaces dans la base E2E puis établissent une session via l'API d'authentification, tandis que les parcours Core conservent la couverture réelle de l'inscription.

### 9.1 Point tooling Prettier découvert

`npm run format:check` échoue également sur des fichiers Core inchangés, notamment `backend/app.js`.

Les vérifications locales ont montré que :

- le problème n'est pas spécifique aux fichiers M-001 ;
- forcer `--end-of-line lf` ou `--end-of-line crlf` ne rend pas le fichier Core conforme ;
- `format:check` ne fait actuellement pas partie de `release:check` ni de la Core Gate canonique.

Ce point est donc un candidat de dette générique Core/tooling à traiter séparément dans `saas-core-api`. Il ne doit pas être corrigé silencieusement dans le produit ni servir à masquer une régression M-001.

### 9.2 Suite immédiate

```text
PR #10 ouverte
→ Core Gate de PR
→ merge uniquement après gate verte
→ Core Gate post-merge sur main
→ clôture M-001
→ démarrage du cadrage détaillé M-002
```

Ne pas commencer M-002 sur la branche M-001 avant la fusion et la validation post-merge.
---

## 10. Cadrage M-001 — COMPLET ET VALIDÉ

Le cadrage détaillé M-001 est désormais fermé.

Ont été validés :

```text
périmètre / ownership / tenancy
RBAC et permissions
DossierAccessGrant
contrat REST
middlewares / services
validation Zod
metadata backend-driven
BusinessActivityEvent
lifecycle Dossier
effets lifecycle sur les grants
stockage / rétention applicable
UX liste / Drawer / Dialog / page de travail
autocomplétion Géoplateforme
bootstrap métier
stratégie de tests
critères d'acceptation
ordre d'implémentation
```

Les préconditions d'implémentation ont été franchies :

```text
PR documentaire #9 fusionnée
+
Core Gate post-merge verte sur main
+
feature/m001-dossiers-access créée
+
backend M-001 implémenté et testé localement
```

La suite suit `docs/m001/M-001-ACCEPTANCE-IMPLEMENTATION.md` à partir du frontend.

---
## 11. Points différés non bloquants

- marge semi-nette ;
- Fiches process ;
- OCR / IA ;
- imports avancés ;
- optimiseur détaillé ;
- purge physique des Dossiers et de leur graphe métier ;
- historique administratif complet des invitations Core ;
- modules Produits / Fournisseurs / Tarifs / Fiches techniques tant que M-001 n'est pas clôturé et fusionné.

---

## 12. Règle de reprise

À la prochaine conversation :

```text
KB-START-HERE
→ Git réel du produit
→ core-origin.json
→ présente reprise
→ état réel de la PR M-001 / Core Gate
→ si PR fusionnée et gate post-merge verte : clôturer M-001 puis cadrer M-002
→ sinon : terminer uniquement la séquence PR / gate / merge M-001
```

Ne pas reprendre l'implémentation frontend historique de M-001 sauf régression démontrée par Git, la CI ou un test réel.
