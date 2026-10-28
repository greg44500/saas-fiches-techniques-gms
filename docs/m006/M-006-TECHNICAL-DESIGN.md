## Lot 3 — Précision technique après audit du 2026-10-28

Deux révisions techniques sont distinctes : `ProcessSheet.revision` protège les transitions de l'agrégat (y compris validation) et `ProcessSheetDraft.revision` protège les écritures de contenu. Le POST de validation exige `expectedRevision` de `ProcessSheet`. Le PUT du brouillon exige `expectedRevision` de `ProcessSheetDraft` et répond désormais avec `revision` (brouillon) **et** `processRevision` (agrégat). Le frontend ne doit jamais comparer ces deux compteurs numériquement pour autoriser la revalidation. Il garde le jeton d'agrégat confirmé par la dernière sauvegarde ou le GET, et le serveur rejette les jetons périmés (409).

Le POST de validation refuse également une révision M-004 encore ouverte ; il acquiert préalablement le verrou transactionnel existant sur le parent, puis vérifie l'absence de `TechnicalSheetDraft` et l'identité de `currentValidatedState` avec `sourceValidation`. Il ne produit ni snapshot métier M-006 ni modification économique M-004.

**Preuve :** revue statique GitHub et tests de non-régression écrits. Aucun test ni gate exécuté dans cette intervention. Ne pas considérer le lot 3 livré avant recette locale.

---

# M-006 — Conception technique et séquencement de l'implémentation

## Lot 2 — Rectification canonique du cycle de validation M-006 (2026-10-27)

**Décision utilisateur validée, prioritaire sur les descriptions historiques des lots ci-dessous :** il existe au plus une Fiche process courante par Fiche technique M-004. Elle peut être modifiée après validation ; **la modification métier réellement enregistrée** la repasse en Brouillon, puis une **revalidation explicite** la remet en Validée. **Aucun historique de versions ni snapshot métier officiel M-006**. Les versions immuables de M-004 et les révisions de `ProcessLibraryRevision` ne changent pas. Les anciennes sections de ce document sont des comptes rendus datés, non des autorisations de recréer un historique process.

### Modèle d'état à respecter lors du lot d'implémentation (non codé ici)

| Opération | Contenu courant | État M-006 |
| --- | --- | --- |
| Création | Saisie initiale | Brouillon |
| Sauvegarde d'un Brouillon | Mis à jour si changement | Brouillon |
| Validation explicite réussie | Inchangé | Validée |
| Consultation, ouverture de l'éditeur, modifications locales non sauvegardées | Inaltéré côté serveur | État serveur conservé |
| Sauvegarde identique au contenu métier courant | Inchangé | Validée reste Validée |
| Sauvegarde d'un changement métier sur une Fiche Validée | Remplacé sur la même fiche, même ID | Brouillon, revalidation requise |
| Revalidation explicite réussie | Inchangé | Validée |

**Architecture visée :** aucune collection `ProcessSheetValidation` ni `/history` métier M-006. Conserver `ProcessSheet` comme identité 1:1 et des données de fabrication courantes strictement scoped Workspace + Dossier ; un éventuel `ProcessSheetDraft` préexistant peut porter ce contenu, sous réserve d'une adaptation validée des services. **Ne pas déduire** que le schéma actuel est déjà conforme : `ProcessSheet.currentValidatedState` est aujourd'hui un ObjectId sans service de validation, et `ProcessSheet.sourceValidation` est immutable. Examiner ces champs et les données réellement persistées avant de fixer schéma/migration ; ne pas réutiliser un identifiant arbitraire pour simuler l'état Validée.

**Traitement transactionnel futur :**
- `PUT /:id/draft` : préserver la validation tant que la saisie n'est pas persistée ; comparer côté serveur le contenu métier normalisé (sans métadonnées techniques). Sur changement réel, sauvegarder les données et invalider l'état éditorial Validée atomiquement ; même revision fence `expectedRevision` pour préserver le 409. Un PUT sans différence métier ne doit pas invalider la validation.
- `POST /:id/validate` (absent actuellement) : permission métier de validation à ajouter via le registre d'extension existant, vérification autoritative Workspace/Dossier, parent M-004 ACTIVE, composition M-004 officielle cohérente, au moins une phase et une étape documentée, champs facultatifs tels que décidés. Ne **pas** demander de justification des ingrédients non affectés. Enregistrer l'état Validée sur la fiche existante et l'événement d'audit minimal, transactionnellement, sans snapshot historique M-006.
- En cas de concurrence entre sauvegarde et validation, refuser l'écrasement silencieux par contrôle de révision/état. Les deux transitions doivent être testées sous transactions MongoDB réelles.
- `DELETE /:id` autonome est un **lot séparé** ; confirmation, permission, parent ACTIVE, transaction de purge du contenu courant et libération de l'association 1:1. Pas d'archivage autonome.
- Les références aux versions M-004 restent nécessaires à la cohérence d'ingrédients et doivent être rapprochées explicitement lorsqu'une composition M-004 évolue ; aucune réconciliation par simple `productVariantId`. Le comportement exact d'adoption de composition et des données persistées doit être fermé avant toute mutation DB.

**Tests obligatoires du prochain lot d'implémentation :** transitions Brouillon/Validée, PUT identique, saisie locale non sauvegardée, modification réelle après validation, revalidation, rôle sans droit, parent archivé/indisponible, cohérence M-004, conflit 409 et rollback, séparation tenants, aucun historique M-006, audit sans copie des contenus antérieurs ; RTL + Supertest et E2E ciblés. Les champs/versionnements des bibliothèques et de M-004 ne doivent pas régresser.

**État de ce lot 2 : documentation exclusivement.** Aucun nouveau schéma, endpoint, migration ou code de production ; aucune preuve de tests/gates locaux post-lot 1 n'a été communiquée. Tous les anciens passages « snapshots officiels / historique » relatifs à M-006 dans les comptes rendus datés ci-dessous sont remplacés par ce contrat.

---
## Lot UX — Structure dans l'arbre et contenu dans le panneau (2026-10-27)

**Décision validée** : tout ajout de phase passe par la bibliothèque Workspace backend existante (aucun intitulé frontend statique). Le bouton général de création de phase est un bouton `FolderPlus` libellé « Phase » de style outline, distinct des `+` locaux d'ajout d'étape. L'arborescence devient le point de pilotage de la **structure du brouillon** : ajout d'une phase, ajout d'une étape, renommage inline d'une phase au crayon, suppression d'une phase à la corbeille et suppression d'une étape. Le panneau de droite présente pour la phase `Phase N : <intitulé>`, modifie uniquement ses **instructions et ingrédients**, et conserve les actions de réordonnancement avec info-bulles. Le nom n'y est plus édité ; le sélecteur redondant « Choisir dans la bibliothèque » est supprimé dans cette zone.

Renommer une phase dans l'arbre modifie seulement le **brouillon de Fiche process** et ne crée/renomme jamais un modèle réutilisable dans la bibliothèque Workspace. Entrée ou perte de focus valident le nom non vide (après trim), Échap annule, nom vide n'écrase pas la valeur existante. Pas de sauvegarde automatique : conservation de `expectedRevision` et gestion du 409 inchangées.

**Suppression** : phase strictement vide (zéro étape, instructions vides, zéro ingrédient associé) = suppression immédiate du brouillon local **sans suppression backend avant PUT** ; phase avec étapes, instructions ou ingrédients = confirmation via le `Dialog` existant. La sélection se reporte sur une phase voisine uniquement si la phase supprimée était sélectionnée, sinon la sélection courante est conservée. Les étapes continuent d'exiger une confirmation. Boutons survol/focus pour souris et clavier, restant visibles sous le breakpoint desktop pour tactile ; étiquettes accessibles et `Tooltip` Base UI pour les actions iconographiques (ajout d'étape, renommage, suppression, déplacement). Le contrôle de focus des `Textarea` phase/étape évite une double bague : bordure `border-ring` contrastée et suppression de la bague externe localement, sans toucher à la primitive Core.

**Périmètre** : composants de la feature process-sheets seulement, tests RTL et intégration page. Pas de modification MongoDB, seed, route ou contrat Core. Vérifications à exécuter en local : renommage Enter/Escape, suppression vide/non vide, focus clavier et tactile, actions tooltip, responsive, ancien éditeur d'étapes complet, conservation des associations ingrédients après déplacement et conflit 409, RTL/lint/build. Aucun test ne doit être déclaré vert sans log.

---

## Lot M-006 — menu d'intitulés Workspace et provisionnement (2026-10-27)

**Contrat validé à partir des demandes successives du propriétaire :** les phases proposées dans l'éditeur sont des titres provenant de MongoDB et partagés entre les Dossiers d'un Workspace. Intitulés par défaut : « Préparation du poste », « Préparations initiales », « Cuisson », « Assemblage », « Présentation / dressage ». Les étapes librement rédigées dans une fiche process restent dans cette fiche et ne sont pas publiées automatiquement au Workspace. Aucun partage inter-Workspace demandé.

L'interface enlève la phrase explicative du Popover et remplace la recherche par `Select` shadcn/Base UI. Les données proviennent de `GET /api/workspaces/:workspaceId/process-phase-titles` ; `POST` sur la même route crée un titre personnalisé validé et audité via la bibliothèque PHASE existante. Après réponse réussie seulement, l'intitulé est ajouté dans le brouillon ; RTK Query invalide le catalogue afin qu'il réapparaisse à la prochaine ouverture. L'action « Autre phase… » passe par `Dialog`, avec erreur 409 visible. Une phase de bibliothèque devient possible avec `steps: []`, sans créer d'étape fictive.

Provisionnement : runner `migration:m006-default-phase-titles` dans le manifeste machine-readable pour les Workspaces existants ; `ensureWorkspaceProcessPhases` idempotent lors du premier GET d'un Workspace créé ensuite, sans toucher aux fondations de création Workspace du Core. Les défauts archivés ou modifiés ne sont jamais écrasés. `ProcessLibraryRevision` révision zéro est assurée pour les modèles par défaut. Dossier local non utilisé pour le menu partagé, tout en conservant les routes de bibliothèque locales préexistantes. GET exige `process-sheet:read`, POST `process-sheet:edit` et mode Workspace écrivable. L'API et le modèle M-006 restent propriétaires de la donnée.

Contrats et déploiement détaillés dans `docs/releases/M-006-PHASE-TITLES.md`. Les tests sont écrits, aucune gate exécutée ici.

---

## Correctif de contrat RTK Query et clarification du partage (2026-10-27)

**Régression observée en local par le propriétaire :** 69 tests réussis / 70, échec unique de l'inventaire strict de \`process-sheets-api.test.js\` après ajout des deux GET de bibliothèque de phases. Le contrat frontend comporte désormais huit endpoints, dont \`listWorkspacePhaseTemplates\` et \`listDossierPhaseTemplates\`. Corriger l'attente et protéger par tests distincts les URL GET, \`status=ACTIVE\`, la recherche et la pagination, le format de réponse et les tags RTK Query. Un test HTTP Supertest vérifie en plus la bibliothèque de modèles ACTIVE Workspace, la visibilité partagée de modèles de phases **et d'étapes** entre Dossiers du même Workspace, l'exclusion des archives, la recherche/pagination et l'isolation de la bibliothèque locale Dossier. Un test d'intégration React vérifie le parcours titre de phase Workspace → étape saisie librement → PUT du brouillon avec révision.

**Précision fonctionnelle donnée par le propriétaire :** les intitulés prédéfinis de phases/étapes doivent appartenir à la **bibliothèque commune du Workspace** et être utilisables dans tous ses Dossiers. Les opérations ajoutées librement dans la Fiche process par les utilisateurs ne doivent **pas être automatiquement publiées** dans la bibliothèque Workspace. Tant qu'un modèle autonome hors fiche n'est pas explicitement cadré, ces étapes sont des données du brouillon de la fiche, donc restent légalement rattachées à son Workspace/Dossier (tenancy), mais sont indépendantes du catalogue de modèles Workspace. Ceci ne valide aucun partage automatique entre Workspaces, ni un schéma de modèles globaux par utilisateur. L'API de bibliothèque locale au Dossier demeure disponible pour compatibilité du contrat M-006 existant ; elle ne définit pas la portée des modèles prédéfinis communs.

**Peuplement des données :** les cinq noms de phases cités (Préparation du poste ; Préparations initiales ; Cuisson ; Assemblage ; Présentation / dressage) sont des besoins métier, pas une constante frontend. Aucune migration/seed d'insertion de modèles n'est ajoutée ici : la présence de ces modèles en MongoDB locale n'a pas été vérifiée, et la définition PHASE existante impose \`steps.min(1)\`. Ne pas prétendre qu'ils sont présents ou ajouter silencieusement une nouvelle primitive de catalogue. Une décision ultérieure est nécessaire si l'on veut des modèles ne contenant que le titre.

**Exécution :** le log de test 69/70 est fourni par le propriétaire pour l'état précédent. Les nouveaux tests de contrat, d'intégration et HTTP sont écrits mais non exécutés dans cet environnement (pas de Node 24.x, ni connexion à la base de développement locale). Ne jamais annoncer de gate verte ; faire exécuter les commandes ciblées puis \`release:check\` avant PR. Aucun changement Core, route/backend métier, index DB ou migration pour cette correction.

---

## Lot UX M-006 — intitulés de phase issus des bibliothèques backend (2026-10-27)

**Décision produit :** les propositions de phases ne sont PAS une constante frontend. L'éditeur lit les modèles \`PHASE\` actifs déjà gérés par le backend, via les routes \`GET /workspaces/:workspaceId/process-library/phases\` et \`GET /workspaces/:workspaceId/dossiers/:dossierId/process-library/phases\`, en respectant les scopes de tenant, le Dossier courant, le filtre \`status=ACTIVE\`, \`search\` et la pagination serveur (100 éléments par page et par périmètre). Le frontend utilise RTK Query avec des tags de cache dédiés \`ProcessPhaseTemplates\`. Les propositions distinguent Dossier et Workspace, sans inventer de valeur absente de la réponse.

**Contrôle d'accès :** les lectures existantes sont soumises à \`process-library:read\`. La page obtient la capability de lecture via le contexte Workspace ; les hooks RTK Query ne lancent aucune requête lorsque la permission manque ou que le panneau n'est pas ouvert. L'édition du brouillon continue de dépendre de \`process-sheet:edit\` et du statut opérationnel. En l'absence de la permission de bibliothèque ou de données, l'utilisateur peut toujours saisir un titre libre sans contournement RBAC.

**UX :** le bouton \`+\` de l'arbre ouvre un \`Popover\` Base UI avec les intitulés retournés par les deux bibliothèques, recherche côté API, pagination, et une action \`Autre phase (intitulé libre)\`. Le formulaire d'une phase existante propose le même sélecteur backend pour changer seulement son titre. Aucun modèle d'étape, instruction ou ingrédient n'est adopté implicitement ; la sélection crée une nouvelle phase \`steps: []\`, ou renomme la phase sélectionnée. Les étapes existantes ne sont pas remplacées par la sélection d'un intitulé. L'ajout à la bibliothèque globale d'un intitulé libre **n'est pas** automatique.

**Contrainte existante à préserver :** un \`ProcessLibraryTemplate\` de type PHASE doit contenir au moins une étape d'après \`phaseDefinitionSchema\` (\`steps.min(1)\`), tandis qu'un brouillon de process peut contenir une phase sans étapes (\`steps: []\`). Les cinq intitulés proposés par le propriétaire doivent donc avoir des modèles effectivement enregistrés dans les bibliothèques via leurs parcours backend validés pour apparaître ; ils ne sont pas automatiquement injectés en base, et aucune donnée n'a été inventée. L'idée future d'une bibliothèque de simples intitulés, ou d'un ajout de modèle vierge en un clic, nécessite un cadrage métier séparé avant de modifier cette contrainte.

**Densité :** aucun texte \`Aucune étape\`, liste ni chevron sur les phases sans étapes. Une étape peut être supprimée directement depuis sa ligne arborescente via l'action discrète au survol/focus, avec confirmation \`Dialog\` existante ; la suppression conserve la sélection courante si une autre étape est retirée. Les données restent enregistrées uniquement au PUT explicite et toujours contrôlées par \`expectedRevision\`/409.

**Vérifications en attente :** tests RTL/API adaptés pour options Workspace et Dossier, choix d'un intitulé sans adoption des étapes du modèle, renommage, suppression d'étape et absence de bruit visuel ; tests frontend, lint, build, tests backend pertinents, \`release:check\` et QA visuelle doivent encore être réellement exécutés. Pas de mutation de bibliothèque, de changement du schéma backend ou du Core dans ce lot.

---

## Lot UX M-006 — arbre phases / étapes et en-tête compact (2026-10-27)

**Décision validée par le propriétaire :** remplacer la navigation horizontale des phases et l'éditeur d'étapes imbriqué par une arborescence verticale et un éditeur contextuel unique. Conserver à gauche le rail ingrédients M-004 inchangé ; à droite, séparer visuellement la navigation hiérarchique (phases repliables, étapes en retrait) de la saisie sélectionnée. En-tête de détail sur une ligne : bouton « Fiches process » | titre H1 | aide contextuelle. L'alignement économise une rangée verticale ; les titres longs restent tronqués visuellement uniquement en petit écran.

**Primitives réutilisées :** Button, Input, Textarea, Dialog, SegmentedControl et Collapsible existants sous \`frontend/src/components/ui\`, ainsi que ProductVariantField, IngredientChoices, ProcessStepFields et ProcessIngredientRail. \`ProcessSheetPhaseTree\` ne possède aucune donnée métier ; \`ProcessSheetPhaseEditor\` saisit exclusivement la phase sélectionnée. \`ProcessSheetDisclosure\` réutilise désormais le Collapsible Base UI, qui gère le repli accessible, les états ouverts/fermés et le retrait du parcours clavier. Animation locale de 210 ms pilotée par \`--collapsible-panel-height\`, désactivée si \`prefers-reduced-motion: reduce\`. Aucun thème ni effet glassy introduit.

**Interactions :** chevron pour développer/replier, titre de phase ou d'étape pour sélectionner ; commande d'ajout pour chaque phase ; éditeur contextuel unique ; Monter/Descendre pour préserver les identifiants et associations sans drag-and-drop ; suppression de phase/étape confirmée par Dialog avant modification locale. En mobile, SegmentedControl « Structure / Édition » sans duplication de l'état du brouillon ; sélection/ajout ouvrent l'édition. Les changements restent locaux jusqu'au PUT explicite.

**Invariant préservé :** aucun sous-niveau ajouté (\`phases[] -> steps[]\`). Aucun changement backend, Mongoose, API, Core, ownership, RBAC, valeurs de bibliothèque ni migration. Les ingrédients restent identifiés par occurrence \`lineKey\` et peuvent être associés à plusieurs éléments. \`unassignedReasons\` historique reste compatible, non obligatoire. \`expectedRevision\`, 409 et rafraîchissements RTK Query sont conservés ; le rechargement après conflit requiert une confirmation explicite car il remplace les saisies locales.

**Tests modifiés :** tests de page, tests RTL de l'éditeur et intégration page → vrai éditeur → payload PUT, couvrant arborescence, contexte, réorganisation, confirmation, associations, lecture seule, données legacy et conflit. **Vérifications réelles en attente :** Vitest ciblé, lint, build, tests backend M-006, \`npm run release:check\` et QA Desktop/tablette/mobile, clair/sombre, clavier, scroll et nombreuses phases. Ne pas déclarer la gate verte sans logs locaux. Branche \`feature/m006-fiches-process\` uniquement, aucune PR ni merge implicite.

---


## Lot UX M-006 — rail ingrédients minimal (2026-10-27)

**Décision produit la plus récente :** pour cette première finition de la colonne ingrédients, supprimer tout bruit visuel inutile. Une seule liste dans l'ordre M-004, **nom de l'ingrédient uniquement**, sans numéro de ligne affiché, sans traits séparateurs, sans distinction en deux listes, sans justificatif ni informations secondaires visibles. L'en-tête est réduit à « Ingrédients » et à deux compteurs : affectés / à affecter. Une coche **verte** apparaît près du nom dès qu'une occurrence M-004 est affectée. Son infobulle au survol/focus donne le ou les lieux d'utilisation : titre de phase et/ou titre d'étape avec sa phase. Aucune information n'est affichée en permanence dans la ligne au-delà du nom et de la coche.

**Contrat de données :** `lineKey` reste la clé de chaque occurrence M-004, y compris lorsque deux lignes portent exactement le même nom. Le rail marque chaque occurrence individuellement. L'affectation à une phase et à une étape ne consomme pas l'ingrédient, ne change pas le compteur d'occurrences affectées au-delà de 1 et fournit les deux lieux d'utilisation dans l'infobulle. Aucun changement aux méthodes d'affectation ou à la sauvegarde `expectedRevision` / gestion 409.

**Justifications :** le propriétaire retire l'obligation de les renseigner, y compris pour la future validation officielle (rectification des décisions 22/31 du cadrage). La saisie et la présentation de justification ont été supprimées du rail, sans destruction des valeurs historiques déjà présentes dans le brouillon ; le champ `unassignedReasons` est temporairement conservé dans la sérialisation et le schéma pour compatibilité. Le lot de validation officielle, non implémenté, devra respecter l'absence de justification obligatoire. Aucun changement backend, migration ou Core dans ce lot.

**Périmètre :** uniquement `ProcessIngredientRail`, la suppression des props de justification inutilisées dans l'orchestrateur et les tests RTL/intégration/documentation liés. La partie phases/étapes et le thème général restent inchangés. Aucune thématisation glassy.

**Vérification :** les scénarios RTL ont été mis à jour pour compteur, absence de décorations et justification, coche verte, localisation phase/étape, occurrences répétées et préservation du payload M-006. Les tests/lint/build/gates ne sont pas encore exécutés localement après ce lot ; leurs résultats ne peuvent pas être présumés.

---


## Lot UX — Atelier de fabrication sans glassy (2026-10-27)

**Décision produit :** remplacer la disposition en cartes imbriquées par une interface Desktop à deux surfaces fonctionnelles, **sans effet glassy, backdrop blur, palette spécifique ni thème dans le thème**. Conserver exclusivement les tokens, modes clair/sombre, contrôles shadcn/ui et Tailwind existants. La bibliothèque de modèles (noms de phase/étape) et les parcours de publication sont hors de ce lot.

**Structure livrée sur `feature/m006-fiches-process` :**
- À gauche, un rail `ProcessIngredientRail` visible durant l'édition : lignes M-004 non affectées, justifications facultativement ouvertes, lignes déjà affectées, et nombre réel d'associations. Une ligne peut toujours être affectée à plusieurs phases/étapes ; les occurrences répétées restent distinguées par leur `lineKey` et leur position de source. Aucun déplacement/consommation automatique.
- À droite, navigation horizontale compacte des phases (boutons sélectionnés), liste d'étapes en lignes simples et **un seul éditeur contextuel de l'étape active**. Les champs de phase et leur association directe sont toujours accessibles via le volet secondaire, sans perdre les instructions.
- Deux surfaces bordées seulement, sans cartes successives pour chaque niveau. Sur Desktop, la zone est limitée à une hauteur relative au viewport et chacun des panneaux dispose de son propre défilement si le contenu déborde. Sur petits écrans, l'ordre est vertical pour rester accessible : aucune promesse d'absence absolue de scrolling quand la hauteur est insuffisante.
- `ProcessSheetDisclosure` anime l'ouverture/fermeture des propriétés facultatives via une transition CSS de grille et opacité sur environ 200 ms. Contenu conservé dans le DOM mais rendu `inert` et `aria-hidden` lorsqu'il est fermé. L'arrivée du panneau phase/étape sélectionné utilise une animation discrète d'environ 190 ms et respecte `prefers-reduced-motion`. Le sélecteur d'ingrédients adopte aussi une transition fluide.
- L'orchestrateur conserve `expectedRevision`, la sauvegarde explicite, le 409 bloquant sans écrasement du brouillon, le mode lecture, les commandes de réordonnancement/suppression, l'aperçu chronologique et les identifiants des objets. Pas d'API, de migration, de schéma Mongoose, de modèle de bibliothèque ou d'invariant métier modifié.
- Les titres « Nouvelle phase » et « Nouvelle étape » restent des valeurs initiales **librement modifiables**. L'insertion depuis les bibliothèques locales/Workspace demeure un lot distinct validé fonctionnellement mais non intégré à cet éditeur.

**Recette à exécuter :** la suite RTL M-006 de l'éditeur a été adaptée aux nouveaux repères (sidebar, navigation, éditeur unique, rôles/aria), avec scénarios de duplication des lignes M-004, affectations non exclusives, réordonnancement, suppression et repli, préservation de tous les champs M-006, lecture seule, aperçu et 409. Le test d'intégration de page vérifie désormais la visibilité du rail et sa réaction à l'affectation avant POST.

**État de preuve :** commits GitHub présents et code inspecté statiquement ; **aucune exécution locale post-refonte de Vitest, ESLint, Vite build, Playwright ou `release:check` n'a été réalisée dans cette intervention**. Ces gates doivent être exécutées sur un environnement Node 24.x + MongoDB approprié avant PR/merge et avant de déclarer le lot stable. La QA visuelle doit confirmer les transitions, le contraste clair/sombre, les hauteurs Desktop, le clavier, l'ordre de navigation et les cas de fortes listes d'ingrédients.

---


## Stabilisation de la modale de création M-006 — conflit 409 et sélecteur (2026-10-27)

**Incident observé en test local AVANT ce correctif :** Vitest frontend M-006 affiche 8 suites, 55 tests : **54 réussis, 1 en échec** (`process-sheet-create-dialog.test.jsx` : scénario « refuse la création sur un conflit serveur et maintient le formulaire »). Au moment de l'échec, l'option « Tartine validée » n'est pas présente et le Select Base UI a `aria-expanded="false"`. La requête de création n'a donc pas encore été soumise ; ce log ne démontre pas un échec de la gestion HTTP 409.

**Audit réalisé :** chaîne modale → liste M-004 éligible RTK Query → Select Base UI/shadcn → validation locale du formulaire → POST M-006 → réponse 409 et rechargement de la liste. Les tests normaux de création par clic passent dans ce même log. Le test 409 ne doit pas confondre la disponibilité du popup sous jsdom avec la gestion métier du conflit. Le parcours 409 est désormais exercé par clavier (la sélection par clic reste testée séparément), avec attente explicite de l'option et du message asynchrone.

**Renforcement du comportement produit :**
- Le submit est bloqué pendant `isLoading`/`isFetching` de la liste M-004, pendant la mutation, et en erreur de chargement.
- L'identifiant choisi doit exister dans les options courantes ; une sélection obsolète après pagination/rafraîchissement ne peut plus être soumise depuis l'UI. La validation transactionnelle du serveur reste prioritaire.
- Le 409 conserve le titre, efface uniquement la Fiche source devenue inéligible, recharge la liste via RTK Query, maintient le dialogue ouvert et laisse une erreur explicite.
- Toute nouvelle édition du titre ou de la sélection efface un message d'échec devenu périmé ; les erreurs non-409 conservent le choix pour permettre une nouvelle tentative.

**Régression couverte :** chemins d'ouverture au clic existants + sélection clavier, erreur 409, données de mutation, `refetch` unique, conservation du titre, désactivation de la soumission, disparition d'une référence lors de la mise à jour, reprise avec nouvelle Fiche technique, erreur non-409, indisponibilité de liste et rechargement, liste `isFetching`.

**Limites de preuve :** lecture et modification sur GitHub uniquement ; **aucun test post-correctif, lint, build ou gate exécuté ici**. Confirmer sur le poste local en lançant les tests M-006 et en répétant la suite de création plusieurs fois, puis l'ensemble des gates. Il n'y a aucun changement Core, de schéma, de route backend ou de contrat M-006.

---


## Stabilisation transversale M-006 — autorisation d'édition (2026-10-27)

**Incident constaté par le propriétaire sur son environnement local avant correctif :** les 6 suites backend process (48 tests) réussissent ; les 7 suites frontend process exécutent 43 tests, dont 42 réussissent et 1 échoue dans `process-sheet-workspace-page.test.jsx` (attendu « Édition : oui », obtenu « Édition : non »). Ce sont des résultats **antérieurs** au présent lot ; ils ne prouvent pas l'état des commits correctifs.

**Cause confirmée :** le test de page simulait un process dépourvu de `status`. L'API réelle sérialise systématiquement `process.status`, et la page ne permet l'édition qu'à `ACTIVE`. Le test utilisait donc un objet impossible dans le parcours nominal.

**Audit étendu GET → RBAC → édition → PUT :** le backend PUT exige un Dossier ACTIVE via middleware et service, en plus de `process-sheet:edit` et d'un process/parent M-004 ACTIVE. Le GET permet aussi les Dossiers PAUSED/ARCHIVED (consultation). La page doit refuser l'édition en l'absence d'une preuve d'activation du Dossier. Mais une requête `GET /dossiers/:id` supplémentaire serait incorrecte pour certains rôles contributeurs, car elle requiert `dossier:read`, non exigé par le PUT M-006.

**Contrat mis en œuvre dans le lot :** le détail `GET .../process-sheets/:id` contient désormais `dossierOperational: boolean`, dérivé de `req.dossier.status === ACTIVE` après les contrôles de scope et d'accès existants. La page accorde l'édition uniquement lorsque `can(process-sheet:edit)`, `process.status === 'ACTIVE'` et `dossierOperational === true`. Elle refuse par défaut les états inconnus et affiche une erreur si le brouillon est manquant. Aucune modification des permissions Core ou des schémas de données. Le serveur reste l'autorité pour chaque PUT, y compris face aux changements d'état concurrents.

**Tests ajoutés/renforcés :**
- RTL page : réponse GET ACTIVE complète, statut absent/inconnu, process ARCHIVED/DELETED, permission refusée, champ Dossier absent/faux, brouillon manquant, décalage de composition M-004 ;
- RTL d'intégration : vrai composant page + vrai éditeur, ajout de phase/étape, sélection de la deuxième occurrence M-004, construction du PUT avec `expectedRevision`, sauvegarde et passage en consultation lorsque les préconditions sont absentes ;
- Supertest/MongoDB : contrat GET `status` et `dossierOperational`, contributeur ayant READ/EDIT process sans `dossier:read`, PUT actif réussi, lecture Dossier PAUSED et PUT refusé avec révision inchangée, GET archivé et PUT bloqué.

Un appel Mongoose M-006 utilise désormais `returnDocument: 'after'` au lieu de l'option dépréciée `new: true`. D'autres avertissements Mongoose peuvent provenir de chemins extérieurs à ce lot ; aucune conclusion globale n'est tirée à leur sujet.

**État de preuve :** cohérence du code, middlewares, service et tests auditée en lecture sur GitHub. Les nouvelles suites ne peuvent pas être exécutées dans l'environnement de cette intervention (dépôt inaccessible au runtime d'exécution). Il est interdit de les annoncer vertes avant réception des logs locaux. Commandes à exécuter dans l'ordre : `npx vitest run backend/tests/modules/process`, `npm --prefix frontend run test -- src/features/process-sheets`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, `npm run release:check`. Aucune PR, aucun merge.

---


## Lot UX — Refonte de l'éditeur de phasage (2026-10-27)

**Statut : implémenté sur `feature/m006-fiches-process`, non testé localement et non livré.** Le cas d'usage principal confirmé est l'assemblage court, composé de plusieurs petites phases comportant une ou deux étapes.

- L'interface affiche les phases sous forme de cartes compactes, avec une seule phase ouverte à la fois et une seule étape active dans cette phase. La lecture du titre, de l'instruction et des associations reste possible sans ouvrir tous les champs.
- Le titre et les instructions de l'étape sont prioritaires. Durées, température, équipements, vigilance, qualité et maîtrise sanitaire sont accessibles à la demande avec des volets natifs `details`.
- La liste M-004 n'est plus répétée en cases à cocher ouvertes dans chaque opération : un sélecteur contextuel permet d'associer par clic des lignes individuelles, toujours distinguées par leur position même pour des Références Produit identiques. Les associations ne sont pas exclusives.
- Les informations directement portées par la phase restent accessibles. Les non-affectations sont signalées sans justification obligatoire, conformément au contrat M-006 rectifié le 2026-10-27.
- Ajout d'un aperçu chronologique de lecture du brouillon local, sans mutation, validation ni export. L'utilisateur peut revenir à l'édition en conservant l'état local.
- Le bouton de sauvegarde reste explicite ; le protocole `expectedRevision`, les messages de conflit 409, la lecture seule/RBAC et les données enregistrées ne sont pas modifiés.
- Séparation des responsabilités : `process-sheet-draft-editor.jsx` orchestre la sélection et la sauvegarde ; `process-sheet-editor-fields.jsx` rend les composants d'édition ; `process-sheet-preview.jsx` rend la lecture.
- Aucun changement de schéma Mongoose, Zod, API M-006, Core ou modèle de bibliothèque. Aucun drag and drop obligatoire ; les commandes de réordonnancement existantes restent disponibles. La génération PDF, l'impression, la validation officielle et les bibliothèques restent leurs lots fonctionnels distincts.

**Vérifications à effectuer avant approbation** : Vitest/RTL M-006, lint frontend, build frontend, gate `release:check`, recette visuelle en thèmes clair/sombre, tailles desktop/tablette et navigation clavier. Les nouveaux tests couvrent le parcours court, les deux occurrences d'une Référence Produit, les affectations multiples phase/étape, le réordonnancement, le maintien de saisie, l'aperçu, les permissions et le conflit 409. Ces tests **n'ont pas été exécutés** depuis le connecteur GitHub.

---


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
2. **Agrégat process** : identité 1:1 unique avec Fiche technique ACTIVE, contenu courant en Brouillon ou Validée **sans versions métier immuables M-006**, affectations ingrédients aux phases/étapes, règles de validation et concurrence. Le lien doit être unique au niveau de l'index MongoDB. Ne pas activer l'API de création avant intégration de la cascade M-004.
3. **Transitions M-004 atomiques** : archivage, réactivation, corbeille, restauration, purge et copie dans les services existants ; tests transactionnels et rollback obligatoires.
4. **Contrôles et révisions** : adoption explicite de bibliothèque, décalage de composition, durées parallèles, audit, suppression autonome physique conditionnée à parent ACTIVE et permissions.
5. **Frontend** : onglet Dossier, sélection technique éligible, éditeur de phases/étapes, bibliothèque partagée/locale, consultations tablette/mobile, état Validée/Brouillon du contenu courant sans historique M-006, actions d'édition et impression sans document persistant.
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

**Suite sécurisée (orientation historique rectifiée par le lot 2 du 2026-10-27) :** implémenter l'agrégat 1:1, le contenu courant et une validation explicite sans versions historiques M-006, puis intégrer les cascades M-004 dans les transactions des services existants **avant** d'autoriser le premier endpoint de création M-006. La gestion des copies doit reconstruire les liens sur les nouvelles lignes cibles. Les tests du nouveau HEAD et la gate restent à exécuter ; aucun statut « vert » revendiqué.

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

La prochaine implémentation fonctionnelle est l'agrégat M-006 1:1 avec M-004 et sa cascade transactionnelle ; ensuite seulement l'éditeur, la validation officielle **sans historique M-006**, les impressions et les bibliothèques dans l'UI.

## Lot 4 — Rectification du parcours et création stricte après validation M-004 (2026-10-26)

Décision client explicite : page principale = liste des **process créés**, et non répertoire M-004. Bouton « Créer une Fiche process » → modale obligatoire titre + Fiche technique éligible → brouillon process et page de détail. Les explications de sections et champs utilisent `InfoTooltip` (i), non de longs sous-titres. Tous les process du Dossier sont listés via `GET .../process-sheets`, la modale consulte `GET .../process-sheets/eligible-technical-sheets`, la création utilise `POST .../process-sheets`, et l'ouverture `GET .../process-sheets/:processSheetId`. La route de composition M-004 existante reste disponible sous `.../process-sheets/technical-sheets/:technicalSheetId/composition` grâce au routeur composé.

**Nouvelle règle remplaçant les décisions 21 et 26 :** M-004 ACTIVE + `currentValidatedState` réel + **absence de tout TechnicalSheetDraft ouvert** + absence de toute ProcessSheet (quel que soit son statut). S'applique dans l'API d'éligibilité et est revérifiée en transaction à la création. Index MongoDB **unique `technicalSheet`**, portée Workspace/Dossier, audit, RBAC `process-sheet:create` + `technical-sheet:read`, anti-concurrence par fence `processEligibilityRevision` sur la Fiche technique (utilisée aussi à l'ouverture d'une révision M-004), aucune nouvelle capability ni quota. Index et backfill Owner via `migration:m006-process-sheets` enregistrée au manifeste.

L'agrégat `ProcessSheet` est 1:1 avec la Fiche technique. `ProcessSheetDraft` est créé avec `phases: []` et `sourceValidation` exact, en transaction. Le statut du process est **piloté uniquement par le parent** : archive/réactivation, corbeille/restauration dans la même transaction M-004 ; purge parent élimine le process et son brouillon avant suppression de M-004. Aucun archivage autonome. La suppression autonome définitivement physique reste à réaliser dans un lot ultérieur avec tests détaillés.

**Copie inter-Dossier, décision 28 amendée :** M-004 copie vers DRAFT ; aucune Fiche process enfant n'est créée avant validation M-004 cible. La reprise de contenu source pourra être proposée après cette validation, après conception du remappage des ingrédients et de la non-divulgation des bibliothèques locales. Ne pas contourner les préconditions de copie M-004.

**Statut précis :** les API de liste, éligibilité, création et lecture et le frontend correspondant sont codés, avec tests de couverture ajoutés. **L'éditeur de phases/étapes et sa sauvegarde ont été livrés dans le lot 5 décrit plus bas ; la validation du contenu courant sans historique M-006, l'impression et la suppression autonome ne sont pas livrées. Les tests et la gate du nouveau HEAD ne sont pas exécutés dans cette conversation.**


### Stabilisation du shell Dossier — parse JSX (2026-10-26)

Recette locale communiquée par l'utilisateur : 8 fichiers de tests frontend passent (36 tests), un fichier `dossier-workspace-page.test.jsx` ne charge pas (0 test) à cause d'une chaîne JavaScript tronquée. Audit du composant GitHub : 902 lignes contre 353 sur `main` et présence de blocs dupliqués. La correction **reconstruit depuis le fichier sain `main`**, puis réapplique les seules extensions M-006 : reconnaissance des détails process et techniques, absence de shell et requêtes sautées sur ces postes, compteur serveur des véritables process, onglet conditionné aux deux permissions lecture. Les tests sont étendus aux détails des deux métiers, aux requêtes `skip`, à l'absence de fuite d'un compteur, à l'état zéro et aux permissions. Aucune règle métier n'est modifiée, aucun changement Core. **Nouveaux tests et gate à exécuter localement ; ne pas annoncer de vert sans log.**


### Diagnostic UI bouton de création absent — retour réel utilisateur (2026-10-26)

La liste M-006 et le compteur fonctionnent, mais la capture utilisateur du Dossier montre l'absence du bouton. **Condition exacte du code au moment de la capture :** `can('process-sheet:create') && can('technical-sheet:read') && dossier.status === 'ACTIVE'`. La permission `process-sheet:create` n'avait été ajoutée qu'au **lot 4**, avec un registre qui la donne aux nouveaux rôles système Owner ; les rôles Owner **déjà persistés** doivent recevoir cette permission via `migration:m006-process-sheets`. La capture ne prouve pas à elle seule laquelle des conditions manque : ne pas l'affirmer comme vérifié en base.

**Correction UX :** le bouton « Créer une Fiche process » reste visible sur la liste M-006 accessible. En l'absence d'une précondition, il est désactivé avec motif explicite et description accessible `aria-describedby` (permission de création, lecture M-004, chargement/erreur Dossier, Dossier inactif) ; **aucune permission nouvelle n'est simulée ou accordée dans React**. Dès que les permissions et l'état sont conformes, la modale fonctionne selon le parcours validé. La modale explique également le cas de zéro Fiche technique éligible : brouillons et révisions ouvertes exclus.

**Procédure locale nécessaire si Owner existant sans droit :** vérifier `MONGODB_URI` et la base de travail, appliquer la séquence de migrations du manifeste jusqu'à `npm run migration:m006-process-sheets` si non déjà appliquée, actualiser la session ou recharger les droits Workspace. Ne pas traiter ce problème par un changement de rôle par défaut ou un contournement du contrôle `POST /process-sheets`. Les captures précédentes montrent une Fiche « en révision » et trois « en brouillon », potentiellement **zéro** Fiche technique éligible même lorsque le bouton est déverrouillé.

**Régressions :** tests RTL pour la présence du bouton avec l'Owner, permission de lecture seule, refus M-004, Dossier inactif/en cours/indisponible, modale, absence de Fiche éligible et lecture de la liste. Tests RBAC/migration et HTTP du lot 4 à rejouer. Aucun résultat nouveau de tests n'a été produit dans cette conversation.

### Lot UI — Modale de création Outlined (2026-10-26)

Décision UX utilisateur : deux champs seulement, **titre** et **Fiche technique associée**. Les libellés sont Outlined/flottants, les placeholders du titre et du sélecteur ne s'affichent qu'au focus, les (i) restent accessibles. Suppression du champ de recherche séparé « Rechercher parmi les Fiches validées… » pour ne pas présenter deux contrôles pour la même sélection. Réutilisation de `ProductVariantField` avec `floating` (pattern déjà utilisé par M-004) sans dupliquer la primitive shadcn/Core ; `Input` et `Select` existants restent les contrôles natifs de l'application.

L'API d'éligibilité et les règles métier ne changent pas. La modale charge jusqu'à 100 Fiches techniques éligibles par page ; un contrôle de pagination apparaît **uniquement si plusieurs pages** sont nécessaires. La sélection changeable reste contrôlée et revient à vide au changement de page, pour ne jamais soumettre une référence devenue hors du jeu d'options. Tests RTL dédiés : absence de deuxième champ de recherche, libellés Outlined, focus/placeholders, sélection, pagination discrète, validation et conflits.

**Validation à obtenir :** tests Vitest du composant et gates frontend exécutés sur le HEAD par l'utilisateur, non exécutables depuis le connecteur GitHub de cette session.

## Lot 5 — Éditeur transactionnel des brouillons M-006 (2026-10-26)

**Périmètre implémenté :** phases/étapes ordonnées (création, suppression, réorganisation), descriptions/instructions, affectation des lignes exactes d'ingrédients, durées distinctes actif/repos/traitement, température, équipements, vigilance, contrôles qualité et sanitaire structurés. Les ingrédients sans affectation restent signalés par les compteurs, sans justification requise. La validation officielle n'est **pas** implémentée : elle contrôlera plus tard le minimum une phase/une étape documentée et la cohérence M-004 actuelle, sans justification des non-affectés. Les bibliothèques locales/Workspace restent indépendantes ; adoption rapide des modèles et publication ne sont pas encore reliées à l'éditeur.

**Backend :** `PUT /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId/draft`, permission `process-sheet:edit`, Workspace/Dossier opérationnels, process et parent M-004 ACTIVE ; données strictement validées par Zod (pas de photo, prix, quantité M-004, ou objet libre), IDs uniques de phases/étapes, lignes M-004 autorisées exclusivement par les clés du snapshot immuable `sourceValidation` du process, un doublon de Référence Produit ne fusionne jamais deux lignes. Une ligne est autorisée dans plusieurs opérations différentes mais pas deux fois dans la même affectation. Motifs de non-affectation uniquement pour les clés connues et réellement non affectées. Taille de brouillon bornée : 40 phases, 40 étapes/phase, 200 clés par liste.

Sauvegarde **transactionnelle** : `expectedRevision` obligatoire, mise à jour atomique de `ProcessSheetDraft` (revision increment), `ProcessSheet` (revision/updatedBy) et de l'audit `PROCESS_SHEET_DRAFT_SAVED`. Conflit 409 si brouillon obsolète ou parent non opérationnel ; 400 si ingrédients externes ou données invalides. Le contrôle de correspondance M-004 ne se fait **pas** par `productVariantId`, mais par identifiant de ligne. La lecture `GET /:processSheetId` renvoie `sourceIngredients` depuis la validation M-004 **liée au process** ainsi que `compositionOutdated` si M-004 possède une autre validation courante, sans remappage automatique.

**Frontend :** composant `ProcessSheetDraftEditor` dans la page de détail. L'état de travail non enregistré est local, RTK Query assure la lecture et la mutation. Sauvegarde explicite et retour de révision, conservation du travail local sur erreur, avertissement 409 et rechargement manuel. Lecture seule sans permission effective, aucun bouton d'édition sur process archivé. Les champs Outlined réutilisent le composant existant, sans fondation Core modifiée. `process-sheet:edit` ajoutée au registre des permissions de l'application et `migration:m006-process-editor-permission` ajoutée au manifeste pour réconcilier les Owners existants de façon idempotente.

**Qualité :** tests unitaires Zod (structures/durées/températures/médias/doublons), Supertest (persistance, révision optimiste, contrôle ingrédients, audit, RBAC, statut parent), RTL (ajout de phases/étapes, clés identiques de variantes répétées mais lignes distinctes, motifs, lecture seule, conflit), RTK Query (contrat et tags), migration RBAC. **Ces tests et les gates ne sont pas exécutés depuis cette session ; aucun résultat vert revendiqué.**

**Hors périmètre du lot :** validation officielle du contenu courant sans snapshots immuables M-006, détection de simultanéité pour durée totale, modèle de bibliothèque appliqué à l'éditeur, suppression autonome, copie et remappage inter-Dossier, impression, images et photos. Les durées sont des champs explicites, pas encore un ordonnancement calculé.
