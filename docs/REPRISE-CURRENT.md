# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : bootstrap technique validé — cadrage produit métier en cours**
>
> **Dernière mise à jour : 2026-09-19**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.
>
> **Aucun module métier n’a encore été implémenté. Aucun modèle métier Mongoose n’a été créé.**

---

## 1. Autorité et principe directeur

Ordre d’autorité :

1. code réel + contraintes DB ;
2. tests/gates réellement exécutés ;
3. contrats fonctionnels validés ;
4. contrats Core correspondant à la version intégrée ;
5. architecture/sécurité/guidelines ;
6. dette active ;
7. documentation opérationnelle ;
8. présente reprise.

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

Tout besoin générique doit être traité dans le Core, testé/versionné, puis intégré au produit via une branche `core-update/vX.Y.Z`.

---

## 2. Produit et état GitHub validé

Dépôt :

```text
greg44500/saas-fiches-techniques-gms
```

Main validé :

```text
9f2b6326c66d8d10460789a19602b70f00066d1e
Merge pull request #4 from greg44500/docs/reprise-after-core-1.0.1
```

Validation post-merge associée :

```text
Core Gate #10
run        : 35366434371
conclusion : success
```

Remotes attendus :

```text
origin        → https://github.com/greg44500/saas-fiches-techniques-gms.git
upstream-core → https://github.com/greg44500/saas-core-api.git
```

Le pilote `saas-core-derived-pilot` reste uniquement une preuve de dérivation/upgrade et ne doit pas servir de base au produit réel.

---

## 3. Core intégré

Core source :

```text
repository : greg44500/saas-core-api
version    : 1.0.1
tag        : v1.0.1
commit     : 9613bdb0c70ee1950dfa7da68e5cbefa704e88f1
```

Le tag `v1.0.1` a été intégré par la branche :

```text
core-update/v1.0.1
```

Le conflit sur `docs/REPRISE-CURRENT.md` a été résolu en conservant la synthèse propre au produit. La synthèse du Core ne doit jamais remplacer celle du produit.

`core-origin.json` a été mis à jour uniquement après validation réelle de l’upgrade.

---

## 4. Identité de release

Le contrat Core 1.0.1 distingue :

```text
core-release.json
→ identité/version du Core

core-origin.json
→ provenance exacte du Core intégré

product-release.json
→ identité/version propre au produit
```

Identité produit actuelle :

```text
name       : saas-fiches-techniques-gms
repository : greg44500/saas-fiches-techniques-gms
version    : 0.1.0
channel    : development
```

Les `package.json` et lockfiles conservent l’identité/version du Core conformément au contrat de dérivation.

`AGENTS.md` est adapté au produit et rappelle explicitement la frontière Core / métier.

---

## 5. Validation de l’upgrade Core v1.0.1

Validation locale réellement exécutée :

```text
npm run release:verify
→ SUCCESS

npm run release:check
→ SUCCESS
```

La gate locale complète a été exécutée avec une base MongoDB dédiée aux tests :

```text
mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_test?replicaSet=rs0
```

Le garde-fou MongoDB a correctement refusé une première exécution lorsque la base ne se terminait pas par `_test`.

PR d’upgrade :

```text
PR #3 — Core update: integrate v1.0.1
head : c2d08c3986d2c1580da71137d5a3fad3b3ecdb0d
```

Validation PR :

```text
Core Gate #6
run        : 35363449426
conclusion : success
```

Merge :

```text
main : 644c76b8c3db408ace0e494f1f50caf52107181d
```

Validation post-merge upgrade :

```text
Core Gate #8
run        : 35364254446
head       : 644c76b8c3db408ace0e494f1f50caf52107181d
conclusion : success
```

La mise à jour documentaire post-upgrade a ensuite été fusionnée via la PR #4 et le `main` `9f2b6326...` a été validé par la Core Gate #10.

L’upgrade Core `v1.0.1` est donc validé de bout en bout.

---

## 6. Infrastructure locale validée

Versions contrôlées :

```text
Node : v24.19.0
npm  : 10.9.2
```

MongoDB local :

```text
127.0.0.1:27017
replica set : rs0
```

Bases produit :

```text
développement : saas_fiches_techniques_gms_dev
tests backend : saas_fiches_techniques_gms_test
E2E           : saas_fiches_techniques_gms_e2e_test
```

Le `.env` local reste non versionné et utilise la base de développement dédiée au produit.

---

## 7. État fonctionnel

Le socle Core est opérationnel et validé.

Aucun modèle métier GMS n’a encore été créé.

Aucun module M-001 / M-002 / ... n’a encore été cadré ou implémenté.

Les tests Core ne remplaceront jamais les futurs tests métier.

Le cadrage global du produit a en revanche commencé le 2026-09-19.

---

## 8. Cadrage métier désormais formalisé

Branche documentaire de travail :

```text
docs/product-business-framing-foundation
```

Pull Request de cadrage :

```text
PR #5 — Docs: formalize initial product business framing
état : ouverte
base : main
```

Dernière preuve CI vérifiée avant le présent enrichissement documentaire :

```text
Core Gate #29
run        : 35462554312
head       : 435f44dd4202732befe11672ed5e735e49fa3e71
conclusion : success
```

Le présent lot documentaire avance ensuite la branche. Toute nouvelle gate déclenchée sur son nouveau HEAD doit être vérifiée sur GitHub avant merge ; cette synthèse ne doit jamais extrapoler un statut vert non observé.

Documents ajoutés en statut DRAFT :

```text
docs/PRODUCT-SCOPE.md
docs/ROADMAP.md
docs/domain/GLOSSARY.md
docs/domain/DOMAIN-MODEL.md
```

Ils formalisent les décisions métier validées sans transformer les points ouverts en hypothèses techniques.

### 8.1 Organisation

Organisation validée :

```text
Workspace
→ plusieurs dossiers
→ 1 dossier = exactement 1 magasin
```

Le Workspace conserve un catalogue commun de produits.

Les conditions commerciales sont contextualisées par magasin/dossier.

L'accès à plusieurs magasins permet uniquement de changer de contexte. Les contextes ne sont jamais fusionnés : une Fiche technique du magasin Nantes ne peut jamais utiliser un Tarif négocié ou Prix facturé du magasin Saint-Nazaire. En l'absence de prix local applicable, le fallback reste le Tarif fournisseur de référence, jamais le prix d'un autre magasin.

### 8.2 Produit

Principes déjà établis :

- nom métier directement compréhensible ;
- nom simple pour un produit entier / standard ;
- précision de préparation dans le nom lorsqu’elle est nécessaire ;
- catégorie ;
- gamme alimentaire uniquement lorsqu’elle est pertinente ;
- unité de référence ;
- rendement produit ;
- photo facultative ;
- dates/auteurs de création et modification ;
- historique des changements significatifs.

Exemple :

```text
Oignon
→ produit entier

Oignon émincé
→ produit préparé distinct
```

La farine constitue un exemple de produit pour lequel la gamme peut être non applicable avec un rendement de 100 %.

### 8.3 Fiabilité et calculs

Principe métier validé :

> L’utilisateur déclare les faits nécessaires ; le système calcule tout ce qui peut être déduit.

Le backend reste l’autorité des calculs et validations.

Le pourcentage de recette est calculé à partir des quantités.

Le taux de rendement est distinct du pourcentage de recette.

Le rendement de référence est défini sur le produit et utilisé automatiquement dans la fiche technique.

### 8.4 Fournisseurs, articles, conditionnements et tarifs

Le domaine sépare strictement Produit, Fournisseur, Article fournisseur, conditionnement, catalogue fournisseur, Tarif négocié magasin et Prix facturé.

Politique Workspace validée :

~~~text
Tarif fournisseur
Tarif négocié ← standard
Prix facturé
~~~

Résolution :

~~~text
Tarif fournisseur
→ Tarif fournisseur de référence applicable

Tarif négocié
→ Tarif négocié valide du même magasin
→ sinon Tarif fournisseur

Prix facturé
→ dernier Prix facturé VALIDE, exploitable et suffisamment frais du même magasin
→ sinon Tarif négocié valide du même magasin
→ sinon Tarif fournisseur
~~~

Aucun prix d'un autre magasin n'est jamais proposé comme fallback.

Le backend est la seule autorité de résolution et expose source, Article, valeur, temporalité, fallback, raison et alertes.

Le Prix facturé :

- est exploitable seulement après rattachement fiable et validation ;
- conserve les états À VALIDER / VALIDÉ / REJETÉ ;
- utilise la date de facture comme origine de fraîcheur ;
- possède une durée standard de fraîcheur d'un an ;
- peut utiliser une durée personnalisée par Workspace lorsque la capability le permet ;
- reste VALIDÉ et historique lorsqu'il devient trop ancien, mais ne participe plus automatiquement à la résolution courante.

La convention technique exacte « 12 mois calendaires vs représentation équivalente » reste à fixer.

Les catalogues fournisseur de référence peuvent être préchargés et sont historisés par édition/millésime. Une nouvelle édition ne détruit pas l'ancienne. Un catalogue hors validité peut rester consultable ou servir de dernier fallback de référence à condition d'être clairement signalé.

Un futur import CSV/XLS/XLSX doit créer une nouvelle édition après mapping, contrôles, aperçu et validation. Le mapping Fournisseur peut être mémorisé. L'IA/OCR pourra assister plus tard mais ne devient jamais l'autorité tarifaire.

### 8.4.1 Sélection d'Article et Références du magasin

Lorsqu'un Produit possède plusieurs Articles exploitables dans le même magasin :

- le SaaS ne choisit jamais automatiquement le moins cher ;
- un Article explicitement choisi reste associé à la version concernée ;
- un seul candidat exploitable peut être résolu automatiquement ;
- plusieurs candidats sans décision explicite déclenchent une sélection utilisateur ;
- changement de prix du même Article = revalorisation ;
- changement d'Article = modification d'approvisionnement distincte.

Le raccourci opérationnel du magasin porte sur des **références favorites**, c'est-à-dire des Articles fournisseur précis, pas sur un Produit générique.

Une référence favorite pointe vers l'Article ; son Prix applicable est recalculé dynamiquement dans le contexte du magasin.

Plusieurs références favorites peuvent correspondre au même Produit.

Deux notions sont conservées :

~~~text
Favorite
→ préférence opérationnelle

Fréquemment utilisée
→ observation calculée de l'usage
~~~

La fréquence se base sur des Fiches techniques VALIDÉES distinctes du magasin ; une revalorisation ou nouvelle version de la même fiche ne gonfle pas le compteur.

La politique Workspace peut fonctionner en manuel, suggestion ou ajout automatique aux favoris. Le seuil exact reste configurable et sa valeur standard définitive reste à fixer.

Une vue unique « Références du magasin » peut prioriser Favorites et Fréquemment utilisées puis donner accès au catalogue complet.

Chaque Produit/Article proposé doit disposer d'une carte d'identité professionnelle : Fournisseur, référence, désignation, conditionnement, marque éventuelle, Prix applicable courant, source, temporalité et alertes. Ces informations viennent du backend.

### 8.5 Fiche technique, versionnement et coûts

Règles validées :

- quantité nette saisie ;
- quantité brute calculée via rendement ;
- pourcentage recette calculé sur le net ;
- prix HT normalisé ;
- CM = somme des lignes ingrédients ;
- Économat séparé ;
- Coût total fabrication = CM + Économat ;
- énergie exclue ;
- absence de prix jamais représentée par zéro ;
- une ligne requise sans Prix applicable empêche la validation officielle.

Cycle de vie conceptuel :

~~~text
DRAFT
→ travail en cours, possiblement incomplet

VALIDATED
→ version officielle, historiquement immuable

ARCHIVED
→ sortie de l'usage actif, historique conservé
~~~

Modifier une version VALIDATED crée/ouvre un nouveau DRAFT.

Une revalorisation peut créer un nouveau DRAFT à composition identique avec les Prix applicables courants, puis nécessite une validation explicite.

Chaque version validée conserve le snapshot nécessaire à la reproductibilité économique : Produit, Article, quantités, rendement, prix, source, magasin et date de valorisation.

Le backend vérifie avant validation permissions, périmètre magasin, complétude, cohérence, Articles, Prix applicables, actualité de la valorisation et conflits concurrents.

Les invariants métier s'appliquent à tous les membres, y compris au Workspace Owner.

La copie inter-magasin reprend la composition mais jamais les prix, valorisations ou historiques économiques du magasin source.

### 8.5.1 Archivage et suppression

Le cycle normal utilise l'archivage.

Aucune suppression automatique n'est déclenchée uniquement par l'âge.

Le Workspace Owner peut, selon la politique de cycle de vie, supprimer définitivement une fiche ancienne déjà archivée après contrôles et audit.

Une fiche VALIDATED active n'est pas supprimée directement.

La fiche et ses versions sont traitées comme une unité cohérente et un audit minimal de suppression doit subsister.

Les contraintes de rétention légale/réglementaire restent à cadrer.

### 8.6 Configuration métier du Workspace

Le panneau de configuration devient une surface structurante et reste visible.

Chaque paramètre distingue :

~~~text
valeur standard
valeur configurée éventuelle
valeur effective
droit de personnalisation
~~~

Le backend calcule la valeur effective. Aucun fallback métier n'est codé en dur dans le frontend.

Principe commercial validé :

~~~text
Free
→ comportements standards
→ personnalisation verrouillée selon capabilities

Trial
→ comportements standards dès le départ
→ personnalisation facultative pour tester l'offre

Payant
→ personnalisation autorisée par le plan
~~~

Un downgrade ne détruit pas automatiquement les valeurs personnalisées ; elles peuvent devenir inactives pendant que les standards redeviennent effectifs.

Paramètres identifiés : politique de prix, fraîcheur factures, politique des références favorites/fréquentes, cycle de vie des fiches, TVA, marge, coefficient, arrondis et autres paramètres démontrés.

### 8.7 RBAC, Workspace Owner et périmètres magasin

Le produit réutilise le système de rôles du Core v1.0.1.

Constat Core vérifié :

~~~text
WorkspaceInvitation
→ roleId

acceptation
→ WorkspaceMember.role

WorkspaceMember
→ un seul Role
~~~

Le produit ne crée donc pas un système de rôles cumulables.

Les responsabilités multiples sont regroupées dans un rôle personnalisé contenant les permissions nécessaires.

Profils types retenus :

- Acheteur / Responsable achats ;
- Économe / Gestionnaire des prix ;
- Responsable fiches techniques ;
- Contributeur fiches techniques ;
- Lecteur métier si besoin.

Le Workspace Owner :

- est le rôle owner du Workspace, pas un rôle Platform ;
- possède toutes les permissions métier du produit ;
- possède tous les dossiers de son Workspace ;
- peut paramétrer le Workspace selon les capabilities disponibles ;
- reste soumis aux invariants métier.

Un PlatformRole, y compris d'administration plateforme, ne donne aucun accès implicite aux dossiers, fiches ou données commerciales d'un Workspace.

Le rôle répond à « que peut faire le membre ? ». Le périmètre dossier répond à « où peut-il le faire ? ».

L'autorisation effective combine :

~~~text
membership actif
+ permission du Role
+ accès dossier
+ état ressource
+ capability éventuelle
+ invariants métier
~~~

Le parcours d'invitation du produit peut afficher rôle et magasins dans un même formulaire, mais le périmètre dossier reste une donnée métier séparée. Son stockage et son éventuelle préparation avant acceptation doivent encore être cadrés sans modifier silencieusement le Core.


### 8.7.1 Invitation puis organisation interne des accès magasin

Décision validée :

```text
Invitation Core
→ entrée dans le Workspace
→ Role Workspace
→ acceptation
→ WorkspaceMember

Puis

organisation métier interne
→ Workspace Owner affecte les dossiers/magasins autorisés
```

Un membre peut temporairement appartenir au Workspace sans dossier.

Le Workspace Owner dispose implicitement de tous les dossiers.

Role et périmètre magasin évoluent indépendamment.

### 8.7.2 Dossier / magasin — identité, lifecycle et UX

Le dossier possède désormais un cadrage plus précis :

- 1 dossier = 1 magasin ;
- nom / enseigne éventuelle ;
- localisation avec assistance d'autocomplétion publique à confirmer techniquement ;
- email destiné notamment aux documents ;
- téléphone facultatif ;
- responsable métier distinct du créateur du dossier ;
- informations opérationnelles modifiables et auditables ;
- statuts `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
- `DELETED` = suppression logique et coupure immédiate des accès métier ;
- restauration vers `PAUSED` avant remise en production ;
- purge physique séparée et soumise à la rétention.

UX structurante :

```text
Dashboard Workspace
→ pilotage global

Drawer dossier
→ consultation / navigation
→ pas de changement de contexte

Ouvrir le dossier
→ travail métier contextualisé

Retour Workspace
→ un clic
```

Le drawer doit pouvoir montrer informations, KPI, fiches/process, accès, activité et administration selon permissions.

La Sidebar devra être enrichie par les sections métier via le point d'extension Core, sans créer une navigation parallèle.

### 8.7.3 Dashboard personnalisable

Le Dashboard Workspace devient le centre de pilotage global.

Le produit réutilise le mécanisme Core v1.0.1 :

```text
widgets Core + widgets métier
→ filtrage permissions / capabilities
→ préférences utilisateur
→ affichage final
```

Le comportement par défaut actuel du Core est conservé : `hiddenWidgetIds = []`, donc tous les widgets accessibles sont visibles initialement.

Les widgets configurables peuvent ensuite être masqués/réaffichés individuellement ; les widgets non configurables restent visibles.

Les préférences d'affichage ne modifient jamais les règles métier.

### 8.7.4 TVA, Objectif de marge et Atelier d'optimisation

TVA validée :

- coûts de fabrication toujours HT ;
- taux standard Workspace possible ;
- taux réellement applicable porté par la fiche/version ;
- calculs HT / TVA / TTC autoritatifs backend ;
- snapshot TVA dans la version VALIDATED ;
- aucune réécriture historique après changement de paramètre.

Objectif de marge :

- taux de marge souhaitable à atteindre ;
- cible définie dans le contexte du magasin et utilisée par la Fiche technique ;
- exemples possibles : 48 %, 52 %, 55 % ;
- aucune substitution arbitraire par un taux de marque ;
- coefficient, prix théorique, prix conseillé/retenu, marge réelle/semi-nette et arrondis restent à formaliser.

Atelier d'optimisation :

- capability commerciale payante et différenciante ;
- logique « Lightroom des Fiches techniques » ;
- sliders globaux conservés ;
- courbe d'équilibre multipoints complémentaire ;
- histogramme composition/coût et graphiques professionnels ;
- réglages fins par ingrédient ;
- quantités de référence + bornes min/max configurables ;
- pièces/unités verrouillées ;
- composition conservée à 100 % lorsque la quantité finale est verrouillée ;
- compensation entre ingrédients modulables ;
- enveloppe de qualité perçue ;
- bornes utilisateur complétées par des limites de sécurité backend ;
- objectif impossible signalé explicitement ;
- simulation non destructive ;
- application explicite au DRAFT avant toute persistance métier.

### 8.8 Principe invariants vs permissions

Règle validée :

~~~text
RBAC
→ ce qu'un utilisateur peut demander

Invariants métier
→ ce que le Workspace peut accepter comme état valide
~~~

Aucune permission, y compris celles du Workspace Owner, ne permet de contourner un invariant de valorisation, d'isolation, d'historisation ou de cohérence.

---


## 9. Points métier restant à cadrer

Le cadrage global n'est pas terminé, mais les blocs Dossier, navigation, Dashboard, TVA et optimisation avancée sont désormais fortement précisés.

Ordre recommandé de reprise :

1. finaliser la matrice précise des permissions des rôles types ;
2. valider la formule Objectif de marge → coefficient → prix théorique à partir des fiches de référence ;
3. cadrer prix conseillé / prix retenu ;
4. cadrer marge réelle / semi-nette ;
5. cadrer arrondis ;
6. cadrer Fiche process ;
7. finaliser les champs obligatoires et la persistance du périmètre Dossier ;
8. cadrer les paramètres mathématiques / sécurité de l'Atelier d'optimisation ;
9. finaliser capabilities / quotas ;
10. finaliser intégrations et contraintes réglementaires ;
11. fixer V1 / hors V1 ;
12. validation documentaire globale ;
13. seulement ensuite cadrage M-001.

Points encore ouverts dans les blocs déjà travaillés :

- lecture détaillée des historiques de prix par le Lecteur métier ;
- permission de validation par défaut de l'Économe ;
- persistance technique du périmètre dossier ;
- caractère obligatoire de l'enseigne, email documents et responsable ;
- fournisseur technique final d'autocomplétion géographique ;
- convention exacte de fraîcheur du Prix facturé ;
- seuil « fréquemment utilisée » et traitement des fiches archivées ;
- données minimales Fournisseur ;
- lifecycle Article fournisseur ;
- gouvernance finale des revues tarifaires ;
- formule économique complète après Objectif de marge ;
- bornes de sécurité et paramètres exacts de l'optimiseur ;
- rattachement commercial exact de la capability payante d'optimisation ;
- types/motifs exacts de version ;
- rétention / purge définitive ;
- détail de la Fiche process ;
- quotas, réglementation et V1 final.

Aucune de ces questions ne doit être résolue implicitement pendant l'implémentation.

## 10. Points techniques non bloquants à suivre

Les points d'extension Core v1.0.1 doivent être utilisés avant toute modification de fondation, notamment le registre de permissions métier Workspace.

Le Core v1.0.1 confirme qu'un WorkspaceMember porte un seul Role et que l'invitation reçoit un roleId.

Le périmètre dossier n'est pas une primitive native du WorkspaceMember : son besoin doit rester côté produit sauf démonstration d'un besoin générique réutilisable justifiant une évolution Core.

Certains éléments hérités portent encore une identité technique Core et ne doivent pas être renommés aveuglément.

Toute évolution générique reste à traiter d'abord dans saas-core-api puis à intégrer via une branche core-update.

---

## 11. Gate avant tout code métier

Avant tout modèle métier Mongoose :

```text
PRODUCT-SCOPE validé
+
GLOSSARY validé
+
DOMAIN-MODEL validé
+
V1 / hors V1 validé
+
rôles / capabilities / quotas cadrés
+
contraintes réglementaires cadrées
+
ROADMAP validée
↓
cadrage M-001
```

Seulement après validation de M-001 :

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

---

## 12. Granularité Git / PR

Règle de travail validée :

> Une PR correspond à un lot fonctionnel cohérent et vérifiable, pas à une couche technique isolée.

Un modèle Mongoose et une validation Zod peuvent faire l'objet de commits sur une branche, mais ne justifient pas à eux seuls une PR par défaut.

La PR #5 constitue le lot documentaire global de cadrage en cours. Il ne faut pas multiplier les PR documentaires pendant cette phase.

En développement, viser des vertical slices cohérentes : backend, permissions, frontend, tests et documentation du lot lorsque cela est pertinent.

---


## 13. Point de reprise immédiat

Reprendre par la fin du bloc économique et RBAC, sans coder :

```text
1. matrice permissions finales
2. Objectif de marge → coefficient → prix théorique
3. prix conseillé / retenu
4. marge réelle / semi-nette
5. arrondis
```

Puis :

```text
Fiche process
→ détails Dossier / affectations
→ cadrage mathématique de l'Atelier d'optimisation
→ capabilities / quotas
→ intégrations / réglementation
→ V1 / hors V1
→ validation globale
→ cadrage M-001
```

Ne créer aucun modèle métier Mongoose avant validation du cadrage global.

Ne créer aucun second système de rôles, de Dashboard ou de navigation parallèle au Core.

Ne jamais confondre Workspace Owner et rôle Platform.
