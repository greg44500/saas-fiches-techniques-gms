# M-004 — Gammes de Fiches techniques — proposition de contrat fonctionnel

**Statut : VALIDÉ PAR LE PROPRIÉTAIRE DU PRODUIT — G1 = B ET G2 = A — DÉVELOPPEMENT AUTORISÉ SUR BRANCHE**  
**Date : 2026-10-24**  
**Branche de préparation :** `feature/m004-gammes-fiches-techniques`  
**Périmètre :** extension organisationnelle du module M-004 existant, sans évolution du Core.

> Les 11 arbitrages initiaux ainsi que les décisions complémentaires
> **G1 = B** (suppression définitive d'une Gamme sans aucune Fiche liée) et
> **G2 = A** (copie sans Gamme avec message explicite si l'ancienne Gamme
> est archivée) ont été confirmés par le propriétaire du produit.
> L'ensemble du contrat, y compris ses règles de concurrence, de suppression,
> de RBAC et d'interface, a reçu une **approbation globale explicite** le
> 2026-10-24. Les évolutions du lot sont autorisées sur la branche dédiée,
> sous réserve des tests locaux et d'une PR unique validée par l'utilisateur.
>
> Sources faisant autorité : code et tests effectifs, puis
> `docs/m004/M-004-FINAL-CONTRACT.md`,
> `docs/m004/M-004-EXPORTS-FINAL-CONTRACT.md`, M-001, RBAC Core v1.2.1.

## 1. Finalité et vocabulaire

Permettre aux utilisateurs d'organiser les Fiches techniques par familles
d'activité (ex. « Snacking », « Traiteur », « Pâtisserie »), sans dupliquer le
référentiel d'un magasin à l'autre.

- **Gamme de Fiches techniques** : classification organisationnelle définie
  une fois dans un Workspace, utilisable dans ses différents Dossiers.
- **Affectation** : association courante, facultative, d'une Fiche technique
  à au plus une Gamme de son propre Workspace.
- **Sans gamme** : absence réelle d'affectation, jamais une Gamme artificielle.
- **Gamme alimentaire M-002** (`foodRange`) : état/type physique d'une
  Référence Produit ; concept indépendant, non réutilisé.

Une Gamme ne contient pas de copies de Fiches : le contenu de « Snacking »
dans le Dossier A correspond exclusivement aux Fiches du Dossier A
actuellement associées à l'identifiant de cette Gamme.

## 2. Arbitrages métier transmis par l'utilisateur (11)

1. Gamme facultative, y compris après validation de la Fiche.
2. Une Fiche appartient à zéro ou une Gamme courante, jamais plusieurs.
3. Pas de sous-gammes ou d'arborescence en V1.
4. Administration commune par l'Owner et le Responsable FT **autorisé**.
5. Affectation/déplacement par Owner, Responsable FT et Contributeur FT
   disposant des droits effectifs de modification de la Fiche.
6. Changement autorisé sur Fiche `ACTIVE`, même validée. Fiche
   `ARCHIVED` à réactiver ; `DELETED` non modifiable.
7. Archivage d'une Gamme : associations conservées, aucune nouvelle
   association, réactivation possible.
8. Copie inter-Dossier : conserver la Gamme de la source lorsqu'elle est
   encore active et appartient au Workspace.
9. Gamme courante uniquement ; traçabilité par audit. Aucun champ Gamme
   dans les validations historiques ni dans les exports V1.
10. Administration depuis le Workspace + création rapide depuis le Dossier.
11. Aucun quota/capability commerciale supplémentaire pour les Gammes ;
    fonctionnalité disponible dans tous les plans.
12. **G1 = B — confirmé :** suppression définitive permise uniquement si
    aucune Fiche technique n'est encore associée à la Gamme.
13. **G2 = A — confirmé :** si la Gamme source est archivée au moment de
    la copie, la nouvelle Fiche est « Sans gamme » et le résultat en informe
    explicitement l'utilisateur.

## 3. Ownership, isolation et visibilité

- Chaque Gamme a un propriétaire unique : `workspace`, immuable.
- Chaque Fiche conserve l'ownership `workspace + dossier` de M-004 ;
  ni le Dossier ni l'identité de la Fiche ne changent au classement.
- L'affectation exige `technicalSheet.workspace === range.workspace`
  côté serveur ; les identifiants provenant d'autres Workspaces sont
  systématiquement refusés sans divulgation de leurs données.
- Les noms des Gammes constituent un référentiel organisationnel partagé
  dans le Workspace. Les Fiches, nombres de Fiches et données économiques
  restent filtrés par le Dossier autorisé.
- La même Gamme peut être vide dans un Dossier et utilisée dans d'autres.
  Aucun enregistrement de « contenu de Gamme par Dossier » n'est nécessaire.
- Les règles de membership Workspace, accès Dossier M-001, modes d'accès et
  statuts du Dossier restent les autorités applicables. L'Owner conserve son
  accès implicite aux Dossiers.

## 4. Entité et identité fonctionnelle

Une Gamme dispose au minimum des données suivantes :

- identifiant stable ;
- Workspace d'appartenance ;
- nom affiché et clé de comparaison normalisée ;
- statut `ACTIVE | ARCHIVED` ;
- auteur et dates de création/modification, auteur/date du changement de
  statut ; données utiles à l'audit.

**Proposition technique de cadrage :** modèle métier `TechnicalSheetRange`,
référence nullable dans `TechnicalSheet`; aucun champ Gamme dans
`TechnicalSheetDraft`, `TechnicalSheetValidation` ou les snapshots
économiques. Ne pas créer un document d'association Dossier/Gamme ni une
collection de copies de Fiches.

**Convention proposée :** nom non vide, longueur plafonnée à 100 caractères,
unicité dans un même Workspace après trim, repli des espaces et comparaison
insensible à la casse. Unicité conservée même après archivage : renommer
ou réactiver une Gamme ne permet pas de doublons. Les règles exactes de
normalisation seront déterminées et testées sans fusion heuristique
de libellés distincts.

**G1 = B — validé en arbitrage métier :** une Gamme peut être supprimée
**définitivement si, et uniquement si, aucune Fiche technique ne lui est
associée dans l'ensemble du Workspace**. Le contrôle englobe tous les
Dossiers et tous les états de Fiche : `ACTIVE`, `ARCHIVED` et `DELETED`
(corbeille comprise). Une Gamme dont la dernière Fiche associée a été
purgée, ou dont toutes les Fiches ont été explicitement déclassées, devient
éligible à la suppression. Il ne suffit pas que la Gamme soit vide dans
le Dossier consulté.

La suppression n'est **jamais** une opération de déclassement en masse :
aucune Fiche ne doit être modifiée, détachée ou purgée automatiquement.
Un contrôle de simple décompte suivi d'une suppression sans coordination
serait insuffisant : la vérification d'absence de références et la
suppression doivent être garanties face aux nouvelles affectations
concurrentes, avec transactions et synchronisation adaptées à MongoDB.
Une seule requête concurrente peut gagner ; jamais une Fiche orpheline.

**Proposition d'application soumise à l'approbation globale :** la
suppression d'une Gamme vide est possible depuis son action de gestion,
qu'elle soit `ACTIVE` ou `ARCHIVED`, avec confirmation explicite de son
caractère irréversible. Un historique d'audit autonome (identifiant,
ancien nom, Workspace, auteur, date) reste consultable selon la politique
d'audit, même après la suppression physique. La suppression libère le
libellé dans le référentiel courant ; un nouveau référentiel pourra
réutiliser ce nom sans réutiliser l'ancien identifiant.

## 5. Cycle de vie de la Gamme

| Opération | État avant | Résultat et invariant |
|---|---|---|
| Créer | — | Nouvelle Gamme ACTIVE dans le Workspace |
| Renommer | ACTIVE | Identité stable ; nouveau libellé partagé, contrôlé contre doublon |
| Archiver | ACTIVE | Devient ARCHIVED ; toutes les affectations existantes sont préservées |
| Réactiver | ARCHIVED | Devient ACTIVE ; redevient sélectionnable pour de nouvelles affectations |
| Consulter | ACTIVE / ARCHIVED | Référentiel visible selon autorisation de lecture |
| Affecter | ACTIVE uniquement | La Gamme peut être sélectionnée pour une Fiche |
| Affecter | ARCHIVED | Interdit, même lors d'une copie vers un autre Dossier |
| Retirer une affectation existante | ACTIVE / ARCHIVED | Autorisé si Fiche ACTIVE et permission de modification |
| Supprimer définitivement | ACTIVE / ARCHIVED, aucune Fiche liée dans aucun Dossier ni statut | Suppression irréversible après confirmation ; aucune Fiche affectée ou modifiée ; audit conservé |
| Supprimer définitivement | Au moins une Fiche liée, y compris archivée ou en corbeille | Refus explicite 409, sans suppression ni déclassement |

**Proposition :** une Gamme archivée reste présente dans les filtres et
les vues de gestion, avec son statut explicite, lorsque cela est nécessaire
pour retrouver des Fiches déjà classées. Elle ne figure plus parmi les choix
disponibles pour une nouvelle affectation. La réactivation ne modifie pas
les Fiches liées. Les éventuelles valeurs de compte sont calculées par
Dossier autorisé, pas sur l'ensemble des magasins. À l'inverse, le
contrôle de suppression porte obligatoirement sur **toutes** les Fiches
du Workspace, même dans les Dossiers non accessibles à l'opérateur :
le serveur renvoie seulement l'éligibilité, sans divulguer les Fiches ou
les magasins concernés.

## 6. Cycle de vie de la Fiche et affectation

- Nouvelle Fiche : peut naître sans Gamme ; un choix facultatif de Gamme
  ACTIVE du Workspace est possible à la création.
- Fiche ACTIVE avec ou sans brouillon, validée ou non : un utilisateur
  autorisé peut affecter une Gamme ACTIVE, changer de Gamme ACTIVE, ou
  retirer le classement (« Sans gamme »).
- Le changement porte uniquement sur les métadonnées courantes de la
  Fiche ; il ne crée ni brouillon, ni validation, ni recalcul, ni copie.
- Il n'altère pas la composition, les prix applicables, la TVA, les marges,
  les quantités, l'historique, les snapshots ou la faculté d'export.
- Fiche ARCHIVED : consultation du classement conservée, mutation
  interdite jusqu'à réactivation de la Fiche.
- Fiche DELETED : association conservée pendant la corbeille mais
  aucune mutation de classement ; restauration selon les règles M-004.
  Une Gamme devenue ARCHIVED pendant la corbeille reste liée après
  restauration et reste non sélectionnable pour les nouvelles affectations.
- Purge de la Fiche : le document de Fiche disparaît selon la politique
  M-004 ; aucune modification automatique de Gamme ni des autres Fiches.
- Le Dossier doit être opérationnel selon M-001 pour modifier un classement.

**Concurrence :** une mutation d'affectation utilise la révision courante
de la Fiche et refuse toute écriture périmée (409). La transition du statut
d'une Gamme et la création d'une nouvelle affectation doivent empêcher
qu'un archivage concurrent laisse passer une affectation interdite.
**La suppression définitive d'une Gamme et une affectation concurrente
exigent la même protection transactionnelle contre les références
orphelines.** Les transactions, protections et éventuels retries sont
détaillés au design technique, avec tests dédiés.

## 7. Copie inter-Dossier

La copie existante (Workspace identique, Dossier cible autorisé,
conditions de copie M-004 satisfaites) reste l'autorité.

- Si la Fiche source possède une Gamme ACTIVE au moment effectif de la
  copie, la nouvelle Fiche reçoit le même identifiant de Gamme.
- Si la source n'a pas de Gamme, la copie est sans Gamme.
- **G2 = A — confirmé :** si la Gamme de la source est `ARCHIVED` lors
  de la copie, celle-ci est créée « Sans gamme ». La réponse métier et
  l'interface signalent explicitement que la Gamme n'a pas été reprise
  car elle est archivée, sans présenter la copie comme un échec.
- Les prix, Articles applicables, coûts et marges sont reconstruits selon
  le Dossier cible : jamais transportés par la Gamme.
- La Fiche copiée reste une nouvelle identité et consomme +1 unité du
  quota des Fiches existant.

La copie et la détermination de la Gamme de destination se font sur
un état cohérent en transaction. Un archivage concurrent ne doit jamais
aboutir à une nouvelle Fiche référant à une Gamme devenue archivée.
En cas de changement concurrent, l'opération applique la règle G2 sur
l'état autoritaire ou signale un conflit explicite à rejouer ; elle ne
réattribue jamais silencieusement la Gamme archivée.

## 8. Autorisations et RBAC

Les profils Owner / Responsable FT / Contributeur FT sont des profils
fonctionnels, les deux derniers reposant sur les rôles Workspace
personnalisés existants.

| Action | Permission et garde |
|---|---|
| Voir les Gammes accessibles au Workspace | Membership et `technical-sheet:read` |
| Créer / renommer / archiver / réactiver / supprimer définitivement une Gamme | Nouvelle permission métier `technical-sheet:range:manage` |
| Créer une Fiche déjà classée | `technical-sheet:create` + accès au Dossier + Gamme ACTIVE du Workspace |
| Modifier / retirer l'affectation d'une Fiche ACTIVE | `technical-sheet:update` + accès au Dossier + statut opérationnel |
| Copier une Fiche et sa Gamme active | `technical-sheet:copy` + contrôles existants source/cible |

Le rôle système Owner reçoit la nouvelle permission métier par le
registre applicatif d'extension existant. Un Responsable FT n'en dispose
que si le rôle Workspace qui lui est attribué possède explicitement
`technical-sheet:range:manage`. Un Contributeur FT peut affecter une
Gamme existante avec `technical-sheet:update`, sans obtenir la
permission d'administration. Ni les rôles système Core ni leurs primitives
ne sont modifiés. Une migration de rôles ne doit pas octroyer la nouvelle
permission à tous les rôles personnalisés sans choix explicite.

La création rapide depuis un Dossier suit exactement la permission
globale d'administration des Gammes, et non le droit d'éditer la Fiche.
Un utilisateur autorisé à administrer les Gammes comprend que son action
crée un nom disponible dans tout le Workspace.

Aucun entitlement ni quota Gammes n'est ajouté. Les permissions RBAC
restent obligatoires quel que soit le plan commercial.

## 9. API et validation attendues (contrat conceptuel)

**Référentiel au niveau Workspace :**

- lister les Gammes ACTIVE et, selon filtre, ARCHIVED ;
- créer une Gamme ;
- renommer une Gamme ;
- archiver et réactiver ;
- supprimer définitivement une Gamme uniquement après vérification
  de l'absence totale de Fiches associées dans le Workspace, confirmation
  explicite et contrôle transactionnel des affectations concurrentes ;
- exposer identifiants, noms et statuts nécessaires à l'UI.

**Fiches au niveau Dossier :**

- renvoyer l'association courante (id + présentation du nom/statut) ;
- accepter un identifiant de Gamme facultatif à la création de Fiche ;
- permettre une mutation explicite de l'affectation avec
  `expectedRevision`, identifiant actif ou `null` ;
- filtrer la liste serveur par identifiant de Gamme, et disposer d'un
  filtre explicite « Sans gamme » ;
- garder la pagination, la recherche et les filtres de lifecycle ;
- conserver le comportement de copie existant, enrichi de l'association
  sous les conditions du §7.

**Validation stricte :** entrées Zod fermées, `ObjectId` contrôlés,
longueurs et unicité, propriété Workspace, statut ACTIVE,
autorisation, état Dossier/Fiche et contrôle de concurrence. La
suppression vérifie tous les statuts des Fiches et tous les Dossiers du
Workspace, indépendamment des grants individuels, sans divulgation.
Les références croisées doivent être vérifiées côté serveur ; jamais
se fier au seul menu de sélection.

**Erreurs :** 400 en cas de données invalides, 403 selon les règles
d'accès applicables, 404 sans fuite inter-Workspace, 409 pour doublons,
états incompatibles, tentative de suppression d'une Gamme liée, ou
conflits de révision. Le design technique fixera
les codes exacts compatibles avec les conventions du dépôt.

Les noms des routes, serializers et fichiers seront définis au design
après validation de ce contrat, en réutilisant les modules existants.

## 10. Audit et traçabilité

Les événements suivants doivent être auditables avec auteur, Workspace,
date et identifiants pertinents :

- création, renommage (ancien/nouveau nom), archivage, réactivation
  et suppression définitive d'une Gamme, en conservant le dernier
  nom métier utile à la compréhension de son audit ;
- affectation, déplacement et retrait de Gamme pour une Fiche, avec
  ancien et nouvel identifiant, Dossier et Fiche ;
- copie avec Gamme reprise ou non reprise, et motif `GAMME_ARCHIVEE`
  lorsque la nouvelle Fiche reste sans Gamme pour cette raison.

Réutiliser les mécanismes d'audit et d'activité métier existants selon
leur responsabilité. La traçabilité permet de comprendre les changements
de classement sans altérer les validations historiques.

**Important :** le libellé actuel de la Gamme peut évoluer partout après
un renommage. L'audit conserve la chronologie des modifications ; il ne
s'agit pas d'une version économique datée.

## 11. Expérience utilisateur V1

### 11.1 Gestion Workspace

Une surface identifiée « Gammes de Fiches techniques » dans la gestion
du Workspace permet, selon les permissions :

- consulter la liste avec nom et état ;
- créer une Gamme avec validation et protection contre les doublons ;
- renommer, archiver, réactiver et supprimer définitivement une Gamme
  vide dans **tout** le Workspace, avec confirmation de l'irréversibilité
  et refus si une seule Fiche lui est encore associée ;
- retrouver une Gamme même si elle est archivée ;
- expliquer qu'un renommage est commun à tous les Dossiers du Workspace.

Les actions de maintenance réutilisent les composants partagés existants :
tableaux, menus de ligne, dialogues, champs et notifications.

### 11.2 Utilisation depuis un Dossier

- Le tableau des Fiches affiche leur classement courant (ou
  « Sans gamme ») sans masquer le statut de Fiche existant.
- Filtre Gamme combinable avec recherche, statut et pagination serveur.
  Les Gammes archivées encore utilisées peuvent être sélectionnées comme
  filtre ; une Gamme sans Fiche produit un état vide intelligible.
- Action « Changer de gamme » sur les Fiches ACTIVE si l'utilisateur
  possède `technical-sheet:update`. Sélecteur de Gammes ACTIVE avec
  choix « Sans gamme ».
- À la création d'une Fiche : sélection de Gamme facultative.
- Création rapide « Créer une gamme » dans les contextes pertinents
  uniquement pour les personnes disposant de
  `technical-sheet:range:manage`; l'interface indique la portée Workspace.
  La nouvelle Gamme est disponible immédiatement, sans présumer
  de l'autorisation de classer la Fiche concernée.
- Après copie d'une Fiche dont la Gamme source est archivée, afficher
  un message de réussite précisant que la copie est « Sans gamme » et
  pourquoi ; la Fiche reste accessible dans le Dossier cible.
- Sur les Fiches déjà liées à une Gamme archivée, conserver un libellé
  visible avec statut « Archivée » ; permettre le déplacement vers une
  Gamme ACTIVE ou « Sans gamme » si la Fiche est ACTIVE.

Accessibilité : labels explicites, clavier, focus, messages d'erreur,
states de chargement, libellés français et réutilisation du Design System.
Ne pas construire une arborescence de navigation ni un second catalogue
de Fiches dupliquées pour représenter les Gammes.

## 12. Commercial, performances et migrations

- Tous les plans peuvent utiliser les Gammes ; aucun plan ou
  capability spécifique, aucun quota de Gammes V1.
- Une Fiche change de Gamme sans consommation supplémentaire du quota
  existant ; seule la création/copie de Fiche consomme selon M-004.
- Aucun document `File`, octet de stockage ou export supplémentaire.
- Fiches existantes (actives, archivées, supprimées) : sans Gamme par défaut ;
  aucun classement inféré, aucune génération automatique de catégories.
- Référentiel initial vide ; aucune Gamme métier préchargée sans décision.
- Index pour unicité Workspace + clé normalisée, filtres performants sur
  Workspace/Dossier/Gamme/statut ; vérifier les migrations et index selon
  le déploiement réel, sans recréer le cluster MongoDB local.
- La création du modèle métier et les index attendent l'approbation du
  présent contrat.

## 13. Cas limites et critères d'acceptation

1. Un Workspace peut avoir ses Gammes, et un autre ses propres Gammes,
   sans lecture, collision de noms, affectation ou fuite entre Workspaces.
2. Deux Dossiers du même Workspace utilisent « Snacking », mais voient
   des ensembles disjoints de Fiches, leurs propres totaux et prix.
3. Une Fiche existante et validée sans Gamme reste légitime et exportable.
4. Une Fiche ne peut jamais avoir deux Gammes courantes.
5. Un Contributeur autorisé peut classer une Fiche de son Dossier,
   mais ne peut ni créer ni renommer une Gamme Workspace.
6. Un Responsable FT muni de la permission globale peut administrer
   le référentiel ; un Responsable sans cette permission ne le peut pas.
7. Un utilisateur sans accès au Dossier ne peut pas classer ses Fiches
   même s'il voit les noms des Gammes du Workspace.
8. Renommer une Gamme met à jour la présentation dans les Dossiers
   sans toucher aux Fiches, historiques et prix.
9. Archiver une Gamme ne détruit aucune relation existante ; aucune
   affectation nouvelle (y compris en copie) ne peut la choisir.
9a. Une Gamme n'est supprimable physiquement que si aucune Fiche du
    Workspace, y compris archivée ou en corbeille, n'y fait référence.
    La suppression est atomiquement protégée contre les affectations
    concurrentes et ne déclasse jamais les Fiches automatiquement.
9b. L'auteur de la suppression doit posséder la permission Workspace
    d'administration ; l'audit historique reste explicable après retrait.
9c. Une Gamme vide dans un magasin mais utilisée dans un autre n'est
    pas supprimable.
10. Une Fiche ARCHIVED ou DELETED refuse le changement de classement.
11. La restauration d'une Fiche ne crée aucune affectation nouvelle ;
    elle préserve son lien même si la Gamme est depuis archivée.
12. Classer une Fiche validée ne crée aucun nouveau brouillon/snapshot
    ni consommation de quota ; exports V1 inchangés.
13. Une modification concurrente de la Fiche cause un conflit explicite,
    sans écraser silencieusement le classement.
14. Un archivage concurrent d'une Gamme et une affectation ne peuvent
    aboutir à une nouvelle association interdite.
15. Une tentative d'utiliser un identifiant de Gamme étranger/inexistant
    est refusée côté serveur sans fuite de données.
16. Les filtres par Gamme, « Sans gamme », recherche et pagination
    restent cohérents sous contrôle serveur.
17. Les règles de copie inter-Dossier et de recalcul économique sont
    préservées ; une copie consomme une seule unité de Fiche.
17a. Copier une Fiche dont la Gamme source est archivée crée une Fiche
    « Sans gamme », avec message explicite, sans copie de l'historique
    économique ni attribution implicite d'une autre Gamme.
18. La création rapide ne donne pas à un Contributeur un droit
    d'administration implicite.
19. L'audit trace la création, le renommage, les transitions de statut,
    les reclassements et les copies pertinentes.
20. Les tests Core/Produit préexistants continuent de passer.

## 14. Stratégie de tests

- **Unitaires :** normalisation/unicité, statuts, affectation nullable,
  autorisations, choix de Gamme à la copie (active, archivée, absente),
  signalement G2, sérialisation.
- **HTTP/Supertest :** création/liste/renommage/archivage/réactivation,
  suppression définitive autorisée/refusée, création/édition de Fiche,
  validation Zod, filtres/pagination, erreurs.
- **Sécurité/tenancy :** deux Workspaces, plusieurs Dossiers, utilisateur
  avec grant sur un seul Dossier, rôles avec/sans permission admin,
  IDs étrangers, accès suspendu.
- **Concurrence :** écriture obsolète, renommages concurrents, archivage
  de Gamme face à affectation, suppression de Gamme face à création
  ou changement de classement, états Fiche invalides.
- **Frontend/RTL :** lecture seule vs actions permises, filtres et compte,
  création rapide, Gamme archivée, messages, accessibilité, RTK Query.
- **E2E :** créer une Gamme Workspace → classer des Fiches dans deux
  Dossiers → déplacer → valider puis reclasser → archiver la Gamme →
  conserver les liens → copier inter-Dossier en G2 → vérifier le message
  « Sans gamme », les coûts locaux, l'historique et l'isolation →
  refuser la suppression tant qu'une Fiche de n'importe quel statut
  reste liée → déclasser/purger les Fiches selon leurs droits → supprimer
  une Gamme devenue entièrement libre avec confirmation.
- **Gates :** exécution locale par l'utilisateur (`npm run release:check`),
  puis Core Gate PR et post-merge ; aucun vert présumé.

## 15. Hors périmètre du lot

Sous-gammes, plusieurs Gammes par Fiche, classement automatique par IA,
tri automatique des recettes, synchronisation de Fiches entre Dossiers,
export ou historisation de Gamme dans les validations, nouvelle capability
commerciale, quota propre aux Gammes, impression/e-mail, refonte du Core,
nettoyage d'autres modules ou migration du `foodRange` M-002.

## 16. Ordre d'implémentation proposé après validation

1. Validation explicite du contrat consolidé (G1 = B et G2 = A déjà arbitrés).
2. Mise à jour des contrats canoniques et du glossaire/modèle de domaine,
   de la roadmap et du suivi de dette au fil du lot, sans antedater la
   validation globale du contrat.
3. Backend : registre permissions, modèle métier, Zod, services,
   endpoints, sérialisation, index/migrations, audit.
4. Tests backend unitaires, intégration et scénarios de sécurité.
5. Frontend : hooks RTK Query, gestion Workspace, sélection et filtres
   Dossier, composants partagés ; tests RTL.
6. E2E métier, contrôles de non-régression, audit visuel local utilisateur.
7. `npm run release:check` local et validation utilisateur.
8. Une seule PR pour le lot cohérent, Core Gate PR, merge autorisé par
   l'utilisateur, contrôle post-merge, documentation de clôture.

La branche existe déjà. Outre la correction ciblée du test de trial
et sa documentation dans `docs/DEBT.md`, elle comporte désormais
l'implémentation des Gammes, les tests et les migrations du lot.
La `release:check` verte rapportée par l'utilisateur **précédait**
ces changements métier : elle ne les valide donc pas. Les tests
et la gate du nouveau HEAD doivent être exécutés localement ;
aucune gate GitHub de la future PR n'est encore attestée.

## 17. Approbation globale obtenue et conditions de livraison

- **G1 : B — arbitré le 2026-10-24** : suppression définitive uniquement
  si aucune Fiche, quel que soit son Dossier ou son statut, n'est liée.
- **G2 : A — arbitré le 2026-10-24** : copie depuis une Gamme archivée
  sans Gamme dans la destination, avec message explicite de réussite.
- **Contrat global : VALIDÉ le 2026-10-24** : règles d'application,
  RBAC, suppression concurrente, parcours UX et tests approuvés.
  L'implémentation est engagée dans la branche M-004, et doit être
  considérée non livrée tant que les gates locales ne sont pas attestées.
- **Livraison conditionnelle** : migration, vérification fonctionnelle
  et sécurité, QA locale, `npm run release:check` puis PR unique.
  Aucun merge sans accord explicite du propriétaire du produit.

## 18. Précisions d'ergonomie décidées pendant la recette (2026-10-24)

À la suite des captures et de la recette visuelle du propriétaire produit :

- Le libellé visible dans la navigation est **« Gammes de produits finis »**,
  au premier niveau de l'espace de travail, au même rang que Produits
  et Fournisseurs, et non dans le sous-menu Dossiers.
- Le titre de page visible est **« Gamme de produits finis »**. La portée
  et l'intérêt du classement sont expliqués dans une infobulle activable
  au survol et au clavier via l'icône d'information déjà partagée.
  Aucun terme technique comme « Workspace » ou « référentiel » dans cette aide.
- Le filtre de statut réduit apparaît à côté d'une loupe de recherche.
  Cliquer sur cette loupe déploie le champ avec une transition fluide.
  La recherche propose, au fur et à mesure de la frappe, les Gammes
  existantes, à partir du point de lecture sécurisé du Workspace ;
  ne pas créer de deuxième moteur de recherche générique.
- **« Créer une gamme »** est une action clairement identifiable pour
  les rôles autorisés ; l'édition est cachée en lecture seule.
  La nouvelle permission propriétaire doit être attribuée aux rôles
  système persistés via la migration M-004.
- La **création d'une Fiche technique** demeure propre à un Dossier et
  n'est pas accessible depuis la page d'administration des Gammes,
  puisqu'elle nécessite un magasin de destination.
- Réutiliser shadcn/Base UI et les composants partagés du SaaS.
  La validation du nouveau code nécessite tests RTL, E2E et
  `npm run release:check` exécutés réellement sur la branche.

Ces précisions de présentation ne modifient ni l'ownership des Gammes,
ni G1/G2, ni le stockage, les droits, les quotas ou les exports.

## 19. Contrôle anti-doublon lors de la création et du renommage (recette du 2026-10-24)

À la demande du propriétaire du produit, les actions « Créer une gamme »
et « Renommer » ouvrent une **modale**, à la place du formulaire intégré
à la page. La création rapide depuis un Dossier reprend ce même dialogue.
La présentation et le contrôle du nom s'inspirent des catégories de
Produits existantes, sans modifier les composants génériques du Core.

- Pendant la saisie, le serveur propose les Gammes **du Workspace courant**
  dont les noms sont proches, y compris les Gammes archivées.
- Un nom exactement égal selon la clé d'unicité validée (espaces/casse)
  interdit la création ou le renommage vers une autre Gamme.
- Un nom proche non identique déclenche une liste d'avertissements.
  L'utilisateur peut créer un nom distinct seulement après avoir
  confirmé explicitement avoir examiné ces propositions.
- La confirmation est contrôlée **côté serveur** via les identifiants
  des candidats examinés ; les nouveaux noms voisins apparus entre
  la vérification et l'écriture provoquent un conflit, avec possibilité
  de réexaminer les résultats. L'index unique reste le garde ultime
  contre les doublons exacts concurrents.
- Le même contrôle s'applique aux créations et aux renommages ;
  le renommage ignore sa propre identité parmi les suggestions.
- La requête de suggestions exige la permission de lecture métier
  et l'appartenance au Workspace. La création et le renommage
  continuent à exiger `technical-sheet:range:manage`.
- Une impossibilité de vérifier les suggestions bloque la validation,
  avec un message explicite, plutôt que d'autoriser un doublon probable.
- L'algorithme de similitude réutilise les critères déjà en place
  pour les noms voisins des catégories de Produits. Les suggestions
  n'ont pas pour effet de renommer ou de fusionner automatiquement
  des Gammes ; une validation humaine est requise pour un nom proche.

## 20. Recette UX : création de Fiche sans interruption (2026-10-24)

- Le sous-titre de la modale de création/renommage de Gamme n'est
  plus visible en permanence : les explications sont dans une infobulle
  accessible au clavier et au survol, auprès du titre.
- La création de Fiche utilise **une seule liste des Gammes ACTIVE**
  autorisées du Workspace ; aucun champ de recherche au-dessus.
  « Sans gamme » est la valeur par défaut, et aucune Gamme n'est
  obligatoire pour enregistrer une Fiche.
- Le bouton « Créer une gamme » apparaît **sur la même ligne que**
  « Gamme (facultative) » uniquement si la permission
  `technical-sheet:range:manage` est effectivement accordée.
  L'ouverture de cette modale métier ne fait pas perdre les champs
  déjà renseignés. Une création réussie préselectionne la Gamme
  dans le formulaire de la Fiche ; fermer ou annuler la modale
  ne modifie pas la sélection précédente.
- Les valeurs du sélecteur proviennent d'une API dédiée qui
  présente **toutes les Gammes actives**, non limitées aux
  premières 100 lignes d'un tableau paginé. Les Gammes archivées
  ne peuvent être affectées à une nouvelle Fiche.
- Les champs saisissables de la modale Fiche sont désormais
  présentés avec des labels flottants « outlined » à animation
  réduite accessible : le libellé se relève au focus ou lorsqu'il
  existe une valeur, et le placeholder exemple apparaît au focus.
  Le modèle visuel existant du Produit et des Articles est réutilisé
  sans créer une primitive transversale Core dans le SaaS métier.
  Les choix déjà préremplis restent lisibles avec leur libellé relevé.
  Le taux de TVA conserve son contrôle segmenté métier.
- Aucune modification des droits, quotas, transactions,
  historiques validés, exports ou règle G1/G2. Tests RTL,
  HTTP et E2E requis avant PR.
