# M-006 — Réconciliation des compositions M-004 et UX de validation (2026-10-28)

**Branche :** `feature/m006-fiches-process`. **Statut : code et tests committés, aucune gate ni QA locale exécutée. Lot 3 non validé ; lot 4 toujours bloqué.**

Le cas utilisateur `Tartine auvergnate` a révélé une absence de parcours pour adopter la validation officielle M-004 plus récente, y compris après une revalorisation sans changement de fabrication. Les codes de refus serveur étaient confondus dans un seul HTTP 409, tandis que les alertes techniques apparaissaient en ligne dans l'éditeur.

**Implémenté :** champ `ProcessSheet.compositionValidation` optionnel pour la référence courante (repli sur `sourceValidation` d'origine, qui reste immuable) ; comparateur des snapshots officiels sur les données de fabrication, propositions d'identité d'occurrence strictement sûres, mapping manuel pour les autres, retrait explicite possible, transaction MongoDB avec double revision + verrou M-004, droits EDIT+VALIDATE, audit métier sans historique de versions M-006 ; routes GET `/:id/composition-review` et POST `/:id/reconcile`. Le POST de validation utilise désormais la référence courante et expose des codes métier dédiés (ancienne composition, révision ouverte, parent indisponible, révision process modifiée, étape manquante, association invalide). Le Core n'est pas modifié.

**UI :** suppression du bandeau d'avertissement de composition et des erreurs techniques affichées sous les boutons ; action compacte « Composition à actualiser »/« Fiche technique en modification » en en-tête, dialogue Base UI de comparaison et affectation contrôlée avec issue « Retirer l'association », confirmation de validation avec signalement non bloquant des ingrédients non affectés, erreurs en dialogue avec action, distinction « Enregistré » (sauvegarde locale) et « Brouillon »/« Validée » (état métier). Le référencement est explicite et sans pertes silencieuses d'instructions.

**Tests ajoutés/mis à jour, non exécutés :** comparateur (économie seule, changement de quantité, doublons, suppression explicite, cibles invalides), HTTP Supertest (validation M-004 renouvelée, maintien Validée sans changement de fabrication, retour Brouillon sur composition modifiée, 400/403/409, audit, unique process), RTL dialogue et formulaire, contrat RTK Query. Exécution locale nécessaire : suite backend process et migrations, frontend process-sheets, lint backend/frontend, build, E2E métier, `release:check` sur la base dédiée. Vérifier les permissions M-006, l'absence de double association, le rollback en transaction, le rendu mobile/clavier clair/sombre, et les synchronisations RTK Query à la revalidation M-004.

**Référence technique :** `docs/m006/M-006-RECONCILIATION.md`. Le rétablissement des références M-004 n'est pas une revalidation forcée de M-004, un clonage de Fiche process ou un historique M-006. Champ facultatif : aucune migration destructive ; contrôler compatibilité et sauvegarde de DB avant un déploiement. La prise en compte de la composition effectivement différente conserve l'obligation de nouvelle validation explicite.

---

# M-006 — Correctif ciblé du clic Valider (2026-10-28)

**Constat utilisateur :** lors de `POST /:processSheetId/validate`, une `CastError` Mongoose sur `editorialState` signalait `{ $ne: 'VALIDATED' }`. La configuration de production applique `mongoose.set('sanitizeFilter', true)` dans `backend/config/db.js`. Le `mongoose.trusted()` entourant le filtre complet ne suffit pas à signaler comme fiable la valeur opérateur du champ imbriqué.

**Correction confirmée statiquement :** `backend/modules/process/processSheetValidation.service.js` exige désormais `editorialState: PROCESS_SHEET_EDITORIAL_STATE.DRAFT` dans le filtre atomique `findOneAndUpdate`. Cette égalité explicite élimine `$ne` et maintient le verrou de révision `expectedRevision`, la transaction, RBAC et les vérifications M-004. Le schéma, le Core et les migrations restent inchangés.

**Régression ajoutée :** dans `backend/tests/modules/process/processSheet.http.test.js`, chargement explicite de la configuration réelle `backend/config/db.js`, puis scénario de validation HTTP 200 d'un process possédant une phase et une étape documentée **sans aucun ingrédient affecté** ni justification. Vérification de `sanitizeFilter === true`, de l'état `VALIDATED`, de la révision, d'une seule écriture d'audit, du refus d'une seconde validation (409), de l'absence de snapshot M-006 et de la référence officielle M-004 conservée. Ce scénario matérialise les décisions du contrat du 2026-10-27 : les affectations manquantes ne bloquent pas.

**Audit statique complémentaire :** autres opérateurs consultés dans les services process ; `$in` et `$ne` des recherches Mongoose déjà transmis comme valeurs `mongoose.trusted`, et `$type` de l'agrégation est distinct du filtrage Mongoose. Aucun changement opportuniste d'autre module.

**Preuves non obtenues :** aucun test Vitest/Supertest, lint, build, E2E ni `release:check` exécuté après le correctif ; aucun accès à la base MongoDB locale ou au runtime Node 24 du poste de développement. Vérification locale requise avec une base dédiée `_test` : `npx vitest run backend/tests/modules/process/processSheet.http.test.js`, puis `npx vitest run backend/tests/modules/process`, `npm run lint`, `npm --prefix frontend run test -- src/features/process-sheets`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, et `npm run release:check` une fois l'environnement E2E préparé. Refaire en navigateur le cycle validation → sauvegarde modifiée → revalidation, et consulter MongoDB après l'erreur ancienne pour vérifier l'absence d'état partiel.

**Périmètre :** correction d'incident du lot 3 uniquement. La modale de contrôle préalable à la validation et le renommage du compteur d'ingrédients sont des propositions UX **non implémentées**, à traiter séparément après stabilisation. Pas de lot 4, pas de PR ni de merge.

---

# Reprise M-006 — Stabilisation statique du lot 3 (2026-10-28)

**Statut : correctifs et tests committés sur `feature/m006-fiches-process`, non validés par exécution locale.** Le HEAD de départ vérifié était `ec21588561242adb994339613186f5354b6413de`. Ne pas ouvrir le lot 4, de PR ou de merge tant que le lot 3 n'est pas accepté après vérification locale.

## Corrections du lot 3

- **Révisions distinctes :** le PUT brouillon retourne désormais `draft.revision` et `draft.processRevision` (révision de l'agrégat après l'écriture transactionnelle). L'éditeur conserve ces deux jetons séparément. La validation POST envoie la révision d'agrégat la plus récente confirmée, non le compteur de contenu du brouillon. Une revalidation après première validation et nouvelle sauvegarde n'est plus interdite du seul fait que les compteurs divergent ; les gardes dirty/conflit et le contrôle serveur 409 restent en place.
- **Cohérence M-004 :** le service de validation refuse désormais une nouvelle validation M-006 pendant qu'un brouillon de révision M-004 est ouvert, après le verrouillage transactionnel du parent. Un process existant reste consultable ; aucune composition M-004 n'est modifiée.
- **Permissions :** `process-sheet:validate` existe dans le registre métier, le middleware de validation et la migration existante `migration:m006-process-validate-permission`. Aucune migration supplémentaire créée. Son exécution sur la base de développement et les permissions effectives de l'utilisateur restent à confirmer localement.
- **Tests ajoutés :** Supertest — validation/revalidation, sauvegarde identique, jetons distincts, révision périmée (409), droit absent (403), contenu vide (400), révision M-004 ouverte (409), absence d'historique M-006 ; RTL — revalidation avec jetons disjoints et jeton agrégat après PUT ; migration — permission VALIDATE retrouvée par Owner.

## Preuves et vérifications manquantes

La lecture GitHub et l'analyse du code **ne sont pas des tests exécutés**. Aucun nouveau log Vitest, ESLint, build, E2E ou `release:check` n'a été obtenu dans cet environnement. État MongoDB local inconnu. Dernier log utilisateur pré-correctifs : 95 tests frontend M-006, 91 réussis et 4 échoués ; deux erreurs ESLint corrigées depuis, sans preuve d'une relance complète.

Ordre opérationnel : (1) relever branche/HEAD et état Git local ; (2) vérifier la base MongoDB effective sans exposer l'URI ; (3) lire les permissions du rôle effectif et les opérations de migration déjà effectuées ; (4) si nécessaire, exécuter uniquement la migration de permission existante après contrôle de ses dépendances ; (5) reconnexion/actualisation du contexte de droits ; (6) tests backend process et migration, tests RTL process, lint backend/frontend et build ; (7) E2E du cycle de revalidation et `release:check` sur la base dédiée ; (8) QA de présence du bouton, rôles, 409, thème et responsive. En cas d'échec, corriger uniquement les anomalies reproduites, sur la même branche.

**Point de vigilance :** les contenus métier M-006 restent uniques et mutables ; les versions officielles immuables M-004 et les révisions de bibliothèques restent inchangées. Le champ hérité `currentValidatedState` de ProcessSheet n'est pas renseigné.

---

# Reprise M-006 — Fiches process (2026-10-26)

## Correctif ESLint frontend M-006 — 2026-10-27

Log local utilisateur : deux erreurs `no-unused-vars` dans `process-sheets-api.js:169` et `process-sheet-draft-editor.test.jsx:674`. Le hook `useValidateProcessSheetMutation` était destructuré par le module RTK Query mais absent du bloc d'exports, bien qu'utilisé par l'éditeur : correction en l'exportant explicitement. Le test RTL de blocage de validation déclarait un `userEvent.setup()` inutilisé : déclaration retirée et test rendu synchrone. Le test `process-sheets-api.test.js` vérifie désormais également l'export du hook pour prévenir la régression. Correction frontend uniquement ; aucune modification backend, Core, schéma ou migration. Le lint et les tests n'ont pas été relancés dans l'environnement de l'assistant ; résultat vert à confirmer localement. Même branche, aucune PR/merge.

---

## Correctif RTL intégration validation — 2026-10-27

Log local utilisateur Vitest 4.1.11 : **95 tests M-006, 91 réussis, 4 échoués**, tous dans `process-sheet-workspace-page.integration.test.jsx`. Cause commune : le mock complet de `process-sheets-api` n'expose pas le hook `useValidateProcessSheetMutation` nouvellement requis par le vrai `ProcessSheetDraftEditor` ; tous les cas échouent avant leur parcours métier au rendu React.

Correction limitée au fichier de test d'intégration : ajouter `validate: vi.fn()` à `mocks`, exposer `useValidateProcessSheetMutation: () => [mocks.validate, { isLoading: false }]`, supprimer l'assertion devenue obsolète de présence du message « Brouillon enregistré. » après sauvegarde, puisque le statut « À jour » est déjà affiché. Aucun backend, Core, migration ou composant de production modifié dans ce correctif.

**Résultat attendu après relance, non constaté :** 4 tests d'intégration réussis et 95/95 pour la suite M-006. Aucun Vitest, lint, build ou gate exécuté par cet assistant. Conserver `feature/m006-fiches-process`, sans PR ni merge.

---

## Lot 2 — Contrat M-006 rectifié : une Fiche process courante et revalidation (2026-10-27)

**Décision du propriétaire confirmée :** pour chaque Fiche technique M-004, zéro ou une Fiche process M-006 ; la Fiche process validée peut être modifiée. Si une **modification métier réelle est enregistrée**, l'état redevient Brouillon et une validation explicite est requise. Une consultation, saisie locale non sauvegardée ou sauvegarde identique ne doit pas invalider. Le process garde son identité et son contenu courant, **sans historique des anciennes versions métier M-006**. Ne pas toucher aux versions officielles immuables M-004 ni aux révisions historiques des modèles de bibliothèque.

**Modifications du lot : exclusivement documentation.** Contrat fonctionnel `docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md` actualisé, conception `docs/m006/M-006-TECHNICAL-DESIGN.md` clarifiée, cohérence `docs/PRODUCT-SCOPE.md`, `docs/ROADMAP.md`, `docs/DEBT.md`, `docs/domain/DOMAIN-MODEL.md`, `docs/domain/GLOSSARY.md`. Les descriptions historiques datées des anciens lots ne sont pas de nouvelles autorisations d'implémenter une version immuable M-006 ; le nouveau contrat prévaut.

**Points de conception bloquants avant lot 3 :** `ProcessSheet.currentValidatedState` ObjectId sans implémentation effective de validation ; `sourceValidation` immutable ; `ProcessSheetDraft` existant ; représentation et comparaison du contenu courant, contrôle d'un PUT identique, concurrence `expectedRevision`, autorisation `process-sheet:validate`, traçabilité sans copie des anciens contenus et vérification de cohérence M-004. **Aucune décision de migration de données n'a été présumée.** La suppression physique autonome est un autre lot, non lancé.

**État des preuves :** le lot 1 d'aperçu est committé mais aucun retour de tests locaux post-lot 1 n'a été fourni ; le dernier log disponible est antérieur au lot 1 (89/90 avec correctif Base UI depuis). Les modifications du lot 2 sont documentaires et n'ont pas été accompagnées d'une exécution de Vitest, lint, build ou `release:check` par l'assistant. Garder la même branche et **ne pas engager le lot 3** avant validation de ce contrat et des vérifications locales applicables. Aucune PR/merge ni modification `main`.

---

## Lot 1 — Prévisualisation M-006 épurée (2026-10-27)

**Branche conservée :** `feature/m006-fiches-process`. À la demande du propriétaire, les lots suivants attendent chacun la vérification des tests locaux, sans PR ni merge.

**Code :** `frontend/src/features/process-sheets/components/process-sheet-preview.jsx` et `process-sheet-row-actions.jsx`. La prévisualisation ne présente plus de paragraphes d'explication visibles, de sous-titres « Ingrédients de la phase / de l'étape », de badges d'ingrédients ou de numéros « ligne N ». La description du Dialog reste disponible aux technologies d'assistance via `sr-only`. Les phases sont présentées sans carte bordée ; les étapes sont indentées et les ingrédients affichés en texte simple. Les ingrédients affectés directement à une phase sont rendus dans celle-ci et ceux d'une étape exclusivement dans celle-ci, plutôt que d'agréger les affectations de toutes les étapes sous la phase. Les sélections restent basées sur `lineKey` : les occurrences identiques ne sont pas fusionnées. Le bouton d'aperçu dans l'atelier utilise le même composant.

**Tests :** nouveau test `process-sheet-preview.test.jsx` (noms sans numéros, distinction des occurrences identiques, niveau de rattachement, conservation des instructions et champs de détails) et adaptation du test de prévisualisation de liste dans `process-sheets-page.test.jsx`. Pas de modification API, modèles, MongoDB, Core, RTK Query, droits ou cycle de vie.

**État réel :** commits écrits via GitHub, pas de test local, lint, build, QA visuelle ou gate exécutés ici. Le dernier résultat fourni pour l'ancien lot indiquait 89/90 avec un test Base UI corrigé au commit `5c4daa3` sans preuve d'exécution post-correctif. Pour valider ce lot, exécuter les tests du composant d'aperçu, de la liste et de l'éditeur, puis la suite M-006, lint et build ; constater aussi le rendu Desktop/mobile et clair/sombre. Ne pas lancer le lot suivant tant que les résultats ne sont pas confirmés.

**Lots suivants séparés, non commencés :** mise à jour du cadrage canonique pour la nouvelle règle décidée le 2026-10-27 (une unique Fiche process courante par M-004, pas d'historique de versions M-006, validation invalidée à la prochaine modification réellement enregistrée), puis implémentation réelle de la validation et, dans un lot indépendant, de la suppression définitive et sécurisée. Les anciennes mentions de « version officielle immuable / historique consultable » des documents M-006 restent historiquement présentes et doivent être remplacées au prochain lot contractuel avant tout développement du cycle de vie.

---

## Correctif RTL ciblé — Select Base UI et label Outlined (2026-10-27)

**Preuve utilisateur :** exécution locale Vitest v4.1.11, suite M-006 : 9 fichiers, 90 tests, **89 réussis et 1 échec**. Seul le test `process-sheet-create-dialog.test.jsx` « déplace les libellés outlined au focus et garde le libellé relevé après sélection » échoue à `getByRole('option', { name: 'Tartine validée' })`. Le DOM montre `aria-expanded="false"` après `user.click(linked)` sous jsdom/Base UI. Les 12 autres tests de création et les 32 tests du brouillon sont verts dans ce log.

**Correctif limité au test** : utiliser l'helper `selectByKeyboard(user)` existant pour réaliser la sélection dans le scénario Outlined, tout en conservant les assertions de focus, de passage à `filled`, de valeur affichée et de disponibilité de « Créer et ouvrir ». L'autre test « demande uniquement le titre et la Fiche technique éligible » conserve le parcours au clic, ce qui préserve une couverture souris. Aucun code de production, Core ou backend modifié.

**Preuves après commit :** Vitest, lint, build et `release:check` non exécutés depuis cet environnement GitHub ; ne pas annoncer 90/90 tant qu'un nouveau log local n'a pas été fourni. Relancer en premier les 13 tests de la modale, puis les 90 tests M-006, lint et build.

---

## QA visuelle — corrections de modales et liste M-006 (2026-10-27)

Suite aux captures du propriétaire, un lot de présentation a été appliqué sur `feature/m006-fiches-process` :

- Dans les deux modales d'options des étapes, la description auparavant visible est remplacée par le `InfoTooltip` placé après le titre. Une `DialogDescription` `sr-only` conserve la description accessible. Aucun changement sur la validation locale et la sauvegarde explicite.
- Dans la création M-006, seul le `(i)` du titre demeure ; les deux `ProductVariantField` conservent leurs labels Outlined mais sans `helpContent` ni `helpLabel`. Si la liste des Fiches techniques éligibles est chargée et vide, le message exact « Aucune fiche technique éligible » apparaît en `text-destructive`. Le contrôle d'éligibilité serveur et la pagination demeurent inchangés.
- Dans la liste, la colonne technique « Statut » est masquée, sans modifier `ProcessSheet.status` ni les cascades M-004. La colonne « État » conserve Brouillon/Validée (le backend ne délivre actuellement pas de validation M-006). Un bouton `…` ouvre un Popover/Base UI avec actions iconographiques : Ouvrir (navigation effective) et Prévisualiser (GET réel, aperçu non modifiant du **brouillon enregistré**). L'entrée Supprimer est présentée en rouge **mais désactivée et explicitement indisponible** : elle ne doit pas être considérée fonctionnelle avant une implémentation backend réelle.
- Les labels courts de durées « Repos (min) » et « Cuisson (min) » évitent la troncature visuelle de la capture ; leurs noms accessibles conservent « Repos / attente (min) » et « Cuisson / traitement (min) ».
- Les tests RTL de modale de création, édition d'étape et liste ont été adaptés aux changements, notamment lecture serveur du preview, absence de colonne statut, absence de (i) dans les deux champs, présence des (i) des modales, affichage du message vide et action Supprimer désactivée.

**Distinction avec les lots métier NON livrés :** la validation officielle M-006, ses versions immuables, son historique et la suppression physique autonome sont inscrits au contrat fonctionnel `docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md` mais aucun endpoint `POST .../:id/validate` ni `DELETE .../:id` n'existe dans `backend/modules/process/processSheet.routes.js`. Ne pas simuler ces commandes dans React, ni changer le statut technique miroir de M-004 pour simuler une validation. Une implémentation réelle impose cadrage de la concurrence `expectedRevision`, cohérence M-004, modèle de versions officielles, permissions dédiées, audit, transactions et effets de purge sur les brouillons/validations/usages sans altérer la Fiche technique ni la bibliothèque. Avant suppression, préserver la règle parent M-004 ACTIVE et vérifier ses transitions concurrentes, plus le relâchement de l'index d'unicité.

**État des preuves :** dernier log utilisateur disponible sur le lot précédent : 31 tests réussis sur 32 avec une erreur de syntaxe de requête Testing Library, corrigée depuis ; aucun nouveau log local de ce lot n'a été reçu. Aucun test, lint, build, Supertest, gate `release:check` ni QA mobile/clair/sombre exécutés depuis GitHub. Après récupération, lancer les tests de `process-sheet-create-dialog.test.jsx`, `process-sheet-draft-editor.test.jsx`, `process-sheets-page.test.jsx`, puis la suite M-006, lint, build et gates applicables. Pas de PR ou de merge sans preuves et validation.

---

## Correctif RTL — sélecteur dans le groupe Qualité (2026-10-27)

**Log utilisateur Vitest 4.1.11 :** `process-sheet-draft-editor.test.jsx` : 31 tests réussis sur 32. L'unique échec est une erreur JavaScript dans le test « bloque les lignes facultatives incomplètes avant de les placer dans le brouillon » : `within(dialog).getByRole('group', { name: 'Qualité' }).getByRole(...)`. `getByRole` retourne un élément DOM, qui ne possède pas cette méthode. Correctif limité au test : stocker le groupe puis appeler `within(quality).getByRole('button', { name: 'Ajouter un contrôle' })`. Aucun code métier, Core, schéma ou migration modifié. **Exécution après correction non encore communiquée** ; relancer le fichier de 32 tests et les gates applicables avant de conclure.

---

## Lot UX M-006 — modales des compléments d'étape et statuts de sauvegarde (2026-10-27)

**Périmètre :** finition ergonomique du brouillon sur `feature/m006-fiches-process`. Les deux volets « Temps, température et équipements » et « Vigilance, qualité et maîtrise sanitaire » de l'éditeur d'étape ont été remplacés par des boutons ouvrant deux modales dédiées, également consultables en lecture seule. Titre de l'étape, instructions et affectations d'ingrédients restent dans l'éditeur principal. Les états « Renseignés » / « Facultatifs » sont calculés séparément pour chacune des deux catégories.

**Champs :** les saisies utilisent le composant flottant `ProductVariantField` déjà réemployé par M-006 (label Outlined, placeholder d'exemple affiché au focus). Trois durées numériques en colonnes compactes sur écrans adaptés, température séparée, équipements/vigilances en listes ajoutables, contrôles qualité et sanitaires avec instruction, critère attendu et mesure corrective. Les longueurs et bornes du contrat Zod M-006 sont conservées ; les lignes ajoutées mais non renseignées sont refusées en modale avant application au brouillon.

**Transactions UX :** ouvrir la modale effectue une copie locale des champs de la seule catégorie. « Annuler » et fermeture modale jettent cette copie ; « Valider » applique la catégorie au brouillon React sans PUT réseau. Seul le bouton global « Enregistrer le brouillon » lance toujours la mutation avec `expectedRevision` et conserve la gestion 409. Pas de modification serveur, de schéma, de Core ni de migration.

**États textuels :** « À jour » et le message d'enregistrement réussi utilisent `text-success` (vert) ; « Modifications non enregistrées », `text-warning` ; « Erreur d’enregistrement », « Conflit d’enregistrement » et messages d'échec, `text-destructive`. Aucun badge ni fond coloré. Les variables sémantiques existantes assurent les variantes clair/sombre.

**Vérifications :** tests RTL de l'éditeur complétés (ouverture, fermeture, annulation, état local, payload, édition qualité/sanitaire, validation incomplète, lecture seule, états texte). Le test d'édition d'un brouillon complet a été adapté : il ferme désormais la modale avant le clic sur le bouton de sauvegarde qui, correctement, est inert derrière le `Dialog` Base UI. Les tests antérieurs déclarés verts par le propriétaire ne valent pas preuve du nouveau lot : nouveaux tests Vitest, ESLint, build, QA visuelle et gate globale sont à exécuter localement et à journaliser. Aucun merge/PR autorisé sans validation.

---
## Correctif ciblé test de création M-006 (2026-10-27)

Journal utilisateur : **82 tests réussis / 83**, seul échec dans `process-sheet-create-dialog.test.jsx`, scénario « soumet exactement le titre et la référence M-004 choisie ». Après la saisie du titre, le clic jsdom sur le `Select` Base UI ne laisse parfois pas la liste ouverte (`aria-expanded=false`) ; l'assertion ne trouve donc pas l'option « Tartine validée ». Les autres tests de la même modale passent, dont des scénarios `selectByKeyboard()` validant la sélection et la soumission. Correction **test seulement** : le test de contrat du payload utilise l'helper clavier commun déjà éprouvé, puis vérifie le bouton activé, les données envoyées au POST et le callback de création. L'ouverture et la sélection à la souris restent testées dans les tests « demande uniquement le titre » et « déplace les libellés outlined ». Aucune modification de `Select`, de la logique de production, du Core, du backend ou des données.

Gates **non exécutées** dans cet environnement. Relancer les 13 tests de la modale, puis les 83 tests du module process, lint et build. Un nouvel échec du test clic conservé justifierait un diagnostic interaction/positionnement Base UI plus profond, plutôt que de retirer sa couverture.

---

## Reprise — lot UX arborescence structurante M-006 (2026-10-27)

Après captures et validation UX utilisateur, refonte frontend ciblée sur `feature/m006-fiches-process`. L'arbre pilote les phases : création via popover backend Workspace (libellé `FolderPlus Phase` distinct du `+` d'étape), renommage inline via crayon (Entrée / blur = commit du brouillon, Échap = annulation), suppression via corbeille visible au hover/focus et sur tactile. Phase réellement vide = suppression locale immédiate ; avec instructions/ingrédients/étapes = `Dialog` de confirmation. La suppression reste persistée uniquement lors de la prochaine sauvegarde explicite. Le panneau de phase indique `Phase N : Titre` et conserve seulement instructions et ingrédients (plus déplacement avec tooltip). Plus de champ titre ni de bouton « Choisir dans la bibliothèque » à droite. Les étapes continuent d'être complètes dans leur propre éditeur ; leurs boutons iconographiques utilisent un composant tooltip M-006 réutilisable. Focus de texte ajusté localement sans modification de la primitive Core.

Tests RTL du brouillon et intégration page adaptés à l'absence du champ titre de phase dans le formulaire ; ajout de scénarios renommage, suppression et focus. Les tests et gates sont **à exécuter réellement** sur l'environnement Node 24/MongoDB local ; aucun passage au vert ne peut être annoncé depuis cette session. Aucun backend/Core modifié. L'ancien travail de seed Workspace et ses contrats n'est pas repris dans ce lot.

---

## Test frontend M-006 — modal 409 et navigation inert (2026-10-27)

Dernier log local : **20 tests réussis sur 21** dans `process-sheet-draft-editor.test.jsx`. L'unique échec concerne l'assertion du test « ne crée pas de phase dans le brouillon si la création serveur échoue » : après HTTP 409, le `Dialog` « Nouvel intitulé de phase » reste ouvert, ce qui est attendu, et Base UI rend le contenu derrière le modal `aria-hidden` / `inert`. La fonction de test `navigation()` utilisait `getByRole` sans `hidden` et ne pouvait donc pas trouver l'arbre tant que le modal était actif. Le test a été corrigé sans toucher à la production : il vérifie le message 409 et la conservation de la saisie **dans le dialogue**, le ferme via « Annuler », puis vérifie l'absence de phase, le statut « À jour » et l'absence de PUT. Cela préserve le comportement accessible de Base UI et les invariants métier. Exécution des tests après correctif encore à confirmer localement.

---

## Correctif M-006 — erreurs en cascade à l'ouverture du menu (2026-10-27)

Le propriétaire a fourni une nouvelle exécution locale du fichier \`process-sheet-draft-editor.test.jsx\` : **6 échecs, 15 réussites (21 tests)**. Les traces disponibles documentent de nouveau l'absence de l'option « Autre phase… » après clic, avec \`aria-expanded=false\` sur le \`Select\`. Les six échecs ne démontrent pas six anomalies métier distinctes ; ils peuvent découler du même helper \`addFreePhase\`.

**Approche corrective plus robuste :** abandonner \`Select\` pour ce **menu d'actions** (choix d'un titre ou ouverture de \`Dialog\`), au profit de la primitive shadcn/Base UI **Popover** du dépôt, déjà utilisée par le chantier M-006 avant le changement de composant. Le résultat reste un menu déroulant simple **sans recherche** ; les intitulés viennent exclusivement du GET Workspace. Le menu est ouvert via \`PopoverTrigger\` rendant un \`Button\`, les titres et « Autre phase… » sont des boutons d'action explicites, le Popover se ferme avant d'ouvrir le Dialog de création. Aucune mutation Mongoose ni régression de la persistance des titres. Les tests RTL de l'éditeur, du menu isolé et de l'intégration page sont alignés sur les vrais rôles accessibles \`button\` plutôt que les anciens \`option\` de Select.

**Statut de preuve :** le commit est un correctif ciblé, non testé dans le Node/Vitest local de l'utilisateur ; le résultat après ce commit est inconnu. Vérifier dans l'ordre le test isolé \`process-phase-picker.test.jsx\`, les 21 tests de l'éditeur, l'intégration page, puis la suite complète et build/lint. Aucune modification de l'API, backend ou migration sur cette correction.

---

## Correctif frontend M-006 — Select Base UI et exports RTK Query (2026-10-27)

Le propriétaire a exécuté la suite frontend du lot et remonté **12 échecs / 75 tests** (63 réussis) dans \`process-sheet-draft-editor.test.jsx\`. Les traces partagées montrent plusieurs échecs du **même helper** \`addFreePhase\` : après un clic sur la combobox « Ajouter une phase », l'option « Autre phase… » n'est pas trouvée ; le trigger montre \`aria-expanded=false\`. Ces erreurs sont en cascade et ne constituent pas 12 régressions fonctionnelles indépendantes. La cause précise du non-déploiement du menu est à confirmer par une exécution locale, non disponible ici.

Relecture de la primitive shadcn/Base UI existante : le menu M-006 différait du sélecteur M-006 déjà fonctionnel car il ne transmettait pas d'\`items\` explicites au \`Select\`, et son trigger réduit à l'icône \`+\` ne possédait aucun \`SelectValue\`. Correctif conservateur : fournir les options à partir de la réponse backend dans \`items\`, conserver un \`SelectValue\` visuellement masqué mais monté pour le trigger compact, réserver \`SelectItem\` aux **vraies valeurs sélectionnables** (les états chargement/erreur/vide sont de simples textes), et ajouter une suite ciblée \`process-phase-picker.test.jsx\` sur l'ouverture réelle et la sélection.

**Autre défaut avéré et indépendant** : \`process-sheets-api.js\` déclarait les hooks \`useListProcessPhaseTitlesQuery\` et \`useCreateProcessPhaseTitleMutation\` mais omettait leur export public. Les mocks Vitest masquaient ce défaut côté composants. Exports explicitement ajoutés, plus un test de contrat assurant la disponibilité des deux hooks depuis ce module. Cela illustre la nécessité d'exécuter les gates ensemble **avant** de présenter un commit comme prêt pour QA.

La correction est sur la branche \`feature/m006-fiches-process\`, sans preuve d'exécution de Vitest, lint, build ou release gate depuis cet environnement. Ne pas relancer de migration DB pour une modification purement frontend. Contrôles requis, dans l'ordre : test \`process-phase-picker.test.jsx\`, test \`process-sheets-api.test.js\`, \`process-sheet-draft-editor.test.jsx\`, intégration page/éditeur, suite entière frontend, lint et build. Ne pas procéder à la QA visuelle tant que ces tests n'ont pas été observés verts.

---

## Correctif M-006 — routes du catalogue non montées, 2026-10-27

**Preuve locale fournie par le propriétaire :** commande Vitest ciblée backend : \`processLibrary.http.test.js\` 14/14 verts, \`processLibrary.validation.test.js\` 4/4 verts, \`processPhaseTitles.http.test.js\` 4 échecs/4 ; chacun reçoit HTTP 404 (GET propriétaire, POST contributeur, archivage, cross-Workspace). Diagnostic dans GitHub : la déclaration \`process-phase-titles\` avait été ajoutée PAR ERREUR dans l'exemple commenté de \`backend/config/applicationRoutes.registry.js\`, au lieu du tableau effectif \`APPLICATION_BACKEND_ROUTE_MODULES\`. \`backend/app.js\` n'a donc jamais monté le router. Correction : déplacer la déclaration dans la collection exécutée et réparer le commentaire. Ajouter un test unitaire de composition explicite \`backend/tests/config/applicationRoutes.registry.test.js\` exigeant précisément le montage du chemin \`/api/workspaces/:workspaceId/process-phase-titles\` ; les tests HTTP métier préexistants vérifieront GET/POST, seed et RBAC après récupération Git.

**Statut** : correction versionnée sur la branche de travail, sans exécution locale attestée après correctif. Les 18 tests verts concernent strictement l'état précédent. Relancer le test du registre + les trois fichiers HTTP/validation concernés, puis la feature frontend et la gate ; aucune CI GitHub verte déclarée.

---

## Reprise M-006 — catalogue Workspace d'intitulés et Select Base UI (2026-10-27)

Lot demandé explicitement : supprimer l'explication « Seul l’intitulé est repris... » et le champ de recherche, passer au Select Base UI (menu déroulant), provisionner par défaut les cinq phases « Préparation du poste », « Préparations initiales », « Cuisson », « Assemblage », « Présentation / dressage » pour chaque Workspace, et persister les intitulés « Autre phase… » via MongoDB afin de les proposer lors des usages suivants. Les phases Workspace sont disponibles dans tous les Dossiers ; les étapes librement ajoutées aux Fiches process ne sont pas enregistrées comme modèles partagés.

Implémentation métier : catalogue `ProcessLibraryTemplate` PHASE existant, définition autorisant des `steps: []`, routes dédiées `GET/POST /workspaces/:id/process-phase-titles` avec `process-sheet:read` / `process-sheet:edit`, cache RTK Query invalidé après POST, seed transactionnel idempotent avec révisions, runner de migration pour Workspaces existants, initialisation à la première lecture pour nouveaux Workspaces sans modification du Core. Aucun seed ne doit écraser un titre existant ou réactiver un modèle archivé. Mode sombre et responsive à recetter.

**État de preuve :** code et tests créés en branche GitHub, mais les tests de ce nouveau lot n'ont PAS été exécutés. Ne pas annoncer de résultat Vitest, Supertest, lint, build, release:verify ou release:check sans logs. Détails de déploiement/rollback : `docs/releases/M-006-PHASE-TITLES.md`.

---

## Reprise — Correctif M-006 RTK Query et portée des étapes libres (2026-10-27)

Suite au log Vitest local du propriétaire : **1 test en échec sur 70** avant correction, uniquement \`src/features/process-sheets/api/process-sheets-api.test.js\` car l'inventaire strict attendait 6 endpoints alors que le module RTK Query en déclare 8 depuis la connexion des bibliothèques backend. Le test d'inventaire est adapté et complété par des scénarios GET Workspace et Dossier avec filtre ACTIVE, recherche, pagination, transformation et cache. Le test d'intégration page/éditeur est étendu à l'insertion d'un intitulé Workspace, la saisie d'une étape libre non publiée et la sauvegarde PUT. Le test HTTP de bibliothèque couvre le partage des modèles Workspace entre Dossiers et maintient l'isolation du catalogue Dossier existant. Tests nouveaux **non exécutés ici** ; aucune gate déclarée verte.

Clarification du propriétaire : modèles prédéfinis de phases/étapes communs au Workspace et donc utilisables dans tous ses Dossiers ; les étapes rédigées librement par un utilisateur dans une Fiche process n'ont pas à alimenter automatiquement la bibliothèque. La Fiche process et son brouillon gardent impérativement leur ownership Workspace + Dossier. Aucune diffusion inter-Workspace ni référentiel global d'étapes utilisateur n'a été validé. Les cinq noms de phases exprimés en conversation ne sont pas présumés enregistrés dans les données MongoDB ; \`phaseDefinitionSchema.steps.min(1)\` reste en vigueur pour les modèles PHASE de bibliothèque.

---

## Reprise M-006 — suggestions de phases côté backend (2026-10-27)

Suite à la demande explicite du propriétaire, les titres de phases proposés au bouton \`+\` et dans le formulaire d'édition proviennent exclusivement des modèles \`PHASE\` actifs stockés côté backend (bibliothèques commune Workspace et locale Dossier). Connexion à deux GET existants via RTK Query, avec \`process-library:read\`, recherche et pagination. Un \`Popover\` Base UI liste uniquement les modèles effectivement retournés, en affichant le scope ; l'action « Autre phase (intitulé libre) » permet une phase locale sans muter la bibliothèque. Aucun choix de nom n'importe automatiquement les étapes/consignes d'un modèle ; l'enregistrement explicite \`expectedRevision\` reste inchangé. Les phases sans étapes ne montrent ni sous-liste « Aucune étape » ni chevron, et chaque ligne d'étape dispose d'une suppression confirmée depuis l'arborescence.

**Limite métier à ne pas masquer :** la bibliothèque PHASE existante impose \`steps.min(1)\`, donc un simple intitulé vide ne peut actuellement pas être créé comme modèle PHASE sans évolution de contrat. Les cinq propositions de noms formulées en conversation ne sont **pas** insérées automatiquement dans MongoDB. Elles n'apparaîtront que si des modèles correspondants existent réellement dans le scope lisible. Un éventuel catalogue administrable de simples titres est à cadrer distinctement, et ne doit pas dupliquer silencieusement \`ProcessLibraryTemplate\`.

Tests JSX/RTL étendus, mais aucune exécution locale attestée. Vérifier le GET effectif avec données Workspace et Dossier, les permissions, la recherche/pagination, le mode lecture seule, le mobile, la suppression et la sauvegarde. Aucun Core ni backend modifié ; pas de fusion main/PR implicite.

---

## Reprise M-006 — arbre phases/étapes et en-tête compact (2026-10-27)

**Lot UX implémenté en branche, à vérifier localement.** Après validation du propriétaire, l'éditeur M-006 remplace les phases horizontales par une arborescence repliable pilotée par Collapsible/Base UI ; une seule phase ou étape est éditée à la fois, sans cartes imbriquées. Le rail ingrédients minimal reste inchangé. Sur téléphone, un SegmentedControl Structure/Édition évite de compresser l'arborescence. Les suppressions passent par Dialog ; le rechargement après 409 avertit de la perte des modifications locales. Les autres primitives existantes (Button, Input, Textarea, ProductVariantField, IngredientChoices, ProcessStepFields) sont réutilisées. En page de détail, « Fiches process » | titre H1 | infobulle sont alignés horizontalement. Transitions de 210 ms avec reduced motion.

Seuls les composants UI et tests/documents du chantier M-006 sont modifiés. Modèle de données et API inchangés ; pas de sous-étapes, aucune intégration des bibliothèques à cette occasion. Identités \`lineKey\`, sauvegarde \`expectedRevision\`, conservation des données non enregistrées et droits de lecture seule préservés. Tests RTL de l'arbre et intégration page/éditeur actualisés mais **non exécutés** dans cette intervention via GitHub ; aucune preuve de lint/build/backend/E2E/release:check. Une validation Windows/Node 24.7+ et une recette visuelle, notamment mobile et thème sombre, sont requises avant toute PR/merge.

---


## Reprise M-006 — simplification de la colonne ingrédients (2026-10-27)

Sur demande produit accompagnée de captures Desktop, **lot limité à la colonne ingrédients**, dans `feature/m006-fiches-process` : une liste unique en ordre M-004, titre « Ingrédients », compteurs affectés / restant à affecter, nom sans suffixe « ligne N », sans bordures entre les noms, sans liste séparée des ingrédients utilisés, sans champ ni bouton de justification. Une coche verte discrète marque chaque occurrence utilisée ; son infobulle accessible au survol/focus donne le titre de la phase et/ou de l'étape d'affectation. L'identité `lineKey` reste distincte, les affectations multiples restent permises. Anciennes justifications conservées dans le payload pour compatibilité, mais non éditables ; contrat validé rectifié (22/31 : pas de justification obligatoire lors de la validation future). Aucun backend, schéma, Core ou thème modifié.

Tests RTL de l'éditeur et du parcours page → édition → PUT adaptés, avec vérification des doubles occurrences de nom, des localisations phase/étape et de la conservation des anciennes données. Tests post-modification, lint/build et gate encore **non exécutés** ; ne pas annoncer vert avant log local. Aucun merge/PR.

---


## Reprise M-006 — atelier à deux zones, sans effet glassy (2026-10-27)

**Changement d'orientation explicite du propriétaire :** pas d'effet glassy à ce stade, afin de conserver l'unité du thème existant. Le lot de refonte UX de l'éditeur a été travaillé sur `feature/m006-fiches-process` : rail distinct de suivi des ingrédients à gauche sur Desktop (non affectés, justificatifs, affectés, nombre d'usages multiples), navigation horizontale compacte des phases et liste des étapes à droite, un unique éditeur d'étape sélectionnée ; disparition des bordures imbriquées répétitives. Les champs de phase restent accessibles via un volet secondaire. Les transitions d'ouvertures/fermetures utilisent une grille animée avec `aria-hidden`/`inert` et respect des animations réduites ; entrée discrète du panneau sélectionné. Pas de nouveau thème ni de `backdrop-blur`. Les titres libres ne sont pas reliés automatiquement aux bibliothèques : intégration de modèles différée.

Données et API M-006 inchangées : `lineKey` unique de chaque occurrence M-004, associations multiples, justificatifs, durées, équipements, vigilances, qualité/sanitaire, ordre, CRUD local, sauvegarde par révision, conflit 409, consultation et aperçu préservés. Architecture frontend séparée entre orchestration, rail ingrédients, saisie d'étape et disclosures. Tests RTL adaptés et enrichis, y compris intégration page → éditeur réel → payload de sauvegarde.

**IMPORTANT : non testé après modifications dans cette intervention.** Les tests précédemment communiqués par le propriétaire ne valent pas pour le nouveau rendu. Commandes à exécuter localement : `npm --prefix frontend run test -- src/features/process-sheets`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, puis `npx vitest run backend/tests/modules/process` et `npm run release:check`. Aucun commit sur `main`, aucune PR ni merge. Avant une nouvelle phase de développement, recueillir la QA visuelle Desktop (scroll local vs page), mobile, thème sombre et navigation clavier.

---


## Reprise M-006 — test de reprise après conflit (2026-10-27)

Dernier log fourni localement : **12/13 tests de la modale passent**, seul « après conflit actualise les choix, autorise une autre Fiche et termine la création » échoue faute d'alerte 409. **Cause du scénario de test identifié dans la fixture** : la liste simulée d'éligibles basculait de sheet-1 à sheet-2 dès l'appel de mutation POST, au lieu d'attendre `eligible.refetch()`; des rendus intermédiaires peuvent alors invalider la sélection avant traitement de la réponse 409. Le mock simule désormais deux états de cache RTK Query stables, avec bascule déclenchée exclusivement par `refetch`, et la suite contrôle explicitement le premier POST/409 puis le second POST réussi. Le dialogue conserve désormais son message 409 face à un `onValueChange(null)` interne de Base UI lors de la mise à jour des options. Aucun changement backend/Core.

**Statut post-correctif : non exécuté** dans cette conversation. Le prochain Vitest local est requis pour conclure. Ne pas qualifier le test de vert à partir de la seule inspection statique.

---


## Reprise M-006 — stabilisation de la création après nouveau log local (2026-10-27)

Log fourni par le propriétaire (avant modification) : suite frontend M-006, **54/55 tests réussis**. L'unique erreur se produit dans `process-sheet-create-dialog.test.jsx` : l'option du Select « Tartine validée » n'est pas affichée, `aria-expanded=false`, avant tout POST et donc avant la réponse 409 simulée. Les 12 tests de la page détail et les 3 tests d'intégration page/éditeur ajoutés précédemment réussissent.

Correctif métier ciblé sur la chaîne complète de création : le formulaire filtre désormais le submit sur une option toujours présente dans la liste actuelle et sur la fin du chargement/rafraîchissement RTK Query ; le conflit 409 préserve le titre, retire la référence périmée et relance les éligibles ; les messages d'erreur s'effacent à la prochaine modification ; les erreurs non-409 conservent la sélection. Tests de modale renforcés pour le clavier Base UI, la création nominale par clic, le conflit 409, la reprise avec nouvelle Fiche source, la disparition d'une éligibilité, le rafraîchissement, les erreurs génériques et la relance de chargement. Aucun backend/Core modifié dans ce sous-lot.

**Vérification encore requise :** exécution réelle post-correctif impossible depuis ce connecteur GitHub ; le résultat du prochain Vitest local, le lint, le build et la gate globale sont inconnus. Recommander répétition de la suite modale 5 fois pour repérer les éventuelles intermittences jsdom, puis toute la feature, lint/build et release:check. Aucun merge dans main.

---


## Reprise M-006 — incident RTL et audit intégral (2026-10-27)

Le log utilisateur montre 48/48 tests backend process réussis et 42/43 tests frontend process réussis **avant** le correctif ; échec sur `Édition : oui` dans le test de la page de détail. Cause confirmée : fixture de process sans `status` alors que l'API réelle le renvoie (`ACTIVE` en situation nominale). Un audit de chaîne a aussi identifié l'écart entre le contrôle frontend du seul statut process et le contrôle backend du Dossier ACTIVE. Correctif complet sur `feature/m006-fiches-process` : booléen `dossierOperational` sur le GET détail calculé depuis `req.dossier` déjà autorisé ; gating de l'éditeur par permission EDIT + process ACTIVE + `dossierOperational === true` ; cas brouillon nul explicitement refusé ; tests de page, test d'intégration page + éditeur réel, Supertest GET/PUT couvrant les rôles contributeurs sans `dossier:read`, Dossier PAUSED, archivage, révision et refus d'écriture. Option Mongoose obsolète `new: true` remplacée sur le PUT draft M-006.

**Gates post-correctif : non exécutées et statut inconnu.** Vérification statique du code et de la cohérence des points de contrôle effectuée, sans prétention de test automatisé vert. Demander exécution locale des tests M-006 backend + frontend, lint, build et release:check avant QA visuelle ou PR. Aucun changement de Core, permission, modèle métier ou migration. La modification de contrat GET est additive ; le backend reste autoritatif pour le PUT.

---


## Reprise du 2026-10-27 — refonte UX du phasage M-006

Développement commencé et commité sur `feature/m006-fiches-process` après validation du cas d'usage dominant : assemblages courts, plusieurs petites phases de une ou deux étapes. L'éditeur a été transformé en cartes de phases repliables et étapes compactes, détails contextuels, affectation d'ingrédients à la demande et revue différée des ingrédients non affectés. Un aperçu chronologique de lecture est disponible sans perdre les modifications locales. Les composants ont été séparés en édition métier, orchestration/sauvegarde et aperçu.

Le backend, la structure des données, les règles métier, la tenancy, les identifiants de lignes M-004 et le protocole `expectedRevision` restent inchangés. Aucun drag and drop obligatoire, aucun PDF, aucune validation officielle ou intégration de bibliothèque n'est ajouté par cette refonte. Les tests RTL ont été enrichis mais **aucun Vitest, lint, build, E2E ni `release:check` n'a été exécuté** dans cette conversation : une validation locale sous Node 24.x, MongoDB adapté et une recette visuelle sont requises avant de qualifier le lot de stable. Aucune PR ni fusion vers `main` n'est autorisée par ce travail.

---


**Lot 5 développé sur `feature/m006-fiches-process` (2026-10-26) :** éditeur de brouillon phases et étapes avec instructions, ingrédients du snapshot M-004 lié au process (lignes répétées distinctes), durées actif/repos/traitement, équipement/vigilance, contrôles qualité/sanitaire, justifications de non-affectation. API `PUT /:processSheetId/draft` strictement validée, transaction et audit, concurrence optimiste, permission `process-sheet:edit` et migration distincte `migration:m006-process-editor-permission`. Vue détail désormais éditable avec sauvegarde et retour 409 explicite, et indicateur de composition M-004 décalée. Tests unitaires/HTTP/RTL ajoutés **non exécutés ici**, QA locale requise avant PR. Le module M-006 complet n'est pas livré : validation officielle, bibliothèque dans l'éditeur, copie du contenu, impression et suppression autonome restent à réaliser. Voir `docs/m006/M-006-TECHNICAL-DESIGN.md`.


**UX modale du 2026-10-26 :** à la demande du propriétaire, simplification à deux champs Outlined, labels flottants et exemples visibles uniquement au focus ; retrait complet de la recherche séparée des Fiches validées. Sélecteur éligible M-004 avec pagination n'apparaissant qu'au-delà de 100 éléments et (i) existants. Réutilisation du pattern déjà adopté pour M-004 ; tests RTL enrichis, vérification locale encore attendue. Aucun changement au backend ni aux règles de création strictes.


**Correctif d'accès à la création (capture utilisateur 2026-10-26) :** le bouton caché par la combinaison `process-sheet:create`, `technical-sheet:read`, `Dossier.ACTIVE` est désormais **toujours affiché** (désactivé et motivé tant qu'une précondition manque, jamais de bypass RBAC). Nouvelle permission CREATE sur rôle Owner existant nécessite `migration:m006-process-sheets` sur la base locale puis actualisation du contexte Workspace. Les quatre Fiches M-004 observées précédemment étaient en brouillon/révision : elles ne sont pas éligibles avant validation et fermeture de brouillon. Tests React de permissions, de Dossier, de modale et zéro éligible ajoutés, **exécution locale encore attendue**. Voir `docs/m006/M-006-TECHNICAL-DESIGN.md`.


**Stabilisation frontend du 2026-10-26 après log utilisateur :** Vitest 8 suites réussies / 36 tests réussis et une suite shell Dossier non chargée (PARSE_ERROR, 0 test). Le fichier sur la branche comportait 902 lignes et des fragments dupliqués, contrairement à `main` (353). Réécriture depuis la source stable de `main` avec réapplication contrôlée des seules évolutions M-006 (onglet, compteur, détection du détail, permissions, skip RTK Query), et extension des tests pour route/permissions/compteurs. Les nouveaux tests restent **à relancer localement** sur le HEAD corrigé ; aucun statut vert extrapolé du log antérieur.


**Nouvelle décision et lot 4 du 2026-10-26 (autorisé par utilisateur) :** correction de l'UX après capture réelle. L'onglet doit lister des **Fiches process**, pas des Fiches techniques. Création via modale **titre + Fiche technique éligible**, ouverture de la Fiche process initialisée, informations complémentaires via (i). Règle de création maintenant stricte : M-004 ACTIVE + validation courante + aucun brouillon M-004 ouvert + aucun process 1:1 existant. Elle **remplace** les anciennes décisions 21/26. Une copie inter-Dossier M-004 cible initialement DRAFT ne crée plus automatiquement de process ; reprise du contenu ultérieure après validation cible (28 amendée). Backend ProcessSheet et ProcessSheetDraft, API liste/éligibilité/création/détail, audit et index unique, clôture transactionnelle des cascades archive/corbeille/purge M-004 ; frontend liste réelle, modale, détail initial. **Le cycle d'édition/validation/impression M-006 n'est pas livré, nouveau lot tests/QA non exécutés.** Branche feature/m006-fiches-process, pas de PR ni merge.


**Lot 3 frontend engagé et commité le 2026-10-26 :** nouvel onglet Dossier « Fiches process » visible sous les deux permissions lecture `process-sheet:read` + `technical-sheet:read`; page de préparation affichant les Fiches techniques actives (recherche/pagination serveur M-004) puis leurs ingrédients brouillon/validés via RTK Query M-006, avec doublons, identités legacy, états d'erreur et sélection partageable par URL. Aucune Fiche process n'est encore créée ni validée, aucun compteur process artificiel, aucune photo. Tests RTL/routage/API ajoutés, **non exécutés** dans cette conversation. Nécessite également la migration M-006 de lecture sur les Owners existants. Aucune PR ni modification de `main`. Détails dans `docs/m006/M-006-TECHNICAL-DESIGN.md`.


**Lot 2 backend engagé le 2026-10-26 :** migration indépendante de permissions `migration:m006-process-composition-permission` ajoutée pour les Owners déjà persistés ; exécution à contrôler sur l'environnement cible.  remontée de l'identifiant de ligne du brouillon M-004 dans les **nouvelles** validations (`sourceLineId`, facultatif et sans backfill des historiques). Projection lecture seule des ingrédients pour M-006 avec occurrences répétées distinctes, regroupement pour affichage, clé legacy strictement bornée à la validation ; API REST scoped Workspace/Dossier et permission `process-sheet:read`, tests ciblés associés. La création d'un process reste fermée tant que la cascade parent-enfant M-004 et l'agrégat 1:1 ne sont pas implémentés. L'utilisateur a déclaré que les vérifications locales du lot 1 sont « tout est ok », sans logs archivés côté assistant ; **aucun résultat de test du lot 2 n'a été fourni ni exécuté ici**. Voir `docs/m006/M-006-TECHNICAL-DESIGN.md`.


**Incident de validation local du 2026-10-26 :** 7/7 tests HTTP M-006 échouent (404) sur l'ancien HEAD. Cause vérifiée dans le code : les deux routes Process Library ont été ajoutées dans un commentaire d'exemple, pas dans le tableau de composition réel. Correction des descriptors dans le tableau, audit transversal et extension des tests de non-régression (routes, scopes, Zod, conflits, rollback, audit) sur `feature/m006-fiches-process`. **Résultat post-correctif non encore exécuté**, ne pas déclarer la gate verte. Voir `docs/m006/M-006-TECHNICAL-DESIGN.md`.

**Démarrage du développement approuvé le 2026-10-26 :** contrat final M-006 validé par le propriétaire. Lot 1 backend Bibliothèques de fabrication (scopes Dossier/Workspace, révisions non destructives, publication, archivage, RBAC, audit, migration et tests HTTP) engagé sur `feature/m006-fiches-process`. **Implémentation M-006 partielle :** aucun agrégat Fiche process, aucune intégration cycle de vie M-004, aucun frontend/process/impression encore livré. Gates et migrations non exécutées dans cette conversation. Voir `docs/m006/M-006-TECHNICAL-DESIGN.md`. Illustrations toujours exclues.


**Statut : contrat fonctionnel final M-006 validé, développement autorisé sur feature/m006-fiches-process ; premier lot backend bibliothèques engagé, aucune livraison globale ni gate validée à ce stade.**

**Nouvelle décision métier du 2026-10-26 — réponses aux recommandations 21 à 35 :** toutes les recommandations fonctionnelles 21–35 sont **approuvées** ; les illustrations/photographies restent **expressément exclues de M-006 V1**, car leur cadrage est reporté. Le contrat de travail `docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md` consigne les quinze décisions et les inconnues techniques restantes ; PRODUCT-SCOPE, ROADMAP, GLOSSARY, DOMAIN-MODEL et DEBT ont été alignés. **Cette décision a été suivie de la validation expresse du contrat final M-006 et de l'autorisation du développement le 2026-10-26.** Aucun champ image, infrastructure de stockage/photo, UI d'illustration ou impression illustrée ne doit être implémenté dans M-006.

**Mise à jour du 2026-10-26 — décision de suspension et règle de suppression :** le propriétaire du produit a demandé de terminer le cadrage **avant toute implémentation**. La Fiche process ne peut **jamais être archivée seule** ; elle suit l'archivage M-004. En revanche, une Fiche process peut être supprimée **seule, définitivement et physiquement**, après confirmation explicite et contrôle des permissions : la Fiche technique et les modèles réutilisables restent intacts, le brouillon et l'historique du process sont purgés, l'association 1:1 est libérée. Les cascades depuis la Fiche technique vers la corbeille M-004 restent une suppression logique, à distinguer de cette destruction autonome. Définir avant code la confirmation, les droits, la traçabilité, le cas d'un parent archivé/en corbeille et les autres arbitrages ouverts.


- PR #50 fusionnée sur main au commit 190962a68086b151b50b82d05cf133f915c5c0ea ; Core Gate post-merge GitHub Actions #40336850143 réussie.
- Branche M-006 initialement identique à main, Core intégré v1.2.1 (voir core-origin.json). 
- Proposition de cadrage **créée sur cette branche** : docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md. Les règles acquises sont distinguées des propositions à confirmer.
- **Association 1:1** : toute Fiche process dépend d'une Fiche technique M-004 du même Workspace/Dossier ; une Fiche technique a au maximum une Fiche process, mais peut n'en avoir aucune.
- **Création guidée** : onglet « Fiches process » dans le Dossier ; choix d'une Fiche technique ACTIVE sans process associé, même en brouillon ou archivé ; contrôle de l'éligibilité côté backend et protection concurrente.
- Les ingrédients sont repris de M-004 (quantités inutiles dans l'éditeur process), affectables aux phases, aux étapes, ou aux deux ; phases et étapes réutilisables dans les bibliothèques Workspace/Dossier ; mises à jour adoptées explicitement sans propagation silencieuse.
- **Cascade parent M-004** : archivage de la Fiche technique => archivage du process ; suppression logique de la Fiche technique => suppression logique du process ; purge définitive => purge du process enfant. La restauration/réactivation symétrique est proposée avec conservation de l'état précédent et reste à fermer contractuellement. La copie inter-Dossier du parent doit créer un process enfant brouillon si la source possède un process éligible.
- Code réel audité : backend/modules/technicalSheet/{technicalSheet.model.js,technicalSheetDraft.model.js,technicalSheetValidation.model.js,technicalSheetValidation.service.js,technicalSheetCopy.service.js,technicalSheetLifecycle.service.js}, routes et registres métier ; frontend/src/features/dossiers/pages/dossier-workspace-page.jsx, application-routes.js, technical-sheets-routes.js. **Point à traiter : identité de ligne stable entre brouillon M-004 et snapshot validé, y compris pour des références Produit répétées.**
- Aucune collection M-006, route M-006, UI M-006, migration ou test M-006 n'a été créée par ce lot. Aucun test local ni gate n'a été exécuté pour le cadrage ; ne pas annoncer de release:check verte.
- **Arbitrages 21–35 désormais approuvés** : brouillon M-006 avec M-004 brouillon ; validation conditionnée à M-004 validé ; non-affectations justifiées ; temps distingués ; contrôles facultatifs ; modèles locaux publiables ; duplication des ingrédients traçable ; copie en nouveau brouillon ; synchronisation M-004 ; suppression autonome uniquement parent ACTIVE ; bibliothèques archivables ; permissions métier ; tous plans sans quota process ; impression du brouillon identifié. **Conception encore ouverte** : identité stable des lignes M-004, contrats API/Zod, conflits/concurrence, calculs de durées simultanées, révisions de bibliothèque, remappage inter-Dossier, modalités d'audit et impression. L'implémentation par lots est autorisée, sans extrapolation des règles restant à concevoir.
- Ne pas créer de PR, coder le domaine ni modifier main avant validation du contrat et vérification des gates applicables.

---

# Reprise courante — lot transversal UI/UX (2026-10-23)

## Stabilisation finale E2E Gammes — notifications (2026-10-26)

- Exécution locale rapportée par l'utilisateur : 37 tests Playwright,
  36 réussis, 1 échec dans `technical-sheet-ranges-m004.spec.js` après
  suppression refusée d'une Gamme encore utilisée.
- Cause démontrée par le log : la même description d'erreur existe dans
  une notification visible et dans la région d'annonce ARIA ; le sélecteur
  global `page.getByText(/encore associée .../)` échoue en strict mode.
  Le serveur retourne bien le refus métier attendu ; aucun défaut de
  suppression MongoDB n'est établi.
- Le scénario utilise désormais l'utilitaire E2E partagé
  `expectVisibleToast` qui cible `[data-slot="toast"]`. Il vérifie
  aussi le titre « Suppression impossible », le maintien du dialogue
  puis l'état archivé et l'affectation de la Fiche.
- Le test React de gestion des Gammes couvre en complément la réponse
  d'erreur serveur, le feedback destructif et la conservation du dialogue.
  Audit des 13 fichiers E2E : pas d'autre assertion portant directement
  sur une description de toast non scoped ayant ce symptôme.
- **Les tests du nouveau HEAD restent à exécuter**, y compris
  `npm run release:check` et la Core Gate PR. Pas de PR ni de merge
  sans validation de l'utilisateur.



## Stabilisation pré-PR — release:verify / manifeste des Gammes (2026-10-26)

- La gate locale `npm run release:check` signalée par l'utilisateur
  s'arrête à `release:verify` : `migration:m004-ranges` et son
  runner M-004 existent bien, mais manquent dans l'inventaire de
  `docs/releases/migration-manifest.json`.
- Audit du HEAD : 29 scripts `migration:*` et 29 runners contre
  28 entrées du manifeste ; un seul écart (Gammes), aucun doublon,
  aucun autre script ou runner orphelin.
- Une entrée `m004-ranges` a été ajoutée avec dépendance à
  `m004-technical-sheets` ; notes opérationnelles de migration
  complétées dans le contrat Gammes.
- Cette correction ne modifie ni le runner, ni MongoDB, ni le
  vérificateur Core ni les migrations existantes.
- `release:verify`, lint, tests backend/frontend, build, E2E et
  `release:check` **restent à exécuter sur le nouveau HEAD**.
  Pas de PR/merge tant que la gate réelle n'est pas validée.



## Finition UX M-003 : filtre animé, favoris et recherche compacte — 2026-10-26

- Le filtre « Tous les articles / Favoris » reprend le curseur coulissant
  200 ms (avec réduction des animations) des modes de recherche Produits
  M-004. Le composant reste propre au produit : pas de changement de
  primitive générique du Core.
- Les actions Ajouter/Retirer des favoris exposent une infobulle au survol
  et au focus clavier via la primitive Tooltip existante.
- La recherche d'Articles du Dossier est initialement réduite à une
  loupe ; clic puis expansion 300 ms avec champ conservé pendant
  l'animation, comme la recherche de prix de l'en-tête du Dossier.
  Recherche réactive côté serveur conservée ; la saisie maintient
  l'expansion lors d'un clic extérieur. Échap efface la requête puis
  rétracte le champ et rétablit le focus sur la loupe.
- Tests du composant, RTL de page et E2E M-003 adaptés ; non exécutés
  localement sur ce nouveau HEAD. Contrôles frontend, QA et
  `npm run release:check` à effectuer avant PR.

## UX M-003 dans la branche Gammes M-004 — 2026-10-26 (recette à exécuter)

- Décision utilisateur : conserver la branche `feature/m004-gammes-fiches-techniques`
  pour la correction UX et la future PR des Gammes. Aucune branche
  ni PR additionnelle dédiée à ce complément.
- Dans « Dossier → Fournisseurs et prix », le premier onglet consulte les
  Articles fournisseur actifs visibles du Workspace, avec compteur,
  recherche et pagination serveur ; « Tous les articles / Favoris »
  change la liste sans créer un catalogue magasin.
- Le choix de favori devient une action sur chaque ligne. La liste des
  favoris est toujours la relation existante Dossier/Article, sans
  duplication de Produit ou prix ; les Articles non associés restent
  consultables et ne deviennent pas valorisables par simple affichage.
- Permissions : lecture catalogue via `supplier:article:read`, lecture
  favoris via `supplier:dossier-reference:read`, mutation via
  `supplier:dossier-reference:manage`. Les utilisateurs sans lecture
  d'Articles conservent leur ancienne lecture des favoris ; aucune
  permission n'est accordée implicitement.
- Aucun changement d'API, de MongoDB, de résolution de prix, de Core ou
  des quatre autres onglets. Tests RTL et scénario Playwright M-003
  ajoutés/actualisés, **non exécutés localement pour ce commit**.
  Gate `npm run release:check` et recette Windows à réaliser avant PR.



## Finition UX — filtre des Gammes dans les Fiches (2026-10-26)

- Dans le tableau des Fiches d'un Dossier : une seule recherche par
  nom/description, placée à côté du filtre Gamme sur écrans assez larges ;
  sur petit écran, les deux contrôles se superposent sans débordement.
- Suppression du champ distinct « Chercher une gamme » et du raccourci
  « Gérer les gammes » dans l'en-tête du Dossier. L'administration
  reste accessible au premier niveau de navigation du Workspace.
- Le filtre utilise le catalogue complet des Gammes actives et archivées
  du Workspace via `/ranges/options?includeArchived=true`, sans la
  limite de pagination du tableau de gestion. Le comportement par défaut
  de `/ranges/options` reste actif uniquement pour les affectations
  et les créations de Fiche.
- Tests RTL, HTTP et Playwright adaptés. **Aucun résultat d'exécution
  locale ni gate globale n'est encore disponible pour cette révision.**
  Pas de PR ou de fusion sans validation.

## État courant — M-004 Gammes, 2026-10-24

### Ajustement demandé — création de Fiche et champs outlined (2026-10-24)

- La modale « Créer une gamme » utilise une infobulle d'information au
  niveau du titre plutôt qu'un sous-titre visible.
- Dans la modale « Créer une Fiche technique », la Gamme est désormais
  choisie via une seule liste déroulante « Sans gamme » par défaut.
  L'action « Créer une gamme », si permission accordée, est alignée avec
  le libellé « Gamme (facultative) » et ouvre la même modale imbriquée.
  Après création, la nouvelle Gamme est sélectionnée sans quitter le
  formulaire de la Fiche. Aucun champ de recherche intermédiaire.
- Le serveur expose toutes les Gammes actives du Workspace via
  `GET /api/workspaces/:workspaceId/technical-sheets/ranges/options`,
  autorisé par la permission de lecture M-004 ; les Gammes archivées
  ne sont pas sélectionnables pour une nouvelle Fiche.
- Les champs texte et les listes de la création de Fiche reprennent
  l'habillage flottant/outlined déjà présent dans
  `ProductVariantField` (Produit M-002), sans copie d'une primitive Core.
  Les libellés remontent au focus ; exemples de saisie révélés au focus
  des champs texte. Le contrôle TVA reste une sélection segmentée.
- Le besoin futur de généraliser cet habillage à tout le SaaS est
  distinct du présent lot produit et reste candidat à une évolution Core.

Tests HTTP, RTL et E2E adaptés/ajoutés mais **non exécutés à ce stade**.
Aucun changement de `main`, aucune PR ou fusion.

### Ajustement demandé en recette — modale et noms proches (2026-10-24)

Le formulaire intégré à la page est remplacé par une modale
commune à création, renommage et création rapide depuis un Dossier.
Le contrôle des noms proches reprend les critères métier des catégories
Produit, avec suggestions Workspace-scoped, avertissements de doublons
exacts/voisins, confirmation explicite des noms différents et refus
serveur lorsque les propositions changent. Contrat complété en
section 19 du cadrage validé.

**Non vérifié à ce stade** : tests ciblés backend/RTL/Playwright et
`npm run release:check` de la nouvelle révision. Pas de PR ni merge.

### Reprise QA interface Gammes — 2026-10-24

Après revue des captures utilisateurs : positionnement initial sous
« Dossiers » inadapté à un référentiel global. La navigation du Produit
place désormais « Gammes de produits finis » au même niveau que Produits
et Fournisseurs. L'écran utilise le titre « Gamme de produits finis »,
une aide accessible via l'icône (i) sans jargon technique, la recherche
prédictive et animée avec les primitives Autocomplete existantes et
un filtre de statut réduit sur la même ligne. Un bouton explicite
« Créer une gamme » ouvre l'édition si le rôle dispose de
`technical-sheet:range:manage`. Lecture seule sinon ; aucun contournement
RBAC. Le bouton « Créer une Fiche technique » reste dans chaque Dossier,
car une Fiche dépend toujours d'un magasin.

**Vigilance pour la QA Windows** : si l'Owner voit la liste mais pas
« Créer une gamme », vérifier l'exécution de
`npm run migration:m004-ranges` sur la base de développement puis
rafraîchir la session et les permissions effectives. Ne pas accorder
manuellement des droits à tous les membres.

Tests modifiés : composition navigation, page Gammes, prédiction Autocomplete
et E2E. Ces tests n'ont **pas** encore été exécutés sur ce HEAD ;
aucune PR, aucun merge.

---

Branche de développement : `feature/m004-gammes-fiches-techniques`, issue
du merge de la PR Produit #49 (`ac0145bd`). Contrat global des Gammes
explicitement approuvé le 2026-10-24 : G1 = B, G2 = A. Document canonique :
`docs/m004/M-004-GAMMES-CADRAGE-PROPOSITION.md`. Le référentiel est
Workspace-scoped ; les Fiches et prix restent Dossier-scoped.

La correction du test Core Gate #231, limitée à l'attente asynchrone du
dialogue Trial, a été validée localement via `npm run release:check`
selon l'utilisateur **avant** le développement des Gammes.

Implémentation des Gammes publiée sur branche, **non vérifiée par des
tests réellement exécutés à ce stade**. Prérequis de clôture : migration
`npm run migration:m004-ranges` sur la DB de développement adaptée,
tests ciblés unitaires/HTTP/RTL/E2E, gate locale globale, QA visuelle,
autorisation de PR et fusion explicites. `main` n'est pas modifié.
Les rubriques historiques ci-dessous décrivent des étapes antérieures et
ne représentent plus le statut courant.

---

## Revue finale du contrôle guidé M-002 — 2026-10-24, gate non validée

Nouveau rapport local après le lot transversal précédent : **17/18 E2E ciblés réussis**. Le seul échec concernait l'attente de deux boutons « Valider » dans le contrôle guidé M-002. Relecture de `ProductReferenceReviewWorkflow`, de `ProductReferenceGovernanceReviewPanel`, de `ProductReferenceDetailsDrawer`, de la revue backend, des tests RTL et des étapes finales du scénario :
- Une Contribution de Dimension provisoire se traite par « Approuver » ; la Référence reste sous « Valider », désactivé jusqu'à l'approbation des dépendances.
- E2E aligné sur les deux libellés, leurs cardinalités et états ; contrôle DB explicite après la décision Dimension (`APPROVED/REVIEWED`) et invariance provisoire de la Référence ; vérification de l'approbation de la Référence après la décision finale.
- Test RTL existant renforcé pour empêcher la régression sur les deux actions et leurs états.
- Aucun code de production ou Core modifié ; tests de ce nouveau correctif **non exécutés**. Rejouer d'abord l'E2E ciblé puis le sous-ensemble complet, et enfin `npm run release:check`. Aucune PR/merge sans confirmation utilisateur.


## Stabilisation des E2E — 2026-10-24 (QA locale requise)

Rapport utilisateur : 34 tests Playwright, 26 réussis et 8 en échec. Audit des 12 fichiers de scénarios, avec correctif groupé :
- M-001 : les liens « Ouvrir » et l'action « Voir » sont désormais dans le menu de ligne « Actions de … ». Helpers et scénarios adaptés sans modifier le composant.
- M-002 : fixture historique de Dimension REVIEWED mais identité encore PROVISIONAL, sans utiliser la revue directe désormais interdite (409). Parcours de la file « À contrôler » avec pagination serveur, sans hypothèse sur la première page.
- M-003 : autocomplétion par Référence fournisseur, prix applicable consulté depuis la barre compacte du Dossier et Article consulté depuis son menu de ligne (avant et après création de Référence).
- Aucun backend/frontend métier, modèle DB ni Core modifié. Tests du nouveau HEAD non exécutés par l'assistant. Faire E2E M-001/M-002/M-003 ciblés, puis `npm run release:check` sous PowerShell. Aucune PR ni fusion sans accord explicite.


## Complément du 24 octobre 2026 — barre compacte du Dossier (QA mise à jour)

L'en-tête regroupe retour, titre/statut, marge cible et recherche d'Article fournisseur, sans grandes cartes fixes. Suite au retour QA, **le nom du Dossier est l'unique bouton ouvrant les coordonnées au clic/clavier** : plus d'infobulle au survol ni d'icône d'information supplémentaire. La recherche est immédiatement après la marge et **réellement réduite à une loupe seule au repos**, avant déploiement animé et focus. Le résultat du prix et les règles de sélection restent conservés, avec repli sans effacement lors d'un clic extérieur. Tests RTL ajustés, mais tests, lint/build, gate et QA Windows du nouveau HEAD non attestés ; aucune PR/merge. D-008 Core et audit M-001 restent différés.


Complément QA du 24 octobre : animation inverse de la recherche de prix corrigée en conservant le champ monté pendant le repli, avec une seule loupe accessible au repos et restitution du focus clavier sur Échap. Les contrôles et la QA locale du nouveau commit restent à effectuer.

## Lot UI/UX transversal — en recette locale

- Correctif QA du 2026-10-23 : « Valider » en survol/focus success, « Examiner » en warning, filtre « Actives » rétabli, dialogue de Catégorie sans sous-titre technique visible. Ces libellés remplacent « Valider directement » et « Non archivées » présents dans les synthèses précédentes.
- Audit Catégories : unicité normalisée déjà contrôlée par MongoDB et le service ; nouvelle vérification HTTP des collisions à la création/archivage/renommage, avec conflit 409 en cas de renommage concurrent. Les ressemblances orthographiques sans clé identique demandent un cadrage dédié de suggestions, sans blocage automatique ajouté.
- Les tests locaux du nouveau HEAD et la QA restent à confirmer par l'utilisateur. Aucune PR ni fusion autorisée sans son accord explicite.

- `main` Produit de référence : `46411c8d5c554f12bf2ec5a27328373c57a2019b` (PR #48 fusionnée ; Core Gate post-merge #229 verte).
- Branche de travail unique : `feature/ui-ux-improvements`, sans modification de `main`.
- Périmètre validé : infobulle de portée Fournisseur, bouton « Enregistrer » désactivé sans nom, menus « … » de lignes Fournisseurs, Articles, Catalogues, Dossiers et Fournisseurs et prix ; composant partagé avec les Fiches techniques.
- Complément UI/UX validé : icône FolderOpen du lien Dossier ; trois sélecteurs d'Article en recherche prédictive (Références, Tarif négocié/Prix facturé, prix applicable), suggestions enrichies, dropdown en Portal sans redimensionnement ; recherche M-003 standard par désignation, référence, Fournisseur et Référence Produit.
- Contrat du lot : `docs/ux/UI-UX-TABLE-ACTIONS-SUPPLIERS-DOSSIERS-2026-10-22.md`.
- Le lot comporte déjà une extension ciblée de la recherche backend M-003 (Fournisseur / Référence Produit), sans changement de tenancy, ownership ni droits.
- Finition M-002 validée : cartes compactes une ligne et badge prioritaire, suppression de « Actif » par carte, filtre « Non archivées », menu unique incluant approbation directe contrôlée / examen facultatif. Un style de superposition ciblé répare les menus de Dimensions dans le drawer sans changer le Core ; tests RTL et QA visuelle à vérifier localement, PR toujours interdite sans accord.
- Complément M-002 du 2026-10-23 : cartes communes Variétés/Caractéristiques, statuts de validation non contradictoires et contrôle d'identité provisoire unique. L'API interdit la revue qualité isolée d'une identité `PROVISIONAL` ; la décision de gouvernance `APPROVE` existante clôt qualité et gouvernance. La correction d'une identité provisoire ne doit pas acquitter silencieusement sa revue qualité.
- Aucun nouveau modèle MongoDB, quota, capability ni changement Core. Tests locaux Windows et QA visuelle après commit encore non vérifiés.
- Tests locaux Windows, gate `npm run release:check`, QA visuelle et autorisation de PR : **en attente de confirmation de l'utilisateur**. Ne pas considérer le lot comme validé sans résultats réels.
- Les branches fusionnées #47/#48 peuvent être nettoyées selon audit antérieur ; `fix/m001-final-ux-review` doit rester conservée jusqu'à étude séparée.
- L'impression est couverte par l'export PDF existant ; la diffusion e-mail automatique est différée, hors de ce lot.
- Après clôture du lot et accord explicite pour PR/merge : chantier Core D-008 pièces jointes e-mail à cadrer séparément ; audit de `fix/m001-final-ux-review` différé et branche conservée.

---

# Reprise courante — cohérence des unités (2026-10-16)

## Synchronisation Core — 22 octobre 2026

- PR métier [#47](https://github.com/greg44500/saas-fiches-techniques-gms/pull/47) fusionnée dans `main` au commit `b48cb3fb807f41d612df5a5d88954c0abbf0aa1f`.
- Correctif de CI MongoDB issu de la PR Core [#50](https://github.com/greg44500/saas-core-api/pull/50), Core Gate post-merge [#103](https://github.com/greg44500/saas-core-api/actions/runs/39778978338) verte.
- Commit Core intégré : `35758f7a3067911244f94b81e7cc3ddd22882eaa`, via un merge Git conservant la filiation entre les dépôts.
- Version et tag Core conservés : `1.2.1` / `v1.2.1`. Provenance renseignée dans `core-origin.json`.
- Périmètre limité à `.github/workflows/core-gate.yml` : runner `ubuntu-22.04` temporaire en raison de l'incompatibilité de MongoDB 8.0 avec certains noyaux Linux récents ; diagnostic et nettoyage Docker renforcés ; replica set `rs0` et URI de test propre au produit conservés.
- `npm run release:check` : gate locale complète verte, exécutée et confirmée par l'utilisateur dans le worktree `saas-gms-core-ci` le 22 octobre 2026.
- Gate GitHub de la PR d'intégration et gate post-merge du produit : **en attente**, à contrôler avant clôture de la synchronisation.
- Aucun changement fonctionnel métier et aucune nouvelle release Core.

## Lot actif M-002/M-003/M-004

**Gate E2E M-003 — correction de la sélection « Créer cette Référence »
(22/10/2026, à retester localement).** Le nouveau retour utilisateur confirme
7/8 tests M-003 verts ; la recherche contextuelle est restaurée, mais le
bouton de soumission redevient introuvable après saisie commerciale.
Cause dans le code : l'état de création reposait sur un booléen réinitialisé
par `onValueChange` de l'autocomplétion. Correctif : mémoriser l'intention
et le nom confirmé indépendamment du champ, verrou immédiat contre les
événements tardifs de fermeture, recherche démontée pendant la décision,
et possibilité explicite « Modifier la recherche ». La sauvegarde reprend
le nom confirmé, pas une saisie effacée par le popover. Tests RTL et E2E
du parcours complet ajoutés ; pouvoirs commerciaux, RBAC, isolation
Workspace et contrôles anti-doublon inchangés. Aucune PR/merge. Gate
locale globale encore à confirmer.

**Avertissements Mongoose M-001 (22/10/2026) — correction à revérifier localement.**
Le contrôle transactionnel de mutation des grants Dossier utilisait l'option
`new: true` dépréciée dans `Dossier.findOneAndUpdate`. Remplacement strict
par `returnDocument: 'after'`, sémantique identique : l'incrément
`accessMutationVersion`, le filtre du Dossier, l'appartenance Workspace,
le statut admissible, la session et le conflit transactionnel restent intacts.
Les deux messages d'avertissement du journal E2E concernaient une API
dépréciée, et non deux échecs fonctionnels distincts. Gates locales à confirmer.

**Correction de la gate Playwright M-003 — 22/10/2026, à revérifier localement.**
Deux échecs signalés (tests 21/22 sur 34) : l'ajout manuel d'Article
faisait une recherche `/products/search` qui exige une capability Produit
absente du contexte import M-003 ; nouvelles lectures pré-création
`/supplier-articles/product-contributions/metadata|search`, sécurisées
par membership, mode écriture, `supplier:article:manage`,
`supplier:catalog:import` et capability `supplier_catalog_import`.
Le moteur de recherche et la gouvernance M-002 sont réutilisés sans
assouplissement de son endpoint général. Tests de permissions,
capabilities et non-divulgation entre Workspaces ajoutés.
Le second échec venait du test qui cherchait l'onglet « Infos Article »
dans un drawer fermé lors du parcours de contribution : le test rouvre
l'Article réellement associé après succès. Les captures, traces et
vidéos locales n'ont pas été consultées dans ce contexte ;
les 32 autres E2E ont été annoncés verts par l'utilisateur.
**Exécution locale des gates complètes requise avant PR / merge.**

**Finition infobulle identité M-004 (2026-10-22) — implémentée,
non testée localement.** Suppression de « Calcul du » et de l'heure de
calcul dans le survol de la ligne. Affichage du nom, de l'unité officielle,
de la gouvernance M-002 (Validée / À valider lorsque fournie), de la date
de modification de la Référence, et pour un Article effectivement
sélectionné, sa référence commerciale et sa date de modification.
Dates `JJ/MM/AAAA` uniquement ; aucune conclusion automatique
« À jour ». Les réponses M-004 exposent désormais les champs
`governanceStatus`/`updatedAt` de la Référence courante. Statut
de la valorisation et calculs inchangés. Tests HTTP, RTL et E2E
ajoutés/étendus, gates globaux et recette visuelle à exécuter
localement par l'utilisateur. Aucune PR/merge avant résultats verts.

**UX M-004 sélecteur Articles et traçabilité des prix (2026-10-22) — code
publié sur la branche, tests locaux NON exécutés.** Choix validé :
`Favoris | Articles | Tous`, même emprise visuelle, indicateur glissant
200 ms et `Tous` par défaut. Le mode Articles utilise la liste M-003,
filtrée par droits, Workspace, fournisseur/Référence actifs et association
exploitable. Choisir un Article en création/remplacement enregistre
Référence + Article ensemble avec contrôle transactionnel, sans nouveau
moteur de prix. Même Référence, autre Article : conserver la ligne et
changer le sourcing. L'infobulle Produit affiche désormais la source
effective enregistrée (prix tarifaire, négocié/facturé ou indicatif)
et le prix normalisé ; anomalie `getPricingSourceLabel` corrigée.
Correctif sécurité associé : recherche d'Articles sans écrasement
du filtre de visibilité Workspace. Tests frontend, HTTP et E2E ajoutés,
gates/QA utilisateur et PR encore en attente. Contrat :
`docs/m004/M-004-FINAL-CONTRACT.md`.

**QA présentation Fiche M-004 (2026-10-22) — tests locaux en attente :** l'infobulle de la ligne Produit affiche désormais le conditionnement sur une ligne, le poids net et le poids net égoutté sur des lignes distinctes, et la quantité totale calculée uniquement lorsqu'elle diffère du poids net (ou si le poids net est absent). La comparaison d'affichage G/KG utilise des décimaux exacts ; le conditionnement historique reste inchangé en dehors de cette infobulle. Tests RTL et de présentation ajoutés ; aucune gate ni QA visuelle déclarée verte.

**Audit BRIDOR 43279 reçu le 2026-10-22 — diagnostic confirmé, correction en attente de tests locaux.** Base `saas_fiches_techniques_gms_dev` : Référence « Croissant individuel PAI » en `UNIT`, un Article privé associé, preuve humaine de 36 pièces valide sur l'Article actuel (36 × 0,120 kg ; 4,32 kg), Tarif fournisseur de 6,50 € par carton, snapshot historique du même contenu (36 × 120 g ; 4 320 g). L'ancienne comparaison littérale de signatures renvoyait `matchesCurrentEvidence: false` malgré l'équivalence physique exacte. Le résolveur retombait sur le prix global indicatif de 0,20 € / pièce ; le brouillon conservait `NO_PRICE`. Correctif métier : comparer les quantités physiques dans des unités communes à précision décimale exacte, en relisant les signatures héritées sans migration ni réattestation, préserver le refus des colis réellement différents. Tests unitaires et HTTP reproduisant le décalage ajoutés ; **aucune gate exécutée par l'assistant**. Rejouer l'audit local, attendre `matchesCurrentEvidence: true`, `currentPrice.source: SUPPLIER_TARIFF`, montant `6,5 / 36`, puis dans le brouillon utiliser « Actualiser les coûts » ; aucune correction de données MongoDB ni migration recommandée.

**QA du 2026-10-22 — recherche et NC croissant (validation locale attendue) :** le champ Référence Produit de la création M-003 n'affiche plus l'aide en permanence : InfoTooltip au niveau du libellé ; le composant métier ProductSearchAutocomplete expose un bouton « Créer cette Référence » *uniquement* lorsque la recherche en cours est terminée sans résultat et que la capability/permission de contribution a été passée. Le bloc séparé a été supprimé ; le parcours provisoire, l'anti-doublon et la gouvernance restent inchangés. Pour M-004, l'info-bulle du prix NC présente maintenant le motif le plus pertinent si les alertes backend sont disponibles (plusieurs Articles à choisir / tarif non normalisable / Article indisponible / tarif hors période). **La cause réelle de BRIDOR 43279 n'est pas connue sans la sortie de l'audit MongoDB en lecture seule.** Tests RTL et E2E modifiés, *non exécutés dans cette conversation*. Pas de réécriture automatique des historiques, ni de contournement de l'équivalence vérifiée.

**Stabilisation Article/valorisation (2026-10-22) — tests locaux et QA NON exécutés.** La création privée peut enregistrer un Article sans Référence puis ouvrir automatiquement le parcours M-002 de contribution PROVISIONAL déjà présent ; le nombre de pièces utilisables est déclaré et attesté dès la création manuelle lorsque le colisage physique et la Référence UNIT l'exigent. Si la Référence créée à la volée se révèle en UNIT avec un conditionnement physique complet, le même parcours ouvre directement l'édition simplifiée pour confirmer le nombre de pièces (l'unité n'était pas connue à la création). L'édition conserve toute preuve à signature inchangée et ne renouvelle pas son horodatage, avec un champ unique et confirmation seulement si nécessaire. Les tarifs historiques non normalisables laissent essayer les sources de repli fiables ; le brouillon M-004 dispose d'une action « Actualiser les coûts ». Audit en lecture seule enrichi : `npm run audit:recipe-unit-usage -- "Croissant individuel PAI"`. **BRIDOR 43279 reste à vérifier sur la base locale** : la présence du code ne prouve pas que le tarif historique possède un snapshot compatible. Aucun test/gate déclaré vert et aucune PR prête à fusionner.

**QA ergonomie M-003/M-004 — correspondance 1 pour 1 et mention d'origine (2026-10-21) :** accord produit intégré : 1 unité du colis = 1 pièce de recette propose dynamiquement le nombre d'unités commerciales sans saisie dupliquée, sous confirmation humaine ; nombre différent avec champ conditionnel ; correspondance inconnue avec avertissement de non-valorisation ; équivalences existantes initialisées selon leur valeur ; changement de mode/colisage retire la confirmation. `packaging.supplierLabel` devient « Mention du conditionnement fournisseur (facultatif) » dans le volet « Informations complémentaires », ouvert si déjà renseigné. Mutation, modèles, calculs backend et historique inchangés. Tests React Testing Library des trois modes, des données existantes, des validations et de la mention ajoutés. Gates locaux non exécutés par l'assistant.

**QA M-003 — test checkbox après modification du colisage (2026-10-21) :** échec Vitest constaté localement : le test gardait une référence vers la checkbox montée avant la suppression temporaire de l'édition des pièces (unitCount effacé => canVerifyRecipeUnits=false). La checkbox remonte lorsque le nombre d'unités est de nouveau renseigné. Correction du test : vérifier son démontage au vidage, relire la checkbox du DOM courant et vérifier qu'elle est décochée ; ajout d'une régression distincte où la quantité par unité change sans démontage, pour confirmer l'invalidation de la confirmation existante. Aucune modification fonctionnelle nécessaire ni modification Core/backend ; gates locaux non exécutés par l'assistant.

**M-003 / M-004 — mise en évidence de l'équivalence pièce/colis (2026-10-21) :** l'édition d'un Article fournisseur UNIT présente désormais la correspondance de valorisation dès l'ouverture, avant les champs de conditionnement, avec la confirmation humaine visible. Les précisions sur l'unité du Référentiel et le risque de compter les sachets au lieu des pièces sont dans deux aides contextuelles InfoTooltip. Le reste du formulaire utilise des libellés outlined animés en mode feature-local (aucune primitive Core modifiée). La fenêtre est élargie sur desktop, seule la zone de champs défile et Annuler/Enregistrer restent hors défilement. La règle de vérification des pièces, l'invalidation de confirmation lorsque le colisage change, la mutation fournisseur et les tarifs historiques restent inchangés. Tests RTL ajoutés et gates locaux/recette visuelle à confirmer.

**QA M-002 — correction complète du contrôle guidé (2026-10-21) :** après le correctif de navigation E2E, le scénario a échoué sur « Masquer le contrôle ». Deux défauts identifiés par lecture de la chaîne entière : (1) le endpoint RTK Query `restoreProductReferenceReviewContext` omettait `dimensionType`, pourtant exigé par Zod pour `dataType=DIMENSION` ; (2) l'attribut `aria-label` restait sur « Examiner ... » après sélection, masquant le libellé accessible « Masquer ... ». Les deux corrigés en une intervention, avec test API du corps HTTP, test du passage de paramètre depuis la page, test du libellé accessible, et assertion E2E sur la requête/réponse de reprise. Aucune modification du Core, du backend ou des données métier. Résultats des gates et du E2E local encore à confirmer ; aucune PR.

**Correction navigation E2E du contrôle guidé — 2026-10-21 :** le scénario Playwright ne pouvait pas trouver l'onglet Références, car l'autocomplétion ne fait que filtrer le tableau. Le test ouvre désormais explicitement le drawer via l'action « Voir » de la ligne Produit, puis vérifie son titre avant de sélectionner l'onglet. Aucun changement de contrat ni de comportement applicatif. Échec local initial constaté (timeout 30 s) ; relance locale requise après pull.

**Cohérence des onglets M-002 — 2026-10-21 :** les Dimensions PROVISIONAL sont désormais signalées dans l'onglet Dimensions par une action distincte « Identité à examiner » même si qualityReviewStatus vaut REVIEWED. Le compteur À contrôler conserve son sens de revue qualité, et une Contribution de gouvernance ouvre la Dimension dans le filtre Toutes. Test RTL dédié ajouté, validation locale requise.

**E2E ciblé gouvernance M-002 — 2026-10-21 :** un scénario Playwright initialise exclusivement la base `_e2e_test` avec une Dimension provisoire déjà REVIEWED dont la Contribution a disparu, une Référence liée PROVISIONAL, puis exerce le contrôle guidé jusqu'aux deux validations distinctes. Le scénario doit encore être exécuté localement ; aucune réussite de gate n'est revendiquée.

**Invariant de validation explicite M-002 (2026-10-21) :** une résolution de Dimension ne peut pas promouvoir automatiquement une Référence encore PROVISIONAL. La mise à jour de signature des Références préserve cet état jusqu'à une décision explicite de Contribution. Test d'intégration étendu, scénario frontend de double bouton « Valider » rendu non ambigu. Gates locaux encore non exécutés.

**UX implémentée — contrôle guidé M-002 (2026-10-21) :** depuis l'onglet Références, le panneau de gouvernance identifie Produit parent et Dimensions avec leur statut d'identité, autorise une revue ciblée dans la même carte, puis la validation finale seulement si les dépendances sont approuvées. La revue qualité reste distincte et les quatre onglets sont conservés. Les décisions et liens de reprise réutilisent les mutations existantes sous permission Application Global MANAGE ; tests frontend ajoutés, gates locaux et QA visuelle à confirmer.

**Lot QA gouvernance M-002 — 2026-10-21 :** le parcours guidé de validation d'une Référence conserve les quatre onglets, expose les dépendances Produit/Dimensions et réutilise les décisions individuelles auditables. Le backend étend la reprise idempotente de Contribution aux Dimensions PROVISIONAL déjà REVIEWED, et remplace l'erreur générique par le nom des identités bloquantes ; contrat M-002 complété. Vérification E2E/RTL et gates locaux requis avant PR.

**QA contrôle vide M-002 — 2026-10-21 :** correction ciblée des champs outlined sans options (Variété, Caractéristiques). Le libellé « Aucune valeur disponible » est une option sentinelle, pas une sélection réelle : elle ne doit plus forcer le label en haut. Les champs concernés restent désactivés et affichent le libellé au centre au repos ; au survol, le libellé monte sur la bordure et le motif d'indisponibilité apparaît. Pas de faux focus ni de sélection autorisée. Les listes non désactivées continuent de flotter au focus. Tests de structure RTL mis à jour ; recette locale requise.

**QA finition M-002 — 2026-10-21 :** la fenêtre « Corriger » affiche désormais le nom initial de la Référence Produit et aligne « Enrichir le référentiel » avec son titre, sans sous-titre redondant. Dans le prototype outlined, les libellés des champs réellement vides restent à l'intérieur puis montent au focus (transition CSS, respect de reduced motion) ; ils restent en haut en présence d’une valeur et redescendent lorsqu’un champ redevient vide. Les listes sans valeur exploitable évitent de masquer leurs libellés ; les listes désactivées conservent l'explication de leur indisponibilité. Tests RTL/E2E ajustés ; résultats à confirmer par l’utilisateur en local avant PR.

**QA prototype UX M-002 — 2026-10-21 :** les libellés flottants « outlined » sont essayés uniquement dans la correction des Références Produit, via un habillage feature-local de Field/Input/Select existants ; le parcours de création conserve les libellés classiques. L'avertissement sur le changement d'unité est compacté avec une aide contextuelle conservant les conséquences complètes et une courte mention visible, sans retirer la confirmation explicite. Corrections ESLint associées : la fonction de réutilisation de Produit n'est plus préfixée par `use` (ce n'est pas un Hook) et le faux `<select>` natif du test devient un bouton de simulation. À valider en RTL, ESLint et recette visuelle locale ; aucune évolution Core ni API.

**QA ergonomie M-002 — 2026-10-21 :** la fenêtre « Corriger la référence Produit » débordait de la hauteur de l'écran et masquait « Annuler » / « Enregistrer ». Le dialogue est élargi sur ordinateur, limité à la hauteur visible, avec une zone de champs défilante et des actions/erreurs de validation conservées hors défilement. Ajustement uniquement frontend métier, sans évolution Core ni du contrat économique. Régression RTL et E2E écran bas ajoutées ; résultats locaux à confirmer par l'utilisateur avant PR.

Branche : `feature/m002-m003-m004-unit-consistency`. Les quatre règles métier (unité M-002 imposée dans les Fiches, preuve de pièces par colis, aucune conversion estimative de poids, correction gouvernée des Références déjà utilisées) sont **validées par l'utilisateur**. Contrat transversal : `docs/m004/M-002-M-003-M-004-UNIT-CONSISTENCY-CADRAGE.md`.

Implémentation préparée : `SupplierArticle.recipeUnitEquivalence`, normalisation `UNIT` par colis vérifié et compatible avec le snapshot tarifaire, historisation des nouveaux prix négociés/facturés, interface Article (titre, aide, « Nb d'unités par colis », unité de fiche en lecture seule, confirmation conditionnelle), garde-fou sur changement interdimensionnel M-002, tests backend/frontend, audit DB en lecture seule. Core inchangé v1.2.1.

**Revue intégration du 2026-10-16 :** le scénario croissant doit distinguer la politique par défaut `NEGOTIATED_PRICE`, la politique `SUPPLIER_TARIFF` (conversion impossible lorsque la preuve ne correspond plus), puis `INVOICED_PRICE` (facture validée seulement). L'affichage commercial des Articles et le Prix applicable suivent les mêmes exigences de preuve pour les conversions `UNIT` des tarifs sans snapshot. Tests locaux à relancer ; aucune réussite annoncée.

**QA M-002 — correction de navigation du 2026-10-16 :** dans le dialogue standard « Créer un Produit », les Produits proches ne présentaient que « Différent » malgré un callback `onUseExisting` déjà relié aux pages Workspace et Application Global. Correction frontend : action « Ouvrir ce Produit » pour les suggestions accessibles ; conservation de « Différent », du parcours contextuel M-003 et des restrictions des Produits archivés. Tests RTL et E2E M-002 étendus. Aucun backend/Core modifié pour cette anomalie. Vérification locale du lot requise avant PR.

**Complément QA M-002 du 2026-10-16 (validé pour implémentation)** : l'utilisateur a constaté que la Référence « Croissant individuel PAI » est passée de `G` à `KG` malgré l'association Article BRIDOR. La règle backend passe du blocage interdimensionnel au blocage de **tout changement d'unité** si un usage existe. L'ouverture d'un Produit retrouvé par la déduplication doit cibler directement l'onglet Références. L'Application Global présente « À contrôler » en petit bouton outline neutre ouvrant la décision existante via une recherche ciblée par `targetId`. Le dialogue de correction déplace le sous-titre technique vers une infobulle métier. Audits locaux, RTL, tests backend, E2E et gates restent à confirmer avant toute PR.

**QA 2026-10-16 :** un correctif encadre maintenant le changement d’unité d’une Référence sans Fiche ni Prix historique, même si des Articles fournisseur restent associés. Confirmation explicite, maintien des tarifs source et invalidation des anciennes équivalences. Le petit bouton warning « À contrôler » peut retrouver ou rétablir une contribution manquante, avec audit et sans validation automatique. Tests locaux indispensables avant PR.

**Validation encore attendue** : audit local de la Référence « Croissant individuel PAI » avant toute correction de données ; exécution locale des tests ciblés, lint, build, E2E et QA visuelle ; corrections sur la même branche. Aucun test vert ni migration effectuée par l'assistant. **Aucune PR/merge avant accord utilisateur.** Les archives ci-dessous peuvent décrire des états plus anciens et ne priment pas sur cet état actuel.

---

---

## Archive — reprise M-002/M-003 au 2026-10-14

**Date : 2026-10-14**  
**Dépôt : `greg44500/saas-fiches-techniques-gms`**  
**Dernier `main` métier vérifié : `962177905bcc198e439a316d9610b23c60dd53cd` (PR #44)**  
**Core intégré : v1.2.1 — `054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3` (`core-origin.json`)**

## Chantier actif — Association Produit depuis Article fournisseur

- Branche : `feature/m002-m003-supplier-product-creation`, créée depuis `a759fac`.
- Complément M-002/M-003 : création de Produits/Références provisoires depuis
  un Article fournisseur privé, sans capability Produit supplémentaire lorsque
  l'import fournisseur est accessible avec les permissions M-003 pertinentes.
- APIs contextuelles sécurisées + réutilisation des services de contribution
  M-002 ; lectures Produits contextuelles ; frontend à dialogues successifs ;
  association automatique et réessai sans recréer la contribution.
- Tests backend/frontend et E2E ajoutés, mais **aucun n'a encore été exécuté**.
  La QA locale, les gates globales et la validation visuelle restent nécessaires.
- Contrat : `docs/m003/M-003-ARTICLE-PRODUCT-CREATION-ADDENDUM.md`.
- Pas d'évolution Core ni de modification de `core-origin.json`.
- Interdiction de fusionner cette branche avant retour des gates et validation
  explicite de l'utilisateur. Le complément impression/email M-004 reprendra
  après la clôture du présent lot.

## État réel vérifié

- **M-001 à M-005 intégrés.** Le complément M-003 est fusionné par la [PR #44](https://github.com/greg44500/saas-fiches-techniques-gms/pull/44).
- [Core Gate PR #44](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/38537453030) : success sur `f40a054b4462167af66f28dc2426b329f7a064f6`.
- [Core Gate post-merge](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/38539141748) : **success à la tentative 2** sur `962177905bcc198e439a316d9610b23c60dd53cd`. Première tentative échouée sur une interaction du sélecteur `Base de vente` du test M-004 ; code du test et composants inchangés avant/après le merge. Cela signale une intermittence potentielle, non une régression métier démontrée.
- Aucune version Core ou provenance Core n'a été changée par la PR #44. Ne pas inférer que les migrations de la PR ont été jouées sur chaque base locale ou de production.

## Clôture fonctionnelle M-003

Imports directs d'Articles et mercuriales (avec ou sans catalogue), association à la Référence Produit facultative à l'import, corrections de listes privées historisées et auditées, choix explicite du tarif courant/expiré, prix normalisés et par pièce, recherche côté serveur, drawer Article à onglets, UX import Produit harmonisée et avertissement M-004 de tarif expiré.

**Dettes différées :** suppression contrôlée d'import/catalogue, renouvellements tarifaires prospectifs, gestion des conflits prix privé/global ; `docs/DEBT.md`.

## Prochain travail métier : complément de diffusion M-004

Les exports CSV, XLSX et PDF sont **déjà présents** dans le code et documentés dans `docs/m004/M-004-EXPORTS-FINAL-CONTRACT.md` et `docs/m004/M-004-EXPORTS-TECHNICAL-DESIGN.md`. Il reste à auditer/cadrer l'**impression** et l'**envoi par e-mail** de la Fiche validée. Avant toute implémentation : vérifier snapshot `TechnicalSheetValidation`, permissions, capability/quota, confidentialité, destinataires, stockage temporaire, traçabilité, réutilisation des rendus et tests. Ne pas redévelopper les formats existants ; pas de nouveau modèle/Core sans raison démontrée. Les Fiches process seront cadrées séparément.

## Opérations Git convenues

Créer puis fusionner une PR **strictement documentaire**. Ensuite seulement, aligner le clone local sur `main` et nettoyer les **branches déjà fusionnées** après vérification du statut Git, des refs et de l'absence de changements non sauvegardés. Ne pas effacer une branche non fusionnée ; ne pas effacer `main` ni modifier le remote `upstream-core`. L'utilisateur garde le contrôle des opérations locales et des merges.

## Archives historiques

Les sections suivantes documentent des états antérieurs des travaux M-003/M-005. Leurs mentions « tests en attente », « branche active » ou « PR interdite » ne s'appliquent plus à l'état courant. Le code et les gates réels priment.

---

## Archive de reprise M-005 (état antérieur à la fusion)

Les sections ci-dessous documentent le chantier et la QA avant fusion. Leurs formulations « branche active », « PR interdite » et « tests à faire » sont **historiques et ne décrivent plus l'état courant**. Pour le statut opérationnel, seule la section précédente fait foi.

---

# Archive — M-005 Atelier d’optimisation des Fiches techniques

**Date : 2026-10-08**  
**Branche : `feature/m005-technical-sheet-optimizer-v1`**  
**État historique au moment de la rédaction : branche en avance sur `main`, avant fusion de la PR #39.**

## 1. Point de départ

M-001 à M-004 constituent les fondations métier déjà intégrées. M-005 réutilise strictement :

- M-002 pour les Références Produit et les rendements ;
- M-003 pour les Articles fournisseur et les Prix applicables contextualisés par Dossier ;
- M-004 pour la composition, les calculs, la valorisation, la concurrence optimiste, les snapshots validés et le cycle DRAFT / VALIDATED.

Core intégré :

~~~text
v1.2.1
commit 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
~~~

Aucune évolution Core n’est requise par M-005.

## 1.1 Recadrage UX validé le 2026-10-07

La QA a invalidé le contrôle à cinq ancres de %CM. La direction désormais contractuelle est :

```text
profil économique global = instantané de toute la Fiche
1 point = 1 ingrédient
x = ajustement économique local
y = contribution au coût matière de la projection
```

Le profil n’est pas une fonction continue et n’interpole rien entre ingrédients.

Le réglage principal est local à la ligne via `economicAdjustmentPercent`. Le backend traduit cette intention en quantité, applique les garde-fous et revalorise avec M-004.

Desktop :

```text
Fiche simulée dominante à gauche
→ KPI économiques compacts au-dessus
→ drawer de pilotage large à droite
   → profil global toujours visible
   → Manuel / Auto
   → bandeau horizontal d’outils
   → inspecteur dynamique
   → actions fixes
```

Outils : Réglage, Produit, Approvisionnement, Contraintes.

Objectif UX : pas de scroll documentaire de la page Atelier sur desktop ; seule la liste de lignes peut disposer de son propre viewport lorsque la recette dépasse la hauteur disponible.

## 1.2 Recadrage UX QA du 2026-10-08

Le second passage QA conserve la Fiche à gauche et le drawer à droite, mais compacte fortement le panneau :

```text
Profil économique + [Manuel | Auto]
→ spectre coloré compact
→ icônes outils seules avec tooltip
→ grande zone contextuelle
→ actions sur une seule rangée
```

Le sous-titre explicatif du profil disparaît. `%CM` devient le libellé de l’axe Y. Réduction / Référence / Augmentation portent une aide contextuelle. Les termes de qualité ou de valeur ne sont pas utilisés car M-005 ne calcule aucun score de qualité.

Le profil adopte une esthétique de spectre/histogramme : une trace indépendante par ingrédient, avec un sommet positionné sur les vraies coordonnées `ajustement / %CM`. Aucun ingrédient n’est relié à un autre.

La plage libre par défaut reste `-99 % → +100 %`, soit presque zéro à deux fois la quantité de référence. Aucun min/max n’est inventé. L’ancien état non verrouillé `min = max = référence` est neutralisé ; le verrouillage explicite passe uniquement par `locked`.

## 1.3 Ajustements QA du 2026-10-08 — lisibilité

Le profil à courbes décoratives est remplacé par des barres horizontales indépendantes, ancrées sur Référence et positionnées verticalement par %CM. La couleur change selon réduction / augmentation. Le détail au survol est docké hors de la zone de tracé : il reste dans le panneau mais ne masque plus les barres ni leurs poignées.

Un indicateur économique global est ajouté sous l’axe. Il ne fait pas la moyenne des ajustements de lignes : il reprend directement `savings.percent` calculé par le backend sur le Coût de fabrication HT. Centre = référence, gauche = économie, droite = surcoût.

Autres ajustements :

- en-tête Atelier sur une ligne ;
- colonne « QT nette » ;
- suppression de « Lecture résultat simulé » ;
- min/max : champs uniquement numériques ou vides, explications dans les aides `(i)` ;
- KPI dynamique : Économie estimée / Surcoût estimé / Écart estimé selon le signe de `before - after`.

## 2. Contrats canoniques M-005

~~~text
docs/m005/M-005-FINAL-CONTRACT.md
docs/m005/M-005-TECHNICAL-DESIGN.md
~~~

Décisions structurantes :

- feature commerciale dédiée : `technical_sheet_optimizer` ;
- baseline/Free : feature absente par défaut ;
- aucun quota de simulation V1 ;
- RBAC : `technical-sheet:update` pour l’Atelier et `technical-sheet:sourcing:manage` pour changer explicitement d’Article ;
- simulation exclusivement sur le DRAFT courant ;
- aucune mutation avant `Appliquer au brouillon` ;
- `TechnicalSheetValidation` reste immuable ;
- min/max/verrouillage persistés sur les lignes du DRAFT et snapshottés lors de la validation ;
- %CM = part relative du Coût Matière, jamais composition physique ;
- l’ajustement M-005 est porté par chaque ligne Ingrédient ; l’ancien contrôle à cinq ancres est abandonné ;
- à Produit/prix/rendement constants, la variation de coût se traduit directement en variation proportionnelle de quantité ;
- min/max sont des garde-fous facultatifs et leur absence ne neutralise pas l’ajustement local ;
- aucune compensation physique obligatoire lors d’une réduction de quantité ;
- alternative Produit V1 = même `CanonicalProduct`, même `referenceUnit`, Référence ACTIVE et visible dans le Workspace ;
- alternative d’approvisionnement = même Référence Produit, Article revalorisé avec le Prix applicable du Dossier courant ;
- mode Auto V1 = meilleur prochain mouvement élémentaire économiquement favorable, sans score de goût ni solveur opaque.

## 3. Backend implémenté

Fichiers principaux :

~~~text
backend/modules/technicalSheet/technicalSheetOptimizer.registry.js
backend/modules/technicalSheet/technicalSheetOptimizer.validation.js
backend/modules/technicalSheet/technicalSheetOptimizerMath.service.js
backend/modules/technicalSheet/technicalSheetOptimizerAlternative.service.js
backend/modules/technicalSheet/technicalSheetOptimizerProjection.service.js
backend/modules/technicalSheet/technicalSheetOptimizerScenario.service.js
backend/modules/technicalSheet/technicalSheetOptimizerAuto.service.js
backend/modules/technicalSheet/technicalSheetOptimizer.service.js
~~~

Le service initial trop volumineux a été découpé par responsabilités :

~~~text
projection / contexte
→ chargement du DRAFT, valorisation fraîche, projection avant/après

scénario Manuel
→ ajustement local, contraintes, override local, substitutions, fingerprint

stratégie Auto
→ génération bornée des candidats et sélection du meilleur prochain mouvement

orchestration
→ contexte API, simulate, apply transactionnel
~~~

Routes :

~~~text
GET  /workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/optimization
POST /workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/optimization/simulate
POST /workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/optimization/apply
~~~

Sécurité des routes :

~~~text
authenticate
→ validation Zod
→ contexte Workspace
→ technical-sheet:update
→ access mode Workspace
→ feature technical_sheet_optimizer
→ contexte Dossier autorisé
→ Dossier opérationnel
~~~

Durcissements intégrés :

- fingerprint simulation recalculé lors de l’Apply, y compris après changement du Prix applicable ;
- `expectedRevision` obligatoire ;
- modification explicite d’Article protégée par `technical-sheet:sourcing:manage` et couverte par un test de refus ;
- plafond de 60 candidats élémentaires en Auto V1 ;
- Articles sans Prix applicable exclus des alternatives M-005 au lieu de faire échouer tout le contexte ;
- une édition M-004 normale de Produit/quantité réinitialise une ancienne enveloppe devenue incohérente ;
- aucune sélection automatique arbitraire de l’Article fournisseur le moins cher dans M-003.

## 4. Persistance et historique

`TechnicalSheetDraft.lines[].optimization` :

~~~text
minNetQuantity
maxNetQuantity
locked
~~~

La même enveloppe est ajoutée à `TechnicalSheetValidation.linesSnapshot[]`.

Effets :

- l’Apply M-005 écrit le DRAFT dans une transaction et incrémente sa révision ;
- la validation M-004 snapshotte ensuite l’enveloppe ;
- une nouvelle révision restaurée depuis une validation conserve les contraintes de recette ;
- une copie inter-Dossier conserve l’enveloppe de recette mais jamais les données économiques source.

Aucune nouvelle collection MongoDB M-005.

## 5. Frontend implémenté

Nouveaux éléments :

~~~text
frontend/src/features/technical-sheets/pages/technical-sheet-optimizer-page.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-route.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimization-profile.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-inspector.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-picker-dialog.jsx
frontend/src/features/technical-sheets/lib/technical-sheet-optimizer.js
~~~

Fonctions visibles :

- page Atelier dédiée ;
- bandeau économique avant / après avec état de recalcul ;
- profil économique global à points, un point par ingrédient, utilisé comme instantané de la simulation ;
- Fiche technique simulée comme surface principale avec barres de contribution ;
- panneau droit largeur drawer avec profil toujours visible, bandeau horizontal d’outils et inspecteur dynamique ;
- réglages en Sheet sur petit écran ;
- garde-fous quantité facultatifs ;
- calques Produit / rendement et approvisionnement ;
- bornes min/max ;
- verrouillage ;
- override local ;
- alternatives Produit ;
- alternatives d’approvisionnement selon permission ;
- modes Manuel / Auto ;
- Réinitialiser / Comparer / Appliquer au brouillon ;
- reprise d’une suggestion Auto en Manuel.

Entrées UX :

~~~text
Fiche technique
→ bouton Optimiser

Dossier → Fiches techniques
→ action Optimiser sur une ligne
→ bouton Atelier d’optimisation + sélecteur de Fiche

Sidebar Workspace → Dossiers
→ Atelier d’optimisation (baguette magique)
→ sélection Dossier
→ sélection Fiche
~~~

Une Fiche validée sans DRAFT passe d’abord par le workflow M-004 de création d’un nouveau brouillon.

## 6. Tests ajoutés

Backend :

~~~text
backend/tests/modules/technicalSheet/technicalSheetOptimizerMath.test.js
backend/tests/modules/technicalSheet/technicalSheetOptimizer.integration.test.js
backend/tests/modules/technicalSheet/technicalSheetOptimizer.http.test.js
backend/tests/plans/applicationCapability.registry.test.js
~~~

Frontend :

~~~text
frontend/src/features/technical-sheets/api/technical-sheets-api.test.js
frontend/src/features/technical-sheets/pages/technical-sheet-optimizer-page.test.jsx
frontend/src/features/technical-sheets/components/technical-sheet-control-panel.test.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-route.test.jsx
frontend/src/app/application-routes.test.js
~~~

E2E :

~~~text
e2e/tests/technical-sheets-m005-optimizer.spec.js
~~~

Le scénario E2E vérifie notamment :

~~~text
simulation
→ avant/après visible
→ aucun changement persistant après reload

puis Apply
→ retour Fiche
→ quantité réellement modifiée dans le DRAFT
~~~

Les tests ajoutés n’ont pas été exécutés à distance. Aucun statut vert n’est revendiqué.

## 7. État de validation

État actuel :

~~~text
cadrage M-005
→ fait

implémentation backend
→ faite

implémentation frontend
→ faite

tests ajoutés
→ faits

revue statique manuelle
→ faite ; derniers durcissements intégrés

tests locaux utilisateur
→ à faire

QA visuelle utilisateur
→ à faire

PR
→ interdite avant validation utilisateur

merge
→ interdit avant validation utilisateur
~~~

## 8. Ordre de reprise immédiat

1. récupérer la branche localement ;
2. lancer les tests M-005 ciblés ;
3. corriger les éventuels échecs sur cette même branche ;
4. lancer les gates globales applicables ;
5. lancer l’application avec `npm run dev` et le frontend ;
6. effectuer la QA visuelle de l’Atelier ;
7. seulement après validation explicite de l’utilisateur : PR unique puis merge unique réalisés par l’utilisateur.

Ne pas créer de micro-version, de PR intermédiaire ou de merge technique pour corriger un test.


### Ajustements QA du 2026-10-08 — compacité et repérage

- Chaque ingrédient conserve une teinte déterministe à partir de son identifiant de ligne ; la teinte s'assombrit proportionnellement à la distance de la référence, dans chaque direction. La couleur ne constitue pas une évaluation qualitative.
- La zone SVG est compactée et les trois aides d'axe ont une typographie identique.
- L'indicateur de coût global conserve son calcul serveur ; son titre « Impact global » est positionné à gauche de la barre sur deux lignes.
- « Réinitialiser » est désormais à côté de Manuel / Auto ; le pied ne conserve que « Comparer » et « Appliquer au brouillon ».


## 1.5 QA du 2026-10-08 — cohérence entre profil et Fiche

- Le repère de couleur de chaque ingrédient dans la Fiche utilise le même helper par lineId que la poignée du profil. Les teintes restent stables indépendamment de l’ordre de présentation.
- Le titre et le surtitre redondants disparaissent du header interne du tableau ; Production et Portions y restent visibles, ainsi que le bouton mobile Réglages.
- Un badge « Simulation en cours » accompagne le titre principal de l’Atelier.
- Le bandeau est renommé « Impacts économiques ».
- Dans l’indicateur global, le libellé est centré verticalement avec la barre. La mention « Référence économique » n’est plus affichée en état neutre ; le libellé accessible « Aucun écart » reste disponible.


## QA palette par ingrédient — 2026-10-08

La palette par ligne INGREDIENT est attribuée une fois depuis l'ordre de la baseline, partagée entre le tableau et le graphique. Le repère du produit, la barre %CM et le profil ont la même couleur de base ; la couleur du graphique peut être renforcée près des extrêmes. Aucun usage de la couleur ne représente un score qualitatif. La palette boucle après dix ingrédients.


## Correctif QA — couleurs des ingrédients et barre %CM (2026-10-08)

Les ingrédients reçoivent des teintes distinctes depuis l'ordre de la baseline sans répétition cyclique de la palette de dix couleurs. Les mêmes teintes identifient les ingrédients dans les pastilles et dans le profil (avec foncement aux extrêmes). Les barres de `%CM` utilisent exclusivement `bg-primary/75`, couleur du thème de l’application, sans style de couleur injecté.


## QA E2E finale (2026-10-08)

- M-005 : la comparaison visuelle des quantités utilise désormais une valeur d'origine barrée et une valeur simulée contiguë, sans flèche ; E2E contrôle explicitement ces deux états et le rechargement non persistant.
- M-003 : l'inspection CSV nécessite toujours un vrai verdict ClamAV CLEAN. Le 503 FILE_INSPECTION_FAILED en environnement Windows signale un moteur indisponible ou en échec. Le runner E2E accepte `CLAMAV_BINARY_PATH` depuis l'environnement utilisateur (défaut `clamscan`). Aucun mock ni bypass antivirus n'est autorisé. Vérifier également les signatures locales ClamAV avant une nouvelle exécution E2E.

---

## Complément M-003 en cours — 2026-10-09

Branche unique : `feature/m003-catalog-management-and-import-ux`.
Lot « Importer une liste d'Articles fournisseur » implémenté côté modèle,
API, frontend Workspace/global et tests ajoutés. Fonctionnalité non validée
tant que le responsable produit n'a pas exécuté les tests locaux et la QA visuelle.

Invariants : fournisseur et référence normalisée ; produit M-002 facultatif
au stade import et obligatoire à l'usage économique ; déduplication au réimport ;
aucune édition Catalogue ou tarif créé par le flux Articles ; séparation stricte
GLOBAL_SHARED / WORKSPACE_PRIVATE. Tests à mener avec ClamAV fonctionnel et base
de test dédiée, migration M-003 des nouveaux indexes à exécuter sur l'environnement
de développement. Ne pas ouvrir de PR ni merger avant validation utilisateur.

---

## Reprise UX des imports — travail en attente de QA locale (2026-10-13)

Branche active : `feature/m003-catalog-management-and-import-ux`.
Complément UX implémenté pour les trois assistants d'import métier : Produits,
Articles fournisseur, Catalogues fournisseur. Stepper quatre étapes avec état
actif visuellement affirmé (bordure, couleur, typographie), coches d'étapes
terminées et `aria-current`; information métier en infobulle accessible ;
sélecteur de fichier francisé et formats acceptés ; footer commun ; récapitulatif
final visible pour les parcours Fournisseurs.

Les modifications sont frontend / tests / documentation, sans changement Core,
API ou modèle DB dans ce complément. Les suites de tests existantes et E2E M-003
ont été adaptées, avec nouveaux tests unitaires des composants d'import.
**Aucun test local ou gate n'est déclaré vert à cette étape.** L'utilisateur
exécute ensuite pull, lint, tests et QA visuelle sur Windows. Corriger les
éventuels échecs sur la même branche ; une seule PR finale après accord.


---

## Complément M-003 — création rapide d'un Fournisseur depuis les imports (2026-10-13)

Branche : `feature/m003-catalog-management-and-import-ux`.

- Les assistants d'import Articles fournisseur et Catalogues utilisent désormais un sélecteur partagé de Fournisseur avec recherche serveur par nom. Il évite de dépendre uniquement des cent premiers Fournisseurs chargés par la page.
- Lorsque l'utilisateur possède les droits de création de Fournisseur de la portée concernée (Workspace ou Application Global), il peut créer une fiche minimale par son nom et la sélectionner immédiatement, sans interrompre l'import.
- Les API existantes de création sont réutilisées, sans changement de modèle, de Core, de permissions ou de contrat d'import.
- La nouvelle identité reste respectivement WORKSPACE_PRIVATE ou GLOBAL_SHARED selon le contexte. La création globale reste réservée aux administrateurs habilités par Application Global.
- Aucun nouveau statut de validation n'a été introduit : le contrat actuel ne connaît que ACTIVE/ARCHIVED. Le workflow de vérification métier distinct (rôle du valideur, règles de disponibilité des Articles et prix, gestion des homonymes et éventuels blocages) doit faire l'objet d'une décision fonctionnelle et d'un avenant contractuel avant tout code.
- Le contrôle d'homonyme dans le sélecteur est une aide UX et non une garantie d'unicité serveur.
- Tests des dialogues et E2E adaptés ; tests nouveaux pour la sélection, les permissions et la création rapide. **Aucune exécution locale ni gate n'est déclarée verte**.

QA nécessaire : recherche d'un Fournisseur au-delà de la première page, sélection d'un fournisseur existant, création privée, création globale habilitée, refus sans droits, éventuelle homonymie, conservation du fichier et des correspondances, import confirmé, isolation Workspace, absence de régression.


### QA en cours — noms et doublons Fournisseurs (2026-10-13)

Demande produit : stocker et présenter les noms Fournisseurs en majuscules, rapprocher les noms proches et empêcher les doublons, y compris en dehors de l'import. Le code du service Fournisseurs a été adapté pour normaliser le nom et refuser les homonymes normalisés lors de la création ou du renommage, en tenant compte du global et du Workspace. Les deux formulaires de création concernés mettent désormais la saisie en majuscules.

**Non clôturé :**
- La détection phonétique/approchée et la décision explicite sur les rapprochements `TRANSGOURMET` / `TRANSGOURMETS` ne sont pas implémentées. Ne pas fusionner automatiquement ces deux identités.
- Aucune contrainte unique MongoDB n'a été activée : audit préalable des homonymes existants (y compris archives) et migration d'index requise pour garantir les écritures concurrentes.
- Les données historiques ne sont pas converties en majuscules.
- Les tests locaux de ces nouveaux changements ne sont pas exécutés ; la gate n'est pas vérifiée.
- Ne pas ouvrir de PR ou fusionner avant stabilisation, tests backend/frontend/E2E et QA utilisateur.

Le contrôle actuel est une réduction du risque, **pas encore une garantie absolue contre tous les doublons**.


### Durcissement Fournisseurs — identité et audit DB (2026-10-13)

- Les nouveaux noms Fournisseurs sont enregistrés en majuscules ; le service refuse les doublons normalisés lors de la création et du renommage, en incluant la visibilité globale pour un Workspace.
- Les variations simples avec ou sans `s` final (ex. TRANSGOURMET(S)) sont bloquées par le service avec HTTP 409 et demande de revue ; il ne s'agit PAS d'un système général de similarité phonétique ou sémantique.
- Deux index uniques partiels (global par normalizedName ; privé par workspace + normalizedName) ont été déclarés. Ils ne protègent pas les collisions cross-scope global/privé concurrentes, qui sont refusées par le service applicatif mais sans garantie atomique commune.
- Commande d'audit préalable, sans écriture : `npm run audit:m003-supplier-names`. Elle signale les doublons existants, incohérences de normalisation et bloque le déploiement des nouveaux index si elle échoue. Vérifier l'URI MONGODB_URI et la base cible avant toute commande.
- `npm run migration:m003-supplier-catalog` n'est à exécuter qu'après audit sans collisions ; la migration échoue volontairement si les noms historiques nécessitent une résolution manuelle. Aucune fusion, suppression ou conversion automatique des données historiques.
- Tests backend spécifiques ajoutés mais non exécutés localement. Revalider les tests historiques dont les attentes de casse changent, l'indexation en base de test, les autorisations, l'UX, E2E et les gates. Aucune PR/merge autorisée sans QA.

---

## Travail en cours — prix fournisseurs hors catalogue et UX Articles (2026-10-13)

Branche : `feature/m003-catalog-management-and-import-ux`.
Référence Core inchangée : v1.2.1.

**Cadrage utilisateur validé :** importer une liste tarifaire fournisseur
avec période de validité (ex. un an), sans créer d'édition catalogue.
Le frontend n'effectue aucune conversion ou présentation calculée des prix :
les montants et textes métier dérivés proviennent du backend.

Code enregistré sur GitHub : `SupplierTariff` accepte l'origine `PRICE_LIST`
avec import, libellé source et période, sans catalogue. L'import Articles
accepte prix, base monétaire, provenance et dates ; absence de prix reste
compatible. Le backend bloque les chevauchements visibles et conserve
l'historique ; le résolveur Prix applicable comprend les deux origines,
sans inventer de prix normalisé lorsqu'il est impossible de le calculer.
La liste Articles reçoit les projections tarifaires et libellés consolidés
côté serveur. L'onglet Articles affiche les badges d'association et les prix ;
les compteurs Fournisseurs/Articles actifs exploitent les totaux serveur.

**Avant QA locale :** vérifier `MONGODB_URI`, puis
`npm run audit:m003-supplier-names`; en l'absence d'anomalies,
`npm run migration:m003-supplier-catalog` pour migrer l'ancien index
tarifaire et appliquer les index de listes. Ne pas faire de migration dans
une base contenant des doublons de Fournisseurs non résolus.

Tests ajoutés : import sans édition, projection prix/kg, périodes en conflit,
isolation tarifaire de deux Workspaces pour un Article global, libellé de
conditionnement, interface de saisie, badges/compteurs. **Aucune exécution
locale, build ni gate verte n'est affirmée.**

Attention : correction/archivage d'une liste déjà importée non livré ;
le conflit est volontairement bloquant. Le prix « fournisseur de référence »
ne constitue pas le Prix applicable d'un Dossier. Ne pas ouvrir de PR ni
merger avant QA explicite et preuve des gates.

Contrôle ajouté : `SupplierTariff.packagingSnapshot` conserve les poids/quantités
au moment de la liste ; projections et Prix applicable utilisent cet
instantané plutôt que le conditionnement courant de l'Article.


## Correction UX complémentaire — option A validée (2026-10-13)

Suite au retour QA sur le formulaire des Articles : calendrier natif
`type=date` supprimé et composant existant `components/forms/date-picker.jsx`
réutilisé, avec affichage français `jj/mm/aaaa`.

Lorsque la colonne prix est mappée, une case « Importer les prix présents
dans le fichier » permet de n'importer que les Articles si elle est décochée.
Lorsque les prix sont importés, une seconde case « Ces prix ont une période
de validité définie » (décochée par défaut) ouvre les champs détaillés.
Sans période renseignée, `validityMode=FROM_IMPORT` est traité côté
backend : `validFrom` est déterminé à la confirmation par le serveur et
`validTo=null`, avec nom de source en français. Avec période définie,
`validityMode=DEFINED` exige nom et début ; l'ancienne forme du contrat
reste acceptée.

Le champ technique « Base tarifaire par défaut » est présenté comme
« À quoi correspond le prix indiqué dans le fichier ? ». Aucune logique
de prix n'est déplacée dans le frontend.

Tests frontend étendus (avec/sans période, import prix désactivé) ;
tests HTTP étendus (horodatage serveur sans expiration, rejet de date
client imposée). **Exécution locale, lint et gate non encore vérifiés.**
Conserver la branche M-003, ne pas ouvrir de PR avant validation utilisateur.

---

## Reprise M-003 — gestion corrective des Articles (2026-10-13)

Sur `feature/m003-catalog-management-and-import-ux`, reprise après
interruption de connexion. Fichiers vérifiés directement sur GitHub avant
reprise, Core toujours v1.2.1 et non modifié.

Nouveau complément :
- tableau Articles : désignation fournisseur prioritaire, référence
  secondaire ; retrait de la provenance d'import sous le prix ;
- fiche détail Article avec action de réassociation/dissociation Produit,
  édition des champs fournisseur et du conditionnement ;
- révisions immuables de corrections d'erreurs de prix pour les
  `SupplierTariff` privés de type `PRICE_LIST` : motif, acteur,
  événement d'audit, ancienne valeur non effacée, même période ;
- liste d'historique privée au Workspace et RBAC explicite ;
- migration de l'index partiel des listes de prix avant validation
  locale ; l'index `supplier_price_list_import_article_revision_unique`
  protège le numéro de révision et le verrou Commerce transactionnel
  garantit une seule révision courante lors des écritures métier ;
- tests backend d'association, correction, révision obsolète, RBAC
  et tenancy ; tests UI d'ordre d'affichage et de correction.

**Important :** les nouveaux prix avec date d'effet distincte,
l'archivage d'une liste et les corrections de tarifs issus de catalogues
ne sont PAS livrés dans cette correction de saisie. Aucun prix historique
n'est réécrit. Les workflows restent à cadrer.

Aucun test, lint, build, E2E ou gate n'a été exécuté par l'assistant.
L'utilisateur effectue le pull et tous les tests localement.
Ne pas ouvrir de PR ni effectuer de merge sans sa validation explicite.

Ordre recommandé : vérifier `MONGODB_URI`, audit Fournisseurs,
migration index M-003, tests backend ciblés, tests frontend ciblés,
lint/backend+frontend, build, E2E et QA manuelle.

Dernière vérification : le résolveur de prix applicable recalcule le montant
normalisé à la lecture après toute correction d'association Produit, depuis
le prix source et son conditionnement figé. Les nouveaux tarifs issus de
Catalogues figent eux aussi désormais le conditionnement dans
`packagingSnapshot`. Les anciens tarifs Catalogue qui ne possèdent pas
cet instantané restent un point à auditer avant correction rétrospective.

## QA locale M-003 — correction transactionnelle des tarifs (2026-10-13)

Les 4 suites backend ciblées ont été lancées par l'utilisateur : 31 tests
réussis sur 32, échec HTTP 500 sur la première correction tarifaire.
L'analyse de code montre que l'index unique partiel de la révision courante
conserve la même clé lors du remplacement transactionnel et peut déclencher
E11000. Le correctif remplace cet index par une unicité
import/Article/numéro de révision et conserve le verrou Commerce commun à
l'import et à la correction. La migration retire l'index précédent.
Le test HTTP vérifie maintenant deux corrections successives, trois
révisions historisées et une seule version courante.

Ce correctif reste **en attente de vérification locale** : d'abord l'audit
sur la base cible, ensuite migration des index si applicable, puis relance
des tests ciblés. Aucun test vert n'est revendiqué par l'assistant.

## QA visuelle M-003 — simplification des Articles et tarifs (2026-10-13)

Sur la branche M-003 : recherche serveur progressive (300 ms, page 1,
effacement du filtre, pas de bouton), champ réduit et alignement de
Recherche/Statut ; drawer Article sans la ligne Fournisseur/référence
redondante, référence placée dans la carte Informations de l’article ;
avertissement de valorisation en couleur sémantique warning ; provenance,
dates de validité et historique dans le Collapsible partagé fermé par défaut
avec animation tenant compte de reduced motion.

Correction tarifaire : explication métier dans InfoTooltip, motif facultatif
(zéro caractère minimum, maximum 500), absent ou vide normalisé à null,
sans changement des règles de montant et de provenance historique.
Tests HTTP, validations, recherche, correction et drawer à vérifier en local.
Aucun test, lint, build, E2E ou gate n'est déclaré vert à ce stade.

## Complément M-003 — projection conditionnement/prix par pièce (2026-10-13)

Retour QA utilisateur : la liste Articles affiche déjà le prix du colis
et le prix normalisé kg/L/UNIT, mais pas celui de chaque élément d'un
carton de plaques de 300 g ; la quantité totale du conditionnement doit
apparaître sous son libellé. L'Article et sa Référence M-002 ne sont pas
reparamétrés à cet effet.

Évolution ciblée :
- présentation de masse totale en kg, de volume total en L ou de
  quantité UNIT ; aucune masse inventée pour une donnée volumique ;
- poids net déclaré incohérent conservé comme information à vérifier,
  séparément de la quantité calculée ; ne pas masquer une anomalie ;
- prix par pièce calculé sans arrondi intermédiaire depuis le prix
  du colis et son nombre d'éléments lorsque le conditionnement explicite
  est complet ; nul si les prérequis ne sont pas réunis ;
- conservation des prix du colis et du prix normalisé, y compris lorsque
  le tarif possède un instantané historique de conditionnement ;
- affichage harmonisé dans le tableau Articles et le drawer Article ;
- tests ciblés backend des masses, volumes, prix pièce, cas incomplets
  et instantanés, ainsi que tests frontend de présentation.

Core v1.2.1 inchangé ; pas de migration ni nouveau stockage ;
une seule branche de livraison M-003.
**Aucun test local ou gate n'est revendiqué vert sur ce lot** :
l'utilisateur exécute les validations localement après pull.

## Densification du tableau Articles M-003 — popovers (2026-10-13)

Après retour QA utilisateur, les colonnes Conditionnement et Tarif
fournisseur HT ne doivent plus empiler plusieurs lignes dans la liste.
Seuls le libellé du conditionnement et le prix du colis restent visibles.
Les informations secondaires déjà projetées par le backend sont dans
deux popovers métier utilisant la primitive UI existante :
- `PackageSearch` : total massique, volumique ou UNIT et anomalie
  éventuelle du poids net déclaré (icône au ton `warning` si besoin) ;
- `Calculator` : prix par pièce et prix normalisé au kg/L/UNIT,
  uniquement si calculables ; aucune nouvelle règle économique.

Activation au survol sur desktop et au clic/toucher ou au clavier.
Les icônes n'apparaissent que si elles portent un complément exploitable.
Aucun composant partagé/Core, backend, modèle ou index n'est modifié.
Tests frontend mis à jour pour vérifier la compacité, les popovers,
les warnings et l'absence d'icône si aucune donnée secondaire.
Validations locales, lint, build, QA et gates encore à exécuter.

## QA M-003 — reprise après interruption et décision prix expiré (2026-10-14)

L'utilisateur valide explicitement :
- dernier tarif expiré visible sur l'Article, prix secondaires conservés ;
- recours au dernier tarif connu expiré dans la valorisation
  des Fiches techniques, avec alerte explicite et traçable ;
- correction historisée des dates de période par l'utilisateur ;
- barre Articles compacte sans labels Recherche/Statut, filtre
  Fournisseur recherché côté serveur + Statut + recherche Article.

Implémentation sur `feature/m003-catalog-management-and-import-ux`
sans upgrade Core ni nouveau modèle/index :
`supplierTariffSelection`, tarif expiré dans les listes,
résolveur de prix M-003 avec alerte, endpoint de correction des dates,
formulaire DatePicker, filtre Fournisseur Popover, avertissement dans
carte prix Dossier et icône d'avertissement sur prix unitaire
dans la composition FT M-004. Les contrôles de chevauchement import
s'appuient sur la même règle de dates civiles Europe/Paris.

Les tests sont préparés ; **aucune exécution locale, lint, build, E2E
ni Core Gate n'est attestée à ce stade**. L'utilisateur réalisera les
tests localement puis décidera de la PR et du merge. Pas de
modification silencieuse de main.

## Correctif ciblé QA locale M-003 — 2026-10-14

Retour utilisateur après le commit `d9ced965` :
- backend ciblé : 44 tests réussis sur 45, inspection CSV du nouveau
  test de correction de période en HTTP 400 ; le test contenait
  les caractères littéraux `\\n` au lieu d'un saut de ligne CSV ;
- frontend ciblé : 36 tests exécutés et réussis, mais suite drawer
  non collectée à cause d'une accolade fermante JSX manquante
  après le bandeau « Dernier prix connu — expiré ».

Corrections limitées à la chaîne de test et à la syntaxe JSX.
Pas d'évolution de règle économique, d'API, de données ou de Core.
Après correction : tests ciblés puis lint, build et gates globaux
à relancer par l'utilisateur ; aucune réussite non démontrée.

## Correction du filtre MongoDB de révision tarifaire — 2026-10-14

Résultat utilisateur au commit `319286ed` :
- suite backend `supplierArticleImport.http.test.js` : 15/16 verts ;
- le test `corrige une période expirée...` passe l'inspection CSV,
  l'import, le contrôle des permissions et du Workspace, mais échoue
  sur l'API de correction avec un HTTP 500 au lieu de 200.

Cause identifiée dans le code (à confirmer par le prochain test) :
`backend/config/db.js` active `mongoose.set('sanitizeFilter', true)` ;
le service de correction de période introduisait un filtre interne
`_id: { $ne: prior._id }` sans `mongoose.trusted`. Avec la
sanitisation, cet opérateur peut être requalifié et provoquer une
erreur de conversion au moment de la requête MongoDB.

Correction ciblée : déclarer ce `$ne` construit et contrôlé par le
service comme fiable via `mongoose.trusted({ $ne: prior._id })`.
La sanitisation globale est conservée. Le test HTTP existant est
renforcé pour vérifier également la création de l'événement d'audit
et son rattachement à la nouvelle révision. Aucun changement de
contrat, de schéma, de Core ou de migration. Tests locaux à rejouer
par l'utilisateur ; succès non revendiqué avant exécution.

## UX M-003 — drawer Article à onglets (2026-10-14)

Retour visuel utilisateur validé : ne plus empiler les blocs
d'informations Article / association / tarif dans le même drawer ;
réutiliser la navigation à onglets des autres drawers.

Lot frontend ciblé :
- `Infos Article` par défaut : référence, Fournisseur, marque,
  conditionnement, statut et modification autorisée ; désignation
  conservée dans le titre du drawer ;
- `Association` : Produit lié ou état « Non associé », action
  conditionnée par RBAC et statut, conséquences économiques accessibles
  via `InfoTooltip` près de l'action sans bandeau permanent ;
- `Tarif fournisseur` : prix principal et complémentaires, provenance,
  dates et avertissement d'expiration ; correction du prix et de la
  période selon les droits ; historique replié et hauteur bornée ;
- navigation réinitialisée à `Infos Article` lors de la réouverture,
  onglet Tarif entièrement absent sans permission de lecture.

Fichiers impactés : drawer, tests RTL, contrat M-003, conception et
synthèse de reprise. Aucun changement Core, backend, migrations ou
règles de valorisation. Les tests sont à exécuter par l'utilisateur
localement ; ne pas annoncer de gate verte sans résultat réel.

## Ajustement UX M-003 — actions dans la carte Tarif (2026-10-14)

Retour visuel : « Corriger le prix » et « Modifier la période »
figuraient sous la carte alors que les autres onglets plaçaient
leurs actions en haut à droite de la zone métier. Déplacement
des deux boutons dans l'en-tête de la carte « Prix fournisseur HT »,
avec alignement à droite et adaptation aux petites largeurs.
Le prix principal, les prix complémentaires, la provenance,
l'expiration et l'historique replié sont conservés.

La garde existante (permission de correction, liste privée
`PRICE_LIST`, Article actif) et les callbacks restent inchangés.
Test RTL renforcé sur la position des actions à l'intérieur de
l'en-tête de la carte et leur absence pour les prix Catalogue.
Aucun Core, backend, API ou modèle touché.
Tests, lint et build à effectuer localement par l'utilisateur.

Note de recette UI/UX (2026-10-23) : table Catégories compactée en menus « … », compteur `totalProductCount` distinct des produits actifs, suppression seulement si réellement vide et contrôlée au backend avec transaction / audit / HTTP 409, zone de lignes à défilement interne sous un en-tête sticky. Panneau de gouvernance : « Approuver » et « Annuler » pour fermer seulement l'examen. Attention : l'audit Core D-008 pièces jointes e-mail et l'ancienne branche M-001 restent différés. Les tests ciblés Windows, la QA et la gate restent à exécuter ; aucune PR ou fusion autorisée.


Complément M-002 du 2026-10-23 : pagination locale du tableau Catégories avec `DataPagination`, scroll interne inchangé ; ajout de la fusion manuelle source→cible avec cible active, transaction réaffectant les `CanonicalProduct` même archivés et supprimant la source avec audit `CATEGORY_MERGED`. Dialogue de confirmation, guards Zod/MANAGE, tests backend HTTP/intégration et tests frontend en attente d'exécution locale. Conserver D-008 Core et l'ancienne branche M-001 hors de ce lot, aucune PR ni merge avant accord. Point de vigilance : concurrence des créations Produit ciblant une source pendant sa fusion, à caractériser sous MongoDB rs0.

Finition UI/UX M-002 (2026-10-23) : nouveau hook métier partagé pour calculer la hauteur de table ; vues Référentiel, À contrôler et Catégories avec scrolling des lignes seulement, entêtes sticky et pagination extérieure. Création/renommage de catégories : recherche de noms exacts/proches serveur (GET suggestions) avec normalisation existante, propositions live, consultation/réutilisation dans le tableau et confirmation explicite des catégories réellement distinctes ; nouveaux garde-fous transactionnels backend par `reviewedCandidateIds`. Les anciennes notes marquant ce rapprochement « non implémenté » sont supersédées pour ce périmètre. Gate, tests Windows et QA visuelle encore à exécuter ; ne pas ouvrir de PR ni fusionner. D-008 Core et audit M-001 séparés.

Complément QA frontend du 2026-10-23 : Fiches techniques (ordre des menus Modifier / Prévisualiser / Optimiser / Supprimer) ; tableau des Fiches avec pagination et en-tête fixes, lignes défilantes ; tableaux de « Fournisseurs et prix » du Dossier sur le même modèle, sans pagination ajoutée. L'unique action des Références fournisseur « Retirer du Dossier » quitte le menu « … » pour un bouton texte + icône, rouge seulement au survol/focus. Aucun changement API, RBAC, tenancy ou Core ; les mutations et confirmations existantes restent inchangées. `useTableViewport` devient l'utilitaire UI réutilisé avec alias M-002 conservé. Tous les tests locaux, lint/build, gate et QA visuelle de ce lot sont à exécuter sous Windows, PR/merge interdits sans autorisation. D-008 pièces jointes Core et audit historique M-001 sont différés.

Complément Frontend UI/UX (2026-10-23) : la page Fournisseurs (onglets Fournisseurs, Articles, Catalogues) et la page Produits (Tous les produits, Favoris) ont maintenant une région défilante pour les seules lignes, un header sticky et le footer `DataPagination` hors scroll. Les recherches, filtres, droits et requêtes serveur paginées sont conservés ; le scroll revient en haut lors des changements de page/taille de page/onglet/filtre. Tests RTL préparés et à exécuter sur Windows ; gate et QA à confirmer. Des captures utilisateurs montrent aussi des erreurs de chargement API : ne pas les confondre avec la mise en page, diagnostic séparé si reproductibles. Aucune PR ni merge autorisés ; Core D-008 et audit M-001 demeurent séparés.
