# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : bootstrap technique validé — cadrage global produit VALIDÉ — cadrage détaillé M-001 EN COURS**
>
> **Dernière mise à jour : 2026-09-20**
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

## 2. Produit et état GitHub réel

Dépôt :

```text
greg44500/saas-fiches-techniques-gms
```

Main courant vérifié :

```text
a178e5635522ecb5561f4c5a1f802b55f94f00c3
Merge pull request #5 from greg44500/docs/product-business-framing-foundation
```

Validation de la PR #5 réellement vérifiée avant merge :

```text
Core Gate #36
run        : 35492367660
head       : 98ca2d21c7a8d7be2f50c95aed6f1110c7e1d3aa
conclusion : success
```

Une Core Gate #37 a ensuite été signalée sur le commit post-merge `a178e563...`. Sa conclusion n'a pas été récupérable via le connecteur GitHub utilisé dans la conversation ; ne pas extrapoler son résultat sans vérification disponible.

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

M-001 est désormais **en cours de cadrage détaillé**. Aucun module métier n'a encore été implémenté et aucun modèle Mongoose métier n'a été créé.

Les tests Core ne remplaceront jamais les futurs tests métier.

Le cadrage global du produit, commencé le 2026-09-19, a été validé et fusionné via la PR #5.

---

## 8. Cadrage métier désormais formalisé

Le lot documentaire global a été fusionné :

```text
PR #5 — Docs: formalize initial product business framing
état : merged
merge : a178e5635522ecb5561f4c5a1f802b55f94f00c3
```

Documents canoniques concernés :

```text
docs/PRODUCT-SCOPE.md
docs/ROADMAP.md
docs/domain/GLOSSARY.md
docs/domain/DOMAIN-MODEL.md
```

Ils sont désormais validés au niveau transversal. Le cadrage détaillé de M-001 poursuit ces contrats sans rouvrir les décisions globales, sauf contradiction démontrée par le code réel, les tests ou un contrat Core plus récent.

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


### 8.4.2 Détail Produit / Magasin

Décision validée :

- le détail d'un Produit dans un magasin affiche le Prix applicable HT courant ;
- une courbe montre l'évolution de ce Prix applicable HT dans le temps ;
- la vue affiche le nombre de Fiches techniques courantes utilisant le Produit ;
- la liste de ces fiches est accessible ;
- le compteur principal ne gonfle pas avec les versions historiques ;
- les fiches archivées peuvent être incluses via un filtre distinct ;
- toutes les données restent strictement limitées au magasin courant.

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

Le parcours d'invitation reste celui du Core : rôle à l'invitation, acceptation, création/activation du WorkspaceMember, puis affectation des Dossiers par le Workspace Owner. Le périmètre Dossier reste une donnée métier séparée et n'est pas préparé avant acceptation.


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

L'invitation Core reste strictement une entrée dans le Workspace : elle exige `email + roleId`, ne prépare aucun magasin et crée/réactive le `WorkspaceMember` seulement à l'acceptation. Après cette acceptation, le Workspace Owner affecte explicitement zéro, un ou plusieurs Dossiers.

Le Workspace Owner dispose implicitement de tous les dossiers et ne nécessite aucun `DossierAccessGrant` individuel.

Role et périmètre magasin évoluent indépendamment.

Lifecycle des affectations validé :

```text
WorkspaceMember SUSPENDED
→ grants conservés mais inopérants

WorkspaceMember REMOVED
→ grants métier à révoquer
→ aucune restauration silencieuse lors d'une future réinvitation
```

Le Core v1.0.1 intégré ne permet pas encore au produit de participer atomiquement à la transaction `removeWorkspaceMember()`. Ce besoin a été formalisé comme évolution générique Core ; il doit être vérifié au début de la prochaine conversation avant toute décision d'implémentation M-001.

### 8.7.2 Dossier / magasin — identité, lifecycle et UX

Le dossier possède désormais un cadrage plus précis :

- 1 dossier = 1 magasin ;
- nom / enseigne éventuelle ;
- localisation facultative avec assistance d'autocomplétion publique faisant partie de l'UX M-001 ; cette aide ne bloque jamais la création du Dossier et la saisie manuelle doit rester possible ;
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


### 8.7.4 TVA, chaîne économique et Atelier d'optimisation

TVA validée :

- coûts de fabrication toujours HT ;
- taux standard Workspace possible ;
- taux réellement applicable porté par la fiche/version ;
- snapshot TVA dans la version VALIDATED.

Chaîne économique validée :

```text
Objectif de marge
= (Prix de vente HT - Coût fabrication HT) / Prix de vente HT

coefficient
= 1 / (1 - objectif de marge)

Prix théorique HT
= Coût fabrication HT × coefficient

Prix théorique TTC
→ règle d'arrondi Workspace

Prix conseillé TTC
→ minimum commercial calculé

Prix définitif TTC
→ décision humaine
```

Invariants :

```text
Prix conseillé TTC >= Prix théorique TTC
Prix définitif TTC >= Prix conseillé TTC
```

Règle d'arrondi standard :

```text
multiple de 0,50 € immédiatement supérieur ou égal
```

Le Workspace peut utiliser des stratégies structurées personnalisées lorsque la capability le permet, par exemple une terminaison en `,90`. Aucune formule arbitraire n'est exécutée.

La marge réelle % et € est calculée depuis le Prix définitif.

La marge semi-nette reste volontairement non définie et ne bloque pas le développement.

Atelier d'optimisation :

- capability commerciale payante et différenciante ;
- logique « Lightroom des Fiches techniques » ;
- sliders globaux + courbe multipoints + histogramme métier ;
- bornes min/max configurables et garde-fous backend ;
- pièces/unités verrouillées ;
- composition à 100 % lorsque le poids final est verrouillé ;
- simulation non destructive ;
- application explicite au DRAFT ;
- mathématiques fines à cadrer avant M-005, pas avant M-001.

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



## 9. État réel du cadrage M-001

Le cadrage transversal est **VALIDÉ depuis le 2026-09-20**. Le cadrage détaillé de M-001 est désormais **EN COURS**.

Décisions finales fermées :

1. seul le nom du Dossier / magasin est obligatoire en saisie métier à la création ;
2. les affectations sont persistées dans une relation métier dédiée `DossierAccessGrant`, sans modification du `WorkspaceMember` Core ;
3. les coordonnées nominatives éventuelles sont minimisées et protégées, mais aucune contrainte réglementaire démontrée n'impose un champ métier obligatoire supplémentaire au Dossier ;
4. la cohérence documentaire a été revue ;
5. PRODUCT-SCOPE, ROADMAP, GLOSSARY et DOMAIN-MODEL passent au statut VALIDÉ.

### Sujets différés qui ne bloquent pas M-001

- marge semi-nette ;
- Fiche process ;
- OCR / IA ;
- imports avancés ;
- mathématiques fines de l'optimiseur ;
- catalogue complet des arrondis commerciaux ;
- purge physique définitive ;
- analyses avancées ;
- quotas non encore démontrés.

### Ordre de modules recommandé

```text
M-001 Dossiers / Magasins + affectations
M-002 Catalogue Produits
M-003 Fournisseurs + Articles + prix/catalogues
M-004 Fiches techniques + valorisation
M-005 Atelier d'optimisation Premium
M-006+ Process / imports / OCR / extensions
```

## 10. Point Core/Produit à vérifier impérativement à la reprise

Les points d'extension Core doivent être utilisés avant toute modification de fondation.

Le Core v1.0.1 confirme qu'un `WorkspaceMember` porte un seul Role, que l'invitation exige `email + roleId`, et qu'un membership `REMOVED` peut être réactivé lors d'une future invitation.

Le produit a démontré un besoin générique supplémentaire : lors de `WorkspaceMember → REMOVED`, un SaaS dérivé doit pouvoir invalider atomiquement ses relations métier liées au membership dans **la même transaction MongoDB** que le retrait Core.

Pour M-001 :

```text
SUSPENDED
→ DossierAccessGrant conservés
→ accès inopérant via le Core

REMOVED
→ DossierAccessGrant ACTIVE doivent devenir REVOKED
→ réinvitation ultérieure ne doit jamais restaurer automatiquement les anciens magasins
```

Vérification effectuée sur le Core v1.0.1 intégré : `removeWorkspaceMember()` ouvre sa propre transaction et n'expose ni hook lifecycle applicatif ni session externe. Une orchestration Produit en deux opérations ne garantirait donc pas l'atomicité et laisserait l'endpoint Core directement appelable.

Le besoin a été transmis au projet `saas-core-api` comme candidat Core générique : point d'extension transactionnel du lifecycle `WorkspaceMember`, au minimum pour `REMOVED`, avec composition explicite et session MongoDB active fournie au handler dérivé.

### Action obligatoire au début de la prochaine conversation

1. vérifier le `main` réel de `greg44500/saas-core-api` ;
2. vérifier si ce besoin a été cadré/implémenté/versionné ;
3. s'il existe une nouvelle release Core, lire son contrat canonique, ses tests, migrations éventuelles et instructions d'upgrade ;
4. si l'évolution existe, prévoir son intégration via `core-update/vX.Y.Z` avant l'implémentation M-001 ;
5. si elle n'existe pas encore, poursuivre le cadrage M-001 mais conserver le retrait atomique comme prérequis bloquant avant passage au code.

L'historique complet des invitations Workspace (`ACCEPTED / REVOKED / EXPIRED`) est un autre candidat Core générique, mais il reste **non bloquant** pour M-001.

Le périmètre Dossier lui-même reste strictement Produit et ne doit pas être ajouté à `WorkspaceMember` Core.

---

## 11. Gate avant tout code métier

Gate globale franchie le 2026-09-20 :

```text
PRODUCT-SCOPE validé
+
GLOSSARY validé
+
DOMAIN-MODEL validé
+
V1 / hors V1 validé
+
rôles / capabilities / quotas cadrés au niveau transversal nécessaire
+
contraintes réglementaires structurantes de M-001 vérifiées
+
ROADMAP validée
↓
cadrage M-001 autorisé
```

Aucun modèle métier Mongoose n'est encore autorisé tant que le cadrage détaillé de M-001 n'est pas validé.

Avant l'implémentation M-001, il faut également disposer d'un mécanisme Core validé permettant la révocation atomique des relations métier lors de `WorkspaceMember → REMOVED`, ou d'un contrat Core équivalent démontré comme sûr.

Seulement après validation de M-001 et résolution de ce prérequis Core :

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

La PR #5 a fusionné le cadrage global. Les mises à jour de reprise M-001 doivent rester des lots documentaires cohérents et ne pas devenir des micro-PR sans valeur de reprise.

En développement, viser des vertical slices cohérentes : backend, permissions, frontend, tests et documentation du lot lorsque cela est pertinent.

---



## 13. Point de reprise immédiat

Le cadrage global est clôturé et le **cadrage détaillé de M-001 — Dossiers / Magasins + affectations** est en cours.

### Première vérification obligatoire

Avant de reprendre les décisions M-001, vérifier `greg44500/saas-core-api` pour savoir si le besoin transactionnel `WorkspaceMember → REMOVED` a évolué depuis Core v1.0.1.

Question précise :

> Existe-t-il désormais un point d'extension Core canonique permettant à un SaaS dérivé de participer à la transaction de retrait d'un `WorkspaceMember` avec la même session MongoDB, afin d'invalider atomiquement ses relations métier ?

Si oui : identifier version/tag/commit, contrat, tests, éventuelles migrations et planifier `core-update/vX.Y.Z` du produit avant implémentation M-001.

Si non : ne pas inventer de contournement Produit non atomique ; poursuivre uniquement le cadrage et maintenir ce point comme prérequis avant code.

### Décisions M-001 déjà validées à ne pas rouvrir sans contradiction démontrée

- `1 Dossier = 1 magasin` ;
- seul le nom du Dossier est obligatoire ;
- adresse/localisation facultative ; autocomplétion intégrée à l'UX M-001 mais jamais bloquante ;
- nom non traité comme identifiant unique métier ;
- `DossierAccessGrant` séparé du `WorkspaceMember` Core ;
- Role = « quoi ? », grant = « où ? » ;
- invitation Core = `email + roleId`, aucun magasin dans l'invitation ;
- affectation des magasins seulement après acceptation et existence du `WorkspaceMember` ;
- un membre actif peut avoir zéro Dossier ;
- Owner implicitement sur tous les Dossiers, sans grant individuel ;
- `SUSPENDED` conserve les grants, inopérants ;
- `REMOVED` doit révoquer les grants ;
- réinvitation = anciens grants restent révoqués jusqu'à nouvelle décision explicite de l'Owner ;
- aucun quota/capability spécifique Dossier démontré à ce stade ;
- contexte magasin actif frontend = confort UX, jamais autorité de sécurité backend.

### Suite du cadrage M-001

1. fermer les permissions métier exactes ;
2. définir API REST et ordre des middlewares ;
3. définir validations Zod ;
4. définir audit et contrats d'erreur ;
5. fermer la matrice de transitions `ACTIVE / PAUSED / ARCHIVED / DELETED` ;
6. cadrer drawer Dossier, liste, gestion des affectations et activation du contexte magasin ;
7. choisir le contrat technique d'autocomplétion d'adresse avec fallback manuel ;
8. définir migrations/seeds si nécessaires ;
9. définir tests unitaires, intégration, permissions, tenancy et E2E critiques ;
10. fixer critères d'acceptation, dette différée et ordre d'implémentation ;
11. valider M-001 ;
12. seulement ensuite, et après résolution du prérequis Core `REMOVED`, créer la branche d'implémentation.

La marge semi-nette, la Fiche process, l'historique complet des invitations Core, l'OCR/IA et l'optimiseur détaillé restent différés et non bloquants pour le cadrage M-001.

Ne créer aucun modèle métier Mongoose avant validation détaillée de M-001.

Ne créer aucun second système de rôles, Dashboard ou navigation parallèle au Core.
