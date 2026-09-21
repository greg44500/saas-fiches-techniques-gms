# SAAS-FICHES-TECHNIQUES-GMS — Roadmap produit

**Statut :** VALIDÉ — cadrage global clôturé, M-001 en cours de cadrage détaillé  
**Dernière mise à jour :** 2026-09-21

> Cette roadmap décrit l'ordre de cadrage et de livraison.  
> Elle ne constitue pas encore un engagement de périmètre V1 ni un calendrier daté.

---

## 1. Phase 0 — Bootstrap technique

**Statut : VALIDÉ**

- dérivation depuis `saas-core-api` ;
- Core `v1.1.0` intégré ;
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
- autocomplétion de localisation via une source publique fiable à confirmer techniquement ;
- lifecycle dossier `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
- suppression logique avant éventuelle purge physique ;
- suppression logique = coupure immédiate des accès métier et des ressources du dossier dans les flux normaux sans destruction automatique de l'historique ;
- restauration contrôlée vers un état non opérationnel, par défaut `PAUSED` ;
- référentiel Produit canonique partagé à l'échelle du SaaS, avec catalogue d'usage par Workspace sans duplication de l'identité Produit ;
- prix et conditions contextualisés par magasin ;
- accès multi-magasins = changement de contexte, jamais partage ou mélange des données locales ;
- invitation Workspace puis affectation séparée des magasins après acceptation ;
- Workspace Owner implicitement autorisé sur tous les dossiers ;
- drawer de consultation sans activation du contexte ;
- ouverture explicite du dossier pour le travail métier ;
- retour au Dashboard Workspace en un clic ;
- Dashboard Workspace comme surface globale de pilotage ;
- Sidebar métier recomposée via le point d'extension Core.

Décisions finales :

- seul le nom du Dossier / magasin est obligatoire en saisie métier à la création ;
- enseigne, localisation, email documents, téléphone et responsable / interlocuteur restent facultatifs ;
- l'autocomplétion d'adresse/localisation fait partie de l'UX M-001, reste facultative et ne bloque jamais la création d'un Dossier ; sa source technique publique fiable reste à choisir pendant M-001 ;
- les affectations sont portées par une relation métier dédiée `DossierAccessGrant`, distincte du `WorkspaceMember` Core ;
- l'invitation Core reste limitée à `email + roleId` ; aucun magasin n'est préparé dans l'invitation ; après acceptation et création/réactivation du `WorkspaceMember`, le Workspace Owner affecte explicitement zéro, un ou plusieurs Dossiers ;
- les permissions M-001 validées sont `dossier:read`, `dossier:create`, `dossier:update`, `dossier:lifecycle:update`, `dossier:access:read` et `dossier:access:manage` ;
- pour un non-owner, l'autorisation effective exige membership `ACTIVE` + permission + `DossierAccessGrant ACTIVE` + même Workspace + statut Dossier compatible ; l'Owner dispose d'un périmètre Dossier implicite sans grant individuel ;
- aucun quota de stockage dur n'est défini par Dossier : la capacité appartient au Workspace ;
- un Dossier `DELETED` n'est pas purgé automatiquement dans M-001 ; sa purge physique reste différée ;
- la politique métier de corbeille est validée transversalement pour les futures ressources purgeables : 30 jours par défaut, configurable de 7 à 90 jours lorsque la personnalisation est autorisée.

### 2.2 Catalogue Produit

**État : fondation révisée et validée — cadrage détaillé M-002 à poursuivre après M-001**

Décisions établies :

- l'identité Produit canonique est partagée à l'échelle du SaaS et n'est pas dupliquée par Workspace ;
- un Workspace construit son catalogue d'usage en référençant les Produits canoniques dont il a besoin ;
- les Dossiers utilisent le catalogue de leur Workspace sans copier l'identité Produit ;
- aucune donnée commerciale ou confidentielle tenant ne peut être stockée dans le Produit canonique ;
- les utilisateurs autorisés peuvent rechercher le référentiel partagé et rattacher un Produit existant au Workspace ;
- si aucun équivalent crédible n'existe, M-002 doit permettre de contribuer/créer une nouvelle identité canonique après contrôle de doublon ;
- la prévention des doublons ne repose pas uniquement sur la casse : normalisation, alias, singulier/pluriel et recherche de proximité doivent participer au contrôle ;
- forme, état/transformation et conservation sont des dimensions structurées lorsqu'elles changent réellement l'usage, le rendement ou la sélection d'un Article fournisseur ;
- une simple faute ou variante orthographique ne crée jamais volontairement un nouveau Produit ;
- une transformation qui crée une formulation réellement différente peut devenir un Produit distinct : la frontière métier sera fermée en M-002.

À préserver :

- catégorie ;
- gamme lorsque pertinente ;
- unité de référence ;
- rendement applicable à la déclinaison réellement utilisée ;
- photo facultative ;
- traçabilité de création / modification ;
- historique des modifications significatives.

**À terminer dans M-002 :**

- schéma conceptuel final entre Produit canonique, déclinaison et relation d'usage Workspace ;
- gouvernance des catégories ;
- unités supportées ;
- règles exactes d'identité sémantique et d'alias ;
- politique de contribution/modération/fusion d'un Produit partagé ;
- critères exacts séparant déclinaison et Produit distinct ;
- lifecycle / archivage du référentiel et du rattachement Workspace.

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
- une version VALIDATED n'est pas purgée automatiquement par âge ;
- CSV/XLS(X) sont générés à la demande sans conservation durable ;
- le PDF est généré uniquement comme pièce jointe temporaire lors d'un envoi de document par e-mail et n'est pas persisté.

À cadrer avant les modules concernés, pas avant M-001 :

- types/motifs exacts de versions avant M-004 ;
- définition de la marge semi-nette lorsqu'elle sera disponible ;
- paramètres mathématiques fins et garde-fous de l'optimiseur avant M-005 ;
- catalogue complet des stratégies d'arrondi ;
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
- un WorkspaceMember porte un seul Role ;
- un rôle personnalisé combine plusieurs responsabilités par ses permissions ;
- Workspace Owner = toutes les permissions métier + tous les dossiers ;
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
- Atelier d'optimisation = capability payante distincte du RBAC.

À finaliser au cadrage des modules :

- permissions techniques M-001 validées ;
- matrice d'autorisation M-001 validée ;
- API REST M-001 validée ;
- lifecycle détaillé des affectations Dossier encore à fermer ;
- Core 1.1.0 fournit désormais le point d'extension transactionnel `WorkspaceMember → REMOVED` requis par M-001 ;
- rattachement commercial exact de l'optimisation avant M-005 ;
- quotas uniquement lorsqu'un besoin quantitatif est démontré.

### 2.7 Paramètres métier

**État : architecture fonctionnelle validée — catalogue de paramètres à poursuivre**

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
M-002 Catalogue Produits
M-003 Fournisseurs + Articles + prix/catalogues
M-004 Fiches techniques + valorisation
M-005 Atelier d'optimisation Premium
M-006+ Process / imports / OCR / extensions
```

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

**Statut : EN COURS — contrat métier et intégration Core/Produit en cours de fermeture**

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

Le contrat API REST M-001 et le contrat d'ordre des middlewares / frontière middleware-service sont désormais validés. Le cadrage doit encore fermer : validations Zod, contrats d'erreur et audit métier, transitions de lifecycle et effets sur les grants, drawer/contexte actif, autocomplétion, stratégie de tests, critères d'acceptation et ordre d'implémentation.

## 5. Phase 4 — Implémentation métier

**Statut : NON AUTORISÉE pour le moment**

Après validation d'un module :

```text
branche
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E si nécessaire
→ gate
→ PR
→ documentation
```

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

Le cadrage transversal est clôturé et M-001 est en cours.

Core 1.1.0 a résolu le prérequis transactionnel `WorkspaceMember → REMOVED`. Les permissions M-001 et la matrice technique d'autorisation sont désormais validées.

Ordre de reprise :

1. définir validations Zod, contrats d'erreur et audit métier ;
2. fermer la matrice exacte des transitions `ACTIVE / PAUSED / ARCHIVED / DELETED` et leurs effets sur les grants ;
3. fermer drawer, liste, gestion des affectations et contexte magasin actif ;
4. choisir le contrat technique d'autocomplétion d'adresse avec fallback manuel ;
5. définir migrations/seeds uniquement si nécessaires ;
6. définir tests unitaires, intégration, permissions, tenancy et E2E critiques ;
7. valider critères d'acceptation et ordre d'implémentation ;
8. seulement après validation complète M-001, créer la branche d'implémentation et développer.

La marge semi-nette, la Fiche process, l'historique complet des invitations Core, l'OCR/IA et l'optimiseur détaillé restent différés et non bloquants pour le cadrage M-001.
