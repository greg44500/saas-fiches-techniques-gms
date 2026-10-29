# SAAS-FICHES-TECHNIQUES-GMS — Point de situation consolidé (2026-10-29)

**Source d'autorité :** code et tests/gates exécutés sur GitHub, puis contrats métier. Les étapes datées conservées plus bas constituent l'historique du développement et ne sont pas une liste de tâches actuellement ouvertes.

## Livraisons confirmées

| Périmètre | État sur `main` | Précision |
| --- | --- | --- |
| M-001 à M-003 | Intégrés | Dossiers/accès, référentiels Produits et Fournisseurs/Articles/tarification ; extensions spécifiques toujours à arbitrer |
| M-004 | Intégré | Fiches techniques, validation et exports PDF/CSV/XLSX ; impression dédiée et envoi e-mail différés |
| M-005 | Intégré | Atelier d'optimisation, sans préjuger des optimisations avancées futures |
| M-006 | Intégré | Fiches process, édition, sauvegarde, validation/revalidation, réconciliation, bibliothèques de titres et centre d'aide (neuf procédures) ; suppression autonome et export PDF/impression non livrés |

PR produit [#51](https://github.com/greg44500/saas-fiches-techniques-gms/pull/51), [#52](https://github.com/greg44500/saas-fiches-techniques-gms/pull/52), [#54](https://github.com/greg44500/saas-fiches-techniques-gms/pull/54) et [#53](https://github.com/greg44500/saas-fiches-techniques-gms/pull/53) **fusionnées**. `main` = `d7baf3e3cae68e14eda982a6dd3c741770c2d146`. [Core Gate produit #243](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/40710767152) **réussie** sur ce commit le 2026-10-28. Core intégré `v1.2.1` au commit `42beaff67200ca4e956378e2273b4eae440f47bc` ; produit `0.1.0` en développement.

## Priorités après la fusion M-006

1. **Clôture Git et documentaire :** synchronisation locale de `main`, audit puis suppression contrôlée des branches fusionnées effectués le 2026-10-29. Actualisation du présent état, de `docs/DEBT.md`, de `docs/REPRISE-CURRENT.md` et de `docs/m006/M-006-HELP-AUDIT.md` dans la branche documentaire `docs/reconcile-m006-postmerge`.
2. **Recettes complémentaires :** contrôle local/visuel des flux métiers sensibles, droits, tenancy, clavier/mobile, centre d'aide et réconciliation M-004/M-006 ; vérifier l'état effectif des migrations de base. Une CI verte ne vaut pas validation manuelle exhaustive.
3. **Prochain chantier distinct : audit de préparation au déploiement** (sans mise en production implicite) : sécurité, architecture, configuration, MongoDB, fichiers, sauvegardes, emails, jobs, monitoring, RGPD, performance, préproduction et retour arrière. Cadrage et arbitrage avant modification.
4. **Backlog fonctionnel à arbitrer, non lancé :** M-006 suppression autonome, M-006 export PDF/impression, M-004 impression/envoi e-mail, historiques/prix/alertes, imports automatisés, illustrations, IA et extensions avancées. Ces fonctions ne sont pas toutes présumées bloquantes pour une V1.

**Limites des preuves :** les tests inclus dans la gate GitHub sont réussis sur le commit post-fusion ; l'exécution locale complémentaire, les tests en conditions de production, la recette accessible et les migrations dans l'environnement cible ne sont pas attestés par cette seule gate.

---

## Historique de roadmap — notes datées conservées

Les mentions ci-après de PR ou de lots « en attente », « non livrés » ou « non testés » reflètent leur état à leur date de rédaction, pas le statut consolidé ci-dessus.

---

## Finalisation de l'aide M-006 sur la base Core alignée (2026-10-28)

La PR métier #53 contient neuf procédures utilisateur M-006. Sa Core Gate #238 a réussi sur le commit initial. La PR d'alignement Core #54 est fusionnée dans `main` (`383bb4ae`) et la Core Gate #241 post-merge a réussi. La branche Help intègre désormais ce `main` sans changement de versions ; la gate du **commit combiné** et la QA manuelle restent à contrôler avant fusion. Le PDF M-006 et la suppression autonome restent différés.

---

## État courant — M-006 intégré et aide utilisateur en préparation (2026-10-28)

La PR [#51](https://github.com/greg44500/saas-fiches-techniques-gms/pull/51) a fusionné M-006 dans `main` (merge `254c613e7e14d99ec4b578c25bcffb87fc7a6180`). La PR [#52](https://github.com/greg44500/saas-fiches-techniques-gms/pull/52) a ensuite été fusionnée (merge `c166571255185cee9db30d4c01c0c7f9b5be9cf8`). Core Gate post-merge #237 : réussite vérifiée le 2026-10-28. Core intégré : v1.2.1 (`core-origin.json`).

La branche `feature/m006-help-center`, issue de ce `main`, porte un lot documentaire autonome : neuf procédures Fiches process, composition dans `APPLICATION_HELP_MODULES`, tests de permission/visibilité et recherche, suivi documentaire. **Statut : changements committés, vérifications du lot Help et QA utilisateur à exécuter ; aucune nouvelle PR fusionnée.**

Les fonctions M-006 livrées couvrent la création depuis une Fiche technique officiellement validée, l'édition des phases/étapes, les associations d'ingrédients, la sauvegarde manuelle, la validation explicite et la réconciliation d'identité d'ingrédients. Les changements économiques ou de quantité seuls ne nécessitent pas cette réconciliation.

**Toujours différés en lots séparés :** suppression autonome de la Fiche process, export PDF/impression M-006, illustrations et aides IA. L'icône PDF et l'action Supprimer restent non fonctionnelles. Le présent chantier n'ajoute aucune fonctionnalité métier, migration, API ou modification Core.

Les sections historiques ci-dessous relatent leur état à leur date de rédaction ; elles ne prévalent pas sur les deux merges et la CI vérifiés ci-dessus.

---
# SAAS-FICHES-TECHNIQUES-GMS — Roadmap produit
## M-006 — progression lot par lot après décision de validation simplifiée (2026-10-27)

**Branche unique :** `feature/m006-fiches-process`. La PR et le merge sont réservés au propriétaire après réussite des gates locaux et QA. Pas de branche supplémentaire ni de livraison présumée.

| Lot | Périmètre | Avancement |
| --- | --- | --- |
| 1 | Prévisualisation épurée, noms d'ingrédients sans numéros de ligne | Code et tests committés ; validation locale non communiquée |
| 2 | Contrat courant Brouillon ↔ Validée, revalidation après changement enregistré, pas d'historique M-006 | Documentation rectifiée ; aucun code modifié |
| 3 | Validation, revalidation, réconciliation sur nom/référence d'ingrédient seulement, UX compacte | Règle du 2026-10-28 implémentée en source, tests adaptés mais gates et QA locales non exécutées ; lot non validé |
| 4 | Suppression définitive autonome avec confirmation, droits, transaction et réouverture de l'unicité 1:1 | À implémenter séparément |
| 5 | Gates M-006/globales, QA responsive, PR/merge par le propriétaire | En attente |

La `revision` technique anti-concurrence ne crée pas de version métier conservée. L'absence d'historique M-006 ne modifie ni les versions immuables M-004 ni les révisions des bibliothèques.

---

## M-006 — ergonomie pilotage phases/étapes (2026-10-27)

Lot frontend : créer / renommer / supprimer des phases dans l'arborescence, titre contextuel « Phase N : Titre » et édition du contenu à droite, actions iconographiques réutilisant le composant Tooltip Base UI, icônes différenciées pour phase et étape, focus harmonisé localement, confirmation conservée pour phases non vides. Aucun changement Core ni persistance Mongoose. QA : clavier, souris, tactile, dark mode, suppression avec contenu, sauvegarde explicite, préservation des identifiants et association ingrédients. Gates/PR à faire après tests locaux.

---

## M-006 — menu des phases et amorçage des titres communs (2026-10-27)

Lot de continuité UX M-006 : affichage `Select` shadcn/Base UI alimenté par le backend Workspace, cinq intitulés prévus à l'initialisation de la base, migration rejouable pour Workspaces existants, saisie d'intitulés libres persistés dans la bibliothèque PHASE Workspace, sans publication automatique des étapes libres d'une Fiche process. Contrats Core et ownership inchangés. Gate, QA et déploiement à valider localement avant PR.

---

## M-006 — propositions de phases issues du backend (2026-10-27)

**Lot frontend sur la branche M-006, non livré et gates à exécuter :** les intitulés proposés dans l'arbre et le formulaire de phase proviennent des bibliothèques backend PHASE actives (Dossier + Workspace) via RTK Query, pas d'une liste statique React. Selection d'un titre seulement ; adoption automatique d'instructions ou d'étapes interdite. Recherche/pagination serveur, permission \`process-library:read\`, titre libre de repli. Masquage complet des sous-listes vides et suppression contextuelle des étapes. Aucun changement de contrat de modèles : les PHASE en bibliothèque imposent au moins une étape, les phases de brouillon peuvent rester vides. Enregistrement en bibliothèque d'un intitulé vierge et peuplement de titres prédéfinis restent à cadrer distinctement ; pas de seed inventé.

---

## M-006 — lot UX arbre de fabrication (2026-10-27)

**Implémentation sur la branche de travail, contrôles en attente.** Refonte du déroulement phases/étapes en arborescence verticale Base UI avec éditeur contextuel unique, conservation du rail ingrédients et en-tête compact « Fiches process | Titre ». Affichage mobile adapté via SegmentedControl et suppressions confirmées par Dialog. Aucun ajout de sous-étapes ni changement de contrats M-006/Backend/Core. Tests frontend révisés ; exécution réelle, QA et gate globale restent à effectuer avant PR. Les autres lots M-006 (bibliothèques, validation, impression, cycles de vie et copies) restent distincts.

---


## Lot M-006 — Refonte UX/UI de l'éditeur (2026-10-27)

**En cours, sur `feature/m006-fiches-process`, non livré et sans gate exécutée.** Cas d'usage UX validé : courtes procédures d'assemblage divisées en petites phases (une ou deux étapes par phase). Refonte frontend engagée : cartes repliables, édition contextuelle, ingrédients par sélection à la demande, revue des non-affectés et aperçu chronologique. Pas de changement du contrat métier ni du backend. Les tests ajoutés doivent être exécutés localement ; QA visuelle et E2E restent à confirmer avant PR. Le drag and drop n'est pas une dépendance de la V1 UX. PDF/impression, validation officielle et bibliothèque intégrée demeurent des lots M-006 futurs séparés.

---


## Complément UX M-003 joint au lot Gammes M-004 — 2026-10-26

- Travail uniquement sur `feature/m004-gammes-fiches-techniques`, intégré
  à la future PR des Gammes après tests et approbation.
- Dossier / Fournisseurs et prix : remplacer le premier onglet « Références »
  par la consultation des Articles fournisseur avec filtre Tous / Favoris
  et action favori en ligne, sans toucher aux autres onglets ni aux
  invariants M-003.
- Cadrage détaillé : `docs/ux/M-003-DOSSIER-ARTICLES-UX-2026-10-26.md`.
  Recette UI, tests ciblés, E2E et gate `release:check` à confirmer.


## Lot courant — Gammes M-004 (2026-10-24)

- PR #49 UI/UX fusionnée dans `main` au commit `ac0145bd`.
- Gate post-merge #231 initialement en échec intermittent sur le test
  d'ouverture du dialogue Trial. Correction du test uniquement sur
  `feature/m004-gammes-fiches-techniques`, gate locale `release:check`
  verte selon confirmation utilisateur avant démarrage des Gammes.
- Contrat Gammes explicitement validé le 2026-10-24, G1 = B (suppression
  uniquement si aucune Fiche liée, tous états et Dossiers inclus) et
  G2 = A (copie sans Gamme avec message si source archivée).
- Branche : `feature/m004-gammes-fiches-techniques`. Développement
  backend + tests, frontend + tests, E2E, migration, QA locale.
- **Non livré** : les tests et la gate du code Gammes doivent être exécutés
  et confirmés localement ; PR unique et merge soumis à l'accord utilisateur.
- Pas de changement Core, de capability, de quota ou de snapshots.

Source validée : `docs/m004/M-004-GAMMES-CADRAGE-PROPOSITION.md`.

---

**Statut :** M-001 à M-005 intégrés ; M-003 complété par PR #44 ; Core Gate post-merge validée à la tentative 2
**Dernière mise à jour :** 2026-10-23

> Cette roadmap décrit l'ordre de cadrage et de livraison.  
> Elle ne constitue pas encore un engagement de périmètre V1 ni un calendrier daté.

## Lot UI/UX transversal actif — 2026-10-22

QA du 2026-10-23 : menu M-002 « Valider » (survol/focus vert) et « Examiner » (survol/focus warning), filtre « Actives » rétabli ; dialogue Catégorie allégé. Protection actuelle des doublons normalisés auditée et renforcée par tests HTTP, avec gestion de conflit d'index au renommage. Suggestions de catégories orthographiquement proches à cadrer séparément avant implémentation.


Complément validé : recherche prédictive d'Articles fournisseur dans les trois parcours Dossier/Tarifs/prix applicable, affichage du nom métier, menus flottants sans agrandir les cartes, icône `FolderOpen` pour l'ouverture du Dossier.

Sur `feature/ui-ux-improvements` : harmonisation des menus d'actions
« … » pour les tableaux Fournisseurs/Articles/Catalogues, Dossiers
et Fournisseurs et prix ; infobulle de portée et désactivation
d'« Enregistrer » sans nom dans le formulaire Fournisseur.
Cadrage : `docs/ux/UI-UX-TABLE-ACTIONS-SUPPLIERS-DOSSIERS-2026-10-22.md`.
Complément M-002 validé le 2026-10-23 : contrôle d'identité provisoire unique avec clôture qualité par l'approbation de gouvernance existante, interdiction de la revue qualité isolée et de l'acquittement implicite lors de la correction ; cartes Variétés/Caractéristiques harmonisées (statut priorisé, action Examiner/Confirmer la qualité, menu d'actions partagé), filtre « À contrôler » cohérent. Contrats M-002 et UI/UX mis à jour ; recette Windows et gate locales requises.

Complément M-002 approuvé le 2026-10-23 : densifier les cartes Dimensions et regrouper dans « … » validation rapide conditionnelle, examen et maintenance ; retirer « Actif » redondant et afficher « Non archivées » dans le filtre. Le contrat Core reste inchangé, superposition M-002 ciblée à vérifier visuellement. Tests et gate en attente.

**Validation locale, gate et QA visuelle en attente ; aucune PR prévue avant accord.**
Ce lot n'ouvre pas une fonctionnalité métier, un changement de Core
ou une refonte des permissions.

### Recette visuelle M-002 — complément de stabilisation (2026-10-16)

Ajout au lot actif de la protection de tout changement d'unité sur Référence utilisée (masse→masse incluse), de la navigation vers les Références du Produit retrouvé, du contrôle de gouvernance ciblé avec petit bouton neutre et de l'infobulle métier du dialogue d'édition. Même branche, tests locaux et gates avant PR.

**Stabilisation après QA (2026-10-16) :** permettre la correction encadrée d'une unité sur la même Référence en présence d'Articles et Tarifs fournisseur seuls, sans altérer les Fiches et Prix historiques ; rétablir le lien de gouvernance d'une identité provisoire orpheline dans la file existante ; bouton « À contrôler » petit et warning. Tests backend, HTTP, frontend, E2E/gates à vérifier localement avant PR.

## Complément UX M-004 — sélection d'Articles et origine tarifaire (2026-10-22)

Implémenté en branche (non fusionné) : sélecteur compact
`Favoris | Articles | Tous`, mode `Tous` initial, transition glissante ;
sélection directe d'Articles actifs du Workspace et partage global autorisé,
sauvegarde atomique Référence/Article ; affichage de la source réelle
de valorisation dans l'infobulle. Finition identité (2026-10-22) :
statut de gouvernance, unité officielle et dates de modification
Référence/Article sans heure ; suppression de l'horodatage du calcul.
Les contrôles de tenancy et RBAC et
les tests unitaires/HTTP/E2E sont ajoutés. **Tests locaux, gates et
validation visuelle non réalisés à ce stade ; pas de PR ni merge.**
Le chantier d'impression et d'e-mail reste distinct, après clôture.

## Lot transversal actif — unités de recette et colisage (2026-10-16)

Travail sur `feature/m002-m003-m004-unit-consistency`. Quatre règles métier validées : l'unité M-002 s'impose à la fiche, l'Article M-003 peut attester explicitement un nombre de pièces de recette par colis, aucune conversion moyenne non vérifiée, changement de dimension déjà utilisée sous contrôle/audit. Code et tests publiés sur la branche, mais non vérifiés localement ; **non validés localement**. Le complément impression/e-mail reste un chantier séparé. Contrat : `docs/m004/M-002-M-003-M-004-UNIT-CONSISTENCY-CADRAGE.md`.


---

## 1. Phase 0 — Bootstrap technique

**Statut : VALIDÉ**

- dérivation depuis `saas-core-api` ;
- Core `v1.2.1` intégré ; provenance exacte et actuelle dans `core-origin.json` : `054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3` ;
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

### Complément transversal M-002/M-003 — Création Produit depuis l'Article (branche en QA)

Un utilisateur disposant de la capability commerciale `supplier_catalog_import`
et des permissions `supplier:article:manage` et `supplier:catalog:import`
peut créer ou réutiliser une Référence Produit depuis un Article fournisseur
privé et actif. Aucune deuxième capability `product_contribution` n'est
exigée pour ce parcours contextuel. Le référentiel Produit global reste sous
gouvernance Application Global ; les créations Workspace sont provisoires.
Contrat et validations à effectuer :
`docs/m003/M-003-ARTICLE-PRODUCT-CREATION-ADDENDUM.md`.

**État :** implémenté sur `feature/m002-m003-supplier-product-creation`,
tests locaux et gates non encore exécutés ; aucune PR ni merge.

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


### 2.5 Fiches process — lot M-006 prioritaire, cadrage consolidé (2026-10-26)

**État actualisé le 2026-10-27 : contrat de création M-006 confirmé et cycle éditorial simplifié par décision du propriétaire : une Fiche process courante, modifiable après validation, revalidation explicite après modification réellement enregistrée, sans historique de versions M-006. Backend : bibliothèques, projection M-004, agrégat 1:1, éligibilité, brouillon sauvegardé et cascades parent-enfant ; frontend : liste, création, atelier d'édition et prévisualisation. Validation officielle et suppression autonome non livrées ; tests du HEAD et gate à vérifier localement.**

Branche existante : `feature/m006-fiches-process`. Cadrage : `docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md`. Le lot ajoute au Dossier les modes opératoires associés 1:1 aux Fiches techniques : création guidée, phases/étapes, affectation des ingrédients M-004, bibliothèques Dossier/Workspace, contrôles structurés facultatifs, validation explicite renouvelable **sans historique des versions M-006**, cycle de vie parent-enfant, suppression autonome définitive autorisée et impression.

**Lot ultérieur, exclu de M-006 V1 : illustrations et photographies**, y compris champs photo, stockage, affichage, galerie et impression illustrée. Le cadrage des formats, tailles, permissions, rétention et coûts doit être distinct. Sont également différés : journaux d'exécution des contrôles, aide IA, infographies et diffusion documentaire avancée.

Suite ordonnée : bibliothèques backend (code et tests créés, **non exécutés**) → conception de l'identité ingrédients M-004 → agrégat Fiche process/backend → intégrations transactionnelles parent/enfant → frontend/RTL → E2E → `npm run release:check` → recette et éventuelle PR **sur autorisation**. La migration M-006 n'a pas été exécutée dans cette conversation.

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



## 7. État de livraison au 2026-10-14

| Lot | État |
| --- | --- |
| M-001 Dossiers / accès | Fusionné |
| M-002 Référentiel Produit | Fusionné, dont adaptations UX ciblées de la PR #44 |
| M-003 Fournisseurs / Articles / tarification | Baseline PR #22 + **complément [PR #44](https://github.com/greg44500/saas-fiches-techniques-gms/pull/44) fusionnés** |
| M-004 Fiches techniques | Fusionné ; exports PDF, XLSX, CSV implémentés |
| M-005 Atelier d'optimisation | Fusionné par [PR #39](https://github.com/greg44500/saas-fiches-techniques-gms/pull/39) |
| Complément de diffusion M-004 | **Impression et envoi par e-mail non livrés** ; audit et cadrage requis |
| Fiches process | À cadrer ultérieurement |

### Clôture M-003 — PR #44

Fusion sur `main` le 2026-10-14, commit `962177905bcc198e439a316d9610b23c60dd53cd`, sans changement du Core v1.2.1.

- [Core Gate PR](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/38537453030) (`38537453030`) : **success**.
- [Core Gate post-merge](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/38539141748) (`38539141748`) : **success à la tentative 2** ; tentative 1 échouée sur un test frontend M-004 intermittent. Ne pas réécrire l'historique comme une réussite au premier passage.

Le complément M-003 livre : import direct d'Articles et mercuriales indépendantes des catalogues, association Produit différable, période fournisseur avec ou sans date de fin explicite, corrections historisées des listes privées, signalement du tarif expiré, projections prix/conditionnements et UX Articles/Fournisseurs. Les assistants d'import Produits M-002 et l'alerte prix en M-004 ont été adaptés sans refonte de leurs domaines.

Les suppressions contrôlées de catalogues, renouvellements prospectifs de listes tarifaires et arbitrages entre offres privées/globales restent dans `docs/DEBT.md`.

### Stabilisation M-002/M-003/M-004 du 2026-10-22 — QA locale requise

- Réutilisation du workflow de contribution provisoire depuis la création manuelle d'Article, sans système Produit parallèle.
- Preuve de pièces saisie à la création manuelle lorsqu'un colis physique sert à valoriser une Référence UNIT ; imports sans association conservés.
- Édition simplifiée, patch des seuls champs modifiés, préservation des preuves valides et de leur date ; invalider seulement lors de changement réel de la signature métier.
- Prix historiques non normalisables écartés du choix prioritaire au profit d'une source fiable ; repli indicatif autorisé, sinon NC préservé et explicable.
- Action « Actualiser les coûts » de M-004 réutilisant la valorisation backend pour un brouillon, sans modifier les snapshots validés.
- Tests backend/frontend/E2E ajoutés, audit BRIDOR en lecture seule enrichi. **Gates, QA visuelle et PR en attente de validation locale.**

### Prochain lot — diffusion M-004

**Déjà présents dans le code et contractés :** CSV, XLSX, PDF issus du snapshot validé ; `docs/m004/M-004-EXPORTS-FINAL-CONTRACT.md` et `docs/m004/M-004-EXPORTS-TECHNICAL-DESIGN.md`.

**À analyser puis cadrer avant toute modification :** impression et envoi par e-mail. Vérifier les points d'extension des exports existants, sécurité des destinataires, RBAC et capability, quotas, audit, confidentialité, stockage temporaire des pièces jointes et tests. Un seul lot complémentaire M-004, pas un nouveau module numéroté.

### Historique M-003 (9 au 14 octobre 2026)

Le contrat `docs/m003/M-003-FINAL-CONTRACT.md` et la conception `docs/m003/M-003-TECHNICAL-DESIGN.md` conservent les décisions détaillées : imports CSV/XLS/XLSX, mercuriales sans catalogue, corrections, périodes, tableaux et drawer Article à onglets. Leur livraison n'est plus « en attente de PR ». Les dettes différées ne sont pas assimilées à des fonctionnalités livrées.

Après la PR strictement documentaire, synchroniser localement `main` et nettoyer uniquement les branches réellement fusionnées après vérification.

Complément UI/UX M-002 (2026-10-23) : tableau Catégories à menus d'actions, suppression conditionnée à zéro Produit associé (y compris archives), contrôle de permission Application Global, audit transactionnel, en-tête fixe et données défilantes. Drawer : « Approuver » et « Annuler » pour sortir du contrôle sans quitter le Produit. Tests locaux et gate non attestés ; aucune PR/merge avant accord.


Complément UI/UX M-002 du 2026-10-23 : pagination standard des catégories (10/20/50/100) en conservant le défilement interne et l'en-tête visible ; action explicite « Fusionner » réaffectant tous les Produits de la source à une cible active, suppression de la source et événement d'audit dans la même transaction. Tests de permissions, validations, intégrité d'association, catégories archivées et frontend préparés ; tests/gate et QA Windows non exécutés ici, pas de PR.

Finition QA du 2026-10-23 (M-002) : les trois tableaux « Référentiel », « À contrôler » et « Catégories » utilisent une région de lignes à défilement interne avec en-tête sticky et pagination hors scroll. Le workflow de création/renommage de catégorie interroge le backend pour proposer les noms proches (y compris archives) et exige la confirmation d'une catégorie distincte, vérifiée aussi par le serveur. Tests et QA PowerShell non exécutés ici ; aucun merge/PR.

Finition du lot UI/UX du 2026-10-23 : menu Fiches techniques réordonné Modifier → Prévisualiser → Optimiser → Supprimer, listage des Fiches avec en-tête sticky et scroll interne, même disposition des tableaux Fournisseurs et prix (Références, Catalogues, Tarifs négociés, Prix facturés, Prix indicatifs). Action isolée « Retirer du Dossier » représentée par un bouton direct icône + texte, rouge au survol/focus, sans modifier les permissions ni les mutations. L'outil de hauteur de tableau est mutualisé sans toucher au Core. Gates Windows et QA à confirmer, aucune PR/merge avant accord.

Lot de finition UI/UX du 2026-10-23 : Fournisseurs, Articles et Catalogues (page Fournisseurs) ainsi que Tous les produits et Favoris (page Produits) disposent de lignes à défilement interne, d'un en-tête sticky et du footer de pagination serveur laissé hors du scroll. Réutilisation du hook transverse UI et de `DataPagination` existant ; pas de changement Core, backend, RBAC ou données. Tests RTL ciblés intégrés ; validation locale Windows, lint/build, gate et QA visuelle toujours en attente, sans PR ni fusion.

- **Lot 5 backend/frontend :** éditeur de brouillon M-006 avec phases et étapes ordonnées, affectation des ingrédients par identité de ligne M-004, consignes, durées et contrôles, sauvegarde transactionnelle avec révision optimiste, audit et permission EDIT/migration associée. **Tests non exécutés ici**, validation officielle M-006 et bibliothèque intégrée à l'éditeur non livrées.
