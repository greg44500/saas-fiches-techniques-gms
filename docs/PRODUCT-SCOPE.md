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

**Règle V1 validée :** un dossier correspond exactement à un magasin. Le dossier est donc le contexte métier du magasin dans le SaaS.

### 3.3 Isolation stricte des contextes magasin

L'accès d'un utilisateur à plusieurs magasins permet de **changer de contexte**, jamais de fusionner les contextes.

Invariant :

```text
contexte actif = un seul dossier / magasin
```

Toutes les données commerciales contextualisées utilisées dans une Fiche technique doivent provenir du magasin actif :

- Tarif négocié ;
- Prix facturé ;
- revue tarifaire ;
- autres conditions commerciales locales.

Un prix spécifique d'un autre magasin ne fait jamais partie de la chaîne de fallback, même si l'utilisateur possède les droits d'accès aux deux magasins.

Exemple :

```text
Fiche du Magasin Nantes
→ Prix facturé Nantes si applicable
→ sinon Tarif négocié Nantes
→ sinon Tarif fournisseur de référence

Tarif négocié Saint-Nazaire
→ jamais utilisé dans le contexte Nantes
```

Le contrôle doit être garanti par le backend et non par l'interface seule.

Le Workspace Owner peut accéder à tous les magasins, et un collaborateur peut recevoir un périmètre multi-magasins, mais tous travaillent toujours dans un contexte magasin actif lorsqu'ils créent, modifient ou valorisent une fiche.

### 3.4 Catalogue commun au Workspace

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

## 6. Fournisseurs, articles fournisseur et tarifs

Le Produit ne contient pas directement son fournisseur, sa référence commerciale, son conditionnement ni son prix.

Le domaine distingue conceptuellement :

```text
Produit
→ ce qui est réellement utilisé dans une fiche

Fournisseur
→ acteur qui commercialise

Article fournisseur
→ référence commerciale précise d'un Produit chez un Fournisseur

Tarif fournisseur de référence
→ prix issu d'un catalogue / mercuriale sans magasin nécessaire

Tarif spécifique magasin
→ condition commerciale connue pour un magasin donné

Prix observé
→ prix réellement constaté, par exemple sur une facture
```

### 6.1 Fournisseur

Les fournisseurs sont créés et gérés par le client ; Sysco et SYCAL ne sont que les premières sources réelles disponibles pour les essais.

Le Fournisseur n'est pas un CRM. Le socle envisagé reste volontairement simple : nom, éventuel code interne, coordonnées/notes facultatives, statut et traçabilité.

### 6.2 Plusieurs articles pour un même Produit

Règle validée :

> Un même Produit peut être associé à plusieurs Articles fournisseur actifs chez un même Fournisseur.

Exemple :

```text
Mozzarella râpée
└── Sysco
    ├── réf. A123 — sac 2 kg
    ├── réf. B456 — carton 4 × 2,5 kg
    └── réf. C789 — sachet 500 g
```

Chaque Article fournisseur possède sa propre référence, sa désignation fournisseur, son conditionnement, ses tarifs et son historique.

Le modèle doit également permettre qu'un même Produit soit proposé par plusieurs Fournisseurs.

### 6.3 Données d'un Article fournisseur

Le socle fonctionnel doit pouvoir représenter au minimum :

- Fournisseur ;
- Produit associé ;
- référence fournisseur lorsqu'elle existe ;
- désignation fournisseur originale ;
- marque éventuelle ;
- conditionnement structuré ;
- libellé fournisseur du conditionnement ;
- poids net lorsqu'il est pertinent ;
- poids net égoutté lorsqu'il est pertinent ;
- statut actif / archivé ;
- dates et auteurs de création / modification.

La désignation fournisseur originale est conservée même si le SaaS utilise un nom Produit métier plus lisible.

### 6.4 Tarif fournisseur de référence

L'utilisateur ne connaît pas nécessairement à l'avance le magasin dans lequel il travaillera.

Les catalogues Sysco et SYCAL disponibles constituent donc des **tarifs fournisseur de référence**, indépendants de tout magasin tant qu'aucune information plus précise n'est connue.

Un tarif catalogue ne doit jamais être présenté comme un tarif négocié magasin sans preuve.

### 6.5 Tarif spécifique magasin

Lorsqu'un prix propre à un magasin est connu, il est enregistré séparément.

Il ne remplace pas ni ne détruit le tarif fournisseur de référence.

Exemple conceptuel :

```text
Tarif catalogue Sysco
→ 2,180 €/kg HT

Tarif spécifique Magasin A
→ 2,050 €/kg HT
```

Le choix exact du tarif applicable dans une fiche lorsqu'il existe plusieurs sources reste à finaliser.

### 6.6 Prix observé et provenance

Une facture, une saisie contrôlée, un import ou un futur OCR peuvent produire une nouvelle observation de prix.

Une observation doit être rattachable à :

- Article fournisseur ;
- Fournisseur ;
- date ;
- montant ;
- unité d'expression du prix ;
- provenance ;
- magasin/dossier lorsque celui-ci est identifiable.

Provenances déjà identifiées :

- catalogue fournisseur ;
- mercuriale ;
- tarif spécifique magasin ;
- facture ;
- saisie manuelle ;
- import fichier ;
- futur OCR.

L'OCR est une extension différable. Il devra alimenter le même historique tarifaire et ne jamais écraser automatiquement un prix existant sans contrôles suffisants.

### 6.7 Historisation

Une nouvelle donnée tarifaire ajoute une nouvelle réalité temporelle ; elle ne doit pas écraser silencieusement l'ancienne.

Le système doit pouvoir déterminer :

- valeur source ;
- valeur normalisée ;
- date / période d'effet ;
- provenance ;
- contexte magasin éventuel ;
- date et auteur d'enregistrement.

**Point ouvert :** priorité exacte entre tarif fournisseur de référence, tarif magasin et prix observé pour déterminer le prix applicable à une fiche.

### 6.8 Politique de Prix applicable du Workspace

La stratégie générale de sélection du prix est un **paramètre du Workspace** et s'applique à tous ses magasins/dossiers.

Modes retenus :

~~~text
Tarif fournisseur
Tarif négocié
Prix facturé
~~~

Valeur standard validée :

~~~text
Tarif négocié
~~~

La stratégie est commune au Workspace, mais les valeurs tarifaires restent strictement contextualisées par magasin.

Règles de fallback validées :

~~~text
Mode Tarif fournisseur
→ Tarif fournisseur de référence applicable

Mode Tarif négocié
→ Tarif négocié valide pour le magasin + Article + date
→ sinon Tarif fournisseur de référence applicable

Mode Prix facturé
→ dernier Prix facturé VALIDE, exploitable et suffisamment frais
   pour le magasin + Article
→ sinon Tarif négocié valide pour ce même magasin
→ sinon Tarif fournisseur de référence applicable
~~~

Un prix spécifique d'un autre magasin n'entre jamais dans cette chaîne de résolution.

Le backend conserve et expose au minimum :

- l'Article fournisseur réellement retenu ;
- la source tarifaire réellement utilisée ;
- la valeur source ;
- la valeur normalisée ;
- la date/période pertinente ;
- le contexte magasin ;
- le fait qu'un fallback ait été appliqué ;
- la raison du fallback ;
- les alertes de validité ou de fraîcheur ;
- les actions encore autorisées.

Le frontend ne reconstruit jamais cette logique et ne possède aucune liste statique ou valeur de remplacement métier.

Le Prix applicable n'est donc pas une propriété globale du Produit. Il résulte du contexte :

~~~text
Produit
× magasin/dossier
× Article fournisseur
× politique de prix du Workspace
× date de valorisation
~~~

Un Produit peut être non valorisable dans un magasin et valorisable dans un autre. Il peut également exister dans le catalogue sans Prix applicable courant.

### 6.9 Temporalité des différentes sources tarifaires

Les trois familles de prix ne portent pas la même temporalité :

~~~text
Tarif fournisseur
→ édition / millésime / période de validité du catalogue

Tarif négocié
→ période de validité de la condition commerciale

Prix facturé
→ fraîcheur opérationnelle calculée depuis la date de facture
~~~

Ces notions ne doivent jamais être fusionnées dans un champ générique d'ancienneté.

Une revue opérationnelle est également distincte de ces temporalités : elle confirme qu'un contrôle a été effectué mais ne prolonge pas artificiellement une validité commerciale.

### 6.10 Prix facturé exploitable et fraîcheur

Un prix lu ou importé depuis une facture n'est pas automatiquement utilisable dans les calculs.

Pour devenir exploitable, un Prix facturé doit pouvoir être rattaché sans ambiguïté :

- au bon Fournisseur ;
- au bon Article fournisseur ;
- au bon magasin/dossier ;
- à une date de facture ;
- à un prix source et une unité d'expression ;
- aux données suffisantes pour calculer un prix normalisé fiable.

Il doit également être explicitement validé.

États fonctionnels minimaux :

~~~text
À VALIDER
→ conservé mais non utilisable comme Prix applicable

VALIDÉ
→ peut devenir Prix applicable si les autres règles sont satisfaites

REJETÉ
→ conservé pour la traçabilité mais jamais utilisé
~~~

La fraîcheur est calculée à partir de la **date de facture**, jamais à partir de la date d'import, d'OCR ou de validation.

Comportement standard retenu :

~~~text
durée de fraîcheur standard
→ 1 an
~~~

La convention technique exacte entre douze mois calendaires et 365 jours reste à fixer avant implémentation.

Le Workspace peut personnaliser cette durée lorsqu'il dispose de la capability commerciale correspondante.

L'expiration de fraîcheur :

- ne change pas le statut VALIDÉ du Prix facturé ;
- ne détruit pas son historique ;
- le rend seulement inéligible à la résolution automatique courante ;
- déclenche le fallback vers le Tarif négocié valide du même magasin puis, à défaut, vers le Tarif fournisseur de référence.

La raison de ce fallback doit rester explicable.

### 6.11 Catalogues fournisseur de référence

Le SaaS peut proposer des catalogues fournisseur de référence préchargés afin que le premier usage soit réellement exploitable sans obliger le client à recréer manuellement chaque Article fournisseur.

Un catalogue doit être identifiable par des informations conceptuelles telles que :

- Fournisseur ;
- édition / millésime ;
- date de début et de fin éventuelles ;
- source ;
- date d'intégration ;
- statut/fraîcheur de la source.

Un catalogue ancien n'est pas écrasé par une édition plus récente.

Exemple :

~~~text
catalogue 2026 consulté en 2027
→ reste historique et exploitable comme source de référence
→ clairement signalé hors période de validité
→ jamais présenté comme un prix actuel sans avertissement
~~~

La résolution peut utiliser un ancien Tarif fournisseur lorsqu'aucune meilleure source n'existe, mais le backend doit alors exposer l'édition, sa période et son état de validité.

Les catalogues fournisseur partagés ne contiennent aucune condition commerciale confidentielle propre à un magasin.

L'import futur de catalogues structurés CSV/XLS/XLSX doit produire une nouvelle édition et non écraser l'ancienne. Le flux envisagé est :

~~~text
lecture
→ détection/présentation des colonnes
→ mapping utilisateur
→ contrôles références / unités / conditionnements
→ détection des doublons et incohérences
→ aperçu
→ validation
→ nouvelle édition historisée
~~~

Le mapping propre à un Fournisseur doit pouvoir être mémorisé et réutilisé.

L'IA n'est pas nécessaire pour les fichiers structurés. Elle pourra plus tard assister le mapping ambigu, l'interprétation de documents complexes ou l'OCR, mais ne deviendra jamais l'autorité qui écrit directement un prix exploitable sans contrôles métier et validation.

### 6.12 Sélection d'Article fournisseur et références du magasin

Un Produit peut correspondre à plusieurs Articles fournisseur exploitables dans un même magasin.

Le SaaS ne sélectionne jamais arbitrairement l'Article le moins cher.

Règles validées :

1. un Article explicitement choisi pour une ligne reste attaché à la version de fiche concernée ;
2. si un seul Article est réellement exploitable dans le contexte courant, le backend peut le résoudre automatiquement ;
3. si plusieurs Articles sont exploitables et qu'aucune décision explicite ne permet de les départager, le backend remonte une sélection nécessaire ;
4. aucun Article d'un autre magasin n'est utilisé pour résoudre le contexte courant ;
5. un changement d'Article est distinct d'une simple revalorisation du même Article et doit être traçable.

Le raccourci opérationnel du magasin porte sur des **références favorites**, c'est-à-dire des Articles fournisseur précis, et non sur un Produit générique seul.

Une référence favorite identifie donc indirectement :

~~~text
Produit
+ Fournisseur
+ Article fournisseur
+ conditionnement
+ magasin
~~~

Le prix n'est pas stocké dans le favori : il est résolu dynamiquement par le backend selon le magasin, la politique du Workspace et la date.

Plusieurs références favorites peuvent correspondre au même Produit.

Le SaaS distingue également :

~~~text
Référence favorite
→ préférence opérationnelle du magasin

Référence fréquemment utilisée
→ observation calculée de l'usage réel
~~~

Ces deux états peuvent coexister. Ils ne créent pas deux catalogues : une vue unique « Références du magasin » peut proposer des filtres ou priorités Favorites / Fréquemment utilisées / Catalogue complet.

Une référence fréquemment utilisée est déterminée à partir de Fiches techniques VALIDÉES distinctes du magasin. Les nouvelles versions ou revalorisations d'une même fiche ne doivent pas gonfler artificiellement ce compteur.

La politique Workspace pourra déterminer :

~~~text
manuel uniquement
ou
suggestion automatique
ou
ajout automatique aux favoris
~~~

Le seuil exact reste configurable et sa valeur standard définitive reste à valider.

Un retrait manuel doit être respecté par l'automatisme et une référence favorite ne disparaît pas automatiquement parce que sa fréquence d'usage baisse.

Chaque Produit et Article proposé à la sélection doit disposer d'une **carte d'identité professionnelle** fournie par le backend et affichable par le frontend, notamment via une infobulle/détail contextuel. Elle doit permettre de vérifier sans ambiguïté le Produit, le Fournisseur, la référence, la désignation d'origine, la marque éventuelle, le conditionnement, le Prix applicable dans le magasin courant, sa source, sa validité/fraîcheur et les alertes pertinentes.

---

## 7. Conditionnement et colisage

Le conditionnement fournisseur doit être lisible pour l'utilisateur **et structuré pour les calculs**.

Un simple texte comme `carton 4 × 2,5 kg` ne suffit pas comme seule donnée.

Le domaine doit pouvoir représenter conceptuellement :

```text
type de conditionnement : carton
nombre d'unités        : 4
quantité par unité     : 2,5
unité                  : kg

quantité totale calculée
→ 10 kg
```

Exemples :

```text
sac de 25 kg
→ 1 × 25 kg
→ total 25 kg

carton de 6 × 1 L
→ total 6 L

carton de 24 × 125 g
→ total 3 kg
```

Le système conserve également le libellé fournisseur d'origine lorsqu'il existe (`5/1`, `4/4`, `6X1KG`, etc.) sans dépendre de ce texte pour les calculs.

Pour les conserves ou produits comparables, les données de poids net et de poids net égoutté doivent pouvoir être exploitées lorsqu'elles sont disponibles.

### 7.1 Prix source et prix normalisé

Le SaaS conserve le prix tel qu'il est fourni par le Fournisseur puis calcule, lorsque les données sont suffisantes, un prix normalisé dans l'unité de référence.

Exemple :

```text
sac de farine : 25 kg
prix fournisseur : 40,625 € HT / sac

prix normalisé
→ 1,625 €/kg HT
```

Le prix source et le prix normalisé restent tous les deux traçables.

Si les données de conditionnement ne permettent pas une conversion fiable, le prix normalisé reste indisponible et le système signale l'information manquante ; il ne devine pas.

### 7.2 Précision des prix

Règle validée :

> Les prix d'achat unitaires et les prix normalisés sont affichés avec exactement trois décimales.

Exemples :

```text
1,625 €/kg HT
2,300 €/L HT
4,000 €/unité HT
```

Une source `2,68 €/kg` s'affiche `2,680 €/kg`.

Cette règle d'affichage ne doit pas provoquer d'arrondi prématuré dans le moteur de calcul. La précision interne nécessaire est conservée jusqu'au point d'arrondi métier défini.

La règle d'affichage des montants totaux et prix de vente finaux sera cadrée séparément.

---

## 8. Fiche technique — principes validés

La fiche technique est une donnée métier structurée, pas un document statique.

Elle s'appuie sur le catalogue, les Articles fournisseur, les données tarifaires et le contexte éventuel du dossier/magasin.

### 8.1 Quantité nette saisie

Règle validée :

> L'utilisateur saisit la quantité nette réellement nécessaire et présente dans la recette.

Le système ne demande pas à l'utilisateur de calculer la quantité brute nécessaire avant pertes.

### 8.2 Quantité brute calculée

Le système applique automatiquement le rendement Produit :

```text
quantité brute nécessaire
=
quantité nette / rendement
```

Exemple :

```text
Oignon
quantité nette : 1,000 kg
rendement : 80 %

quantité brute
= 1,000 / 0,80
= 1,250 kg
```

Pour un Produit à 100 % de rendement, quantité nette et quantité brute sont identiques.

### 8.3 Part dans la recette

Le « % de la recette » est calculé automatiquement sur les **quantités nettes réellement présentes dans la recette**.

Les pertes de rendement influencent la quantité brute nécessaire et le coût, mais ne modifient pas la composition proportionnelle de la recette.

Exemple :

```text
Oignon net : 1 kg
Tomate nette : 3 kg
Total net recette : 4 kg

Oignon
→ 25 %

Tomate
→ 75 %
```

Le « % de la recette » reste distinct du taux de rendement.

### 8.4 Prix d'achat et coût de ligne

Règle validée :

> Le coût matière est basé sur les prix d'achat HT.

Pour une ligne d'ingrédient :

```text
quantité brute nécessaire
×
prix d'achat HT normalisé
=
coût matière HT de la ligne
```

Exemple :

```text
Oignon
quantité nette : 1,000 kg
rendement : 80 %
quantité brute : 1,250 kg
prix achat : 1,625 €/kg HT

coût ligne
= 1,250 × 1,625
= 2,03125 € HT
```

Le moteur conserve la précision nécessaire ; les règles d'arrondi des montants agrégés restent à cadrer.

### 8.5 Coût Matière

Définition métier validée :

> **Coût Matière (CM) = somme des coûts HT de toutes les lignes d'ingrédients.**

```text
CM HT
=
Σ coûts HT des lignes d'ingrédients
```

### 8.6 Économat

L'Économat regroupe les consommables achetés nécessaires à la fabrication, au conditionnement ou à la commercialisation du produit.

Exemples :

- barquette ;
- étiquette ;
- film ;
- sachet ;
- autres consommables.

L'Économat est une nature de marchandise achetée différente des ingrédients mais intégrée dans la fiche technique.

Les consommables peuvent utiliser les mêmes mécanismes d'approvisionnement que les ingrédients :

- Fournisseur ;
- Article fournisseur ;
- conditionnement ;
- tarif HT ;
- historique.

Ils ne sont pas soumis aux attributs alimentaires qui ne leur sont pas applicables, notamment gamme alimentaire, rendement matière ou % de recette.

Chaque consommable possède une unité de référence adaptée à sa consommation réelle : unité, mètre, kg, litre, etc.

L'utilisateur saisit la quantité réellement consommée dans la fiche ; le SaaS normalise le prix fournisseur et calcule automatiquement le coût de la ligne d'Économat.

Exemple :

```text
Barquette
carton de 300
prix carton : 42,000 € HT

prix normalisé
→ 0,140 €/unité HT

fiche technique
→ 1 barquette
→ coût Économat : 0,140 € HT
```

### 8.7 Coût total de fabrication

Définition métier validée :

> **Coût total de fabrication = Coût Matière + Économat.**

```text
Coût total de fabrication HT
=
CM HT + Économat HT
```

L'énergie est explicitement exclue de ce calcul.

Aucune autre charge ne doit être ajoutée à cette définition sans nouvelle validation métier.

### 8.8 Valorisation économique

La composition technique et la valorisation économique restent distinctes.

Une même composition peut être revalorisée lorsque les tarifs changent.

Le système doit pouvoir conserver :

```text
composition
+
valorisation courante
+
historique des valorisations
```

Restent à valider avant implémentation :

- règle exacte du prix applicable lorsqu'il existe plusieurs sources tarifaires ;
- TVA et sa portée ;
- objectif de marge ;
- coefficient multiplicateur ;
- prix théorique ;
- prix de vente retenu / conseillé ;
- marge réellement obtenue ;
- taux de marge ;
- taux de marge semi-nette ;
- arrondis des totaux et prix de vente.

Aucune formule non démontrée ne doit être implémentée par hypothèse.

### 8.9 Concurrence, revalorisation et prix modifiés en cours de travail

Une modification tarifaire crée une nouvelle réalité temporelle et ne réécrit jamais silencieusement le prix déjà utilisé dans une Fiche technique en cours.

Lorsqu'une Fiche technique est calculée, elle doit pouvoir conserver la référence Article, la source tarifaire et les valeurs effectivement utilisées pour expliquer son état courant.

Si un prix change pendant l'édition :

- le nouveau tarif devient disponible selon sa date d'effet ;
- la fiche en cours ne change pas silencieusement ;
- le backend détecte qu'une revalorisation est disponible ou nécessaire ;
- avant validation, le backend vérifie que la valorisation est toujours cohérente avec les données applicables ;
- si elle ne l'est plus, la validation est refusée jusqu'à revalorisation explicite.

Aucun verrou global n'empêche un Économe ou un Acheteur de mettre à jour un tarif uniquement parce qu'une fiche est ouverte ailleurs.

Un changement de prix sur le même Article est une revalorisation. Un changement d'Article fournisseur est une modification d'approvisionnement distincte et traçable.

### 8.10 Copie d'une Fiche technique entre magasins

Une Fiche technique peut être copiée/importée d'un magasin vers un autre afin d'éviter une ressaisie inutile.

Cette opération copie uniquement la structure métier réutilisable, notamment :

- Produits / ingrédients ;
- quantités ;
- unités ;
- autres données de composition explicitement réutilisables.

Elle ne copie jamais :

- Prix facturés ;
- Tarifs négociés ;
- Prix applicables calculés ;
- valorisations économiques ;
- historique tarifaire ;
- historique de validation ou de revalorisation du magasin source.

La fiche cible constitue une nouvelle fiche dans un nouveau contexte.

~~~text
composition copiée
→ résolution des Articles et Prix dans le magasin cible
→ recalcul complet
→ nouvel historique local
~~~

Une provenance minimale vers la fiche source peut être conservée pour l'audit, sans transférer son historique économique.

### 8.11 Versionnement et validation

La Fiche technique est une identité durable portant des versions successives.

États conceptuels validés :

~~~text
DRAFT
→ travail en cours
→ non officiel
→ peut être incomplet ou temporairement non valorisable

VALIDATED
→ version officielle validée
→ historiquement immuable

ARCHIVED
→ sortie de l'usage actif
→ historique et valorisation conservés
~~~

Une modification d'une version VALIDATED ne réécrit jamais cette version. Elle crée ou ouvre une nouvelle version DRAFT.

Une revalorisation peut produire une nouvelle version DRAFT dont la composition est inchangée mais dont les prix et coûts sont recalculés. Elle doit ensuite être explicitement validée.

Chaque version validée doit conserver le snapshot nécessaire à la reproductibilité économique : Produit, Article fournisseur réellement utilisé, quantités, rendement, Prix applicable, source, contexte magasin, date de valorisation et autres données indispensables.

Le backend doit pouvoir expliquer les différences entre versions, par exemple :

~~~text
composition inchangée
+ 4 lignes tarifaires modifiées
+ Coût Matière modifié
+ nature = REVALORISATION
~~~

Les libellés techniques exacts des types de version seront fixés lors du cadrage du module.

### 8.12 Conditions de validation et invariants

La validation est une action backend explicite.

Elle doit notamment recontrôler :

- membership et permissions ;
- accès au dossier/magasin ;
- complétude requise ;
- cohérence des quantités ;
- Article fournisseur réellement utilisable ;
- présence d'un Prix applicable pour chaque ligne devant être valorisée ;
- actualité de la valorisation ;
- changements concurrents incompatibles.

L'absence de prix n'est jamais représentée par zéro.

~~~text
prix absent
≠
prix à 0
~~~

Une Fiche technique VALIDATED exige que chaque ligne requise soit correctement valorisée. Un total de fabrication nul ne peut pas rendre une fiche officielle par simple convention.

Ces invariants s'appliquent à tous les utilisateurs, y compris au Workspace Owner.

### 8.13 Archivage, restauration et suppression

Le cycle de vie normal privilégie l'archivage.

Une version ou fiche archivée conserve sa vraie valorisation et son historique :

~~~text
ARCHIVED
≠
UNVALUED
≠
ZERO
~~~

Aucune suppression automatique n'est déclenchée uniquement par l'âge.

Le Workspace Owner peut, selon la politique de cycle de vie du Workspace, supprimer définitivement une fiche ancienne déjà archivée, sous contrôles backend, audit et règles de rétention applicables.

Une fiche VALIDATED active ne doit pas être supprimée directement : le parcours normal est archivage puis éventuelle suppression définitive.

La suppression définitive traite la fiche et ses versions comme une unité cohérente ; elle ne supprime pas arbitrairement une version intermédiaire.

Un audit minimal de suppression doit être préservé lorsque le contenu est détruit : identité de la fiche, Workspace, magasin, acteur, date et raison selon le contrat à finaliser.

Les exigences légales ou réglementaires de rétention restent à cadrer avant implémentation.

---

## 9. Historique, évolution et analyses

L'historisation est une exigence de conception dès le départ.

### 9.1 Produit

Un Produit doit permettre de consulter :

- ses modifications ;
- ses Articles fournisseur associés ;
- ses Fournisseurs associés ;
- son historique commercial ;
- son utilisation dans les fiches techniques ;
- les dossiers/magasins concernés lorsque cette visibilité est autorisée.

### 9.2 Tarifs

Une mise à jour tarifaire ne doit pas simplement écraser l'ancienne valeur.

Le système doit préserver :

- ancien prix ;
- nouveau prix ;
- unité d'expression ;
- date / période ;
- provenance ;
- contexte magasin éventuel ;
- valeur normalisée lorsque calculable ;
- écart en valeur ;
- écart en pourcentage ;
- fiches potentiellement impactées.

Il doit être possible de distinguer l'évolution d'un tarif fournisseur de référence de celle d'un tarif ou prix observé spécifique à un magasin.

### 9.3 OCR / facture

Extension structurellement prévue :

```text
Facture
→ OCR
→ fournisseur / date / établissement / référence / quantité / prix
→ rapprochement Article fournisseur
→ contrôles
→ validation si nécessaire
→ nouvelle observation tarifaire historisée
```

L'OCR ne doit jamais écraser directement un prix sur la seule base d'une lecture automatique.

### 9.4 Fiches techniques

Le système doit pouvoir distinguer :

```text
valorisation historique
→ valeurs réellement utilisées lors d'une version / date donnée

valorisation courante
→ recalcul à partir des données actuellement applicables
```

La consultation des écarts de coûts et marges doit pouvoir devenir visuelle et facilement accessible.

Les alertes et graphiques détaillés peuvent être différés ; les données nécessaires doivent être préservées dès le socle.

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

## 12. Paramètres métier et configuration du Workspace

Le panneau de configuration métier est une surface structurante du produit et doit rester accessible au Workspace Owner.

Aucun paramétrage préalable ne doit être obligatoire pour commencer à travailler : le SaaS fournit des comportements standards immédiatement utilisables.

Pour chaque paramètre configurable, le backend distingue conceptuellement :

~~~text
valeur standard
→ fournie par le SaaS

valeur configurée
→ choix explicite du Workspace lorsqu'il en a le droit

valeur effective
→ valeur réellement appliquée par le moteur

droit de personnalisation
→ capability commerciale effective
~~~

Le frontend ne code jamais une valeur de remplacement selon le nom d'un plan. Il consomme la valeur effective et les droits exposés par le backend.

Portées possibles à examiner au cas par cas :

~~~text
système
Workspace
dossier / magasin
fiche
~~~

La présence de ces portées dans le modèle conceptuel ne signifie pas qu'elles seront toutes implémentées.

Paramètres candidats déjà identifiés :

- politique de Prix applicable ;
- durée de fraîcheur des Prix facturés ;
- politique des références favorites/fréquemment utilisées ;
- politique de cycle de vie des Fiches techniques ;
- TVA ;
- objectif de marge ;
- coefficient ;
- règles d'arrondi ;
- unités, catégories et conditionnements lorsque leur gouvernance le justifie ;
- autres paramètres démontrés par la suite du cadrage.

### 12.1 Free, Trial et offre payante

Principe commercial retenu :

~~~text
FREE
→ métier disponible avec les comportements standards
→ panneau visible
→ paramètres personnalisables verrouillés selon capabilities

TRIAL
→ comportements standards actifs dès le départ
→ personnalisation facultative disponible pour tester l'offre évaluée

PAYANT
→ personnalisation des paramètres autorisés par le plan
~~~

La fonctionnalité métier fondamentale n'est pas volontairement dégradée pour forcer l'achat : la monétisation porte sur la personnalisation avancée lorsque celle-ci constitue une capability commerciale.

Un downgrade ne supprime pas les configurations personnalisées. Elles peuvent être conservées mais devenir inactives lorsque la capability n'est plus disponible ; le backend applique alors le comportement standard. La règle exacte de réactivation ultérieure reste à cadrer.

### 12.2 Politique de cycle de vie des fiches

Le Workspace dispose conceptuellement d'une politique centrale de cycle de vie.

Comportement standard immédiatement utilisable :

- DRAFT autorisés ;
- versions VALIDATED conservées ;
- pas de suppression automatique ;
- archivage explicite ;
- suppression définitive uniquement sous contrôles prévus.

Des personnalisations payantes pourront éventuellement porter sur :

- cadence de revue fonctionnelle ;
- règles de revalorisation ;
- signalement de fiches anciennes ;
- archivage ;
- purge ;
- rétention.

Il faut distinguer la fraîcheur fonctionnelle d'une recette de la fraîcheur économique de sa valorisation : une recette ancienne mais récemment revalorisée n'est pas nécessairement obsolète, et une recette récente peut avoir besoin d'attention si ses prix sont devenus anciens.

---

## 13. Utilisateurs, rôles et périmètres

Le produit réutilise le RBAC Workspace du Core. Il ne crée pas un second système de rôles parallèle.

### 13.1 Workspace Owner

Le rôle système owner du Workspace, fourni par le Core, constitue l'autorité complète à l'intérieur de CE Workspace.

Pour ce produit, le Workspace Owner :

- reçoit toutes les permissions métier applicatives prévues pour owner via le point d'extension RBAC du Core ;
- peut agir sur tous les magasins/dossiers de son Workspace ;
- peut créer, modifier, revaloriser, valider, archiver et administrer les données métier selon les contrats ;
- peut gérer les membres, rôles et paramètres dans les limites des mécanismes Core ;
- n'a pas besoin d'un rôle métier supplémentaire.

Le Workspace Owner ne contourne jamais les invariants métier, les capabilities, les quotas ni les validations de sécurité.

Le terme Workspace Owner doit être utilisé pour éviter toute confusion avec les rôles Platform.

### 13.2 Rôles Platform

Un PlatformRole, y compris un rôle d'administration de la plateforme, ne donne aucun accès implicite aux données métier d'un Workspace.

Il ne permet pas automatiquement de consulter :

- dossiers/magasins ;
- Fiches techniques ;
- Tarifs négociés ;
- Prix facturés ;
- autres données commerciales confidentielles.

Un éventuel futur accès support transversal constituerait une fonctionnalité distincte à cadrer, sécuriser et auditer explicitement.

### 13.3 Un rôle Workspace par membre

Le Core v1.0.1 porte un seul Role sur chaque WorkspaceMember.

Le cadrage métier s'aligne donc sur ce contrat :

~~~text
WorkspaceMember
→ 1 Role Workspace
→ ensemble de permissions Core + métier
~~~

Les responsabilités métier ne sont plus modélisées comme plusieurs rôles cumulés sur le même membre.

Lorsque plusieurs responsabilités doivent être combinées, un rôle personnalisé regroupe l'union des permissions nécessaires.

Exemple :

~~~text
Acheteur + Économe
→ un rôle Workspace personnalisé
→ permissions Achats + permissions Prix
~~~

Les profils suivants servent de rôles types/presets de cadrage :

- Acheteur / Responsable achats ;
- Économe / Gestionnaire des prix ;
- Responsable fiches techniques ;
- Contributeur fiches techniques ;
- Lecteur métier lorsque le besoin de simple consultation existe.

Le nom affiché du rôle n'est jamais utilisé comme autorité technique : les permissions effectives gouvernent les actions.

### 13.4 Invitation et affectation

Le mécanisme d'invitation du Core est conservé.

~~~text
Owner / acteur autorisé
→ invitation email
→ choix d'un Role du Workspace
→ acceptation
→ WorkspaceMember avec ce Role
~~~

Le rôle owner ne peut pas être attribué par invitation.

L'interface produit pourra réunir dans un même parcours le choix du rôle et le périmètre de magasins, mais les responsabilités restent séparées :

~~~text
Role Workspace
→ ce que le membre peut faire

Périmètre dossiers
→ où il peut le faire
~~~

Le Core v1.0.1 ne porte pas nativement ce périmètre métier dans WorkspaceMember/WorkspaceInvitation. Le stockage et l'orchestration du périmètre dossier devront donc être cadrés dans le produit en utilisant les points d'extension disponibles, sans modifier silencieusement le Core.

### 13.5 Périmètre magasin et autorisation effective

Pour un membre non-owner, l'accès peut porter sur un ou plusieurs dossiers explicitement autorisés.

Le contexte actif reste toujours un seul magasin à la fois.

L'autorisation métier effective combine conceptuellement :

~~~text
membership actif
+ permission du rôle
+ accès au dossier
+ état de la ressource
+ capability commerciale si nécessaire
+ invariants métier
~~~

Le rôle détermine ce que l'utilisateur peut demander. Les invariants déterminent ce que le système accepte comme état valide.

### 13.6 Orientations de matrice de permissions

Sans figer encore la matrice finale, les directions validées sont :

- Acheteur / Responsable achats : Fournisseurs, Articles, catalogues, négociations et conditions commerciales selon permissions ;
- Économe / Gestionnaire des prix : consultation/gestion des prix, validation des Prix facturés, revues tarifaires et correction/revalorisation des fiches dans son périmètre selon permissions ;
- Responsable fiches techniques : création, modification, validation, archivage et restauration selon permissions ;
- Contributeur fiches techniques : création et travail sur ses DRAFTS selon permissions, sans administration tarifaire implicite ;
- Lecteur métier : consultation des données autorisées ;
- suppression définitive des Fiches techniques : réservée au Workspace Owner dans le cadrage actuel.

La permission de validation d'une Fiche technique reste une permission indépendante : elle pourra être accordée explicitement à un rôle personnalisé sans imposer qu'elle appartienne à tous les Économes.

---

## 14. V1 / hors V1

Le périmètre V1 n'est pas encore finalisé.

Éléments considérés comme fondamentaux pour le cadrage du socle :

- Workspace + dossiers magasin ;
- catalogue Produit commun au Workspace ;
- catégories et rendement ;
- Fournisseurs et Articles fournisseur ;
- conditionnements structurés ;
- catalogues fournisseur de référence historisés ;
- prix magasin isolés et historisés ;
- politique de Prix applicable du Workspace ;
- fraîcheur standard des Prix facturés ;
- références favorites / fréquemment utilisées par magasin ;
- cartes d'identité Produit/Article ;
- Fiches techniques calculées, versionnées et validables ;
- archivage et historique ;
- configuration métier avec comportements standards ;
- RBAC Workspace étendu par les permissions métier ;
- périmètres magasin indépendants du rôle.

Les imports structurés de catalogues, l'OCR/IA, les automatisations avancées et certaines personnalisations peuvent rester différables selon l'arbitrage V1 final.

---

## 15. Points ouverts à résoudre avant validation globale

- définir la liste et la gouvernance des catégories ;
- décider catégorie unique ou multiple ;
- préciser les types d'unités de référence supportés ;
- finaliser la liste/gouvernance des types de conditionnement ;
- fixer la convention technique exacte de la durée standard de fraîcheur d'un Prix facturé : 12 mois calendaires ou autre représentation équivalente ;
- définir la valeur standard définitive du seuil « fréquemment utilisée » et les règles de comptage des fiches archivées ;
- finaliser les permissions exactes de chaque rôle type ;
- cadrer le stockage du périmètre dossier et son éventuelle préparation dès l'invitation ;
- définir les données minimales définitives du Fournisseur ;
- définir le lifecycle exact d'un Article fournisseur remplacé ou archivé ;
- finaliser la gouvernance détaillée des revues tarifaires ;
- valider la TVA et sa portée ;
- valider les formules de marge, coefficient et prix de vente ;
- valider la notion de prix de vente conseillé / retenu ;
- définir le calcul de la marge semi-nette ;
- définir les règles d'arrondi des montants agrégés ;
- finaliser les motifs/types de version d'une Fiche technique ;
- cadrer les règles exactes de rétention et de suppression définitive ;
- définir la frontière fiche technique / fiche process ;
- cadrer capabilities et quotas commerciaux ;
- cadrer les intégrations externes V1 ;
- cadrer les contraintes réglementaires réellement applicables ;
- finaliser le périmètre V1 / hors V1 ;
- finaliser la roadmap ;
- seulement ensuite proposer M-001.

Aucune de ces questions ne doit être résolue implicitement dans le code.

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
