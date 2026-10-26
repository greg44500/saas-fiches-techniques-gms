# M-006 — Conception technique et séquencement de l'implémentation

**Statut : conception engagée, implémentation partielle — ne pas présenter le module M-006 comme livré.**  
**Date : 2026-10-26**  
**Branche :** `feature/m006-fiches-process`  
**Contrat autoritatif :** `docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md` (validé explicitement par le propriétaire du produit le 2026-10-26).  

## Frontière Core / produit

Les bibliothèques et processus de fabrication sont des modèles métier propres au produit. RBAC, authentification, contexte Workspace, audits, validations des requêtes et composition de routes réutilisent les points d'extension existants du Core intégré v1.2.1. Aucun nouveau framework ni primitive Core dupliquée. JavaScript uniquement.

## Lot 1 — Bibliothèques (backend et tests ajoutés, gates non vérifiées)

- Deux scopes explicites : commun Workspace (`dossier: null`) et local au Dossier. L'identité ne provient jamais de `createdBy`. Une API ne retourne pas les modèles d'un autre Dossier au travers d'un contexte local.
- `ProcessLibraryTemplate` : type `STEP` ou `PHASE`, définition courante strictement validée, statut `ACTIVE/ARCHIVED`, révision optimiste, index d'unicité tenant/scope/type/nom normalisé.
- `ProcessLibraryRevision` : snapshot autonome par numéro de révision, jamais mis à jour en place. Révision initiale numéro 0. Les transitions de statut n'effacent pas les snapshots et créent également un snapshot immuable de la définition inchangée, afin que tout numéro de révision corresponde à une version consultable. Les futures Fiches process devront **copier le contenu adopté** plutôt que suivre la définition vivante.
- Une définition d'étape contient instructions, équipement, durées facultatives en minutes, vigilance et contrôles qualité/sanitaires structurés facultatifs. Une définition de phase est constituée d'étapes matérialisées ; aucune association persistante à un ingrédient précis. Les nombres maximums techniques ne sont pas des valeurs réglementaires. Pas de champ image, photo ou média.
- Mutations en transactions MongoDB, `expectedRevision` pour éviter l'écrasement des écritures, refus d'éditer un modèle archivé. L'archivage empêche l'utilisation par les futurs agrégats M-006, à confirmer lors de l'intégration.
- La publication est une **copie explicite** du modèle local vers un modèle Workspace distinct, avec permission locale, permission Workspace et permission de publication. Aucune mise à jour automatique du contenu source ou de ses usages.
- Les actions sont enregistrées dans `BusinessActivityEvent`, avec uniquement les métadonnées utiles (pas de contenu détaillé).
- Suppression physique de modèles différée jusqu'à l'existence du comptage des usages et de la protection transactionnelle contre une suppression concurrente.
- Des tests HTTP Supertest couvrent versionnement, archivage, limites de scope, publication, doublons et refus des champs illustration. **Tests non exécutés dans cette conversation.**

### API Lot 1

- `GET /api/workspaces/:workspaceId/process-library/steps|phases`
- `POST /api/workspaces/:workspaceId/process-library/steps|phases`
- `GET /api/workspaces/:workspaceId/process-library/steps|phases/:templateId`
- `GET .../:templateId/revisions`
- `PUT .../:templateId` avec `expectedRevision`
- `POST .../:templateId/archive`, `POST .../:templateId/reactivate`
- Les mêmes endpoints locaux sous `/api/workspaces/:workspaceId/dossiers/:dossierId/process-library`
- `POST .../:templateId/publish` **local uniquement**.

Permissions métier : `process-library:read`, `process-library:local:manage`, `process-library:workspace:manage` et `process-library:publish`, accordées au rôle système Owner via l'extension applicative. Les rôles personnalisés ne reçoivent aucun droit implicite : attribution/provisionnement à décider avec les profils du Workspace.

La migration `migration:m006-process-library` installe les index des deux modèles et réconcilie les permissions Owner à l'aide du service de migration existant. Ne jamais l'exécuter sur une base non vérifiée.

## Lots suivants avant livraison complète

1. **Identité stable des ingrédients M-004** : auditer et résoudre les doublons d'une Référence Produit, la relation brouillon/snapshot validé et la copie. Ne pas rétroéditer les snapshots M-004.
2. **Agrégat process** : identité 1:1 unique avec Fiche technique ACTIVE, brouillon/versions immuables, affectations ingrédients aux phases/étapes, règles de validation et concurrence. Le lien doit être unique au niveau de l'index MongoDB. Ne pas activer l'API de création avant intégration de la cascade M-004.
3. **Transitions M-004 atomiques** : archivage, réactivation, corbeille, restauration, purge et copie dans les services existants ; tests transactionnels et rollback obligatoires.
4. **Contrôles et révisions** : adoption explicite de bibliothèque, décalage de composition, durées parallèles, audit, suppression autonome physique conditionnée à parent ACTIVE et permissions.
5. **Frontend** : onglet Dossier, sélection technique éligible, éditeur de phases/étapes, bibliothèque partagée/locale, consultations tablette/mobile, historiques, actions d'édition et impression sans document persistant.
6. **Qualité** : migrations sur base de test dédiée, Vitest/Supertest, tests frontend RTL, E2E Playwright, contrôles tenancy/RBAC/concurrence puis `npm run release:check`. PR et fusion uniquement après validation des preuves et autorisation correspondante.

**Hors lot M-006 V1 : illustrations/photographies, galerie, upload, stockage image, impression illustrée, journal de production et assistant IA.**
