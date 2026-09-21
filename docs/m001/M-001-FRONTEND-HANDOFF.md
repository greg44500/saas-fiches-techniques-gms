# M-001 — Handoff frontend après validation backend

**Statut :** HISTORIQUE — frontend M-001 implémenté et gate locale finale validée le 2026-09-21
**Date :** 2026-09-21  
**Produit :** `greg44500/saas-fiches-techniques-gms`  
**Branche unique :** `feature/m001-dossiers-access`

---

## 1. Point de reprise impératif

La prochaine conversation doit reprendre **sur la même branche** et ne doit ni recréer le backend ni rouvrir le cadrage M-001 sans contradiction démontrée.

Ordre de reprise :

```text
KB-START-HERE
→ état GitHub réel
→ core-origin.json
→ docs/REPRISE-CURRENT.md
→ présent handoff
→ contrats UX/API/tests M-001
→ code frontend Core réellement présent
→ implémentation frontend
```

Ordre d'autorité :

1. code réel + contraintes DB ;
2. tests/gates réellement exécutés ;
3. contrats fonctionnels validés ;
4. contrats Core 1.1.0 ;
5. architecture/sécurité/guidelines ;
6. dette active ;
7. documentation ;
8. synthèses de reprise.

---

## 2. État Git et Core

Base de la branche :

```text
main
08a12982fd80526a32e2620b0a35c3b1fe108cac
```

Core intégré :

```text
repository : greg44500/saas-core-api
version    : 1.1.0
tag        : v1.1.0
commit     : 8326fb48856dcef151b5ab01495c934951050d6d
```

Checkpoint backend testé localement :

```text
c8e8f676dfaeebd69180cae6030d1304627ee088
```

Résultats communiqués le 2026-09-21 :

```text
npm run release:verify → vert
npm run lint           → vert
npm test               → vert
```

Ne pas annoncer `release:check` complet comme vert à ce stade : le frontend M-001 et les E2E métier ne sont pas encore implémentés.

---

## 3. Workflow de sortie obligatoire

Pour le Core comme pour le produit métier, une branche n'est pas prête à fusionner sur les seuls tests automatisés.

Séquence obligatoire M-001 :

```text
frontend
→ tests frontend
→ E2E métier
→ npm run release:check
→ pull local dans VS Code
→ lancement réel de l'application
→ validation fonctionnelle + visuelle par l'utilisateur
→ corrections éventuelles
→ relance des tests/gates
→ PR M-001 unique
→ Core Gate PR verte
→ merge
→ Core Gate post-merge verte
→ documentation finale
```

Ne pas ouvrir de PR intermédiaire pour le backend seul.

---

## 4. Frontière Core / Produit

Invariant :

```text
Core
→ mécanismes génériques réutilisables

Produit GMS
→ Dossiers, grants, activité, lifecycle, UX métier
```

Utiliser les points d'extension Core déjà présents. Ne pas modifier silencieusement les fondations Core pour satisfaire un besoin générique.

Si un besoin générique apparaît :

```text
saas-core-api
→ correction
→ tests
→ version
→ core-update/vX.Y.Z dans le produit
```

---

## 5. Backend M-001 déjà implémenté

Ne pas le réécrire sans cause démontrée.

Le backend fournit désormais :

- les six permissions `dossier:*` ;
- les registries statuts/transitions/revocation/activity ;
- les modèles `Dossier`, `DossierAccessGrant`, `BusinessActivityEvent` ;
- les validations Zod strictes ;
- les serializers ;
- les services Dossier, grants, lifecycle et activité ;
- l'autorisation tenant-safe avec anti-énumération ;
- le hook transactionnel `WorkspaceMember REMOVED` ;
- les 10 endpoints REST M-001 ;
- les indexes M-001 et leur migration dédiée ;
- les tests backend unitaires/intégration/Supertest.

API à consommer :

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

Le frontend ne doit jamais contourner ou reproduire l'autorisation backend.

---

## 6. Contrat UX à respecter

Surfaces validées :

```text
Liste Dossiers
→ recherche / filtre / pagination

Drawer Dossier
→ Informations
→ Accès
→ Activité
→ lifecycle léger

Dialog
→ création / édition

Page Dossier
→ vrai contexte de travail
```

Route de travail :

```text
/workspaces/:workspaceId/dossiers/:dossierId
```

Seul `ACTIVE` est un contexte opérationnel.

Ne jamais créer :

- endpoint backend `currentDossier` ;
- `activeDossierId` Redux comme autorité ;
- `activeDossierId` localStorage comme autorité.

L'URL sélectionne le contexte UX ; chaque requête backend revalide l'accès.

---

## 7. Métadonnées backend-driven

Le frontend doit charger :

```text
GET /api/workspaces/:workspaceId/dossiers/metadata
```

et utiliser :

```text
dossierStatuses
statusTransitions
accessGrantStatuses
accessRevocationReasons
businessActivityActions
```

Aucune liste statique concurrente de statuts/actions métier ne doit être créée dans le frontend.

Les metadata améliorent l'UX ; elles ne constituent jamais une autorisation.

---

## 8. Points d'extension frontend Core vérifiés

Les fichiers existent réellement sur la branche :

```text
frontend/src/app/application-routes.js
frontend/src/app/application-routes.test.js

frontend/src/app/workspace-navigation.js
frontend/src/app/workspace-navigation.test.js

frontend/src/services/api/base-api.js
frontend/src/store/store.js
```

État actuel :

- `APPLICATION_FRONTEND_ROUTE_MODULES` est vide ;
- `APPLICATION_WORKSPACE_NAVIGATION_MODULES` est vide ;
- `baseApi` est l'unique API slice RTK Query ;
- les features métier doivent utiliser `baseApi.injectEndpoints` plutôt que créer une seconde API slice.

Avant modification, lire ces fichiers et un ou deux modules Core comparables afin de conserver les conventions réelles.

---

## 9. Composants Core réutilisables vérifiés

Réutiliser avant de créer une nouvelle primitive :

```text
frontend/src/components/data-display/data-table.jsx
frontend/src/components/data-display/data-pagination.jsx

frontend/src/components/shared/entity-details-drawer.jsx
frontend/src/components/shared/confirmation-dialog.jsx
frontend/src/components/shared/toast-provider.jsx
frontend/src/components/shared/status-badge.jsx
frontend/src/components/shared/empty-state.jsx
frontend/src/components/shared/error-state.jsx

frontend/src/components/ui/*
```

Le `DataTable` laisse la feature définir ses colonnes métier.

Le `DataPagination` est prévu pour les listes serveur paginées et laisse la feature porter l'état page/limit vers RTK Query.

`EntityDetailsDrawer` fournit la mécanique Sheet/focus/transition ; le contenu Dossier reste dans la feature métier.

---

## 10. Structure frontend recommandée

Respecter l'architecture du projet :

```text
frontend/src/features/dossiers/
  dossiers.api.js
  dossiers-routes.jsx
  dossiers-navigation.js
  components/
  hooks/
  pages/
  tests associés
```

Le découpage exact doit suivre les conventions réellement observées dans les features Core existantes ; ne pas créer de méga-fichier.

Responsabilités :

```text
RTK Query
→ état serveur

Redux Toolkit
→ uniquement véritable état global client si besoin démontré

useState
→ état local UI
```

M-001 ne nécessite pas de slice Redux `activeDossier`.

---

## 11. Ordre d'implémentation frontend

### Étape 11 — RTK Query + routes

Créer les endpoints Dossiers avec `baseApi.injectEndpoints`.

Prévoir les tags/invalidation nécessaires pour :

- liste ;
- détail ;
- metadata ;
- activité ;
- grants ;
- create/update/status/grant/revoke.

Ajouter les routes via `application-routes.js`, sans modifier le routeur principal.

Ajouter la navigation Workspace via `workspace-navigation.js`.

Ajouter immédiatement les tests de composition des routes/navigation.

### Étape 12 — Liste Dossiers

Réutiliser `DataTable` et `DataPagination`.

Couvrir :

- loading ;
- erreur + retry ;
- état vide ;
- recherche ;
- filtre statut ;
- pagination ;
- labels issus des metadata ;
- `Voir` → drawer ;
- `Ouvrir` seulement si ACTIVE.

La sécurité de visibilité reste backend-driven.

### Étape 13 — DossierForm + Dialog

Un seul formulaire pour create/edit.

Champs :

- name obligatoire ;
- brand ;
- location.address ;
- location.postalCode ;
- location.city ;
- documentEmail ;
- phone ;
- contactName.

Respecter absent / null / effacement du contrat backend.

Ne jamais proposer au client de choisir le statut initial.

### Étape 14 — Drawer Dossier

Sections :

```text
Informations
Accès
Activité
```

Prévoir le lifecycle léger et les confirmations sensibles.

Owner :

```text
accès implicite
→ jamais de faux DossierAccessGrant
```

### Étape 15 — Page de travail

Créer :

```text
/workspaces/:workspaceId/dossiers/:dossierId
```

M-001 fournit une vue d'ensemble minimale.

Ne pas anticiper Produits, Prix, Fiches techniques ou Process.

PAUSED / ARCHIVED / DELETED ne doivent pas devenir des contextes de travail actifs.

### Étape 16 — Adresse

Architecture :

```text
DossierForm
→ hook local
→ provider/adapter
→ Géoplateforme / IGN
```

Contrat :

- minimum 3 caractères ;
- debounce environ 300 ms ;
- maximum 8 suggestions `StreetAddress` ;
- `AbortController` ;
- fallback manuel permanent ;
- panne fournisseur non bloquante ;
- persistance uniquement `address/postalCode/city`.

Les tests doivent mocker le provider externe.

### Étape 17 — Tests frontend

Vitest + React Testing Library.

Suivre `docs/m001/M-001-TEST-STRATEGY.md`.

### Étape 18 — E2E

Ajouter exactement les quatre parcours critiques validés :

1. Owner : création → drawer → page Dossier ;
2. Owner : affectation d'un membre autorisé ;
3. membre sans grant : absent de liste + URL directe refusée ;
4. suppression : grants révoqués → restauration PAUSED sans restauration des accès.

---

## 12. Autocomplétion et réseau réel

Les tests ne doivent jamais dépendre du réseau Géoplateforme.

Pendant l'implémentation réelle, vérifier le CORS du fournisseur depuis le navigateur.

Un proxy backend n'est créé que si cette vérification démontre qu'il est nécessaire. Ne pas anticiper une infrastructure non démontrée.

---

## 13. Tests/gates après frontend

Après chaque bloc frontend cohérent :

```text
npm --prefix frontend run lint
npm --prefix frontend run test
```

Avant readiness M-001 :

```text
npm run release:check
```

Puis validation locale réelle de l'application par l'utilisateur.

Ne pas annoncer une gate verte ou une validation visuelle sans preuve.

---

## 14. Point tooling Prettier

Le checkpoint backend a montré que :

```text
npm run format:check
```

échoue aussi sur des fichiers Core inchangés, notamment `backend/app.js`, et reste en échec avec `--end-of-line lf` comme `--end-of-line crlf`.

Cette commande n'appartient actuellement ni à `release:check` ni à la Core Gate canonique.

Conclusion pour M-001 :

- ne pas reformater massivement le Core ;
- ne pas introduire une correction silencieuse dans le produit ;
- traiter ce besoin générique séparément dans `saas-core-api`.

---

## 15. Granularité Git

Une seule branche :

```text
feature/m001-dossiers-access
```

Une seule PR fonctionnelle M-001.

Les écritures GitHub réalisées pendant le backend ont produit de nombreux commits techniques par fichier. Avant la PR finale, réorganiser/squasher l'historique en un petit nombre de commits cohérents, sans perdre la traçabilité fonctionnelle.

Ne pas faire ce nettoyage destructif avant que frontend + E2E + validation locale soient terminés.

---

## 16. Hors périmètre

Ne pas ajouter dans cette reprise :

- Produits ;
- Fournisseurs ;
- Articles ;
- Prix ;
- Fiches techniques ;
- Fiches process ;
- OCR/IA ;
- optimiseur ;
- presets métier finaux dépendants de modules futurs ;
- purge physique du graphe Dossier ;
- capability Dossier non validée.

---

## 17. Clôture du handoff

Ce handoff a rempli son rôle : le frontend M-001, les quatre E2E métier et la gate locale complète ont été validés le 2026-09-21.

Pour toute reprise actuelle, utiliser `docs/REPRISE-CURRENT.md` et l'état réel de la PR M-001. Ne pas reprendre les étapes 11 à 18 sauf régression démontrée.
