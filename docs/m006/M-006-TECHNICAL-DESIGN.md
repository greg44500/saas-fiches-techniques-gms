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

## Audit de remédiation des 7 échecs HTTP (2026-10-26)

L'exécution locale communiquée par le propriétaire du produit (`vitest v4.1.10`) indique 7 échecs / 7, tous dus à un `404` reçu dès le premier appel, y compris le contrôle cross-Workspace attendu en `403`. L'audit du code source révèle que les descriptors `process-library-workspace` et `process-library-dossier` avaient été placés accidentellement **dans le commentaire d'exemple** de `applicationRoutes.registry.js`, et non dans le tableau `APPLICATION_BACKEND_ROUTE_MODULES`. Ce défaut ne nécessite aucune modification du Core.

Correction : déclaration réelle des deux modules via le point d'extension applicatif, avant la route Dossier générale. Contrôles préventifs : test du registre et du montage, tests stricts Zod (phase/étape/média/révisions), tests HTTP de détection 200/400/401/403/404, recherche, pagination, conflits 409, rollback d'une publication en doublon, audit, isolation Dossier et statut archivé.

**Preuve d'exécution :** la sortie locale fournie établit uniquement l'état **rouge de l'ancien HEAD**. Les nouveaux tests et l'intégration corrigée **ne sont pas encore exécutés** sur la machine locale ; aucun résultat vert n'est revendiqué. Ne pas fusionner avant passage des gates applicables.

## Lot 2 — Identité des lignes et lecture M-004 pour M-006 (2026-10-26)

**Statut : backend commité, tests ajoutés, vérification locale à réaliser ; pas encore de création de Fiche process.**

Le code M-004 confirme que `TechnicalSheetDraft.lines` dispose d'un identifiant ObjectId par ligne, mais que `TechnicalSheetValidation.linesSnapshot` n'enregistrait auparavant que la Référence Produit et l'ordre. Un `productVariantId` n'identifie pas une occurrence : deux lignes peuvent utiliser la même Référence. Remapper par Référence Produit, par nom ou uniquement par ordre risquerait donc d'attribuer un ingrédient à la mauvaise étape.

### Changement compatible côté M-004

- Nouveau champ **facultatif** `sourceLineId` dans les **nouvelles** lignes `TechnicalSheetValidation.linesSnapshot` ; capturé lors de la validation à partir de l'`_id` de chaque ligne de brouillon.
- Aucun changement de l'identité des lignes de brouillon existantes, des calculs économiques, du schéma Core ou des snapshots M-004 historiques ; **aucun backfill destructif**.
- Les anciennes validations dépourvues de `sourceLineId` utilisent exclusivement une identité `validation:<validationId>:index:<index>`, valable **dans cette version uniquement**. Le service indique `requiresExplicitLegacyMapping` ; aucune inférence implicite entre versions.
- Les lignes d'ingrédient individuelles portent une clé `line:<sourceLineId>` quand connue. Le regroupement de Références Produit répète toutes les clés `lineKeys`, sans fusionner la traçabilité.

### API de lecture (pas de mutation)

`GET /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/technical-sheets/:technicalSheetId/composition`

Réponse : identifiant et statut du parent, `draft` et `validated` quand disponibles, `currentSourceKind`, lignes INGREDIENT avec identités et libellés, et `groupedIngredients` sans doublon d'affichage. Aucune quantité, aucun prix, aucun fournisseur, aucune fiche process créée. Les composants `ECONOMAT` M-004 ne sont pas réinjectés artificiellement parmi les ingrédients de fabrication.

Autorisation : `process-sheet:read` par registre applicatif, membership Workspace, accès au Dossier et politique de lecture du statut du Dossier. Parent M-004 en corbeille masqué (`404`), parent archivé consultable en lecture seule. Les droits ne sont pas confondus avec la capacité commerciale ni avec un quota de création.

Tests ajoutés : projection unitaire avec Référence Produit répétée, absence d'identité, snapshots legacy et sélection de lignes ; intégration HTTP (auth, RBAC, tenancy, Dossier et statut parent) ; non-régression de la validation M-004 réelle attestant la présence du `sourceLineId` ; registres de routes et de permissions.

**Suite sécurisée :** implémenter l'agrégat 1:1, le brouillon et les versions validées, puis intégrer les cascades M-004 dans les transactions des services existants **avant** d'autoriser le premier endpoint de création M-006. La gestion des copies doit reconstruire les liens sur les nouvelles lignes cibles. Les tests du nouveau HEAD et la gate restent à exécuter ; aucun statut « vert » revendiqué.

### Déploiement des permissions du lot 2

La permission `process-sheet:read` est nouvelle **après** le lot Bibliothèque. Une exécution historique de `migration:m006-process-library` ne suffit pas à garantir les droits des Owners déjà persistés. Migration distincte `migration:m006-process-composition-permission` ajoutée au manifeste avec dépendance sur le lot Bibliothèque, idempotente via `backfillRegisteredSystemRolePermissions`. L'application ne doit pas être ouverte aux parcours M-006 avant cette réconciliation dans l'environnement cible. Rôles personnalisés non élargis automatiquement. Aucun changement commercial ni nouveau quota.

### Robustesse des références en brouillon

La projection utilise les `productVariant` ObjectId **bruts** des lignes de brouillon, et résout les libellés via une lecture groupée distincte des Références Produit. Une ancienne référence devenue indisponible ne doit pas effacer la clé de ligne ni provoquer un `500` par déréférencement `null` lors d'un `populate`. Le nom peut être `null` jusqu'à la revue des données ; les identifiants et occurrences restent conservés. Test HTTP dédié sur une Référence absente. Ce comportement n'autorise pas la validation automatique d'un process dont la composition n'est pas cohérente.

## Lot 3 — Première interface React de consultation (2026-10-26)

**Statut : frontend de lecture M-006 implémenté et tests RTL ajoutés ; gates et CI de ce HEAD non vérifiées.**

La V1 complète de création/édition/validation des Fiches process n'est **pas** disponible côté backend. L'onglet Dossier « Fiches process » démarre donc comme une **surface de préparation explicite**, sans prétendre afficher des Fiches process sauvegardées ni proposer de fausses actions. Le nombre de Fiches process n'est pas calculable à ce stade ; aucun compteur trompeur.

- Route enfant Dossier `process-sheets`, assemblée dans `application-routes.js` via le module `process-sheets-routes.js`, sans modification du routeur Core.
- Onglet dans le shell Dossier, exposé uniquement pour les utilisateurs disposant conjointement de `process-sheet:read` **et** `technical-sheet:read`. Une barrière côté route répète ce contrôle avant de monter la page ; le backend contrôle toujours membership Workspace et droits Dossier.
- Sélecteur de Fiches techniques M-004 **actives**, recherche et pagination serveur réutilisées via `useListTechnicalSheetsQuery` ; état local piloté par `useDataPagination`. L'ID sélectionné reste dans le paramètre d'URL `?sheet=` (lien partageable, aucune donnée métier dans Redux).
- Panneau de composition alimenté par la seule API existante `GET .../process-sheets/technical-sheets/:technicalSheetId/composition` avec RTK Query ; tags de cache `TechnicalSheet` et `TechnicalSheetDraft` partagés avec M-004. Affichage des deux sources distinctes si présentes, regroupement visuel des variantes répétées sans effacer les lignes, avertissement legacy, références indisponibles, états de chargement/erreur/absence, rafraîchissement manuel par l'état d'erreur.
- Pas d'appel process avec un ID absent (`skip`), pas de mutation M-006, pas de compteur de process, pas d'upload/image, pas d'impression.
- Reprise des primitives UI `DataTable`, `DataPagination`, `EmptyState`, `ErrorState`, `StatusBadge` et des classes d'onglet existantes.
- Tests : composition des routes, visibilité conditionnelle de l'onglet, barrière d'accès, contrat RTK Query, liste/sélection/recherche/pagination et rendu des deux états et des cas limites.

### Gates attendues avant recette

```bash
npm --prefix frontend run test -- src/features/process-sheets src/features/dossiers/pages/dossier-workspace-page.test.jsx src/app/application-routes.test.js src/features/dossiers/dossiers-composition.test.js
npm --prefix frontend run lint
npm --prefix frontend run build
npm run release:check
```

Les commandes doivent être exécutées localement sous le Node 24.x spécifié par le dépôt. **Aucun résultat vert n'est revendiqué pour ce nouveau lot**, et aucune PR/fusion n'est ouverte avant la validation complète.

La prochaine implémentation fonctionnelle est l'agrégat M-006 1:1 avec M-004 et sa cascade transactionnelle ; ensuite seulement l'éditeur, la validation officielle, les historiques, les impressions et les bibliothèques dans l'UI.

## Lot 4 — Rectification du parcours et création stricte après validation M-004 (2026-10-26)

Décision client explicite : page principale = liste des **process créés**, et non répertoire M-004. Bouton « Créer une Fiche process » → modale obligatoire titre + Fiche technique éligible → brouillon process et page de détail. Les explications de sections et champs utilisent `InfoTooltip` (i), non de longs sous-titres. Tous les process du Dossier sont listés via `GET .../process-sheets`, la modale consulte `GET .../process-sheets/eligible-technical-sheets`, la création utilise `POST .../process-sheets`, et l'ouverture `GET .../process-sheets/:processSheetId`. La route de composition M-004 existante reste disponible sous `.../process-sheets/technical-sheets/:technicalSheetId/composition` grâce au routeur composé.

**Nouvelle règle remplaçant les décisions 21 et 26 :** M-004 ACTIVE + `currentValidatedState` réel + **absence de tout TechnicalSheetDraft ouvert** + absence de toute ProcessSheet (quel que soit son statut). S'applique dans l'API d'éligibilité et est revérifiée en transaction à la création. Index MongoDB **unique `technicalSheet`**, portée Workspace/Dossier, audit, RBAC `process-sheet:create` + `technical-sheet:read`, anti-concurrence par fence `processEligibilityRevision` sur la Fiche technique (utilisée aussi à l'ouverture d'une révision M-004), aucune nouvelle capability ni quota. Index et backfill Owner via `migration:m006-process-sheets` enregistrée au manifeste.

L'agrégat `ProcessSheet` est 1:1 avec la Fiche technique. `ProcessSheetDraft` est créé avec `phases: []` et `sourceValidation` exact, en transaction. Le statut du process est **piloté uniquement par le parent** : archive/réactivation, corbeille/restauration dans la même transaction M-004 ; purge parent élimine le process et son brouillon avant suppression de M-004. Aucun archivage autonome. La suppression autonome définitivement physique reste à réaliser dans un lot ultérieur avec tests détaillés.

**Copie inter-Dossier, décision 28 amendée :** M-004 copie vers DRAFT ; aucune Fiche process enfant n'est créée avant validation M-004 cible. La reprise de contenu source pourra être proposée après cette validation, après conception du remappage des ingrédients et de la non-divulgation des bibliothèques locales. Ne pas contourner les préconditions de copie M-004.

**Statut précis :** les API de liste, éligibilité, création et lecture et le frontend correspondant sont codés, avec tests de couverture ajoutés. **L'éditeur de phases/étapes, la sauvegarde métier, les versions validées, l'impression et la suppression autonome ne sont pas livrés. Les tests et la gate du nouveau HEAD ne sont pas exécutés dans cette conversation.**


### Stabilisation du shell Dossier — parse JSX (2026-10-26)

Recette locale communiquée par l'utilisateur : 8 fichiers de tests frontend passent (36 tests), un fichier `dossier-workspace-page.test.jsx` ne charge pas (0 test) à cause d'une chaîne JavaScript tronquée. Audit du composant GitHub : 902 lignes contre 353 sur `main` et présence de blocs dupliqués. La correction **reconstruit depuis le fichier sain `main`**, puis réapplique les seules extensions M-006 : reconnaissance des détails process et techniques, absence de shell et requêtes sautées sur ces postes, compteur serveur des véritables process, onglet conditionné aux deux permissions lecture. Les tests sont étendus aux détails des deux métiers, aux requêtes `skip`, à l'absence de fuite d'un compteur, à l'état zéro et aux permissions. Aucune règle métier n'est modifiée, aucun changement Core. **Nouveaux tests et gate à exécuter localement ; ne pas annoncer de vert sans log.**
