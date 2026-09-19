# SAAS-FICHES-TECHNIQUES-GMS — Glossaire métier

**Statut :** DRAFT — cadrage métier en cours  
**Dernière mise à jour :** 2026-09-19

> Ce glossaire fixe le vocabulaire déjà stabilisé pendant le cadrage.  
> Les termes marqués comme ouverts ne doivent pas être transformés en contrats techniques définitifs.

---

## Workspace

Espace de travail du client du SaaS et frontière de tenancy héritée du Core.

Un Workspace peut contenir plusieurs dossiers correspondant à des contextes magasin.

---

## Dossier

Contexte de travail créé par l'utilisateur pour un magasin.

Le dossier sert notamment à contextualiser les prix, disponibilités, fiches techniques et fiches process.

**Ouvert :** confirmer que la règle V1 est strictement `1 dossier = 1 magasin`.

---

## Magasin

Contexte opérationnel pour lequel l'utilisateur réalise ses fiches et dans lequel s'appliquent les conditions commerciales propres au site : prix, disponibilité, fournisseur/article applicable, etc.

---

## Catalogue produit

Base de produits commune à un Workspace.

Les dossiers puisent dans ce catalogue au lieu de recréer les mêmes produits magasin par magasin.

---

## Produit

Denrée ou composant utilisable dans une fiche technique, indépendamment de son fournisseur et de son prix.

Le produit porte notamment :

- un nom métier précis ;
- une catégorie ;
- une gamme alimentaire lorsqu'elle est pertinente ;
- une unité de référence ;
- un taux de rendement ;
- une photo facultative ;
- des métadonnées de création et modification.

### Règle de nommage

Si le produit est entier ou utilisé dans sa forme standard, utiliser le nom simple :

```text
Carotte
Oignon
Rumsteck
Maquereau
```

Si une forme de préparation est nécessaire pour comprendre ce qui est réellement utilisé, la préciser dans le nom :

```text
Carotte râpée
Oignon émincé
Rumsteck tranché
Maquereau en filet
```

---

## Catégorie

Classification fonctionnelle du produit destinée au classement, à la recherche, aux filtres et aux analyses.

Exemples possibles : légumes, viandes, poissons, fromages, épicerie.

La liste exacte n'est pas encore validée.

---

## Gamme alimentaire

Référentiel professionnel utilisé lorsqu'il est pertinent pour le produit.

Référentiel de cadrage :

- 1re gamme : frais ;
- 2e gamme : conserve / appertisé ;
- 3e gamme : surgelé ;
- 4e gamme : cru prêt à l'emploi ;
- 5e gamme : cuit prêt à l'emploi.

La gamme n'est pas obligatoire pour tous les produits.

Exemple :

```text
Farine
→ gamme : non applicable
→ rendement : 100 %
```

La gamme ne fixe pas automatiquement un taux de rendement.

Référence officielle de cadrage :
https://www.economie.gouv.fr/files/files/directions_services/daj/marches_publics/oeap/concertation/autres_groupes_travail/indexation-prix-denrees-alimentaires.pdf

---

## Unité de référence

Unité normalisée utilisée pour les calculs métier.

Exemples :

- kg / g ;
- L / ml ;
- unité.

Un carton, un sac, une boîte ou une barquette sont des conditionnements commerciaux et non des unités mathématiques de référence.

---

## Taux de rendement

Part réellement valorisable d'un produit.

```text
100 %
→ aucune perte ou partie non valorisée

< 100 %
→ parage, perte, épluchure, os, carcasse, peau, liquide non valorisé, etc.
```

Le rendement de référence est défini en amont sur le produit et récupéré automatiquement par la fiche technique.

Lorsqu'une donnée objective permet de le calculer, le système doit le faire.

Exemple de conserve :

```text
rendement = poids net égoutté / poids net × 100
```

---

## Quantité nette

Quantité réellement nécessaire et présente dans la recette.

C'est la quantité saisie par l'utilisateur pour une ligne d'ingrédient.

---

## Quantité brute

Quantité à acheter ou à mettre en œuvre avant pertes.

Elle est calculée automatiquement :

```text
quantité brute = quantité nette / rendement
```

---

## % de la recette

Part d'un Produit dans la totalité de la recette.

Elle est calculée automatiquement à partir des quantités nettes réellement présentes dans la recette.

Les pertes de rendement n'entrent pas dans ce pourcentage.

Elle est distincte du taux de rendement.

---

## Fournisseur

Acteur qui commercialise un ou plusieurs articles correspondant aux produits du catalogue.

Les fournisseurs doivent pouvoir être créés par le client dans son contexte de travail.

---

## Article fournisseur

Référence commerciale précise d'un Produit chez un Fournisseur.

Un même Produit peut avoir plusieurs Articles fournisseur actifs chez un même Fournisseur, par exemple avec des références ou conditionnements différents.

Un Article fournisseur peut porter notamment :

- référence fournisseur ;
- désignation fournisseur originale ;
- marque éventuelle ;
- conditionnement structuré ;
- libellé fournisseur du conditionnement ;
- poids net ;
- poids net égoutté si applicable ;
- statut et traçabilité.

Un Produit ne doit pas être confondu avec un Article fournisseur.

---

## Conditionnement / colisage

Façon dont un Fournisseur commercialise un Article.

Le conditionnement doit être à la fois lisible et structuré pour les calculs.

Exemples :

```text
sac de 25 kg
→ 1 × 25 kg

carton de 6 × 1 L
→ total 6 L

carton de 24 × 125 g
→ total 3 kg
```

Le système conserve le libellé fournisseur d'origine lorsqu'il existe mais ne dépend pas uniquement de ce texte pour les calculs.

Le conditionnement doit pouvoir être ramené à l'unité de référence du Produit lorsque les données disponibles le permettent.

---

## Tarif fournisseur de référence

Prix issu d'un catalogue ou d'une mercuriale Fournisseur, sans nécessité de connaître un magasin.

Il constitue une référence commerciale et ne doit pas être présenté comme un tarif négocié magasin sans preuve.

---

## Tarif spécifique magasin

Prix connu pour un Article fournisseur dans un magasin donné.

Il est conservé séparément du Tarif fournisseur de référence.

---

## Prix observé

Prix réellement constaté à une date donnée, par exemple sur une facture.

Il peut être rattaché à un magasin lorsque le contexte est identifiable.

Sa provenance doit être conservée.

---

## Provenance tarifaire

Origine d'une donnée de prix.

Provenances déjà identifiées :

- catalogue fournisseur ;
- mercuriale ;
- tarif spécifique magasin ;
- facture ;
- saisie manuelle ;
- import fichier ;
- futur OCR.

---

## Prix normalisé

Prix calculé automatiquement dans l'unité de référence du Produit à partir du prix source et du conditionnement.

Exemple :

```text
40,625 € HT / sac de 25 kg
→ 1,625 €/kg HT
```

S'il manque des données fiables, le prix normalisé reste indisponible : il n'est pas deviné.

---

## Prix applicable

Prix retenu par le moteur de calcul pour valoriser une fiche dans son contexte.

La priorité exacte entre tarif fournisseur de référence, tarif spécifique magasin et prix observé reste à cadrer.

---

## Prix d'achat HT

Base économique utilisée pour le calcul du Coût Matière.

Les prix d'achat unitaires et prix normalisés sont affichés avec exactement trois décimales.

L'affichage à trois décimales ne doit pas provoquer d'arrondi prématuré dans les calculs internes.

---

## Prix actuel

Prix commercial actuellement applicable pour un article fournisseur dans le contexte d'un magasin.

Il ne remplace pas l'historique des prix.

---

## Historique de prix

Suite chronologique des prix applicables à un article ou produit dans un magasin.

Une mise à jour ne doit pas écraser silencieusement la valeur précédente.

---

## Fiche technique

Donnée métier structurée décrivant une composition et sa valorisation économique dans le contexte d'un dossier/magasin.

Elle n'est pas un simple document statique.

L'utilisateur sélectionne les produits et renseigne les faits nécessaires ; l'application calcule les données dérivées.

---

## Ligne de composition

Utilisation d'un produit dans une fiche technique avec une quantité donnée.

Elle permet de déterminer automatiquement notamment :

- part dans la recette ;
- rendement applicable ;
- coût ;
- impact sur la valorisation totale.

---

## Composition technique

Ensemble relativement stable des produits et quantités constituant une fiche technique.

Elle doit être distinguée de la valorisation économique.

---

## Valorisation économique

Résultat des calculs de coût, marge et prix obtenus à partir :

- de la composition ;
- des rendements ;
- des prix applicables ;
- des paramètres de calcul applicables.

Une même composition peut être revalorisée dans le temps.

---

## Valorisation historique

Photographie des valeurs et résultats utilisés à une date ou version donnée.

Elle permet de comprendre pourquoi une fiche affichait un certain coût ou une certaine marge à ce moment-là.

---

## Valorisation courante

Calcul effectué avec les données actuellement applicables, notamment les prix courants.

---

## Coût Matière (CM)

Somme des coûts HT de toutes les lignes d'ingrédients.

```text
CM HT = Σ coûts HT des lignes d'ingrédients
```

Le coût d'une ligne utilise la quantité brute nécessaire et le prix d'achat HT normalisé.

---

## Économat

Ensemble des consommables achetés nécessaires à la fabrication, au conditionnement ou à la commercialisation du produit.

Exemples :

- barquette ;
- étiquette ;
- film ;
- sachet.

L'Économat est une nature de marchandise achetée différente des ingrédients mais intégrée à la fiche technique.

Les consommables utilisent les mêmes mécanismes d'approvisionnement, de conditionnement, de tarif et d'historisation lorsque pertinent, sans être soumis aux attributs alimentaires non applicables.

L'utilisateur renseigne la quantité réellement consommée ; le SaaS calcule le coût à partir du prix normalisé.

---

## Coût total de fabrication

Définition métier du produit :

```text
Coût total de fabrication HT
=
Coût Matière HT + Économat HT
```

L'énergie est exclue de ce calcul.

Aucune autre charge ne doit être ajoutée sans validation métier.

---

## Objectif de marge

Marge cible utilisée pour calculer un prix théorique.

Une valeur par défaut éventuelle ne signifie pas nécessairement une contrainte obligatoire.

---

## Prix théorique

Prix calculé automatiquement pour atteindre un objectif de marge donné selon la formule métier validée.

---

## Prix de vente retenu / conseillé

Prix effectivement proposé ou choisi pour la fiche.

Il peut être différent du prix théorique nécessaire pour atteindre l'objectif de marge.

---

## Fiche process

Document/donnée métier décrivant la fabrication : étapes, durées, points critiques et critères d'acceptabilité.

La frontière exacte entre les données process portées par la fiche technique et la fiche process détaillée reste à définir.

---

## Paramètre métier

Valeur ou règle susceptible d'influencer les calculs ou comportements du produit.

Exemples candidats :

- TVA ;
- marge par défaut ;
- arrondis ;
- seuils d'alerte.

Le panneau de paramètres peut être développé plus tard.

---

## Valeur par défaut

Valeur proposée automatiquement lors d'une création, mais potentiellement modifiable si le contrat métier l'autorise.

---

## Contrainte

Règle qui doit être respectée et ne constitue pas seulement une valeur proposée.

---

## Seuil d'alerte

Valeur à partir de laquelle le système signale une situation sans nécessairement empêcher l'opération.

---

## Historique produit

Traçabilité des changements significatifs du produit : nom, catégorie, rendement, photo, archivage, etc.

Il est distinct de l'historique commercial des prix et conditionnements.

---

## Alerte

Signal visuel ou notification indiquant une incohérence, une variation ou un impact nécessitant l'attention de l'utilisateur.

Les règles détaillées d'alertes restent à cadrer.

---

## Extension planifiée

Fonctionnalité non développée immédiatement mais dont le modèle V1 ne doit pas rendre l'ajout ultérieur inutilement complexe.

---

## Extension éventuelle

Possibilité identifiée sans obligation de créer immédiatement une abstraction technique ou un module dédié.
