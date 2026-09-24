# SAAS-FICHES-TECHNIQUES-GMS — Roadmap produit

**Statut :** VALIDÉ — M-001 clôturé — M-002 recadré après QA, implémentation d'ajustement à reprendre  
**Dernière mise à jour :** 2026-09-23

> Cette roadmap décrit l'ordre de cadrage et de livraison.  
> Elle ne constitue pas encore un engagement de périmètre V1 ni un calendrier daté.

---

## 1. Phase 0 — Bootstrap technique

**Statut : VALIDÉ**

- dérivation depuis `saas-core-api` ;
- Core `v1.2.0` intégré au commit `c428fbec1edfa21a8860fcf8283072e45719832b` ;
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

- seul le nom du Dossier / magasin est obligatoire en saisie métier à la création ;
- enseigne, localisation, email documents, téléphone et responsable / interlocuteur restent facultatifs ;
- l'autocomplétion d'adresse/localisation utilise en V1 la Géoplateforme / IGN, reste facultative et ne bloque jamais la création ou la modification d'un Dossier ; aucun payload fournisseur, identifiant BAN ou coordonnée n'est persisté en M-001 ;
- les affectations sont portées par une relation métier dédiée `DossierAccessGrant`, distincte du `WorkspaceMember` Core ;
- l'invitation Core reste limitée à `email + roleId` ; aucun magasin n'est préparé dans l'invitation ; après acceptation et création/réactivation du `WorkspaceMember`, le Workspace Owner affecte explicitement zéro, un ou plusieurs Dossiers ;
- les permissions M-001 validées sont `dossier:read`, `dossier:create`, `dossier:update`, `dossier:lifecycle:update`, `dossier:access:read` et `dossier:access:manage` ;
- pour un non-owner, l'autorisation effective exige membership `ACTIVE` + permission + `DossierAccessGrant ACTIVE` + même Workspace + statut Dossier compatible ; l'Owner dispose d'un périmètre Dossier implicite sans grant individuel ;
- aucun quota de stockage dur n'est défini par Dossier : la capacité appartient au Workspace ;
- un Dossier `DELETED` n'est pas purgé automatiquement dans M-001 ; sa purge physique reste différée ;
- la politique métier de corbeille est validée transversalement pour les futures ressources purgeables : 30 jours par défaut, configurable de 7 à 90 jours lorsque la personnalisation est autorisée.

### 2.2 Référentiel Produit

**État : recadrage QA validé — adaptation du modèle/UX/seed à implémenter avant fusion M-002**

Le socle déjà développé reste conservé : `CanonicalProduct`, `ProductVariety`, `ProductCharacteristic`, `ProductVariant`, `WorkspaceProduct`, contributions gouvernées, recherche/déduplication, imports et autorisation Application Global.

Le recadrage QA du 2026-09-24 ajoute/rectifie :

- `CUT` comme Caractéristique `Pièce / découpe` ;
- possibilité pour un `CanonicalProduct` d'exister sans variante artificielle ;
- Gammes limitées à 1..5 ;
- PAI/PAE séparé de la Gamme via une classification d'usage de variante ;
- signature de variante enrichie par cette classification ;
- seed `m002-reference-v3` à créer, v1/v2 restant immuables ;
- migration explicite/fail-closed des anciennes variantes Gamme 6 ;
- recherche utilisateur sans vocabulaire `alias` ;
- liste principale groupée par Produit avec pagination par Produit ;
- accès visible à la gouvernance globale depuis la navigation Platform pour les gouverneurs explicitement habilités.

Dépendance générique Core démontrée : point d'extension de navigation Platform. Ce lot doit être traité dans `saas-core-api` en une seule PR, sans version/tag/release, puis intégré au produit par SHA exact.

Contrat canonique : `docs/m002/M-002-RECARDAGE-QA.md`.

À fermer avant fusion M-002 : intégration du commit Core, modèle/migration/seed v3, backend/frontend, tests, E2E, QA visuelle, documentation finale, une seule PR M-002.

### 2.3 Fournisseurs, articles, conditionnements et tarifs

**État : très avancé — moteur de résolution, fraîcheur et références magasin cadrés**

Décisions établies :

- Produit / Fournisseur / Article séparés ;
- plusieurs Articles possibles pour un même Produit ;
- conditionnements structurés ;
- tarifs de référence fournisseur historisés par édition ;
- possibilité de catalogues fournisseur préchargés ;
- Tarif négocié strictement magasin ;
- Prix facturé validé et rattaché au magasin ;
- fraîcheur calculée depuis la date de facture ;
- comportement standard de fraîcheur : un an, convention technique exacte à fixer ;
- politique Workspace : Tarif fournisseur / Tarif négocié / Prix facturé ;
- fallback strictement dans le même magasin ;
- aucun prix d'un autre magasin comme secours ;
- backend seule autorité de résolution ;
- sélection automatique possible uniquement lorsqu'un seul Article est exploitable ;
- jamais de sélection automatique du moins cher ;
- références favorites = Articles fournisseur précis propres au magasin ;
- références fréquemment utilisées = usage calculé sur fiches VALIDÉES distinctes ;
- modes manuel / suggestion / ajout automatique paramétrables ;
- carte d'identité professionnelle Produit/Article ;
- imports CSV/XLS/XLSX prévus comme extension structurée sans obligation d'IA ;
- une ligne de catalogue importée ne crée jamais automatiquement un Produit canonique ;
- les éditions de catalogue peuvent être `GLOBAL_SHARED` ou `WORKSPACE_PRIVATE` ;
- un import Workspace est privé par défaut ; aucune publication globale automatique ;
- une édition globale peut être référencée par plusieurs Workspaces sans duplication de ses lignes ;
- les mappings Fournisseur + référence Article déjà validés sont réutilisés dans les éditions suivantes ;
- une ligne peut rester non rapprochée tant qu'aucune correspondance Produit fiable n'est validée ;
- l'identité Fournisseur associée aux catalogues globaux doit être réutilisable ; le modèle exact global/Workspace des Fournisseurs reste à fermer en M-003 ;
- chaque édition/catalogue importé doit être rattaché explicitement à un Fournisseur identifié et conserver sa propre identité/version ;
- l'interface M-003 doit permettre de filtrer par Fournisseur et de sélectionner un catalogue/une édition précise, sans déduire l'origine d'un Produit à partir de son seul libellé ;
- un import de type SYSCO doit donc être identifiable comme catalogue SYSCO avant que ses Articles/références puissent être proposés dans les sélecteurs ;
- IA/OCR uniquement comme assistance future sous contrôle métier.

À finaliser :

- valeur standard exacte du seuil de fréquence ;
- règles de comptage des fiches archivées ;
- données minimales définitives Fournisseur ;
- lifecycle des Articles remplacés/archivés ;
- détails finaux des revues tarifaires ;
- convention technique exacte de la durée de fraîcheur.



### 2.4 Fiches techniques

**État : socle économique suffisamment cadré pour ne plus bloquer M-001**

Décisions établies :

- quantité nette saisie, brute calculée ;
- coûts HT ;
- CM + Économat ;
- version DRAFT / VALIDATED / ARCHIVED ;
- version VALIDATED immuable ;
- revalorisation explicite ;
- snapshot économique historique ;
- validation backend complète ;
- absence de prix distincte de zéro ;
- copie inter-magasin sans prix ni historique source ;
- TVA distincte des coûts HT ;
- Objectif de marge = `(PV HT - coût fabrication HT) / PV HT` ;
- coefficient = `1 / (1 - objectif de marge)` ;
- Prix théorique HT = `Coût fabrication HT × coefficient` ;
- Prix conseillé obtenu après application de la règle d'arrondi Workspace au Prix théorique TTC ;
- Prix définitif choisi humainement ;
- invariant `Prix définitif TTC >= Prix conseillé TTC >= Prix théorique TTC` ;
- marge réelle % et € calculées depuis le Prix définitif ;
- règle standard d'arrondi = multiple de 0,50 € immédiatement supérieur ou égal ;
- règles d'arrondi personnalisables par stratégies structurées ;
- marge semi-nette explicitement différée et non bloquante ;
- Atelier d'optimisation Premium cadré fonctionnellement ;
- un DRAFT actif n'est jamais purgé pour simple ancienneté ;
- un DRAFT explicitement supprimé relève de la corbeille métier du Workspace ;
- le nombre de DRAFTS actifs est destiné à être limité commercialement par un quota métier de plan ;
- le nombre de Fiches techniques VALIDATED est destiné à être limité par un quota métier distinct ;
- ces quotas sont des compteurs de ressources métier et ne réutilisent pas `storage_bytes` ;
- les seuils Free/Premium, clés finales et règles de comptage des ARCHIVED seront fermés en M-004 ;
- une version VALIDATED n'est pas purgée automatiquement par âge ;
- CSV/XLS(X) sont générés à la demande sans conservation durable ;
- le PDF est généré uniquement comme pièce jointe temporaire lors d'un envoi de document par e-mail et n'est pas persisté.

À cadrer avant les modules concernés, pas avant M-001 :

- types/motifs exacts de versions avant M-004 ;
- définition de la marge semi-nette lorsqu'elle sera disponible ;
- paramètres mathématiques fins et garde-fous de l'optimiseur avant M-005 ;
- ensemble complet des stratégies d'arrondi ;
- contrat technique de corbeille/restauration/purge des DRAFTS avant M-004 ;
- éventuelle suppression définitive des VALIDATED et contraintes réglementaires avant implémentation.


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
- Économe : validation des Prix facturés, revues et revalorisation, sans validation FT par défaut ;
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



## 7. Prochaine étape immédiate

M-002 est implémenté sur `feature/m002-catalogue-produits`. La priorité n'est plus de recadrer son modèle mais de prouver le lot :

```text
pull du HEAD M-002
→ migration M-002 sur la base de développement
→ tests backend ciblés
→ tests backend globaux en tenant compte du problème connu de parallélisme
→ tests frontend
→ lint/build
→ E2E M-002
→ validation visuelle utilisateur
→ documentation finale si un écart est démontré
→ UNE PR M-002
→ UNE fusion
```

Après fermeture de M-002, le cadrage suivant est M-003. Le premier point à verrouiller sera l'identité Fournisseur/Catalogue : un Produit sélectionné depuis un catalogue doit conserver une origine Fournisseur et une édition/catalogue explicites, avec filtres et liste de catalogues identifiés.

Ne pas rouvrir M-001 sauf régression démontrée. Les ajustements visuels Dossier déjà identifiés restent un lot UX séparé après la priorité M-002.
`npm run format:check` reste un sujet Core/tooling séparé s'il est toujours non conforme sur des fichiers Core inchangés.

La marge semi-nette, la Fiche process, l'historique complet des invitations Core, l'OCR/IA et l'optimiseur détaillé restent différés selon leur module.
