# SAAS-FICHES-TECHNIQUES-GMS — Cadrage produit

**Statut :** DRAFT — cadrage métier en cours  
**Dernière mise à jour :** 2026-09-19  
**Périmètre :** définition du problème métier, des principes produit et des invariants à préserver avant tout module métier

> Ce document formalise uniquement les décisions validées pendant le cadrage.  
> Les points encore ouverts sont explicitement signalés et ne doivent pas être transformés en règles techniques par anticipation.
>
> Aucun modèle métier Mongoose ne doit être créé tant que le cadrage global n'est pas validé.

---

## 1. Principe directeur

```text
Core = fondations génériques
Produit = métier
```

Le produit doit s'appuyer sur les mécanismes Core existants pour l'authentification, les Workspaces, la tenancy, le RBAC, les capabilities, les quotas, l'audit et les points d'extension.

Toute évolution générique nécessaire à plusieurs SaaS reste candidate au Core.

---

## 2. Problème métier

Le produit vise des utilisateurs qui travaillent pour un ou plusieurs magasins et doivent créer, maintenir et exploiter des fiches techniques et des fiches process à partir de produits réellement achetés.

Les conditions d'approvisionnement peuvent varier selon le magasin :

- fournisseur ;
- référence fournisseur ;
- conditionnement ;
- disponibilité ;
- prix ;
- date d'effet du prix.

Un même produit métier peut donc être utilisé dans plusieurs magasins avec des conditions commerciales différentes.

Le besoin principal est de centraliser les données produit et de les contextualiser automatiquement pour le magasin concerné afin d'obtenir des fiches techniques fiables, calculées et historisées.

---

## 3. Organisation générale validée

### 3.1 Workspace

Le Workspace reste la frontière de tenancy du Core.

Il représente l'espace de travail du client du SaaS et peut contenir plusieurs contextes magasin.

Les données métier d'un Workspace ne doivent pas être partagées implicitement avec un autre Workspace.

### 3.2 Dossier / magasin

L'utilisateur travaille dans un dossier correspondant au contexte d'un magasin pour lequel il réalise ses travaux.

Orientation actuelle :

```text
Workspace
→ plusieurs dossiers
→ chaque dossier contextualise le travail pour un magasin
```

Le dossier sert notamment à déterminer les prix, disponibilités et autres conditions applicables lors de la création et de la valorisation des fiches.

**Point restant à verrouiller :** confirmer si, en V1, un dossier représente toujours exactement un magasin et aucun autre type de contexte.

### 3.3 Catalogue commun au Workspace

Le Workspace dispose d'une base de produits commune dans laquelle les dossiers viennent puiser.

La donnée produit ne doit pas être dupliquée pour chaque magasin uniquement parce que son prix change.

---

## 4. Principe de fiabilité des données

Règle directrice :

> L'utilisateur déclare les faits métier nécessaires ; l'application contrôle, normalise et calcule automatiquement toute donnée qui peut être déduite.

Conséquences :

- une valeur calculable ne doit pas être demandée en saisie libre ;
- les validations frontend ne remplacent jamais les validations backend ;
- les valeurs dérivées sont calculées par la logique métier backend ;
- les incohérences sont bloquées ou signalées ;
- une valeur absente d'une source ne doit jamais être inventée ;
- les données historiques ne doivent pas être réécrites silencieusement par une modification ultérieure.

Exemples :

```text
quantités ingrédients
→ calcul automatique de la part dans la recette

prix + rendement + quantité
→ calcul automatique du coût matière

objectif de marge
→ calcul automatique du prix théorique

prix de vente retenu
→ calcul automatique de la marge réellement obtenue
```

---

## 5. Produit — définition métier validée

Un produit représente une denrée ou un composant utilisable dans une fiche technique, indépendamment de son fournisseur et de son prix.

### 5.1 Nom

Le nom doit être immédiatement compréhensible par l'utilisateur.

Règle de nommage :

- si le produit est entier ou utilisé dans sa forme standard : utiliser le nom simple ;
- si une préparation ou une forme modifie sa compréhension, son rendement ou son usage : préciser cette forme dans le nom.

Exemples :

```text
Carotte
Oignon
Rumsteck
Maquereau

Carotte râpée
Oignon émincé
Rumsteck tranché
Maquereau en filet
```

Il n'est pas prévu à ce stade d'ajouter un champ utilisateur séparé « forme/état ».

### 5.2 Données minimales du produit

Socle actuellement retenu :

- nom — obligatoire ;
- catégorie — nécessaire au classement, tri, recherche et aux analyses ;
- gamme alimentaire — uniquement lorsqu'elle est pertinente ;
- unité de référence — nécessaire aux calculs ;
- taux de rendement — caractéristique métier du produit ;
- photo — facultative ;
- notes — facultatives, sans logique métier cachée ;
- date de création — système ;
- date de dernière modification — système ;
- créé par — audit ;
- modifié par — audit ;
- historique des modifications significatives — à préserver.

### 5.3 Catégorie

La catégorie sert à classer et filtrer les produits et pourra alimenter les analyses futures.

La liste canonique des catégories n'est pas encore définie.

**Point ouvert :** catégorie unique ou possibilité d'appartenance multiple.

### 5.4 Gamme alimentaire

La notion de gamme n'est pas obligatoire pour tous les produits.

Lorsqu'elle est pertinente, le référentiel métier doit permettre les gammes 1 à 5 ainsi qu'une valeur « non applicable ».

Exemple validé :

```text
Farine
→ gamme : non applicable
→ rendement : 100 %
```

La gamme aide à comprendre la nature et le niveau de préparation/conservation du produit, mais ne doit jamais imposer à elle seule un rendement universel.

Référence professionnelle de cadrage :

- 1re gamme : frais ;
- 2e gamme : conserve / appertisé ;
- 3e gamme : surgelé ;
- 4e gamme : cru prêt à l'emploi ;
- 5e gamme : cuit prêt à l'emploi.

Cette classification est un référentiel professionnel ; elle ne doit pas être forcée lorsqu'elle n'est pas pertinente.

### 5.5 Unité de référence

Les calculs doivent reposer sur des unités normalisées, par exemple :

```text
masse
→ g / kg

volume
→ ml / cl / l

nombre
→ unité
```

Les notions comme carton, sac, boîte, seau ou barquette relèvent du conditionnement commercial et non de l'unité mathématique de référence du produit.

### 5.6 Taux de rendement

Le taux de rendement représente la part réellement valorisable du produit.

```text
100 %
→ 100 % du produit est utilisé

< 100 %
→ pertes, parage ou parties non valorisées
```

Exemples :

- carcasse de volaille ;
- peau ou arêtes de poisson ;
- épluchures de légumes.

Orientation validée :

- le rendement de référence est défini en amont sur le produit ;
- la fiche technique l'utilise automatiquement ;
- l'utilisateur ne ressaisit pas librement ce taux lors de la création ordinaire d'une fiche.

Lorsqu'une donnée objective permet le calcul du rendement, l'application doit le calculer automatiquement.

Exemple pour une conserve :

```text
poids net = 800 g
poids net égoutté = 480 g

rendement = 480 / 800 × 100
           = 60 %
```

Si le poids net égoutté n'est pas disponible, le système ne doit pas inventer le rendement.

**Extension à préserver :** possibilité future d'une exception de rendement documentée et historisée, sans obligation de la développer en V1.

---

## 6. Fournisseurs, articles fournisseur et prix

Le produit ne doit pas contenir directement :

- fournisseur ;
- référence fournisseur ;
- prix ;
- conditionnement fournisseur ;
- prix magasin.

Ces informations varient indépendamment du produit.

Le domaine doit donc distinguer conceptuellement :

```text
Produit
→ ce qui est utilisé dans la fiche

Fournisseur
→ acteur qui commercialise

Article / offre fournisseur
→ référence, désignation, marque éventuelle, conditionnement

Condition commerciale magasin
→ prix, disponibilité, date d'effet, historique
```

L'utilisateur doit pouvoir créer des fournisseurs et associer des produits à ces fournisseurs.

Le modèle ne doit pas empêcher qu'un même produit soit associé à plusieurs fournisseurs ou plusieurs références.

**Point ouvert :** règles de sélection d'un fournisseur ou article privilégié dans un magasin.

---

## 7. Conditionnement et colisage

Les fournisseurs peuvent commercialiser un produit avec des conditionnements différents :

- kg ;
- unité ;
- carton ;
- sac ;
- boîte ;
- barquette ;
- seau ;
- autres conditionnements à définir.

Le système doit conserver le conditionnement commercial tout en ramenant les calculs à une unité de référence normalisée.

Exemples conceptuels :

```text
Farine
→ unité de référence : kg
→ article fournisseur : sac de 25 kg

Boisson
→ unité de référence : L
→ article fournisseur : carton de 6 × 1 L
```

Pour les conserves, les données de poids net et de poids net égoutté doivent pouvoir être exploitées lorsqu'elles sont disponibles.

La liste et le paramétrage exact des conditionnements restent à cadrer.

---

## 8. Fiche technique — principes validés

La fiche technique est une donnée métier structurée, pas un document statique.

Elle doit s'appuyer sur le catalogue et le contexte du dossier/magasin.

### 8.1 Composition

Pour chaque ligne de composition, l'utilisateur choisit un produit et indique la quantité nécessaire.

L'application doit ensuite récupérer ou calculer les informations dérivées applicables :

- unité ;
- rendement ;
- prix applicable au magasin ;
- part du produit dans la recette ;
- coût de la ligne ;
- impact sur les totaux.

### 8.2 Part dans la recette

Le « % de la recette » représente la proportion du produit dans la totalité de la recette.

Il doit être calculé automatiquement à partir des quantités.

Exemple :

```text
recette totale = 10 kg
emmental = 1,5 kg

part de l'emmental = 1,5 / 10 × 100
                    = 15 %
```

La somme des proportions des composants de la recette doit tendre vers 100 % selon les règles exactes qui seront validées.

### 8.3 Rendement

Le « % utilisé » des exemples de fiches correspond au taux de rendement matière.

Il ne doit pas être confondu avec le « % de la recette ».

### 8.4 Valorisation économique

La composition technique et la valorisation économique doivent être distinguées.

Une même composition peut être revalorisée lorsque les prix changent.

Le système doit pouvoir conserver :

```text
composition
+
valorisation courante
+
historique des valorisations
```

Les exemples fournis montrent notamment les notions suivantes :

- prix d'achat ;
- prix de revient ligne ;
- prix de revient matières premières ;
- coût d'emballages / économat ;
- prix de revient total ;
- objectif de marge ;
- coefficient multiplicateur ;
- prix théorique correspondant à l'objectif ;
- prix de vente retenu / conseillé ;
- marge réellement obtenue ;
- taux de marge ;
- taux de marge semi-nette.

Toutes les formules ne sont pas encore validées.

Aucune formule non démontrée dans les sources métier ne doit être implémentée par hypothèse.

### 8.5 Emballages / décoration

Les exemples de fiches techniques distinguent les matières premières des emballages / décorations.

Le domaine doit donc permettre de valoriser séparément les consommables ou emballages nécessaires à la fiche.

**Point ouvert :** décider s'ils utilisent le même catalogue que les produits alimentaires ou un sous-type / domaine distinct.

---

## 9. Historique, évolution et analyses

L'historisation est une exigence de conception dès le départ.

### 9.1 Produit

Un produit doit permettre de consulter :

- ses modifications ;
- ses fournisseurs et références associés ;
- son historique de prix via les conditions commerciales ;
- son utilisation dans les fiches techniques ;
- les dossiers/magasins dans lesquels il intervient lorsque cette visibilité est autorisée.

### 9.2 Prix

Une mise à jour de prix ne doit pas simplement écraser l'ancienne valeur.

Le système doit préserver :

- ancien prix ;
- nouveau prix ;
- date d'effet ;
- écart en valeur ;
- écart en pourcentage ;
- fiches impactées ;
- conséquences sur leurs coûts et marges lorsque calculables.

### 9.3 Fiches techniques

Le système doit pouvoir distinguer :

```text
valorisation historique
→ ce qui était vrai lors d'une version/validation donnée

valorisation courante
→ ce que donnent les prix actuellement applicables
```

La consultation de l'écart doit être visuelle et facilement accessible.

Les alertes détaillées sont une extension à cadrer ; l'architecture ne doit pas les rendre difficiles à ajouter.

---

## 10. Fiche process

Le produit doit également gérer des fiches process de fabrication.

Le cahier des charges initial prévoit notamment :

- denrées ;
- temps / durées ;
- étapes de fabrication ;
- points critiques ;
- critères d'acceptabilité ;
- génération future possible d'une infographie synthétique.

Les exemples de fiches techniques contiennent déjà des colonnes « mode opératoire » et « temps ».

**Point ouvert :** définir la frontière exacte entre les informations process visibles dans une fiche technique et la fiche process détaillée reliée.

---

## 11. Politique d'extension

Principe validé :

> Les extensions identifiées doivent être prises en compte dans la conception afin d'éviter des refontes structurelles prévisibles, sans obligation de les développer immédiatement.

Trois niveaux sont distingués :

```text
Fonction V1
→ développée immédiatement

Extension planifiée
→ non développée immédiatement mais architecture compatible exigée

Extension éventuelle
→ possibilité identifiée sans créer d'abstraction complexe sans besoin démontré
```

Extensions actuellement identifiées :

- alertes visuelles sur prix, coûts et marges ;
- historique graphique ;
- comparaison de fournisseurs ;
- import de mercuriales ;
- OCR facture / mercuriale ;
- génération inversée de recette ;
- optimisation de marge assistée par IA ;
- analyse de portefeuille de fiches ;
- assistant de rédaction de process ;
- génération d'infographies process ;
- rappels / notifications ;
- recherche globale intelligente ;
- exports PDF / CSV ;
- envoi direct de documents par e-mail.

Aucune de ces extensions n'est considérée comme V1 uniquement parce qu'elle est citée ici.

---

## 12. Paramètres métier

Un futur panneau de paramètres est identifié comme utile, mais son développement peut être différé.

Le cadrage doit néanmoins éviter de coder en dur des valeurs qui pourront devenir configurables.

Paramètres candidats déjà identifiés :

- taux de TVA ;
- objectif de marge par défaut ;
- règles d'arrondi ;
- unités par défaut ;
- seuils d'alerte ;
- règles de présentation ;
- catégories ;
- conditionnements ;
- autres valeurs réellement démontrées par la suite du cadrage.

Principe :

```text
valeur système / référentiel
→ éventuellement valeur Workspace
→ éventuellement valeur dossier/magasin
→ éventuellement valeur fiche
```

La hiérarchie exacte reste à définir au cas par cas.

Il faut distinguer :

- valeur par défaut ;
- contrainte obligatoire ;
- seuil d'alerte.

Le panneau de paramètres peut être reporté tant que les données susceptibles d'être paramétrables ne sont pas codées comme constantes rigides.

---

## 13. Utilisateurs et rôles

À ce stade, le seul acteur métier explicitement établi est :

- utilisateur travaillant dans un Workspace et créant/utilisant des dossiers magasin, produits, fiches techniques et fiches process selon ses autorisations.

Les rôles métier précis ne sont pas encore validés.

Les rôles Core existants et les permissions métier futures doivent rester distincts.

---

## 14. V1 / hors V1

Le périmètre V1 n'est pas encore finalisé.

Éléments considérés comme fondamentaux pour le cadrage du socle :

- Workspace + dossiers magasin ;
- catalogue produits commun au Workspace ;
- catégories ;
- gamme lorsque pertinente ;
- rendement produit ;
- fournisseurs ;
- conditionnements ;
- prix contextualisés par magasin ;
- historique des prix ;
- fiches techniques calculées ;
- traçabilité des changements ;
- base de fiche process.

Les arbitrages précis V1 / différé seront réalisés après cadrage des fournisseurs, des calculs de fiche technique et de la fiche process.

---

## 15. Points ouverts à résoudre avant validation globale

- confirmer la cardinalité exacte dossier ↔ magasin ;
- définir la liste et la gouvernance des catégories ;
- décider catégorie unique ou multiple ;
- préciser les types d'unités de référence supportés ;
- préciser le paramétrage des conditionnements ;
- définir les règles de sélection fournisseur/article dans un magasin ;
- valider toutes les formules financières des fiches ;
- valider la TVA et sa portée ;
- valider la notion de prix de vente conseillé / retenu ;
- définir le calcul de la marge semi-nette ;
- définir le traitement exact des emballages ;
- définir la frontière fiche technique / fiche process ;
- cadrer les utilisateurs et rôles métier ;
- cadrer capabilities et quotas commerciaux ;
- cadrer les intégrations externes V1 ;
- cadrer les contraintes réglementaires réellement applicables ;
- finaliser le périmètre V1 / hors V1 ;
- finaliser la roadmap ;
- seulement ensuite proposer M-001.

---

## 16. Sources de cadrage utilisées

Le présent document synthétise les éléments métier fournis et validés le 2026-09-19 à partir de :

- échanges de cadrage avec le porteur du produit ;
- cahier des charges initial « SAAS-FICHES-TECHNIQUES-GMS » ;
- trois exemples de fiches recettes Bruschetta (Italienne, Royale, Normande) ;
- exemples de tarifs fournisseurs Sysco et SCAL ;
- référentiels professionnels sur les gammes alimentaires.

Référence officielle consultée pour la terminologie des gammes :

- Direction des Affaires juridiques, Ministère de l'Économie — glossaire d'indexation des prix des denrées alimentaires : https://www.economie.gouv.fr/files/files/directions_services/daj/marches_publics/oeap/concertation/autres_groupes_travail/indexation-prix-denrees-alimentaires.pdf

La source métier utilisateur prime sur les hypothèses lorsqu'une règle spécifique au produit est validée.
