# SAAS-FICHES-TECHNIQUES-GMS — Roadmap produit

**Statut :** M-005 fusionné sur `main` (PR #39) ; clôture documentaire en cours, gate post-merge non vérifiée
**Dernière mise à jour :** 2026-10-08

> Cette roadmap décrit l'ordre de cadrage et de livraison.  
> Elle ne constitue pas encore un engagement de périmètre V1 ni un calendrier daté.

---

## 1. Phase 0 — Bootstrap technique

**Statut : VALIDÉ**

- dérivation depuis `saas-core-api` ;
- Core `v1.2.1` intégré sur la branche Core-update jusqu’au commit post-tag `6581e573c6a6885790b23fe502bd34d8199ea6ba`, avec provenance exacte dans `core-origin.json` ;
- provenance Core tracée ;
- gate canonique validée ;
- points d'extension Core disponibles ;
- aucun module métier encore implémenté avant le cadrage.

---

## 2. Phase 1 — Cadrage global du produit

**Statut : VALIDÉ — 2026-09-20**

Objectif : obtenir un contrat produit suffisamment précis pour interdire les hypothèses métier pendant l'implémentation.


### 2.1 Problème métier et organisation

**État : fortement cadré**

Décisions établies :

- Workspace comme espace de travail du client ;
- plusieurs dossiers dans un Workspace ;
- règle V1 : `1 dossier = 1 magasin` ;
- identité du dossier modifiable sans recréer le contexte ;
- données magasin : nom, enseigne si pertinente, localisation, email documents, téléphone facultatif, responsable métier distinct de `createdBy` ;
- autocomplétion facultative via le service Géoplateforme / IGN, avec fallback manuel permanent ;
- lifecycle dossier `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
- suppression logique avant éventuelle purge physique ;
- suppression logique = coupure immédiate des accès métier et des ressources du dossier dans les flux normaux sans destruction automatique de l'historique ;
- restauration contrôlée vers un état non opérationnel, par défaut `PAUSED` ;
- référentiel Produit canonique partagé à l'échelle du SaaS, avec référentiel d'usage par Workspace sans duplication de l'identité Produit ;
- prix et conditions contextualisés par magasin ;
- accès multi-magasins = changement de contexte, jamais partage ou mélange des données locales ;
- invitation Workspace puis affectation séparée des magasins après acceptation ;
- Workspace Owner implicitement autorisé sur tous les dossiers ;
- drawer de consultation sans activation du contexte ;
- création/édition Dossier via Dialog métier basé sur les primitives Base UI/shadcn existantes ;
- ouverture explicite du dossier vers une vraie page de travail métier ;
- retour au Dashboard Workspace en un clic ;
- Dashboard Workspace comme surface globale de pilotage ;
- Sidebar métier recomposée via le point d'extension Core.

Décisions finales :

- le nom du Dossier / magasin et sa marge cible par défaut sont obligatoires à la création ;
- la marge cible par défaut initialise les nouvelles Fiches techniques sans effet rétroactif ;
- enseigne, localisation, email documents, téléphone et responsable / interlocuteur restent facultatifs ;
- l'autocomplétion d'adresse/localisation utilise en V1 la Géoplateforme / IGN, reste facultative et ne bloque jamais la création ou la modification d'un Dossier ; aucun payload fournisseur, identifiant BAN ou coordonnée n'est persisté en M-001 ;
- les affectations sont portées par une relation métier dédiée `DossierAccessGrant`, distincte du `WorkspaceMember` Core ;
- l'invitation Core reste limitée à `email + roleId` ; aucun magasin n'est préparé dans l'invitation ; après acceptation et création/réactivation du `WorkspaceMember`, le Workspace Owner affecte explicitement zéro, un ou plusieurs Dossiers ;
- les permissions M-001 validées sont `dossier:read`, `dossier:create`, `dossier:update`, `dossier:lifecycle:update`, `dossier:access:read` et `dossier:access:manage` ;
- pour un non-owner, l'autorisation effective exige membership `ACTIVE` + permission + `DossierAccessGrant ACTIVE` + même Workspace + statut Dossier compatible ; l'Owner dispose d'un périmètre Dossier implicite sans grant individuel ;
- aucun quota de stockage dur n'est défini par Dossier : la capacité appartient au Workspace ;
- un Dossier `DELETED` n'est pas purgé automatiquement dans M-001 ; sa purge physique reste différée ;
- la politique métier de corbeille des Fiches techniques est Workspace-scoped : 30 jours par défaut, configurable de 1 à 90 jours par l'Owner, échéance figée à la suppression.

### 2.2 Référentiel Produit

**État : CONTRAT EXISTANT CONSERVÉ — corpus professionnel v9 implémenté, sans changement des invariants de calcul M-002**

Contrat canonique :

```text
docs/m002/M-002-FINAL-CONTRACT.md
```

Décisions finales :

- `ProductVariant` conserve son nom technique mais joue le rôle métier de Référence Produit exploitable ;
- nom métier persistant et unique par normalisation ;
- Conservation obligatoire ;
- unité de référence obligatoire ;
- libellés singulier/pluriel obligatoires pour les Références `UNIT`, sans effet sur l'identité ni les calculs ;
- Catégorie facultative ;
- `foodRange` / Gammes conservés côté backend pour compatibilité et évolution future, mais non exposés par le frontend actif ;
- suppression de `usageType` du contrat actif ;
- état/transformation facultatif ;
- dimensions avancées facultatives ;
- `WorkspaceProduct` présenté comme Favori ;
- liste Workspace `Produit | Conservation | Actions` ;
- seed actif sur la branche : `m002-reference-v9`, 16 catégories, 381 Produits et 488 Références Produit ;
- v9 conserve exactement les identités v8 et nomme les 64 unités de recette dénombrables ;
- migration de réconciliation v1-v8 → v9, sans suppression physique des données utilisateur ;
- migration additionnelle fail-closed ;
- import dédupliqué par nom exact de Référence ;
- frontière stricte M-002 / M-003 maintenue.

La dépendance générique Core de navigation Platform est résolue par le commit post-tag `6581e573c6a6885790b23fe502bd34d8199ea6ba`. Elle est intégrée sur la branche Core-update dédiée et devient effective sur `main` après PR, merge et Core Gate post-merge du BLOC A.

Décision de clôture du 2026-09-25 : le contrat M-002 reste l'autorité. Les
audits Produit des 2026-10-03 et 2026-10-06 ont validé des enrichissements
sans refonte du modèle : la séparation `CanonicalProduct / ProductVariant`
est conservée, M-003 reste propriétaire des données commerciales et le v9
ajoute seulement la sémantique d'affichage des Références `UNIT`.
L'implémentation reste sur une branche et une PR uniques jusqu'à validation
locale et visuelle.

### 2.3 Fournisseurs, articles, conditionnements et tarifs

**État : CLÔTURÉ — PR #22 fusionnée le 2026-09-28 ; Core Gates #132 et #133 vertes**

Source canonique :

~~~text
docs/m003/M-003-FINAL-CONTRACT.md
~~~

Décisions établies :

- Produit / Fournisseur / Article restent des concepts distincts ;
- Fournisseurs et catalogues possèdent les portées `GLOBAL_SHARED` ou `WORKSPACE_PRIVATE` ;
- un import utilisateur de catalogue est privé à son Workspace par défaut et ne devient jamais global automatiquement ;
- un catalogue Workspace est réutilisable par plusieurs Dossiers sans duplication ;
- l'identité baseline d'un Article est `Fournisseur + référence fournisseur` ;
- une ligne sans référence exploitable ne crée pas automatiquement un Article ;
- les Articles suivent `ACTIVE / ARCHIVED` et peuvent conserver un lien `replacedBy` ;
- conditionnements structurés et prix normalisés lorsque les données sont suffisantes ;
- conditionnement V1 plat à un niveau arithmétique ; le libellé fournisseur conserve les niveaux commerciaux supplémentaires ;
- éditions de catalogues historisées ; nouvelle édition ≠ écrasement de l'ancienne ;
- réimport de la même édition = réconciliation sans duplication ;
- Tarifs fournisseur de référence historisés par édition ;
- Tarif négocié strictement Dossier, avec refus baseline des périodes actives chevauchantes pour le même Article ;
- Prix facturé strictement Dossier, explicitement validé avant usage automatique ;
- fraîcheur baseline du Prix facturé = 12 mois calendaires depuis la date de facture ;
- politique Workspace : Tarif fournisseur / Tarif négocié / Prix facturé ;
- fallback strictement dans le même Dossier ;
- backend seule autorité de résolution du Prix applicable ;
- sélection automatique d'Article possible uniquement lorsqu'un seul Article est exploitable ;
- jamais de sélection automatique de l'Article le moins cher ;
- référence favorite = Article fournisseur précis × Dossier ;
- mode manuel retenu pour démarrer ; suggestion/ajout automatique pourront être activés avec un seuil effectif configuré ;
- imports structurés CSV/XLS/XLSX ; PDF libre/OCR différés ;
- une ligne catalogue ambiguë ne crée jamais silencieusement une Référence Produit ;
- gouvernance `GLOBAL_SHARED` sous autorité Application Global ;
- Workspace Owner = toutes les permissions métier M-003 dans son Workspace, sans devenir administrateur global ;
- import `WORKSPACE_PRIVATE` = capability commerciale dédiée et payante dans la baseline V1.

Les paramètres explicitement qualifiés de baseline V1 restent révisables après tests métier réels sans bloquer l'implémentation. Les invariants de tenancy, d'isolation Dossier et d'historisation restent structurants.

Checkpoint UX/QA du 2026-09-28 :

- les listes Fournisseurs / Articles / Catalogues réutilisent le `DataTable` partagé et le `DataPagination` partagé dans le même pattern de conteneur que Dossiers ;
- aucun style structurel de tableau spécifique M-003 n'est introduit ;
- le filtre Fournisseurs démarre sur `Tous` afin d'exposer immédiatement les actifs et archivés réactivables ;
- l'onglet Catalogues reste consultable avec le droit de lecture ; seule l'action d'import dépend de `supplier_catalog_import` ;
- le bouton d'import est masqué lorsque la capability n'est pas active ;
- les libellés utilisateur restent en français (« espace de travail », « Origine »).

Clôture M-003 :

~~~text
release:check local : vert
QA visuelle : validée
PR #22 : fusionnée
Core Gate PR #132 : success
merge : 2044dbf3c13473d926cfaa8b86f5eb9dbbf259ac
Core Gate post-merge #133 : success
~~~

Les retours des bêta-testeurs peuvent déclencher des retouches UX ultérieures sans bloquer M-004 ni rouvrir le contrat M-003, sauf changement d'invariant métier.

Extension post-clôture validée le 2026-09-29 pendant la QA M-004 : ajout d'un Prix indicatif interne, historisé, porté par Workspace ou Dossier et utilisable comme dernier recours lorsqu'aucune source commerciale M-003 n'est exploitable. Cette extension ne modifie ni l'isolation Dossier des Tarifs négociés/Prix facturés, ni la priorité des sources commerciales, ni la frontière Core/Produit.

Checkpoint UX du 2026-09-30 : le parcours Produit ↔ Fournisseur doit rester unique. Les écrans Produit et Fournisseurs peuvent ouvrir le même workflow M-003 avec un contexte prérempli, mais aucune donnée commerciale ni aucun formulaire parallèle ne doit être créé. Le drawer Produit expose les Favoris actifs, le Prix indicatif Workspace et les Articles/conditionnements accessibles sans sélectionner automatiquement un fournisseur.

Extension du 2026-10-06 : les Workspaces peuvent consulter en lecture seule
les Prix repères globaux, leur conditionnement et leur provenance pour toutes
les Références visibles, sans dépendre des Favoris. La Platform peut maintenir
un prix `PACKAGE` avec conditionnement plat et provenance structurée. Aucun
montant ni fournisseur n'est inventé dans le bootstrap existant.

Le **corpus d'aide métier** est volontairement traité dans un bloc séparé après stabilisation de ces parcours. Il devra utiliser le point d'extension Core `APPLICATION_HELP_MODULES` et conserver le filtrage serveur selon permissions, capabilities et contexte ; aucune logique d'aide parallèle ne doit être créée.

Le lot UX M-002 `GMS-UX-002` a été traité et fusionné avant l'ouverture de M-004. M-004 peut donc poursuivre sa conception sur le `main` vérifié au commit `b479b217815fad885f233e98b8f3145656641352`.


### 2.4 Fiches techniques

**État : CLÔTURÉ HORS EXPORTS ET DIFFUSION — stabilisation UX fusionnée et Core Gate post-merge verte le 2026-10-02**

Source canonique :

~~~text
docs/m004/M-004-FINAL-CONTRACT.md
~~~

Décisions fermées :

- une Fiche est une identité durable appartenant à un Workspace et un Dossier ;
- 0 ou 1 brouillon de travail, 0 ou 1 état validé courant, historique automatique immuable ;
- toute ligne repose sur une Référence Produit M-002 ;
- quantité nette saisie, quantité brute calculée depuis le rendement M-002 ;
- aucune surcharge locale du rendement en V1 ;
- conversions uniquement entre unités physiquement compatibles ;
- sections Ingrédients et Économat séparées ;
- M-003 reste l'unique autorité de résolution Article / Prix applicable ;
- 0 Article peut désormais rester valorisable par Prix indicatif M-003 ; sinon non résolu ;
- 1 Article = résolution automatique possible, N = choix humain obligatoire ;
- aucun Article le moins cher sélectionné automatiquement ;
- absence de Prix applicable distincte de zéro ;
- Coût matière HT + Économat HT = Coût de fabrication HT total ;
- l'ancien champ ambigu Portions reste supprimé ; `productionQuantity` représente les pièces fabriquées et `portionsPerProductionUnit` le nombre de portions par pièce ;
- `totalPortions = productionQuantity × portionsPerProductionUnit` est dérivé par le backend ;
- la base de vente est explicitement `PIECE | PORTION` ;
- CM/Pce et CF/Pce sont calculés sur les pièces ; CMU et CFU sur les portions ;
- coût de fabrication, TVA, marge cible, Prix de vente calculé, Prix conseillé, Prix retenu et marge réelle sont historisés selon la base de vente ;
- arrondi V1 du Prix conseillé = multiple de 0,50 € immédiatement supérieur ou égal ;
- le Prix retenu peut être inférieur au Prix conseillé mais jamais au plancher économique de la base de vente ;
- le brouillon est recalculé automatiquement après sauvegarde ; un changement tarifaire détecté à la validation actualise le brouillon puis exige une nouvelle confirmation ;
- copie inter-Dossier sans aucune donnée financière source ;
- marge cible d'une copie initialisée depuis le Dossier cible ;
- archivage, corbeille, restauration et purge portent sur la Fiche entière ;
- une Fiche en corbeille continue de consommer sa capacité ;
- 1 identité Fiche = 1 unité de quota, indépendamment du brouillon et de l'historique ;
- seule la purge définitive libère une unité ;
- seuil commercial Free définitif à décider ; une limite temporaire de développement, par exemple 10 Fiches, peut être configurée ;
- RBAC M-004 validé dans le contrat canonique ;
- contrôle de concurrence optimiste obligatoire ;
- détails UX ajustables après QA visuelle sans modifier les invariants fonctionnels ;
- poste de travail stabilisé autour d'un cockpit/header compact, groupes Production/Vente, six garde-fous économiques (CF HT, CMU HT, CFU HT, Prix retenu TTC, %MR, Écart € vs cible) et deux drawers mutuellement exclusifs Analyse / Infos dossier ;
- historique déplacé dans Analyse > Historique ; nom/description et commentaire de validation utilisent des dialogues dédiés.

Périmètre produit V1 :

~~~text
Bloc Fiche technique
→ implémentation + tests + QA visuelle + stabilisation

puis bloc séparé Exports et diffusion V1
→ CSV
→ XLSX
→ PDF
→ impression
→ envoi e-mail
~~~

Les autres exports restent différés à V2.

Corbeille M-004 :

~~~text
WorkspaceBusinessSettings.trashRetentionDays
→ 30 jours par défaut
→ 1 à 90 jours
→ purgeScheduledAt figé à la suppression
→ job métier global et idempotent
→ aucun changement Core
~~~

Clôture technique confirmée le 2026-09-30 :

- backend M-004, migrations et job de purge implémentés ;
- frontend M-004 implémenté avec RTK Query et routes Workspace/Dossier ;
- séparation RBAC `technical-sheet:update` / `technical-sheet:sourcing:manage` implémentée ;
- quota `technical_sheets` et capacité Dashboard implémentés ;
- corpus Playwright final : 22/22 scénarios verts localement, dont les cinq parcours critiques M-004 ;
- lint, tests globaux et build confirmés verts localement ;
- PR #25 fusionnée dans `main` ;
- Core Gate PR #145 : success ;
- merge : `588612ba987c4a91951d4939231f9f44881c50d8` ;
- Core Gate post-merge #146 : success.

Stabilisation finale confirmée le 2026-10-02 :

- PR #34 `fix(m004): finalize technical sheet valuation UX` fusionnée dans `main` ;
- merge : `0562ff94506b7715fd848b89691c0a001b1cadd7` ;
- Core Gate PR #177 : success ;
- Core Gate post-merge #178 : échec isolé dans le bootstrap E2E M-001, avant le lifecycle métier testé ;
- PR #35 `test(m001): stabilize dossier E2E session bootstrap` fusionnée sans modification des règles métier M-001 ;
- merge : `ca222ff0a4ba8759ffb35109616456dcb2f51f71` ;
- Core Gate PR #179 : success ;
- Core Gate post-merge #180 : success.

Les exports et la diffusion restent un bloc V1 séparé et ne sont pas implicitement ouverts par cette clôture. La priorité suivante est l'audit/cadrage des Produits globaux ; le bloc Exports et diffusion reprend ensuite.


### 2.5 Fiches process

**État : DIFFÉRÉ — non bloquant pour M-001**

Le domaine reste prévu mais son cadrage détaillé n'est plus une condition préalable au démarrage.

Il sera cadré avant son implémentation : relation avec la Fiche technique, étapes, durées, points critiques, critères d'acceptabilité, versionnement et données communes/séparées.


### 2.6 Utilisateurs, RBAC, capabilities et quotas

**État : baseline RBAC validée — détails techniques par module**

Décisions établies :

- réutilisation du RBAC Workspace du Core ;
- les rôles système Core restent génériques et inchangés dans leur définition ;
- les permissions et profils métier GMS appartiennent au produit et utilisent la primitive générique Role/Permission du Core ;
- un WorkspaceMember porte un seul Role ;
- un rôle métier personnalisé combine plusieurs responsabilités par ses permissions ;
- Workspace Owner = autorité métier complète du produit + tous les dossiers, sans devenir un rôle métier GMS ;
- PlatformRole sans accès implicite aux données métier Workspace ;
- rôle et périmètre dossier séparés ;
- invitation Core puis affectation Dossier après acceptation ;
- un membre peut appartenir au Workspace avec zéro Dossier ;
- changement de Role et changement de périmètre indépendants ;
- l'état du Dossier participe à l'autorisation effective ;
- baseline des profils Acheteur, Économe, Responsable FT, Contributeur FT et Lecteur validée ;
- Économe : validation des Prix facturés, revues et correction économique, sans validation FT par défaut ;
- Contributeur/Lecteur : Prix applicable nécessaire sans historique commercial détaillé ;
- administration du Dossier et affectations Owner-only par défaut ;
- les profils Acheteur, Économe, Responsable FT, Contributeur FT et Lecteur métier sont des presets produit destinés à créer des Roles Workspace personnalisés, jamais des rôles système Core ;
- leur provisionnement final est progressif et intervient lorsque les permissions des modules concernés sont suffisamment cadrées ; M-001 n'invente pas les permissions M-002/M-003/M-004 ;
- le Workspace Owner reste le rôle système générique Core enrichi, dans le produit dérivé, par les permissions métier déclarées via le point d'extension RBAC applicatif ;
- Atelier d'optimisation = capability payante distincte du RBAC.

À finaliser au cadrage des modules :

- permissions techniques M-001 validées ;
- matrice d'autorisation M-001 validée ;
- API REST M-001 validée ;
- lifecycle Dossier et effets sur les affectations validés ;
- Core 1.1.0 fournit désormais le point d'extension transactionnel `WorkspaceMember → REMOVED` requis par M-001 ;
- rattachement commercial exact de l'optimisation avant M-005 ;
- besoin quantitatif désormais démontré pour les DRAFTS et Fiches techniques VALIDATED : métriques/quota métier à fermer en M-004 ;
- conserver `storage_bytes` pour les fichiers persistants Core, sans l'utiliser comme mesure des ressources MongoDB métier.

### 2.7 Paramètres métier

**État : architecture fonctionnelle validée — ensemble de paramètres à poursuivre**

Décisions établies :

~~~text
standard
+ configuré éventuel
→ effectif calculé par le backend
~~~

- panneau métier visible et comportements standards immédiatement utilisables ;
- Free = standards, personnalisation selon capabilities ;
- Trial = standards + personnalisation facultative pour tester l'offre ;
- Payant = personnalisation autorisée par le plan ;
- downgrade sans destruction automatique des valeurs configurées ;
- aucune valeur métier de remplacement codée en dur dans le frontend ;
- préférences d'affichage séparées de la configuration métier ;
- Dashboard Core + widgets métier ;
- tous les widgets accessibles sont visibles par défaut avec le Core v1.1.0 (`hiddenWidgetIds = []`) ;
- les widgets configurables peuvent ensuite être masqués/réaffichés par utilisateur ;
- les widgets non configurables restent visibles ;
- masquer un KPI ne désactive jamais une règle métier ou une alerte bloquante.

Paramètres métier déjà identifiés : politique de prix, fraîcheur factures, favoris/fréquence, cycle de vie des fiches, TVA standard, Objectif de marge, coefficient, arrondis et contraintes de l'optimiseur lorsque leur portée sera validée.


### 2.8 Intégrations et contraintes réglementaires

**État : VALIDÉ pour les fondations de M-001 — autres obligations à cadrer au module concerné**

Décision M-001 : les éventuelles coordonnées nominatives du responsable / interlocuteur, email ou téléphone constituent des données personnelles lorsqu'elles identifient une personne. Leur collecte doit donc rester minimisée, protégée par les contrôles d'accès et non rendue obligatoire sans nécessité fonctionnelle démontrée. Aucune contrainte réglementaire vérifiée n'impose un champ métier obligatoire supplémentaire au Dossier.

La conformité globale et la rétention restent suivies par D-003 / D-006 avant production.

À étudier au module concerné :

- autocomplétion ville / code postal / adresse via une source publique actuelle, avec la Géoplateforme / BAN comme candidate à confirmer ;
- import catalogues/mercuriales CSV/XLS/XLSX ;
- fichiers / images ;
- export PDF / CSV ;
- e-mail, notamment envoi de documents à l'adresse configurée du dossier ;
- OCR ;
- assistance IA ;
- règles fiscales réellement applicables ;
- règles alimentaires/hygiène réellement prises en charge ;
- contraintes de rétention.

Aucune obligation réglementaire ne doit être inventée.


### 2.9 Périmètre V1 / hors V1

**État : VALIDÉ pour l'ordre initial des modules**

Ordre initial recommandé :

```text
M-001 Dossiers / Magasins + affectations
M-002 Référentiel Produits
M-003 Fournisseurs + Articles + prix/catalogues
M-004 Fiches techniques + valorisation
M-005 Atelier d'optimisation Premium
M-006+ Process / imports / OCR / extensions
```

### 2.9 Données initiales / bootstrap

**État : stratégie validée**

```text
M-001
→ aucune migration historique
→ aucun seed Dossier
→ Owner suffisant pour les premiers tests métier

M-002
→ bootstrap Produits canoniques initiaux

M-003
→ bootstrap Fournisseurs / Articles / catalogues de référence

Presets de rôles métier
→ propriété du produit
→ provisionnement progressif selon les permissions effectivement cadrées
```

Les données de bootstrap sont versionnées, idempotentes, traçables et respectent les mêmes invariants que les flux métier normaux.

---

Ne bloquent plus M-001 :

- marge semi-nette ;
- Fiche process ;
- OCR / IA ;
- imports avancés ;
- paramètres fins de l'optimiseur ;
- purge physique ;
- analyses avancées.

Gate globale avant M-001 : **VALIDÉE le 2026-09-20**.

Décisions fermées :

- nom du Dossier comme seul champ métier obligatoire à la création ;
- affectations persistées via `DossierAccessGrant` ;
- contraintes réglementaires structurantes de M-001 vérifiées ;
- cohérence documentaire revue ;
- cadrage transversal déclaré VALIDÉ.


## 3. Phase 2 — Validation documentaire globale

**Statut : VALIDÉ — 2026-09-20**

Les fondations transversales nécessaires à M-001 sont désormais stables. La validation globale n'impose pas de spécifier les fonctionnalités futures non nécessaires au module suivant.

Gate franchie :

```text
cadrage global validé
→ cadrage M-001 autorisé
```

La dette existante D-003 / D-006 reste suffisante pour suivre conformité et rétention ; aucune nouvelle dette spécifique à M-001 n'est créée à ce stade.

Aucun modèle métier Mongoose n'est autorisé avant validation détaillée de M-001.


## 4. Phase 3 — Cadrage M-001

**Statut : VALIDÉ — cadrage détaillé clôturé le 2026-09-21**

Module :

```text
M-001 — Dossiers / Magasins + affectations
```

Ce module dépend directement du Workspace Core, crée la frontière métier magasin et prépare M-002/M-003 sans dépendre encore des Fiches techniques.

Décisions M-001 déjà validées :

- `1 Dossier = 1 magasin` ;
- seul le nom du Dossier est obligatoire à la création ;
- l'adresse/localisation et son autocomplétion font partie de l'UX M-001 mais restent facultatives et non bloquantes ;
- le nom du Dossier n'est pas une identité unique suffisante ; la localisation peut aider à distinguer des magasins homonymes ;
- le Role Workspace répond à « quoi ? » et `DossierAccessGrant` à « où ? » ;
- aucune affectation magasin n'est préparée dans `WorkspaceInvitation` ;
- l'invitation Core exige `email + roleId`, puis l'acceptation crée/réactive le `WorkspaceMember` ;
- un `WorkspaceMember` peut rester actif avec zéro Dossier ;
- le Workspace Owner affecte ensuite explicitement les magasins ;
- le Workspace Owner dispose implicitement de tous les Dossiers et ne nécessite aucun grant individuel ;
- une suspension du membership conserve les grants, qui deviennent inopérants tant que le membership n'est pas `ACTIVE` ;
- un retrait `REMOVED` doit révoquer les grants métier afin qu'une future réinvitation ne restaure jamais silencieusement les anciens magasins.

Prérequis Core résolu par Core 1.1.0 :

```text
WorkspaceMember → REMOVED
→ lifecycle applicatif onMemberRemoved
→ session MongoDB Core transmise
→ M-001 révoque ses DossierAccessGrant dans cette transaction
→ erreur métier = rollback global
```

Les permissions exactes et la matrice technique d'autorisation M-001 sont désormais validées.

Le contrat API REST M-001, le contrat d'ordre des middlewares / frontière middleware-service, le contrat de validation Zod / métadonnées backend-driven, l'activité métier produit, le lifecycle Dossier, le contrat UX liste/drawer/Dialog/page Dossier, l'autocomplétion d'adresse, la stratégie de bootstrap, la stratégie de tests, les critères d'acceptation et l'ordre d'implémentation sont désormais validés. Le cadrage détaillé M-001 est complet.

## 5. Phase 4 — Implémentation métier

**Statut : M-001 CLÔTURÉ TECHNIQUEMENT — PR #10 fusionnée et Core Gate post-merge validée**

Branche fonctionnelle unique :

```text
feature/m001-dossiers-access
```

Validation finale du lot M-001 le 2026-09-22 :

```text
npm run release:check → vert
Playwright            → 11/11 verts
head final PR #10     → 91bab9f80bce3b4095f5c806bc45e166729f33b8
Core Gate #104        → success
merge PR #10          → 8a10a859f567d7f038e5fc5e7b436580d3471b89
Core Gate #105        → success selon le résultat signalé par l'utilisateur
```

Le backend, le frontend, l'autocomplétion, la gestion des affectations, le lifecycle, le Dashboard métier et les quatre E2E M-001 sont implémentés.

Workflow complet de sortie :

```text
branche
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E métier
→ release:check complet
→ pull local VS Code
→ validation fonctionnelle + visuelle utilisateur
→ corrections éventuelles
→ PR
→ Core Gate PR
→ merge
→ Core Gate post-merge
→ documentation finale
```

La gate automatisée complète et la Core Gate sur le head final sont obligatoires avant fusion. Les ajustements purement visuels ou ergonomiques non bloquants découverts après merge peuvent être traités dans un lot UX M-001 post-merge, sans rouvrir le cadrage fonctionnel ni l'architecture.

### Granularité Git / PR

Règle de travail validée :

> Une PR correspond à un lot fonctionnel cohérent et vérifiable, pas à une couche technique isolée.

Ainsi :

```text
modèle + validation Zod
→ commits possibles
→ pas une PR autonome par défaut

capacité métier complète
→ backend
→ permissions
→ frontend
→ tests
→ documentation
→ une PR cohérente
```

Les PR ne doivent ni être des micro-lots techniques, ni devenir des regroupements de fonctionnalités indépendantes.

---

## 6. Extensions à préserver sans les développer prématurément

Le domaine doit rester compatible avec :

- historique graphique de prix ;
- alertes sur coûts / marges / volatilité ;
- analyse d'impact d'un produit sur les fiches ;
- comparaison fournisseurs ;
- import automatisé de mercuriales ;
- OCR de facture / catalogue ;
- reverse recipe ;
- optimisation de marge par IA ;
- analyse transversale des fiches ;
- assistant de rédaction process ;
- génération d'infographie process ;
- recherche globale ;
- rappels / notifications ;
- exports et partage avancés.

Principe :

```text
compatibilité structurelle
≠
développement immédiat
```

---



## 7. M-005 fusionné — prochaine étape

**Statut au 2026-10-08 :** implémentation M-005 fusionnée sur `main` par la [PR #39](https://github.com/greg44500/saas-fiches-techniques-gms/pull/39), commit de merge `5d0a3d9692343d60ccfec0e46759383d595680dd`. Le comparatif GitHub confirme que ce commit correspond au `main` examiné lors de cette mise à jour.

Contrats canoniques :

~~~text
docs/m005/M-005-FINAL-CONTRACT.md
docs/m005/M-005-TECHNICAL-DESIGN.md
~~~

M-005 fournit un Atelier d'optimisation économique, des simulations MANUAL/AUTO non persistées avant « Appliquer au brouillon », des contraintes et verrouillages par ingrédient, des alternatives Produit et Article accessibles, un profil à barres indépendantes par ingrédient et un indicateur économique global. Le backend réutilise les calculs M-004 et les prix applicables M-003 ; l'application au DRAFT est transactionnelle, contrôlée par révision et fingerprint. Les validations antérieures restent immuables.

**Preuves et réserves :** la fusion est vérifiée. Le résultat de la Core Gate post-merge n'a pas été établi par les données accessibles lors de cette révision documentaire ; il reste à contrôler. Aucun bilan « tous les tests verts » n'est déduit de la seule fusion. Ne pas rouvrir M-005 sans anomalie démontrée.

**Prochaine priorité : audit des exports et de la diffusion V1**, sans préjuger du numéro du prochain module. Inventorier le CSV, XLSX, PDF, l'impression et l'envoi e-mail, y compris leurs API, parcours UI, stockage, permissions, capabilities, quotas et tests. Réutiliser les exports déjà présents dans M-004 ; définir les écarts avant le cadrage et la validation d'un unique lot cohérent. Les Fiches process constituent le chantier métier candidat suivant, à cadrer séparément.
