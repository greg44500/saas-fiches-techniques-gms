# M-006 — Fiches process — Proposition de contrat fonctionnel

**Statut : RECOMMANDATIONS 21–35 APPROUVÉES — CONTRAT CONSOLIDÉ EN ATTENTE DE VALIDATION FINALE POUR IMPLÉMENTATION**  
**Date : 2026-10-26**  
**Branche de travail :** feature/m006-fiches-process  
**Dépôt :** greg44500/saas-fiches-techniques-gms  
**Base contrôlée au démarrage :** main@190962a68086b151b50b82d05cf133f915c5c0ea, branche identique lors du contrôle préalable  
**Core intégré :** v1.2.1@35758f7a3067911244f94b81e7cc3ddd22882eaa (core-origin.json)

> **Discipline :** ce document consolide les décisions exprimées par le propriétaire du produit, y compris l'approbation des recommandations 21 à 35 du 2026-10-26. Les détails de conception explicitement mentionnés restent à résoudre avant implémentation. Il ne remplace pas M-004 et n'autorise aucun modèle Mongoose, endpoint ou écran métier avant validation du contrat final.
>
> Terminologie : « fiche process » est un document de fabrication lié à une Fiche technique M-004 ; « bibliothèque » est le référentiel de phases et d'étapes réutilisables.

## 1. Objectif, utilisateurs et valeur métier

Décrire de façon structurée la fabrication d'un produit à partir d'une Fiche technique existante : phases, étapes, ingrédients mobilisés, éléments complémentaires, temps, consignes, points de vigilance, qualité et maîtrise sanitaire. Réutiliser des définitions de phases/étapes entre magasins sans modifier les instructions officielles existantes lors d'une mise à jour de bibliothèque.

Acteurs : responsable de Fiches techniques/process, contributeur, opérateur/lecteur en atelier et administrateur de bibliothèque, avec permissions Workspace et accès Dossier existants. Les rôles métier sont des profils de rôles personnalisés, pas de nouveaux rôles système du Core.

Usages retenus : rédaction sur ordinateur dans le Dossier, consultation sur ordinateur/tablette/téléphone, impression de supports de fabrication.

## 2. Périmètre V1 et hors périmètre

**V1 visée :**
- un onglet « Fiches process » dans le Dossier à côté de « Fournisseurs et prix » et « Fiches techniques » ;
- création guidée par choix d'une Fiche technique disponible ;
- une Fiche process au maximum par Fiche technique ;
- organisation en phases et étapes, affectation des ingrédients M-004 aux phases et/ou étapes ;
- éléments propres au process distingués de la composition économique M-004 ;
- bibliothèque commune Workspace et modèles locaux Dossier (étapes et phases), avec publication contrôlée ;
- brouillons, validation explicite, historique immuable et adoption contrôlée des évolutions de bibliothèque ;
- RBAC, ownership, audit, copie inter-Dossier, cycle de vie lié à celui de la Fiche technique, et suppression autonome irréversible du process après confirmation explicite ;
- consultation adaptée aux supports d'atelier et impression lisible.

**Hors périmètre ou différé :**
- saisie des contrôles exécutés à chaque fabrication / journal d'exécution (question 7 expressément différée) ;
- création d'une Fiche process autonome sans Fiche technique ;
- deuxième process pour une même Fiche technique ;
- modifications automatiques des calculs, prix, fournisseurs ou quantités M-004 ;
- partage public ou inter-Workspace de bibliothèques (non validé) ;
- génération d'infographies, assistant IA, OCR, automatisations, exports avancés ;
- déclaration automatique de conformité réglementaire/HACCP ;
- **illustrations, photographies, galerie, champs image/photo et stockage ou gestion documentaire associés** : cadrage et réalisation reportés à un lot ultérieur, y compris toute intégration graphique aux impressions.

## 3. Identité, ownership et relation avec M-004 — DÉCISIONS VALIDÉES

- Chaque Fiche process doit avoir exactement une Fiche technique M-004 existante.
- Une Fiche technique possède **zéro ou une** Fiche process, jamais deux.
- La Fiche process appartient au **même Workspace et au même Dossier** que sa Fiche technique.
- Les fiches et leurs historiques restent propres au Dossier, même si les modèles de phases/étapes sont partagés dans le Workspace.
- Les champs createdBy / updatedBy sont destinés à l'audit et ne déterminent jamais l'ownership.
- Une Fiche technique peut être créée et validée sans Fiche process (validations M-004 et M-006 indépendantes).
- La Fiche technique M-004 demeure la source de vérité de la composition, des quantités, fournisseurs et calculs économiques.

**Conséquence technique à concevoir :** unicité de l'association techniqueSheet + contrôle de même Workspace/Dossier côté service, en transaction et au niveau des index. Aucune libération implicite de l'association par un simple archivage de process ; aucune création concurrente de doublon.

## 4. Parcours de création et liste des Fiches techniques éligibles — DÉCISIONS VALIDÉES

Depuis « Dossier → Fiches process », l'action « Créer une Fiche process » propose d'abord un **sélecteur des Fiches techniques disponibles** :

1. uniquement celles du Dossier courant et accessibles à l'utilisateur ;
2. uniquement les Fiches techniques **ACTIVE** ;
3. uniquement celles **sans Fiche process déjà associée**, même si ce process est actuellement archivé ;
4. recherche, pagination et compteur déterminés par le backend si le volume le justifie ;
5. aucune option provenant d'un autre Dossier ou Workspace ;
6. contrôle de nouveau côté backend au moment de la création pour éviter les collisions entre utilisateurs ;
7. création de la Fiche process en brouillon, puis ouverture de l'éditeur.

La liste ne doit pas confondre « aucune Fiche process validée » et « aucune Fiche process » : un brouillon existant occupe déjà l'association 1:1. Une Fiche process archivée ne permet pas d'en créer une seconde.

Autre entrée validée : depuis la Fiche technique, afficher « Créer la Fiche process » si éligible et « Ouvrir la Fiche process » lorsqu'elle existe, sous réserve des permissions. Les mêmes contrôles serveur s'appliquent.

**Décision approuvée (21, 26) :** si la Fiche technique ACTIVE ne dispose encore que d'un brouillon, autoriser la préparation d'un brouillon process à partir des ingrédients M-004 en cours. La validation officielle M-006 exige une composition M-004 validée et cohérente avec les ingrédients/associations du process ; aucun brouillon M-004 seul n'autorise la validation M-006.

## 5. Récupération et affectation des ingrédients — DÉCISIONS VALIDÉES

- Les ingrédients disponibles dans la Fiche process sont **ceux de la Fiche technique liée**, pas un deuxième catalogue d'ingrédients.
- Les **quantités ne sont pas nécessaires** à l'édition de la Fiche process ; elles restent gouvernées par M-004.
- Lors de la complétion du process, les ingrédients M-004 peuvent être affectés à **une phase, une ou plusieurs étapes, ou aux deux**.
- Une phase affiche la consolidation de ses ingrédients directs et de ceux de ses étapes, **sans doublon visuel** ; les associations réelles sont néanmoins conservées.
- Un même ingrédient peut participer à plusieurs opérations.
- Les modèles de bibliothèque ne stockent **aucune relation persistante avec les ingrédients d'une Fiche technique déterminée** ; les affectations sont propres à chaque Fiche process.
- Éléments propres au process possibles : équipement, auxiliaire de fabrication, consigne, et ajout provisoire de denrée. Toute denrée réellement incorporée absente de M-004 doit être réconciliée explicitement avec M-004 avant validation officielle, sans modification économique silencieuse.

**Risque relevé dans le code :** les lignes de TechnicalSheetDraft possèdent un _id de sous-document, alors que TechnicalSheetValidation.linesSnapshot stocke productVariantId, ordre, quantités, etc., sans identifiant de ligne historique identique. Plusieurs lignes peuvent potentiellement désigner la même Référence Produit. Ne PAS choisir silencieusement productVariantId comme clé d'association universelle : concevoir/tester une identité de ligne stable ou une stratégie de réconciliation tenant compte des versions et des doublons, avant implémentation.

## 6. Organisation des phases, étapes et bibliothèque — DÉCISIONS VALIDÉES

- Une Fiche process est organisée en **phases ordonnées**, chacune contenant **plusieurs étapes ordonnées**.
- Les définitions d'étapes sont créées une fois et réutilisables dans plusieurs Fiches process.
- Les **modèles de phases** regroupant des étapes sont eux aussi réutilisables.
- Il existe une bibliothèque commune au Workspace, et des modèles locaux à un Dossier. La publication d'un élément local vers le Workspace est une opération explicite et soumise aux autorisations.
- Les éléments de bibliothèque sont **paramétrables à l'utilisation** : instructions spécifiques, ingrédients, temps, températures et équipements peuvent varier selon la recette et le Dossier.
- **Création rapide validée (25) :** une étape créée depuis l'éditeur est initialement un modèle local au Dossier ; sa publication ultérieure vers la bibliothèque Workspace est explicite et autorisée.
- Réorganisation des phases et des étapes retenue dans l'éditeur de brouillon, sans perturber les versions officielles.

### Mise à jour contrôlée — DÉCISION VALIDÉE

Lorsqu'une étape ou un modèle de phase réutilisé est modifié dans la bibliothèque :
- aucune mise à jour automatique des Fiches process qui l'utilisent ;
- la Fiche process conserve ses paramètres et sa définition effectivement adoptée ;
- une nouvelle révision disponible est signalée à l'utilisateur autorisé ;
- l'adoption est une action explicite dans le brouillon ; elle ne réécrit jamais les versions VALIDATED ;
- archiver un modèle ne détruit ni les utilisations ni les états historiques.

**À concevoir :** gestion des versions des modèles, provenance de l'adoption, conservation des personnalisations locales et effet d'une modification de phase sur ses étapes composantes. Ne pas introduire de couplage implicite entre une bibliothèque et les process officiels.

## 7. Champs et consignes — ORIENTATIONS FONCTIONNELLES APPROUVÉES, DÉTAILS TECHNIQUES À CONCEVOIR

Pour une **phase** : titre, description/instructions facultatives, ordre, ingrédients directement associés, étapes, consignes facultatives.

Pour une **étape** : référence/révision de bibliothèque facultative, titre, description, ordre, ingrédients affectés, éléments propres au process, équipement, temps, température, vigilance de fabrication, qualité, sanitaire, observations éventuelles.

Trois catégories distinctes de contrôles/consignes sont **validées** :
1. vigilance de fabrication (gestes, texture, ordre des opérations) ;
2. contrôle qualité (aspect, poids, température attendue, etc.) ;
3. maîtrise sanitaire / informations HACCP éventuelles.

**Décision approuvée (24) :** consigne, critère attendu et action corrective si nécessaire sont des champs structurés **facultatifs**, sans enregistrement des contrôles réellement effectués pendant une fabrication. Ne pas appeler automatiquement « CCP HACCP » toute vigilance sanitaire ; l'applicabilité réglementaire doit être étudiée et sourcée avant toute qualification juridique.

**Décision approuvée (23) :** distinguer travail actif, attente/repos et cuisson/traitement ; gérer les chevauchements d'opérations afin de ne pas additionner artificiellement des temps simultanés. Formats, unités et calcul précis de durée totale restent à arrêter avant implémentation.

La question de la saisie des résultats des contrôles réalisés pendant une production reste volontairement différée.

## 8. Validation et cohérence des versions — DÉCISIONS ET POINTS OUVERTS

- Cycle M-006 retenu : brouillon modifiable, validation explicite, version officielle immuable, historique consultable.
- Une Fiche technique peut être officielle sans process ; les validations sont indépendantes.
- La Fiche process validée doit pouvoir identifier la composition / validation M-004 à laquelle elle se rapporte.
- Les brouillons peuvent préparer un process pendant que M-004 évolue ; la validation M-006 exige une composition M-004 validée et une vérification de cohérence avec la composition de référence.
- **Décisions approuvées (22, 31) :** signaler les ingrédients non affectés ; autoriser leur non-affectation avec justification explicite. Pour valider, exiger au minimum une phase et une étape documentée ; durées, températures et contrôles demeurent facultatifs.
- La gestion de concurrence doit refuser les écrasements silencieux, comme M-004.
- Les évolutions de bibliothèque sont adoptées uniquement dans le brouillon, jamais appliquées en place à une version officielle.

### Changement de la Fiche technique — DÉCISION VALIDÉE

Après validation d'une évolution de **composition** de M-004, proposer à l'utilisateur : « Souhaitez-vous revoir la Fiche process ? » :
- **Oui** : ouvrir la Fiche process associée pour examen (en fonction des droits et de son statut).
- **Non** : terminer ce parcours sans mutation ni obligation de validation du process.
- Une simple revalorisation tarifaire ne doit pas déclencher le même dialogue.

Le rejet de la proposition n'est **pas** une mise à jour silencieuse du process ni une suppression de l'historique. **Décision approuvée (32) :** conserver un indicateur non bloquant de décalage entre la composition M-004 courante et la composition de référence du process ; répondre « Non » à la révision ne mute pas le process.

**Intégration à vérifier :** M-004 calcule des catégories de changement de validation (dont COMPOSITION), mais il faut vérifier les différences réelles pertinentes pour le process, sans assimiler tous les événements M-004 à un changement de fabrication.

## 9. Cycle de vie dépendant de M-004 — DÉCISIONS NOUVELLES VALIDÉES

La Fiche process **ne peut pas survivre à la purge de sa Fiche technique**. Elle ne peut pas être archivée indépendamment de sa Fiche technique. En revanche, elle peut être supprimée seule de manière **physique et définitive**, après confirmation explicite de l'utilisateur autorisé ; cela laisse la Fiche technique intacte.

| Action M-004 | Règle métier pour M-006 |
| --- | --- |
| Création d'une Fiche technique | Ne crée pas automatiquement de Fiche process. |
| Suppression autonome d'une Fiche process | Suppression **immédiate et définitive** de l'agrégat M-006 (brouillon, historique, usages associés) après confirmation ; la Fiche technique M-004 et les modèles de bibliothèque restent intacts ; l'association 1:1 est libérée. |
| Archivage autonome d'une Fiche process | **Interdit** ; l'archivage est exclusivement provoqué par la Fiche technique. |
| Archivage de la Fiche technique | Archive automatiquement la Fiche process associée ; versions et bibliothèques conservées. |
| Réactivation de la Fiche technique | **Décision approuvée (29)** : réactiver le process conservé lorsque le parent est réactivé, selon l'état de référence enregistré, sans ressusciter un process supprimé définitivement. |
| Suppression M-004 vers corbeille | Supprime **logiquement** la Fiche process associée dans la même opération métier, sans purge physique précoce. |
| Restauration M-004 | **Décision approuvée (29)** : restaurer le process associé et son état antérieur approprié avec le parent, s'il est restaurable ; ne jamais recréer un process supprimé définitivement. |
| Purge définitive de M-004 | Purge aussi l'agrégat M-006 correspondant (brouillon, validations, liens d'utilisation) sans laisser d'orphelin. |
| Copie de M-004 entre Dossiers | Reprend le contenu process autorisé dans une **nouvelle Fiche process DRAFT** associée à la **nouvelle Fiche technique DRAFT** du Dossier cible. N'importe pas les validations/historiques d'origine. |

**Garantie de cohérence visée :** ces transitions doivent être transactionnelles, avec contrôles de tenancy, concurrence, permissions et audit, et sans altérer les documents de bibliothèque partagés par d'autres Fiches process. Une purge M-004 existante ne doit pas laisser de données M-006 orphelines.

**Décision du propriétaire du produit (2026-10-26) :** aucune commande d'archivage autonome de Fiche process ; suppression autonome physique et définitive avec confirmation explicite. Cette destruction est distincte de la mise en corbeille par cascade depuis M-004. Une nouvelle Fiche process peut ensuite être créée pour la Fiche technique encore éligible. **Précisions approuvées (29, 33) :** suppression autonome physique uniquement si la Fiche technique parente est `ACTIVE`, après confirmation explicite et permission effective (Owner ou responsable habilité) ; elle reste interdite lorsque le parent est archivé ou en corbeille. La confirmation et l'audit exacts sont à concevoir sans conserver de données censées être purgées.

**Preuve de code à prendre en compte :** technicalSheetLifecycle.service.js distingue ACTIVE / ARCHIVED / DELETED, calcule purgeScheduledAt, restaure depuis preDeleteStatus et purge TechnicalSheet, Draft et Validations dans une transaction. Il faudra brancher la cascade M-006 sur ces services effectifs plutôt que simuler une suppression immédiate.

## 10. Copie inter-Dossier

- La copie M-004 est aujourd'hui conditionnée par une composition source validée et l'absence de brouillon source ouvert. M-006 devra s'intégrer à ce parcours existant.
- Si un process source existe et qu'un état réutilisable est éligible, créer un process cible DRAFT lié à la nouvelle Fiche technique cible (une seule identité par parent).
- Les affectations des ingrédients doivent être **reliées aux lignes de composition réellement copiées** ; jamais conserver aveuglément les identifiants de sous-documents source.
- Les modèles Workspace actifs peuvent être référencés selon les règles de version adoptées, les étapes locales du Dossier source ne doivent pas devenir visibles au Dossier cible par simple copie. Proposition : matérialiser des définitions/snapshots nécessaires en préservant le contenu et la provenance sans autorisation indue.
- Aucun historique de validation, contexte économique ou donnée propre au magasin source ne doit être répliqué comme historique officiel du magasin cible.
- **Décision approuvée (28) :** privilégier la dernière version officielle du process source lorsqu'elle existe ; en son absence, examiner le brouillon source s'il est cohérent avec la composition M-004 effectivement copiée et accessible. Toute copie crée un **nouveau brouillon M-006** sans historique validé source. La Fiche technique M-004 source doit toujours respecter ses propres préconditions de copie ; ne pas les contourner. Pour les modèles locaux indisponibles dans le Dossier cible, conserver le contenu nécessaire sous forme réutilisable localement sans exposer la bibliothèque source ; modalités techniques à concevoir.

## 11. Tenancy, RBAC et capabilities

- Scope des Fiches process : Workspace + Dossier + Fiche technique du même scope. Toute requête recalcule l'autorisation côté serveur.
- Bibliothèque Workspace : workspace immutable ; bibliothèque locale : workspace + dossier ; pas de fuite de modèles propres à d'autres Dossiers sans permission de publication.
- Utiliser les mêmes primitives Core/M-001 : membership Workspace, permissions via applicationRolePermission.registry.js, loadAuthorizedDossierContext, politique des statuts Dossier, access mode, audit.
- **Décision approuvée (33) :** Owner et Responsable **effectivement autorisé** peuvent valider et supprimer définitivement ; Contributeur effectivement autorisé peut créer/modifier ; Lecteur peut consulter ; l'administration/publication des bibliothèques exige des permissions distinctes. Les libellés exacts, l'impression, la copie et les autorisations détaillées doivent être conçus dans le registre applicatif Core, sans faire dépendre la sécurité d'un simple nom de profil.
- Aucun rôle système Core modifié ; l'Owner dispose des permissions métier par extension, et les autres rôles uniquement selon leurs attributions effectives.
- **Décision approuvée (34) :** Fiches process comprises dans tous les plans en V1, **sans quota supplémentaire de nombre de process** ; appliquer uniquement les limites de stockage existantes lorsqu'elles sont réellement pertinentes. Aucune capability payante ou quota M-006 nouveau n'est introduit implicitement.

## 12. API envisagée — CONCEPTION NON VALIDÉE

Les URLs ci-dessous sont **hypothétiques**, pour discussion du contrat seulement :

~~~text
Dossier :
GET    /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets
GET    /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/eligible-technical-sheets
POST   /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets
GET    /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId
PUT    /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId/draft
POST   /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId/validate
GET    /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId/history
DELETE /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId   # suppression physique explicitement confirmée, contrôle serveur strict

Workspace :
GET/POST /api/workspaces/:workspaceId/process-library/steps
GET/POST /api/workspaces/:workspaceId/process-library/phases
~~~

À compléter : révisions et adoption de bibliothèque, modèles locaux, archivage/purge/restauration, gestion fine des erreurs, impression, filtres/pagination, autorisations. Les transitions depuis M-004 restent des appels de **service intégrés**, pas de simples appels HTTP internes successifs.

Validation Zod stricte et fermée, ObjectId et scopes vérifiés, expectedRevision pour les écritures, limites métier à fixer, protection contre références inter-Workspace, erreurs de conflit 409, transactions pour invariants et événements. Aucun coût ou valeur économique accepté depuis le client M-006.

## 13. Frontend et ergonomie — DÉCISIONS VALIDÉES ET PROPOSITIONS

- Ajouter **Fiches process (N)** au niveau des onglets du Dossier, sous réserve du droit de lecture.
- Liste : nom, Fiche technique associée, statut, date de modification, recherche/filtre, accès au brouillon ou à la version validée, indicateur d'une évolution à revoir le cas échéant, action de suppression autonome uniquement selon permission et avec confirmation explicite.
- Création : sélecteur **Fiches techniques actives sans Fiche process**, alimenté par l'API éligible ; sélectionner puis ouvrir directement un brouillon.
- Point d'entrée depuis une Fiche technique existante selon sa situation : créer/ouvrir le process.
- Éditeur : colonne/zone des ingrédients M-004, phases ordonnées, étapes réutilisables paramétrables, association des ingrédients à la phase et/ou à l'étape, indicateur des non-affectés, ajout de consignes et éléments propres au process.
- Sur mobile/tablette : parcours lisible, prioriser la consultation et la manipulation accessible ; ne pas dupliquer une version parallèle des données.
- **Décision approuvée (35) :** impression des process validés et impression possible d'un brouillon **explicitement identifié comme brouillon** ; aucun stockage persistant de nouveau document généré. Mise en page, contenu exact et commande d'impression restent à concevoir. Aucune image/illustration en V1.
- Navigation Workspace : surface métier « Bibliothèque de fabrication », cohérente avec les Gammes de produits finis, et non dans l'administration générique Core.
- Réutiliser les primitives Core/design system, RTK Query pour les données serveur, Redux seulement si état client réellement global ; préserver accessibilité et thèmes.

## 14. Audit, corbeille, rétention, migrations

- Tracer la création, édition, validation, archivage, réactivation, suppression, restauration, purge, copie, publication des modèles et adoption de révision ; inclure les références métier nécessaires, sans exposer les données des autres Dossiers.
- Déterminer la politique de conservation des versions/process liée à M-004 ; **pas de politique de rétention inventée**.
- La purge de la Fiche technique doit supprimer l'agrégat enfant M-006 dans la même transaction ; les éléments partagés de bibliothèque utilisés ailleurs restent conservés.
- Prévoir migrations/index M-006, évolution éventuelle de service M-004 pour cascades, backfill RBAC des rôles système et inventaire des migrations ; ne pas modifier la DB sans contrat validé.
- Ne pas créer de nouvelle instance MongoDB ou nouveau replica set.
- Respecter les contrats Core d'extension du tag v1.2.1 ; aucune modification du Core n'est justifiée par les besoins métier identifiés à ce stade.

## 15. Tests et critères d'acceptation envisagés

**Backend :** création 1:1 et sélection éligible ; exclusion des Fiches archivées, supprimées, déjà associées ; concurrence de deux créations ; accès Dossier/Workspace ; scoping bibliothèque ; snapshots validés ; adoption de révision ; associations ingrédients/phase/étape ; doublons de Référence Produit ; cohérence parent-enfant ; sauvegardes concurrentes ; mutations de recette ; copie avec reconstruction de correspondances ; cascade archiver/réactiver/delete/restore/purge ; transactions rollback ; audit, quotas/capabilities selon contrat.

**Frontend RTL :** onglet et compteur selon droits, sélection d'une Fiche technique éligible, état vide, création guidée, affectation des ingrédients, phases/étapes, messages de conflit, badges, avertissement de révision, imprimabilité, accessibilité.

**E2E Playwright :** création depuis le Dossier et depuis M-004 ; réutilisation de bibliothèque ; prévention d'un deuxième process ; archivage et suppression/restauration du parent ; suppression définitive autonome (confirmation/refus/permission, absence de cascade vers M-004, nouvelle création) ; copie inter-Dossier ; non-divulgation entre Dossiers/Workspaces ; consultation sur différents formats d'écran ; historique immuable sauf suppression physique explicitement autorisée.

**Critères d'acceptation indispensables :**
1. impossible de créer une Fiche process sans Fiche technique ;
2. impossible d'en créer deux pour une même Fiche technique, même sous concurrence ;
3. le sélecteur de création montre seulement les Fiches techniques actives non associées du Dossier autorisé ;
4. les ingrédients M-004 peuvent être liés aux phases et/ou aux étapes, sans dupliquer ni recalculer la recette ;
5. les versions validées ne changent jamais silencieusement ;
6. les mises à jour de modèles partagés n'altèrent pas les process existants ;
7. archivage M-004 entraîne archivage M-006 ;
8. suppression logique M-004 entraîne suppression logique M-006, avec conservation du contenu en corbeille ;
9. purge M-004 efface aussi le process enfant sans laisser d'orphelin ;
10. la restauration et la copie respectent les règles explicitement finalisées ;
11. les droits et la séparation Workspace/Dossier sont assurés par le serveur ;
12. l'impression correspond à la version réellement consultée, sans altérer le contenu officiel ;
13. aucune archive autonome du process n'est possible ;
14. supprimer définitivement un process exige autorisation + confirmation, préserve M-004 et les modèles réutilisés, efface son historique et libère l'association 1:1.

**Gates avant PR d'implémentation :** tests unitaires, Supertest/intégration MongoDB, RTL, E2E critiques, puis npm run release:check. Aucun test ni gate M-006 n'est déclaré exécuté à la date de cette proposition.

## 16. Arbitrages fonctionnels 21–35 approuvés le 2026-10-26 ; conception à poursuivre

Le propriétaire du produit **approuve les recommandations fonctionnelles 21 à 35**. L'approbation ne transforme ni les pistes techniques, ni les URLs envisagées, ni les algorithmes encore ouverts en contrats implémentables. Ce tableau lève les anciens arbitrages fonctionnels et fait autorité sur les formulations « proposé / à confirmer » antérieures du présent document.

| N° | Décision fonctionnelle approuvée |
| --- | --- |
| 21 | Préparation du brouillon process sur composition M-004 en cours ; validation M-006 seulement sur composition M-004 validée et cohérente. |
| 22 | Ingrédients sans affectation signalés ; non-affectation volontaire avec justification explicite. |
| 23 | Temps actif, attente/repos et cuisson/traitement distingués ; simultanéité prise en compte sans somme artificielle. |
| 24 | Champs facultatifs structurés : consigne, critère attendu, action corrective ; **aucun journal d'exécution** en V1. |
| 25 | Création rapide d'étape dans l'éditeur, initialement bibliothèque locale Dossier ; publication Workspace explicite si autorisée. |
| 26 | Process brouillon permis avec une Fiche technique ACTIVE n'ayant elle-même qu'un brouillon ; validation officielle M-006 bloquée jusqu'à validation cohérente de M-004. |
| 27 | Présentation unifiée sans quantité des Références Produit identiques, sans perdre l'identité des lignes métier nécessaires à la traçabilité. |
| 28 | Copie préférentielle du dernier process validé ; sinon prise en considération d'un brouillon source réutilisable. Nouvelle Fiche process cible obligatoirement en brouillon, liée à la Fiche technique copiée ; préconditions M-004 conservées. |
| 29 | Archivage, réactivation, corbeille, restauration et purge synchronisés avec M-004 ; suppression autonome définitive **seulement si le parent est ACTIVE** ; aucune résurrection après destruction physique. |
| 30 | Archivage des modèles de bibliothèque : plus de nouvelles utilisations ; utilisations et historiques existants conservés. Suppression physique seulement sans dépendances imposant leur conservation. |
| 31 | Validation : au moins une phase et une étape documentée ; temps, températures et contrôles facultatifs ; justification des ingrédients volontairement non affectés. |
| 32 | Si révision proposée après changement de composition et refusée : aucune mutation du process et indicateur de décalage non bloquant. |
| 33 | Owner et Responsable habilité : validation et suppression définitive ; Contributeur habilité : création et modification ; Lecteur : consultation ; permissions dédiées pour administrer/publier les bibliothèques, toutes évaluées côté serveur. |
| 34 | Fonction incluse dans tous les plans en V1, sans quota process ajouté ; limites de stockage existantes uniquement si pertinentes. |
| 35 | Impression des versions validées et des brouillons visiblement marqués, sans nouveaux documents générés stockés durablement. |

**Décision de report distincte : illustrations/photographies des étapes EXCLUES de M-006 V1.** Aucun champ image/photo, upload, stockage dédié, galerie, affichage illustré ou sortie imprimée illustrée n'est à développer. Le cadrage futur devra traiter formats, limites, stockage, permissions, consultation, impressions et suppression. Ne pas construire prématurément une abstraction « pour plus tard ».

### Détails restant à résoudre en conception, sans rouvrir les décisions ci-dessus

1. **Identité de ligne M-004** : lier de manière stable les ingrédients d'un brouillon, d'une validation historique et d'une copie, notamment en cas de Références Produit répétées et de changement de composition ; ne pas prendre `productVariantId` seul pour une identité universelle.
2. **Durées et simultanéité** : unités, bornes de saisie, représentation des dépendances et règle de calcul/affichage du temps total.
3. **Révisions bibliothèque** : identité/version, adoption volontaire et préservation des paramètres locaux ; traitement des modèles archivés et dépendances empêchant une purge.
4. **Copie inter-Dossier** : déterminer objectivement quand le brouillon process source est réutilisable, préserver la cohérence avec la composition validée copiée par M-004 et éviter toute fuite de modèles locaux.
5. **Validation / concurrence** : cohérence transactionnelle de la composition de référence et de l'identité des ingrédients ; contrôle d'unicité 1:1 ; conflits de sauvegarde et de version.
6. **Cycle de vie / audit** : implémenter la synchronisation parent-enfant sur les services M-004 et leur transaction ; définir l'UX de confirmation, la conservation des seules métadonnées d'audit réellement permises et la gestion des accès pendant corbeille/restauration.
7. **Contrats d'interface** : permissions exactes dans les registres du Core intégré, erreurs API, pagination, contraintes Zod, impression sans stockage, composants et tests.
8. **Réglementation** : séparer maîtrise sanitaire, vigilance et contrôle qualité, sans qualifier automatiquement des champs « CCP/HACCP ».

### Condition de passage à la conception et au code

**La validation des recommandations est acquise ; la validation explicite de la version finale du contrat consolidé et l'autorisation de commencer le développement sont encore distinctes et non accordées dans cette conversation.** Jusqu'à cette autorisation : documentation uniquement, pas de modèle, migration, endpoint, frontend M-006 ou test métier nouvellement implémenté.

## 17. Ordre d'implémentation proposé — SOUS RÉSERVE DE VALIDATION

1. Clore les arbitrages résiduels et valider ce contrat ; mettre à jour PRODUCT-SCOPE, ROADMAP, GLOSSARY, DOMAIN-MODEL et DEBT si nécessaire.
2. Concevoir les modèles, identités de ligne et invariants ; examiner les points d'extension Core et services M-004.
3. Implémenter bibliothèque locale/Workspace et lecture de la composition M-004 ; tests ciblés.
4. Implémenter agrégat process, brouillon, associations et validation/historique ; tests permissions, tenancy et concurrence.
5. Intégrer atomiquement le cycle de vie et la copie depuis M-004 ; tests rollback, restauration et purge.
6. Implémenter onglet Dossier, création guidée, éditeur et consultation ; tests RTL.
7. Implémenter impression lisible et parcours mobile/tablette ; tests RTL/E2E.
8. Vérifier migrations, sécurité, performance, tests E2E critiques et gate complète npm run release:check.
9. Recette fonctionnelle utilisateur, puis seulement PR et merge explicites ; documentation finale.

## 18. Sources internes consultées

- AGENTS.md — règles de cadrage, frontière Core/métier, tests et branches.
- docs/PRODUCT-SCOPE.md, section 10 « Fiche process ».
- docs/ROADMAP.md, section 2.5 « Fiches process ».
- docs/domain/DOMAIN-MODEL.md, section 15.
- docs/m004/M-004-FINAL-CONTRACT.md et docs/m004/M-004-TECHNICAL-DESIGN.md.
- backend/modules/technicalSheet/technicalSheet.model.js.
- backend/modules/technicalSheet/technicalSheetDraft.model.js.
- backend/modules/technicalSheet/technicalSheetValidation.model.js.
- backend/modules/technicalSheet/technicalSheetValidation.service.js.
- backend/modules/technicalSheet/technicalSheetCopy.service.js.
- backend/modules/technicalSheet/technicalSheetLifecycle.service.js.
- frontend/src/features/dossiers/pages/dossier-workspace-page.jsx.
- frontend/src/features/technical-sheets/technical-sheets-routes.js.
- frontend/src/app/application-routes.js.
- Core v1.2.1 : docs/derived-saas/DERIVED-SAAS.md et EXTENSION-POINTS.md.

**Rappel :** le code réel et les tests qui seront exécutés restent prioritaires sur les propositions de ce document. Les règles à confirmer ne sont pas présentées comme déjà implémentées.

**Décision de suspension maintenue :** les recommandations 21–35 et le report des illustrations ont été approuvés le 2026-10-26. La validation formelle du contrat final, ainsi que l'autorisation distincte de commencer le code, restent nécessaires. Aucun modèle, migration, route, test métier ou écran M-006 avant ces accords.
