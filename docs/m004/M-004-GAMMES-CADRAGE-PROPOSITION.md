# M-004 — Gammes de Fiches techniques — proposition de contrat fonctionnel

**Statut : PROPOSITION À VALIDER — AUCUNE AUTORISATION DE DÉVELOPPER**  
**Date : 2026-10-24**  
**Branche de préparation :** `feature/m004-gammes-fiches-techniques`  
**Périmètre :** extension organisationnelle du module M-004 existant, sans évolution du Core.

> Les 11 arbitrages ci-dessous ont été transmis par le propriétaire du produit.
> Ce texte en précise les conséquences et propose des détails nécessaires à
> l'implémentation. Les points marqués **À CONFIRMER** ne sont pas décidés ;
> le document complet doit faire l'objet d'une approbation explicite avant
> toute évolution de schéma, d'API ou de code métier.
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

**À CONFIRMER — G1 :** une Gamme n'a pas de suppression définitive en V1 :
l'archivage est l'unique retrait, y compris lorsque la Gamme est vide.
Cette proposition protège la réversibilité et les Fiches associées.
Si une suppression de Gamme vide est souhaitée, définir avant code les
préconditions, impacts d'audit et interdictions de référence.

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
| Supprimer | — | Hors V1 si G1 confirmé |

**Proposition :** une Gamme archivée reste présente dans les filtres et
les vues de gestion, avec son statut explicite, lorsque cela est nécessaire
pour retrouver des Fiches déjà classées. Elle ne figure plus parmi les choix
disponibles pour une nouvelle affectation. La réactivation ne modifie pas
les Fiches liées. Les éventuelles valeurs de compte sont calculées par
Dossier autorisé, pas sur l'ensemble des magasins.

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
Les transactions, protections et éventuels retries sont détaillés au
design technique, avec tests dédiés.

## 7. Copie inter-Dossier

La copie existante (Workspace identique, Dossier cible autorisé,
conditions de copie M-004 satisfaites) reste l'autorité.

- Si la Fiche source possède une Gamme ACTIVE au moment effectif de la
  copie, la nouvelle Fiche reçoit le même identifiant de Gamme.
- Si la source n'a pas de Gamme, la copie est sans Gamme.
- Les prix, Articles applicables, coûts et marges sont reconstruits selon
  le Dossier cible : jamais transportés par la Gamme.
- La Fiche copiée reste une nouvelle identité et consomme +1 unité du
  quota des Fiches existant.

**À CONFIRMER — G2 :** si la Gamme source est ARCHIVED à l'instant de
copie, la copie est créée « Sans gamme », avec une information explicite
dans le résultat utilisateur. Alternative à arbitrer : obliger à choisir
une Gamme ACTIVE ou refuser la copie. La copie ne doit jamais réattribuer
silencieusement une Gamme archivée.

## 8. Autorisations et RBAC

Les profils Owner / Responsable FT / Contributeur FT sont des profils
fonctionnels, les deux derniers reposant sur les rôles Workspace
personnalisés existants.

| Action | Permission et garde |
|---|---|
| Voir les Gammes accessibles au Workspace | Membership et `technical-sheet:read` |
| Créer / renommer / archiver / réactiver une Gamme | Nouvelle permission métier `technical-sheet:range:manage` |
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
autorisation, état Dossier/Fiche et contrôle de concurrence.
Les références croisées doivent être vérifiées côté serveur ; jamais
se fier au seul menu de sélection.

**Erreurs :** 400 en cas de données invalides, 403 selon les règles
d'accès applicables, 404 sans fuite inter-Workspace, 409 pour doublons,
états incompatibles ou conflits de révision. Le design technique fixera
les codes exacts compatibles avec les conventions du dépôt.

Les noms des routes, serializers et fichiers seront définis au design
après validation de ce contrat, en réutilisant les modules existants.

## 10. Audit et traçabilité

Les événements suivants doivent être auditables avec auteur, Workspace,
date et identifiants pertinents :

- création, renommage (ancien/nouveau nom), archivage, réactivation
  d'une Gamme ;
- affectation, déplacement et retrait de Gamme pour une Fiche, avec
  ancien et nouvel identifiant, Dossier et Fiche ;
- copie avec Gamme reprise ou non reprise.

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
- renommer, archiver et réactiver ;
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
- Existing Fiches (actives, archivées, supprimées) : sans Gamme par défaut ;
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
18. La création rapide ne donne pas à un Contributeur un droit
    d'administration implicite.
19. L'audit trace la création, le renommage, les transitions de statut,
    les reclassements et les copies pertinentes.
20. Les tests Core/Produit préexistants continuent de passer.

## 14. Stratégie de tests

- **Unitaires :** normalisation/unicité, statuts, affectation nullable,
  autorisations, choix de Gamme à la copie, sérialisation.
- **HTTP/Supertest :** création/liste/renommage/archivage/réactivation,
  création/édition de Fiche, validation Zod, filtres/pagination, erreurs.
- **Sécurité/tenancy :** deux Workspaces, plusieurs Dossiers, utilisateur
  avec grant sur un seul Dossier, rôles avec/sans permission admin,
  IDs étrangers, accès suspendu.
- **Concurrence :** écriture obsolète, renommages concurrents, archivage
  de Gamme face à affectation, états Fiche invalides.
- **Frontend/RTL :** lecture seule vs actions permises, filtres et compte,
  création rapide, Gamme archivée, messages, accessibilité, RTK Query.
- **E2E :** créer une Gamme Workspace → classer des Fiches dans deux
  Dossiers → déplacer → valider puis reclasser → archiver la Gamme →
  conserver les liens → copier inter-Dossier → vérifier coûts locaux,
  historique inchangé et isolation.
- **Gates :** exécution locale par l'utilisateur (`npm run release:check`),
  puis Core Gate PR et post-merge ; aucun vert présumé.

## 15. Hors périmètre du lot

Sous-gammes, plusieurs Gammes par Fiche, classement automatique par IA,
tri automatique des recettes, synchronisation de Fiches entre Dossiers,
export ou historisation de Gamme dans les validations, nouvelle capability
commerciale, quota propre aux Gammes, impression/e-mail, refonte du Core,
nettoyage d'autres modules ou migration du `foodRange` M-002.

## 16. Ordre d'implémentation proposé après validation

1. Validation explicite du présent contrat et des points G1/G2.
2. Mise à jour des contrats canoniques et du glossaire/modèle de domaine,
   de la roadmap et du suivi de dette au fil du lot, sans « valider »
   rétroactivement les choix encore ouverts.
3. Backend : registre permissions, modèle métier, Zod, services,
   endpoints, sérialisation, index/migrations, audit.
4. Tests backend unitaires, intégration et scénarios de sécurité.
5. Frontend : hooks RTK Query, gestion Workspace, sélection et filtres
   Dossier, composants partagés ; tests RTL.
6. E2E métier, contrôles de non-régression, audit visuel local utilisateur.
7. `npm run release:check` local et validation utilisateur.
8. Une seule PR pour le lot cohérent, Core Gate PR, merge autorisé par
   l'utilisateur, contrôle post-merge, documentation de clôture.

La branche existe déjà. Elle inclut uniquement la correction ciblée du
test frontend de trial liée à la Core Gate #231 et sa documentation dans
`docs/DEBT.md`. Cette correction ne modifie pas le code de production et
a été déclarée verte lors d'un `npm run release:check` local par
l'utilisateur ; aucune gate GitHub de la future PR n'est encore attestée.

## 17. Validation attendue

- **G1 :** confirme-t-on « archivage uniquement, jamais de suppression
  physique de Gamme en V1, même vide » ?
- **G2 :** confirme-t-on « copie sans Gamme avec avertissement si la
  Gamme source est archivée » ?
- **Contrat global :** après réponse à G1/G2, approuver ou demander
  la correction du présent document ; aucun code métier avant cet accord.
