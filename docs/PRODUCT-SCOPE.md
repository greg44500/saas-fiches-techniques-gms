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

Modes prévus :

```text
Tarif fournisseur
Tarif négocié
Prix facturé
```

Valeur par défaut validée :

```text
Tarif négocié
```

La stratégie est commune au Workspace, mais les valeurs tarifaires restent contextualisées : les magasins peuvent négocier indépendamment leurs prix.

Règles de fallback validées :

```text
Mode Tarif fournisseur
→ Tarif fournisseur de référence applicable

Mode Tarif négocié
→ Tarif négocié valide pour le magasin et l'Article
→ sinon Tarif fournisseur de référence applicable

Mode Prix facturé
→ dernier Prix facturé exploitable et validé pour le magasin et l'Article
→ sinon Tarif négocié valide
→ sinon Tarif fournisseur de référence applicable
```

Le moteur conserve la **source réellement utilisée** et signale lorsqu'un fallback a été nécessaire.

Le Prix applicable n'est donc pas une propriété globale du Produit. Il résulte du contexte :

```text
Produit
× magasin/dossier
× Article fournisseur
× politique de prix du Workspace
× date de valorisation
```

Un Produit peut être non valorisable dans un magasin et valorisable dans un autre. Il peut également exister dans le catalogue sans Prix applicable courant.

Pour créer ou modifier une Fiche technique, un Produit ne peut être ajouté que si le moteur peut déterminer un Prix applicable dans le magasin courant. Le catalogue commun doit néanmoins permettre d'identifier qu'un Produit existe déjà, afin d'éviter sa recréation lorsqu'il lui manque seulement une condition tarifaire locale.

### 6.9 Validité commerciale et revue tarifaire

Le Tarif fournisseur de référence est un prix général du Fournisseur, non spécifique à un magasin. Il peut évoluer dans le temps lorsqu'un nouveau catalogue ou une nouvelle mercuriale entre en vigueur. Chaque évolution est historisée.

Un Tarif négocié est une condition commerciale spécifique à un magasin et à un Article fournisseur.

Il doit pouvoir porter :

- une date de début de validité ;
- une date de fin éventuelle ;
- la provenance de la condition ;
- la traçabilité de création et modification.

La validité commerciale d'un Tarif négocié est déterminée par ses dates et non par un seuil universel d'ancienneté. Un accord peut par exemple être valable six mois ou un an.

Le SaaS distingue strictement :

```text
validité commerciale du tarif
≠
dernière vérification opérationnelle du tarif
```

Une revue tarifaire peut être organisée par magasin pour confirmer que les prix connus sont toujours cohérents, corriger les changements et planifier un prochain contrôle.

Cette revue doit pouvoir préserver au minimum :

- date de dernière revue ;
- auteur de la revue ;
- périmètre contrôlé ;
- prochaine date de revue lorsqu'elle est planifiée ;
- anomalies ou tarifs restant à vérifier.

Une action de revue en masse ne doit pas prolonger artificiellement une date de validité contractuelle. Elle confirme seulement qu'une vérification opérationnelle a été effectuée.

La fréquence exacte des revues reste configurable/cadrable et ne doit pas être figée arbitrairement pour tous les magasins ou toutes les familles de produits.

### 6.10 Prix facturé exploitable

Un prix lu ou importé depuis une facture n'est pas automatiquement utilisable dans les calculs.

Pour devenir exploitable, un Prix facturé doit pouvoir être rattaché sans ambiguïté :

- au bon Fournisseur ;
- au bon Article fournisseur ;
- au bon magasin/dossier ;
- à une date de facture ;
- à un prix source et une unité d'expression ;
- aux données suffisantes pour calculer un prix normalisé fiable.

Il doit également être **validé** avant d'être utilisé automatiquement.

États fonctionnels minimaux retenus :

```text
À VALIDER
→ conservé mais non utilisable comme Prix applicable

VALIDÉ
→ utilisable comme Prix applicable

REJETÉ
→ conservé pour la traçabilité mais jamais utilisé
```

La validation doit pouvoir porter sur la donnée tarifaire de la ligne, et pas seulement sur l'authenticité globale du document.

Le seuil de fraîcheur éventuel d'un Prix facturé validé reste à finaliser. Il ne doit pas être confondu avec la durée contractuelle d'un Tarif négocié.


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

Lorsqu'une Fiche technique est calculée, elle doit pouvoir conserver la référence tarifaire et les valeurs effectivement utilisées pour expliquer son état courant.

Si un Économe ou un Acheteur modifie un prix pendant qu'un autre utilisateur travaille sur la fiche :

- le nouveau tarif devient disponible pour les nouvelles valorisations selon sa date d'effet ;
- la fiche en cours ne change pas silencieusement ;
- le système détecte qu'une donnée tarifaire plus récente/applicable existe ;
- l'utilisateur est informé qu'une revalorisation est disponible ou nécessaire.

Avant validation définitive d'une fiche, le backend doit contrôler que sa valorisation reste cohérente avec les Prix applicables courants. En cas d'écart, une revalorisation explicite est requise avant validation.

Une fiche déjà validée conserve sa valorisation historique. Elle peut être comparée à une valorisation courante sans destruction de l'état passé.

Aucun verrou métier global ne doit empêcher la mise à jour d'un tarif uniquement parce qu'un autre utilisateur consulte ou édite une fiche.


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

Les rôles Core et les rôles métier du produit restent distincts.

### 13.1 Workspace Owner

Le rôle `owner` du Workspace existe déjà dans le Core et constitue l'autorité complète à l'intérieur de son Workspace.

Pour ce produit, le Owner :

- dispose implicitement de toutes les permissions métier du SaaS ;
- peut agir sur tous les magasins/dossiers du Workspace ;
- peut gérer Produits, Fournisseurs, Articles, tarifs, revues, Fiches techniques et Fiches process ;
- peut gérer les utilisateurs et paramètres du Workspace dans les limites du Core ;
- n'a pas besoin de recevoir séparément chaque rôle métier.

Le Owner ne contourne cependant pas les autres mécanismes :

```text
RBAC
→ qui peut agir

Capability
→ la fonctionnalité est-elle disponible dans le plan

Quota
→ quelle quantité est autorisée

Validation métier / sécurité
→ invariants toujours obligatoires
```

Aucun rôle métier `Admin` spécifique au produit n'est défini à ce stade.

Une future administration déléguée du Workspace, sans transfert de propriété, est identifiée comme une évolution générique potentielle du Core et ne doit pas être inventée directement dans le produit.

### 13.2 Rôles métier

Les autres utilisateurs reçoivent explicitement un ou plusieurs rôles métier et, lorsque nécessaire, un périmètre de magasins.

Socle retenu pour poursuivre le cadrage :

- **Acheteur / Responsable achats** : Fournisseurs, Articles fournisseur, négociations et conditions commerciales selon permissions ;
- **Économe / Gestionnaire des prix** : contrôle, validation des Prix facturés, revues tarifaires et cohérence des prix selon permissions ;
- **Responsable fiches techniques** : création, modification et validation fonctionnelle des fiches selon permissions ;
- **Utilisateur métier** : consultation et utilisation des Produits/Fiches autorisés sans administration tarifaire implicite.

Les rôles peuvent être cumulés.

Exemple :

```text
Utilisateur
→ Acheteur
→ Économe
→ Responsable fiches techniques
→ Magasins A et B
```

Le fait de créer ou utiliser une Fiche technique n'accorde jamais implicitement le droit de modifier ou valider les tarifs.

### 13.3 Périmètre magasin

Un rôle métier peut être limité à certains magasins/dossiers du Workspace.

Exemple :

```text
Économe A
→ Magasin A

Économe B
→ Magasins B et C
```

La matrice exacte des permissions métier reste à finaliser avant implémentation.

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
- plusieurs Articles fournisseur par Produit et par Fournisseur ;
- conditionnements structurés ;
- tarifs fournisseur de référence sans obligation de connaître un magasin ;
- tarifs spécifiques magasin lorsque connus ;
- prix observés sourcés et historisés ;
- normalisation automatique des prix HT ;
- fiches techniques calculées ;
- traçabilité des changements ;
- base de fiche process.

Les arbitrages précis V1 / différé seront réalisés après cadrage des fournisseurs, des calculs de fiche technique et de la fiche process.

---

## 15. Points ouverts à résoudre avant validation globale

- définir la liste et la gouvernance des catégories ;
- décider catégorie unique ou multiple ;
- préciser les types d'unités de référence supportés ;
- finaliser la liste/gouvernance des types de conditionnement ;
- finaliser les détails de sélection d'Article fournisseur lorsqu'il existe plusieurs Articles valides ;
- finaliser le seuil éventuel de fraîcheur d'un Prix facturé validé et les règles d'alerte associées ;
- finaliser la fréquence/gouvernance des revues tarifaires ;
- définir le lifecycle exact d'un Article fournisseur remplacé ou archivé ;
- valider la TVA et sa portée ;
- valider les formules de marge, coefficient et prix de vente ;
- valider la notion de prix de vente conseillé / retenu ;
- définir le calcul de la marge semi-nette ;
- définir les règles d'arrondi des montants agrégés ;
- définir la frontière fiche technique / fiche process ;
- finaliser la matrice des permissions des rôles métier et leur périmètre magasin ;
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
