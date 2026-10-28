## Décision métier prioritaire — identité d’ingrédient seule (2026-10-28)

Décision explicite du propriétaire, postérieure au cadrage du 27/10 : **seul un changement du nom ou de la Référence Produit d’un ingrédient M-004 déclenche un contrôle de composition M-006**. Le nombre d’occurrences d’ingrédients compte dans l’identité de la liste, y compris les doublons. Les prix, quantités nettes/brutes, unités, fournisseurs, références d’Articles fournisseur, ordre, notes, optimisations et bases de production ne déclenchent ni désynchronisation, ni modale, ni revalidation M-006 à eux seuls. Référence métier = identité de la Référence Produit (`productVariantId`), non référence d’Article fournisseur.

Le système compare la **liste multi-ensemble** des couples `productVariantId` + `productVariantName` des snapshots officiels M-004, et non leurs identifiants de validation. Si les identités sont identiques, la Fiche process existante reste éditable et validable sur sa composition de référence, sans migration de lignes ni réécriture de l’historique. Un brouillon M-004 encore ouvert ne modifie pas la composition officiellement validée et ne bloque pas une nouvelle validation M-006. Les écritures concurrentes doivent rester protégées.

Si une identité d’ingrédient change, la modale doit montrer uniquement les ingrédients ajoutés/retirés ou renommés et les associations réellement ambiguës ; toutes les autres associations, phases et instructions sont conservées. La nouvelle référence de validation officielle est adoptée seulement après confirmation transactionnelle des correspondances. Les ingrédients non affectés font l’objet d’un **avertissement non bloquant uniquement à la validation** : si tous sont affectés, pas de modale de confirmation supplémentaire.

Cette décision **remplace** les règles antérieures fondées sur la seule différence d’identifiant M-004, la quantité ou l'existence d’un brouillon M-004 pour le **parcours de validation d’une Fiche process existante**. La règle séparée de création initiale depuis M-004 validée et sans brouillon reste inchangée. Cf. `docs/m006/M-006-RECONCILIATION.md`.

---

# M-006 — Fiches process — Proposition de contrat fonctionnel

**Statut : CONTRAT FONCTIONNEL M-006 VALIDÉ — IMPLÉMENTATION AUTORISÉE LE 2026-10-26, LIVRAISON PARTIELLE EN COURS**  
**Date : 2026-10-26 — cycle de validation rectifié le 2026-10-27**  
**Branche de travail :** feature/m006-fiches-process  
**Dépôt :** greg44500/saas-fiches-techniques-gms  
**Base contrôlée au démarrage :** main@190962a68086b151b50b82d05cf133f915c5c0ea, branche identique lors du contrôle préalable  
**Core intégré :** v1.2.1@35758f7a3067911244f94b81e7cc3ddd22882eaa (core-origin.json)

> **Discipline :** ce document consolide les décisions exprimées par le propriétaire du produit, y compris l'approbation des recommandations 21 à 35 du 2026-10-26. Les détails de conception explicitement mentionnés restent à résoudre avant implémentation. Il ne remplace pas M-004 et n'autorise aucun modèle Mongoose, endpoint ou écran métier avant validation du contrat final.
>
> Terminologie : « fiche process » est un document de fabrication lié à une Fiche technique M-004 ; « bibliothèque » est le référentiel de phases et d'étapes réutilisables.

### Rectification de cycle M-006 — décision du propriétaire du 2026-10-27 (prioritaire)

Cette décision **remplace** les anciennes mentions de « versions officielles immuables », d'« historique des versions validées » et de « brouillon de révision d'une version officielle » de la **Fiche process**, uniquement. Elle ne modifie **ni** le versionnement officiel des Fiches techniques M-004, **ni** les révisions/snapshots des modèles de bibliothèques de fabrication.

- **Une seule Fiche process courante par Fiche technique M-004**, avec identité persistante et propriété Workspace/Dossier inchangées, indépendamment de son état éditorial.
- **États éditoriaux M-006 :** `Brouillon` et `Validée`. La création démarre en Brouillon ; une validation explicite, autorisée et contrôlée côté serveur rend le **contenu courant** Validé.
- Une Fiche process validée est **modifiable à volonté**. Les changements locaux non enregistrés n'affectent pas l'état serveur ; **une modification réelle du contenu enregistrée côté serveur** invalide la validation et repasse la **même** Fiche process en Brouillon. Une sauvegarde sans différence métier n'invalide pas la validation. La revalidation explicite est nécessaire après les modifications enregistrées.
- **Aucun historique des anciennes versions de Fiches process** et aucune collection de snapshots officiels M-006 à créer. Seul le contenu métier courant est conservé. Les compteurs de révision purement techniques (`expectedRevision`, concurrence) et l'audit minimal des événements sont distincts d'un historique de versions métier : ils n'ont pas à archiver les contenus successifs.
- Il n'existe **aucune** action d'archivage autonome M-006. La suppression physique autonome après confirmation et contrôle serveur conserve M-004 et libère l'unicité, selon les règles déjà approuvées.

**À résoudre dans le lot technique avant implémentation** : mode de représentation persistée de l'état Validée/Brouillon et de la date/auteur de validation, migration ou compatibilité des champs déjà présents (dont `currentValidatedState`), normalisation des comparaisons pour distinguer un vrai changement métier d'un PUT identique, verrouillage de concurrence et cohérence de la référence M-004. **Ne pas réutiliser le versionnement métier M-004** pour créer un historique M-006. Le code actuel ne dispose d'aucun endpoint de validation officielle : cette rectification n'annonce aucune fonctionnalité livrée.

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
- contenu courant en Brouillon ou Validée, modification puis revalidation explicite sans historique de versions M-006, et adoption contrôlée des évolutions de bibliothèque ;
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
- Les Fiches process courantes et leurs événements d'audit restent propres au Dossier, même si les modèles de phases/étapes et leurs révisions sont partagés dans le Workspace. Aucune archive des anciennes versions de Fiches process.
- Les champs createdBy / updatedBy sont destinés à l'audit et ne déterminent jamais l'ownership.
- Une Fiche technique peut être créée et validée sans Fiche process (validations M-004 et M-006 indépendantes).
- La Fiche technique M-004 demeure la source de vérité de la composition, des quantités, fournisseurs et calculs économiques.

**Conséquence technique à concevoir :** unicité de l'association techniqueSheet + contrôle de même Workspace/Dossier côté service, en transaction et au niveau des index. Aucune libération implicite de l'association par un simple archivage de process ; aucune création concurrente de doublon.

## 4. Parcours de création et liste des Fiches techniques éligibles — DÉCISIONS VALIDÉES

Depuis « Dossier → Fiches process », l'action « Créer une Fiche process » propose d'abord un **sélecteur des Fiches techniques disponibles** :

1. uniquement celles du Dossier courant et accessibles à l'utilisateur ;
2. uniquement les Fiches techniques **ACTIVE avec validation officielle M-004 courante**, **sans brouillon de révision M-004 ouvert** ;
3. uniquement celles **sans Fiche process déjà associée**, même si ce process est actuellement archivé ;
4. recherche, pagination et compteur déterminés par le backend si le volume le justifie ;
5. aucune option provenant d'un autre Dossier ou Workspace ;
6. contrôle de nouveau côté backend au moment de la création pour éviter les collisions entre utilisateurs ;
7. création de la Fiche process en brouillon, puis ouverture de l'éditeur.

La liste ne doit pas confondre « aucune Fiche process validée » et « aucune Fiche process » : un brouillon existant occupe déjà l'association 1:1. Une Fiche process archivée ne permet pas d'en créer une seconde.

Autre entrée validée : depuis la Fiche technique, afficher « Créer la Fiche process » si éligible et « Ouvrir la Fiche process » lorsqu'elle existe, sous réserve des permissions. Les mêmes contrôles serveur s'appliquent.

**Décision nouvelle du 2026-10-26 (remplace expressément 21 et 26 pour la création) :** la création d'une Fiche process est interdite tant que la Fiche technique n'est pas ACTIVE, validée officiellement et **sans** brouillon M-004 de révision ouvert. La validation M-006 exige toujours une composition officielle M-004 cohérente. Les process déjà créés subsistent si M-004 ouvre ensuite une révision ; ils restent consultables et doivent être réconciliés avant toute validation nouvelle.

## 5. Récupération et affectation des ingrédients — DÉCISIONS VALIDÉES

- Les ingrédients disponibles dans la Fiche process sont **ceux de la Fiche technique liée**, pas un deuxième catalogue d'ingrédients.
- Les **quantités ne sont pas nécessaires** à l'édition de la Fiche process ; elles restent gouvernées par M-004.
- Lors de la complétion du process, les ingrédients M-004 peuvent être affectés à **une phase, une ou plusieurs étapes, ou aux deux**.
- Une phase affiche la consolidation de ses ingrédients directs et de ceux de ses étapes, **sans doublon visuel** ; les associations réelles sont néanmoins conservées.
- Un même ingrédient peut participer à plusieurs opérations.
- Les modèles de bibliothèque ne stockent **aucune relation persistante avec les ingrédients d'une Fiche technique déterminée** ; les affectations sont propres à chaque Fiche process.
- Éléments propres au process possibles : équipement, auxiliaire de fabrication, consigne, et ajout provisoire de denrée. Toute denrée réellement incorporée absente de M-004 doit être réconciliée explicitement avec M-004 avant validation officielle, sans modification économique silencieuse.

**Risque relevé dans le code :** les lignes de TechnicalSheetDraft possèdent un _id de sous-document, alors que TechnicalSheetValidation.linesSnapshot stocke productVariantId, ordre, quantités, etc., sans identifiant de ligne historique identique. Plusieurs lignes peuvent potentiellement désigner la même Référence Produit. Ne PAS choisir silencieusement productVariantId comme clé d'association universelle : concevoir/tester une identité de ligne stable ou une stratégie de réconciliation tenant compte des versions et des doublons, avant implémentation.

**Rectification UX du 2026-10-27 — colonne d'ingrédients :** une liste unique dans l'ordre de M-004, nom seul, sans numéro de ligne affiché, sans séparation ou groupe « déjà affectés », ni formulaire de justification. Une coche verte apparaît uniquement après affectation ; le survol ou focus de la coche indique les phases et étapes d'utilisation. Les identifiants `lineKey` restent strictement distincts en mémoire et dans l'API pour les occurrences d'un même produit. Le champ historique `unassignedReasons` reste conservé à ce stade pour compatibilité avec les brouillons existants ; son absence d'édition ne doit pas empêcher la validation future.

## 6. Organisation des phases, étapes et bibliothèque — DÉCISIONS VALIDÉES

- Une Fiche process est organisée en **phases ordonnées**, chacune contenant **plusieurs étapes ordonnées**.
- Les définitions d'étapes sont créées une fois et réutilisables dans plusieurs Fiches process.
- Les **modèles de phases** regroupant des étapes sont eux aussi réutilisables.
- Il existe une bibliothèque commune au Workspace, et des modèles locaux à un Dossier. La publication d'un élément local vers le Workspace est une opération explicite et soumise aux autorisations.
- Les éléments de bibliothèque sont **paramétrables à l'utilisation** : instructions spécifiques, ingrédients, temps, températures et équipements peuvent varier selon la recette et le Dossier.
- **Création rapide validée (25) :** une étape créée depuis l'éditeur est initialement un modèle local au Dossier ; sa publication ultérieure vers la bibliothèque Workspace est explicite et autorisée.
- Réorganisation des phases et des étapes dans l'éditeur, sans modifier le serveur avant enregistrement explicite. Après enregistrement d'un changement réel sur une Fiche process validée, son état redevient Brouillon.

### Mise à jour contrôlée — DÉCISION VALIDÉE

Lorsqu'une étape ou un modèle de phase réutilisé est modifié dans la bibliothèque :
- aucune mise à jour automatique des Fiches process qui l'utilisent ;
- la Fiche process conserve ses paramètres et sa définition effectivement adoptée ;
- une nouvelle révision disponible est signalée à l'utilisateur autorisé ;
- l'adoption est une action explicite sur le contenu en cours ; son enregistrement, s'il modifie une Fiche process Validée, la fait repasser en Brouillon ; les révisions immuables concernent les **modèles de bibliothèque**, pas les anciennes Fiches process ;
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

- **Cycle M-006 rectifié le 2026-10-27 :** contenu courant Brouillon → validation explicite → Validée → modification réelle enregistrée → Brouillon → revalidation. Même identité persistante, sans historique des contenus M-006 successifs. Une simple consultation ou une saisie locale non sauvegardée ne change pas l'état serveur.
- Une Fiche technique peut être officielle sans process ; les validations sont indépendantes.
- Le contenu courant de la Fiche process conserve une référence explicite à la composition/validation officielle M-004 à laquelle il se rapporte, à vérifier à chaque validation M-006. Les versions **M-004** restent immuables ; la Fiche process ne crée pas de version métier distincte.
- La **création initiale** d'un brouillon process nécessite une M-004 ACTIVE, officiellement validée, sans brouillon de révision ouvert ; après création, un brouillon process existant peut évoluer parallèlement à M-004. La validation M-006 exige une composition M-004 validée et une vérification de cohérence avec la composition de référence.
- **Décisions 22 et 31 rectifiées par le propriétaire le 2026-10-27 :** signaler discrètement les ingrédients non affectés par les compteurs, **sans exiger ni proposer de justification** pour leur non-utilisation. Pour valider, exiger au minimum une phase et une étape documentée ; durées, températures et contrôles demeurent facultatifs. La validation M-006 future ne devra pas réintroduire l'ancienne obligation de justification.
- La gestion de concurrence doit refuser les écrasements silencieux, comme M-004.
- Les évolutions de bibliothèque ne sont jamais appliquées automatiquement ; leur adoption explicite modifie le contenu courant et exige revalidation de la Fiche process si elle était Validée et si le changement est effectivement enregistré.

### Changement de la Fiche technique — DÉCISION VALIDÉE

Après validation d'une évolution de **composition** de M-004, proposer à l'utilisateur : « Souhaitez-vous revoir la Fiche process ? » :
- **Oui** : ouvrir la Fiche process associée pour examen (en fonction des droits et de son statut).
- **Non** : terminer ce parcours sans mutation ni obligation de validation du process.
- Une simple revalorisation tarifaire ne doit pas déclencher le même dialogue.

Le rejet de la proposition n'est **pas** une mise à jour silencieuse du contenu courant de la Fiche process et n'en change pas l'état éditorial. **Décision approuvée (32) :** conserver un indicateur non bloquant de décalage entre la composition M-004 courante et la composition de référence du process ; répondre « Non » à la révision ne mute pas le process.

**Intégration à vérifier :** M-004 calcule des catégories de changement de validation (dont COMPOSITION), mais il faut vérifier les différences réelles pertinentes pour le process, sans assimiler tous les événements M-004 à un changement de fabrication.

## 9. Cycle de vie dépendant de M-004 — DÉCISIONS NOUVELLES VALIDÉES

La Fiche process **ne peut pas survivre à la purge de sa Fiche technique**. Elle ne peut pas être archivée indépendamment de sa Fiche technique. En revanche, elle peut être supprimée seule de manière **physique et définitive**, après confirmation explicite de l'utilisateur autorisé ; cela laisse la Fiche technique intacte.

| Action M-004 | Règle métier pour M-006 |
| --- | --- |
| Création d'une Fiche technique | Ne crée pas automatiquement de Fiche process. |
| Suppression autonome d'une Fiche process | Suppression **immédiate et définitive** de l'agrégat M-006 (contenu courant, données propres au process, usages associés) après confirmation ; la Fiche technique M-004 et les modèles de bibliothèque restent intacts ; l'association 1:1 est libérée. |
| Archivage autonome d'une Fiche process | **Interdit** ; l'archivage est exclusivement provoqué par la Fiche technique. |
| Archivage de la Fiche technique | Archive automatiquement la Fiche process associée ; son contenu courant et les bibliothèques restent conservés. |
| Réactivation de la Fiche technique | **Décision approuvée (29)** : réactiver le process conservé lorsque le parent est réactivé, selon l'état de référence enregistré, sans ressusciter un process supprimé définitivement. |
| Suppression M-004 vers corbeille | Supprime **logiquement** la Fiche process associée dans la même opération métier, sans purge physique précoce. |
| Restauration M-004 | **Décision approuvée (29)** : restaurer le process associé et son état antérieur approprié avec le parent, s'il est restaurable ; ne jamais recréer un process supprimé définitivement. |
| Purge définitive de M-004 | Purge aussi l'agrégat M-006 correspondant (contenu courant, état de validation, liens d'utilisation) sans laisser d'orphelin. |
| Copie de M-004 entre Dossiers | La cible M-004 est créée en brouillon : **ne pas créer automatiquement la Fiche process cible** tant que la Fiche technique copiée n'a pas été validée officiellement. La reprise éventuelle du **contenu courant** source pourra être proposée après validation M-004 cible, via remappage explicite, dans une nouvelle Fiche process Brouillon, sans historique M-006. |

**Garantie de cohérence visée :** ces transitions doivent être transactionnelles, avec contrôles de tenancy, concurrence, permissions et audit, et sans altérer les documents de bibliothèque partagés par d'autres Fiches process. Une purge M-004 existante ne doit pas laisser de données M-006 orphelines.

**Décision du propriétaire du produit (2026-10-26) :** aucune commande d'archivage autonome de Fiche process ; suppression autonome physique et définitive avec confirmation explicite. Cette destruction est distincte de la mise en corbeille par cascade depuis M-004. Une nouvelle Fiche process peut ensuite être créée pour la Fiche technique encore éligible. **Précisions approuvées (29, 33) :** suppression autonome physique uniquement si la Fiche technique parente est `ACTIVE`, après confirmation explicite et permission effective (Owner ou responsable habilité) ; elle reste interdite lorsque le parent est archivé ou en corbeille. La confirmation et l'audit exacts sont à concevoir sans conserver de données censées être purgées.

**Preuve de code à prendre en compte :** technicalSheetLifecycle.service.js distingue ACTIVE / ARCHIVED / DELETED, calcule purgeScheduledAt, restaure depuis preDeleteStatus et purge TechnicalSheet, Draft et Validations dans une transaction. Il faudra brancher la cascade M-006 sur ces services effectifs plutôt que simuler une suppression immédiate.

## 10. Copie inter-Dossier

- La copie M-004 est aujourd'hui conditionnée par une composition source validée et l'absence de brouillon source ouvert. M-006 devra s'intégrer à ce parcours existant.
- Si un process source existe, mémoriser éventuellement l'origine M-004 de la copie pour une **reprise guidée ultérieure**. Ne créer **aucune** Fiche process cible tant que la nouvelle Fiche technique M-004 reste en brouillon ; la cible devra être validée et sans révision ouverte.
- Les affectations des ingrédients doivent être **reliées aux lignes de composition réellement copiées** ; jamais conserver aveuglément les identifiants de sous-documents source.
- Les modèles Workspace actifs peuvent être référencés selon les règles de version adoptées, les étapes locales du Dossier source ne doivent pas devenir visibles au Dossier cible par simple copie. Proposition : matérialiser des définitions/snapshots nécessaires en préservant le contenu et la provenance sans autorisation indue.
- Aucun contenu économique, historique M-004 ni métadonnée privée propres au magasin source ne doivent être répliqués illicitement dans le magasin cible ; M-006 ne possède pas d'historique de versions métier à importer.
- **Décision 28 actualisée le 2026-10-27 :** examiner uniquement le **contenu courant** de la Fiche process source, qu'elle soit Brouillon ou Validée, pour une éventuelle reprise guidée. La reprise n'intervient **qu'après validation M-004 de la copie**, et toujours en nouvelle Fiche process Brouillon, sans historique M-006. La Fiche technique M-004 source doit toujours respecter ses propres préconditions de copie ; ne pas les contourner. Pour les modèles locaux indisponibles dans le Dossier cible, conserver le contenu nécessaire sous forme réutilisable localement sans exposer la bibliothèque source ; modalités techniques à concevoir.

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
DELETE /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId   # suppression physique explicitement confirmée, contrôle serveur strict

Workspace :
GET/POST /api/workspaces/:workspaceId/process-library/steps
GET/POST /api/workspaces/:workspaceId/process-library/phases
~~~

À compléter : révisions et adoption de bibliothèque, modèles locaux, archivage/purge/restauration, gestion fine des erreurs, impression, filtres/pagination, autorisations. Les transitions depuis M-004 restent des appels de **service intégrés**, pas de simples appels HTTP internes successifs.

Validation Zod stricte et fermée, ObjectId et scopes vérifiés, expectedRevision pour les écritures, limites métier à fixer, protection contre références inter-Workspace, erreurs de conflit 409, transactions pour invariants et événements. Aucun coût ou valeur économique accepté depuis le client M-006.

## 13. Frontend et ergonomie — DÉCISIONS VALIDÉES ET PROPOSITIONS

- Ajouter **Fiches process (N)** au niveau des onglets du Dossier, sous réserve du droit de lecture.
- Liste : nom, Fiche technique associée, **état éditorial** (Brouillon ou Validée), dernière modification, recherche/filtre, accès au contenu courant, indicateur d'une évolution M-004 à revoir le cas échéant, suppression autonome uniquement selon permission et après confirmation. Le statut technique miroir de M-004 n'a pas à être affiché en colonne.
- **Liste principale : uniquement les Fiches process réellement créées**, avec Fiche technique associée, état, dernière modification, recherche/pagination et actions autorisées. Jamais une table des Fiches techniques sur cette page.
- **Création en modale :** titre obligatoire + liste déroulante des Fiches techniques du Dossier **ACTIVE, validées, sans brouillon M-004 ouvert et sans process**, filtrée par le backend (recherche/pagination). Confirmation : création 1:1 en transaction puis ouverture de la Fiche process brouillon. Les explications des champs et sections sont placées dans les infobulles (i), pas en longs sous-titres.
- Point d'entrée depuis une Fiche technique existante selon sa situation : créer/ouvrir le process.
- Éditeur : colonne/zone des ingrédients M-004, phases ordonnées, étapes réutilisables paramétrables, association des ingrédients à la phase et/ou à l'étape, indicateur des non-affectés, ajout de consignes et éléments propres au process.
- Sur mobile/tablette : parcours lisible, prioriser la consultation et la manipulation accessible ; ne pas dupliquer une version parallèle des données.
- **Décision approuvée (35) :** impression des process validés et impression possible d'un brouillon **explicitement identifié comme brouillon** ; aucun stockage persistant de nouveau document généré. Mise en page, contenu exact et commande d'impression restent à concevoir. Aucune image/illustration en V1.
- Navigation Workspace : surface métier « Bibliothèque de fabrication », cohérente avec les Gammes de produits finis, et non dans l'administration générique Core.
- Réutiliser les primitives Core/design system, RTK Query pour les données serveur, Redux seulement si état client réellement global ; préserver accessibilité et thèmes.

## 14. Audit, corbeille, rétention, migrations

- Tracer la création, édition, validation, archivage, réactivation, suppression, restauration, purge, copie, publication des modèles et adoption de révision ; inclure les références métier nécessaires, sans exposer les données des autres Dossiers.
- Aucune politique de conservation de versions métier M-006 : pas d'historique du contenu courant. Le journal d'audit minimal et la rétention des autres données M-004 / bibliothèques suivent leurs propres contrats, sans politique inventée.
- La purge de la Fiche technique doit supprimer l'agrégat enfant M-006 dans la même transaction ; les éléments partagés de bibliothèque utilisés ailleurs restent conservés.
- Prévoir migrations/index M-006, évolution éventuelle de service M-004 pour cascades, backfill RBAC des rôles système et inventaire des migrations ; ne pas modifier la DB sans contrat validé.
- Ne pas créer de nouvelle instance MongoDB ou nouveau replica set.
- Respecter les contrats Core d'extension du tag v1.2.1 ; aucune modification du Core n'est justifiée par les besoins métier identifiés à ce stade.

## 15. Tests et critères d'acceptation envisagés

**Backend :** création 1:1 et sélection éligible ; exclusion des Fiches archivées, supprimées, déjà associées ; concurrence de deux créations ; accès Dossier/Workspace ; scoping bibliothèque ; état courant validé sans snapshot historique M-006 ; transition Validée → Brouillon à l'enregistrement d'un vrai changement ; revalidation, PUT identique sans invalidation ; adoption de révision de bibliothèque ; associations ingrédients/phase/étape ; doublons de Référence Produit ; cohérence parent-enfant ; sauvegardes concurrentes ; mutations de recette ; copie avec reconstruction de correspondances ; cascade archiver/réactiver/delete/restore/purge ; transactions rollback ; audit, quotas/capabilities selon contrat.

**Frontend RTL :** onglet et compteur selon droits, sélection d'une Fiche technique éligible, état vide, création guidée, affectation des ingrédients, phases/étapes, messages de conflit, badges, avertissement de révision, imprimabilité, accessibilité.

**E2E Playwright :** création depuis le Dossier et depuis M-004 ; réutilisation de bibliothèque ; prévention d'un deuxième process ; archivage et suppression/restauration du parent ; suppression définitive autonome (confirmation/refus/permission, absence de cascade vers M-004, nouvelle création) ; copie inter-Dossier ; non-divulgation entre Dossiers/Workspaces ; consultation sur différents formats d'écran ; validation puis modification/revalidation du même process sans historique ;

**Critères d'acceptation indispensables :**
1. impossible de créer une Fiche process sans Fiche technique ;
2. impossible d'en créer deux pour une même Fiche technique, même sous concurrence ;
3. le sélecteur de création montre seulement les Fiches techniques actives **officiellement validées, sans brouillon M-004 ouvert**, non associées du Dossier autorisé ;
4. les ingrédients M-004 peuvent être liés aux phases et/ou aux étapes, sans dupliquer ni recalculer la recette ;
5. une Fiche process Validée repasse en Brouillon seulement après un changement métier effectivement enregistré ; une simple consultation, saisie locale ou sauvegarde sans différence métier ne déclenche pas cette transition ;
6. les mises à jour de modèles partagés n'altèrent pas les process existants ;
7. archivage M-004 entraîne archivage M-006 ;
8. suppression logique M-004 entraîne suppression logique M-006, avec conservation du contenu en corbeille ;
9. purge M-004 efface aussi le process enfant sans laisser d'orphelin ;
10. la restauration et la copie respectent les règles explicitement finalisées ;
11. les droits et la séparation Workspace/Dossier sont assurés par le serveur ;
12. l'impression correspond à la version réellement consultée, sans altérer le contenu officiel ;
13. aucune archive autonome du process n'est possible ;
14. supprimer définitivement un process exige autorisation + confirmation, préserve M-004 et les modèles réutilisés, supprime le contenu courant M-006 et libère l'association 1:1.

**Gates avant PR d'implémentation :** tests unitaires, Supertest/intégration MongoDB, RTL, E2E critiques, puis npm run release:check. Aucun test ni gate M-006 n'est déclaré exécuté à la date de cette proposition.

## 16. Arbitrages fonctionnels 21–35 approuvés le 2026-10-26 ; conception à poursuivre

Le propriétaire du produit **approuve les recommandations fonctionnelles 21 à 35**. L'approbation ne transforme ni les pistes techniques, ni les URLs envisagées, ni les algorithmes encore ouverts en contrats implémentables. Ce tableau lève les anciens arbitrages fonctionnels et fait autorité sur les formulations « proposé / à confirmer » antérieures du présent document.

| N° | Décision fonctionnelle approuvée |
| --- | --- |
| 21 | **Remplacée le 2026-10-26** : création M-006 uniquement depuis M-004 ACTIVE, validée et sans brouillon M-004 ouvert ; validation M-006 sur composition officielle cohérente. |
| 22 | **Rectifiée le 2026-10-27 :** ingrédients affichés ensemble, affectation suivie par coche verte et compteur, absence d'affectation tolérée sans justification. |
| 23 | Temps actif, attente/repos et cuisson/traitement distingués ; simultanéité prise en compte sans somme artificielle. |
| 24 | Champs facultatifs structurés : consigne, critère attendu, action corrective ; **aucun journal d'exécution** en V1. |
| 25 | Création rapide d'étape dans l'éditeur, initialement bibliothèque locale Dossier ; publication Workspace explicite si autorisée. |
| 26 | **Remplacée le 2026-10-26** : process initial interdit sur fiche en brouillon ; les process existants sont conservés si M-004 est mise ultérieurement en révision. |
| 27 | Présentation unifiée sans quantité des Références Produit identiques, sans perdre l'identité des lignes métier nécessaires à la traçabilité. |
| 28 | **Amendée le 2026-10-26** : copie M-004 produit une Fiche technique cible DRAFT, donc **pas de process cible immédiat**. Reprise du contenu process proposée **après validation M-004 cible**, en brouillon M-006 sans historique source ; contrôles de copie M-004 conservés. |
| 29 | Archivage, réactivation, corbeille, restauration et purge synchronisés avec M-004 ; suppression autonome définitive **seulement si le parent est ACTIVE** ; aucune résurrection après destruction physique. |
| 30 | Archivage des modèles de bibliothèque : plus de nouvelles utilisations ; utilisations et historiques existants conservés. Suppression physique seulement sans dépendances imposant leur conservation. |
| 31 | **Rectifiée le 2026-10-27 :** validation : au moins une phase et une étape documentée ; temps, températures et contrôles facultatifs ; aucune justification exigée pour les ingrédients non affectés. |
| 32 | Si révision proposée après changement de composition et refusée : aucune mutation du process et indicateur de décalage non bloquant. |
| 33 | Owner et Responsable habilité : validation et suppression définitive ; Contributeur habilité : création et modification ; Lecteur : consultation ; permissions dédiées pour administrer/publier les bibliothèques, toutes évaluées côté serveur. |
| 34 | Fonction incluse dans tous les plans en V1, sans quota process ajouté ; limites de stockage existantes uniquement si pertinentes. |
| 35 | Impression de la Fiche process **courante** Validée ou Brouillon (brouillon visiblement marqué), sans nouveaux documents générés stockés durablement. |

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

**Le propriétaire du produit a validé explicitement le contrat consolidé M-006 et autorisé l'implémentation le 2026-10-26.** Le développement est désormais permis, par lots cohérents sur la branche dédiée, sans introduire d'hypothèses métier supplémentaires. Les inconnues techniques doivent être résolues et testées avant l'activation des parcours concernés.

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

**État actualisé le 2026-10-26 :** le contrat complet est validé et l'implémentation autorisée. Lot backend des bibliothèques de fabrication engagé (voir `docs/m006/M-006-TECHNICAL-DESIGN.md`). **M-006 n'est pas livré dans son ensemble :** les Fiches process, leur intégration transactionnelle à M-004, le frontend et l'impression restent à réaliser/tester. Aucun résultat de gate n'est revendiqué.

## 19. Rectification validée du parcours principal (2026-10-26)

Le propriétaire a confirmé expressément, après examen de la première UI, que **la liste principale doit contenir exclusivement des Fiches process**. Le tableau de Fiches techniques créé au lot 3 est remplacé. La création s'effectue dans une modale « titre + Fiche technique éligible », avec des (i) d'infobulle aux titres. Après création, ouvrir le brouillon M-006. Cette décision rend caduques les descriptions antérieures suggérant un explorateur permanent des compositions M-004 sur la page principale.

La règle **M-004 ACTIVE, officiellement VALIDATED, sans DRAFT M-004 et sans M-006 déjà associé** est approuvée ; le serveur en garantit l'application, même en situation concurrente. Les anciennes décisions 21 et 26 contraires ne restent pas des alternatives applicables. La décision 28 est adaptée en conséquence : aucune création process pendant que la copie M-004 cible est encore en brouillon.
