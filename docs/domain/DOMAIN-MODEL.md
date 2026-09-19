# SAAS-FICHES-TECHNIQUES-GMS — Modèle de domaine

**Statut :** DRAFT — cadrage métier en cours  
**Dernière mise à jour :** 2026-09-19  
**Important :** ce document décrit des concepts métier et leurs relations. Il ne constitue pas un schéma Mongoose.

---

## 1. Objectif

Décrire les concepts nécessaires au produit avant toute implémentation afin de :

- préserver la frontière Core / métier ;
- éviter la duplication des données ;
- garantir la fiabilité des calculs ;
- permettre l'historisation ;
- rendre possibles les extensions futures sans imposer leur développement immédiat.

---

## 2. Vue d'ensemble

```text
Workspace
│
├── Catalogue produit
│   ├── Produits
│   │   ├── Catégorie
│   │   ├── Gamme éventuelle
│   │   ├── Unité de référence
│   │   └── Rendement
│   │
│   ├── Fournisseurs
│   │
│   └── Articles / offres fournisseur
│       ├── Référence fournisseur
│       ├── Conditionnement
│       ├── Poids net / égoutté si applicable
│       └── Conditions commerciales par magasin
│           ├── Prix
│           ├── Disponibilité
│           ├── Date d'effet
│           └── Historique
│
├── Dossiers magasin
│   ├── Fiches techniques
│   │   ├── Composition
│   │   ├── Valorisations
│   │   ├── Emballages / économat
│   │   └── Historique
│   │
│   └── Fiches process
│
└── Audit / traçabilité
```

---

## 3. Workspace

Le Workspace est la frontière de tenancy héritée du Core.

Invariant :

```text
toute donnée métier du produit
→ ownership Workspace explicite
```

Les ressources métier appartenant au Workspace doivent utiliser l'ownership explicite prévu par le Core.

`createdBy` / `updatedBy` servent à l'audit et ne remplacent pas l'ownership.

---

## 4. Dossier / magasin

Le dossier fournit le contexte dans lequel l'utilisateur travaille pour un magasin.

Relations actuelles :

```text
Workspace
1
→ plusieurs Dossiers

Dossier
→ contexte magasin
```

Le dossier contextualise notamment :

- conditions commerciales ;
- disponibilité des produits ;
- fiches techniques ;
- fiches process.

**À valider avant implémentation :**

- cardinalité stricte `1 dossier = 1 magasin` en V1 ;
- informations minimales du magasin ;
- cycle de vie du dossier ;
- copie/import entre dossiers.

---

## 5. Produit

Le Produit est indépendant de son fournisseur et de son prix.

### 5.1 Caractéristiques

Conceptuellement :

```text
Produit
├── nom
├── catégorie
├── gamme éventuelle
├── unité de référence
├── taux de rendement
├── photo facultative
├── notes facultatives
├── statut
├── createdAt
├── updatedAt
├── createdBy
└── updatedBy
```

Le détail technique de persistance reste à définir ultérieurement.

### 5.2 Nommage

Invariant de lisibilité :

```text
produit entier / forme standard
→ nom simple

forme préparée nécessaire à la compréhension
→ précision dans le nom
```

Exemples :

```text
Oignon
Oignon émincé

Carotte
Carotte râpée
```

Le domaine ne nécessite pas à ce stade un champ utilisateur séparé « forme/état ».

### 5.3 Catégorie

La catégorie est indépendante de la gamme.

```text
Catégorie
→ axe fonctionnel de classement

Gamme
→ axe professionnel de préparation / conservation lorsqu'applicable
```

### 5.4 Gamme

La gamme est facultative lorsqu'elle n'est pas pertinente.

Le modèle doit permettre :

```text
1
2
3
4
5
non applicable
```

Exemple :

```text
Farine
→ gamme non applicable
→ rendement 100 %
```

### 5.5 Rendement

Le rendement est une caractéristique de référence du produit utilisé dans la fiche.

Invariant :

```text
fiche technique
→ hérite du rendement produit
→ ne demande pas une ressaisie libre ordinaire
```

Lorsque le rendement est mathématiquement déductible de données fiables, il doit être calculé.

Exemple :

```text
poids net égoutté / poids net
→ rendement conserve
```

Le modèle doit préserver une possibilité future d'exception documentée et historisée sans imposer son développement en V1.

---

## 6. Fournisseur

Un Fournisseur est un acteur commercial pouvant proposer des articles correspondant aux produits du Workspace.

Le fournisseur ne doit pas être codé comme une liste fermée : les exemples Sysco et SCAL ne constituent pas les seuls fournisseurs possibles.

Le client doit pouvoir créer ses fournisseurs.

**À cadrer :**

- données minimales fournisseur ;
- archivage ;
- unicité ;
- gestion des doublons.

---

## 7. Article / offre fournisseur

Le domaine doit séparer le Produit de sa représentation chez un fournisseur.

Conceptuellement :

```text
Produit
1
→ 0..n Articles fournisseur

Fournisseur
1
→ 0..n Articles fournisseur
```

Le modèle ne doit pas empêcher plusieurs fournisseurs ou plusieurs références pour un même produit.

Un article fournisseur peut porter :

- référence ;
- désignation fournisseur ;
- marque éventuelle ;
- conditionnement ;
- poids net ;
- poids net égoutté si applicable.

**À valider :**

- cardinalités exactes ;
- règles d'unicité ;
- article privilégié ;
- article actif/inactif.

---

## 8. Conditionnement

Le conditionnement décrit la façon dont l'article est acheté.

Exemples :

```text
sac de 25 kg
carton de 6 × 1 L
boîte
barquette de 500 g
carton de 24 unités
```

Invariant :

> Le conditionnement commercial doit pouvoir être converti vers l'unité de référence nécessaire aux calculs.

Le modèle doit permettre l'ajout futur de nouveaux types de conditionnement sans transformer chaque type en logique spécifique dispersée.

---

## 9. Condition commerciale magasin

Le prix doit être contextualisé.

Le domaine doit permettre conceptuellement :

```text
Article fournisseur
+
Dossier / magasin
+
Période
→ Condition commerciale
```

Une condition commerciale peut inclure :

- prix ;
- disponibilité ;
- date d'effet ;
- éventuellement date de fin ;
- provenance de la donnée ;
- historique.

Invariant majeur :

> Le prix n'est jamais une propriété directe et intemporelle du Produit.

---

## 10. Historique des prix

Une mise à jour de prix ajoute une nouvelle réalité temporelle ; elle ne doit pas détruire l'ancienne.

Le modèle doit pouvoir répondre à :

- quel était le prix à une date donnée ?
- quel est le prix courant ?
- quel est l'écart absolu ?
- quel est l'écart relatif ?
- quelles fiches sont impactées ?

Les graphiques et alertes peuvent être différés, mais la donnée nécessaire doit être préservée dès le socle.

---

## 11. Fiche technique

Une Fiche technique appartient au contexte d'un dossier/magasin et utilise les Produits du catalogue du Workspace.

Conceptuellement :

```text
Dossier
1
→ 0..n Fiches techniques

Fiche technique
1
→ plusieurs Lignes de composition
```

### 11.1 Ligne de composition

Une ligne associe au minimum :

- produit ;
- quantité nécessaire.

Les autres informations doivent être récupérées ou calculées autant que possible.

### 11.2 Données calculées

Le système doit calculer notamment, lorsque les données nécessaires sont disponibles :

- poids/quantité totale ;
- part de chaque produit dans la recette ;
- coût de chaque ligne ;
- coût matières premières ;
- coût emballages / économat ;
- coût total ;
- éléments de marge et prix selon les formules validées.

### 11.3 % de recette

```text
part recette ligne
=
quantité de la ligne / quantité totale pertinente × 100
```

La formule exacte devra préciser la gestion des unités compatibles et le périmètre du dénominateur.

L'utilisateur ne saisit pas librement cette valeur.

### 11.4 Rendement dans la fiche

Le rendement utilisé provient par défaut du produit.

Le calcul économique doit tenir compte du rendement selon la définition finale quantité brute / quantité nette qui reste à verrouiller.

---

## 12. Composition et valorisation

La composition et la valorisation sont deux dimensions distinctes.

```text
Composition
→ quels produits et quelles quantités ?

Valorisation
→ combien cette composition coûte-t-elle avec les données économiques applicables ?
```

Une variation de prix ne doit pas obliger à modifier la composition.

---

## 13. Valorisation courante et historique

Le modèle doit permettre deux lectures :

```text
Valorisation historique
→ valeurs réellement utilisées à une date/version

Valorisation courante
→ recalcul avec les prix actuellement applicables
```

Cela permet de mesurer :

- variation de coût ;
- variation de marge ;
- produits responsables de l'écart ;
- fiches impactées.

Le choix technique entre snapshots, événements, versions ou combinaison sera étudié lors du cadrage du module concerné.

---

## 14. Emballages / économat

Les exemples métier distinguent les matières premières des emballages / décorations.

Le modèle doit préserver cette distinction économique.

**À décider :**

```text
Option A
→ même catalogue avec catégorie/type distinct

Option B
→ concept spécialisé de consommable
```

Aucune décision de persistance n'est prise à ce stade.

---

## 15. Fiche process

Une Fiche process est reliée au travail d'un dossier et décrit la fabrication.

Concepts déjà identifiés :

- étapes ;
- durées ;
- denrées ;
- points critiques ;
- critères d'acceptabilité.

**À cadrer :**

- relation avec la fiche technique ;
- versionnement ;
- réutilisation ;
- données process présentes directement dans la fiche technique.

---

## 16. Traçabilité du Produit

Le domaine doit pouvoir répondre à :

```text
Produit
→ où est-il utilisé ?
→ dans quelles fiches ?
→ avec quels fournisseurs ?
→ avec quelles références ?
→ avec quels prix historiques ?
→ quelles modifications a-t-il subies ?
```

Deux historiques doivent rester conceptuellement distincts :

```text
Historique produit
→ identité / catégorie / rendement / photo / statut

Historique commercial
→ prix / conditionnement / disponibilité / article fournisseur
```

---

## 17. Principe « données saisies vs données calculées »

Classification obligatoire lors du cadrage de chaque champ :

```text
FAIT UTILISATEUR
→ donnée réellement connue uniquement par l'utilisateur

DONNÉE DE RÉFÉRENCE
→ récupérée depuis Produit / Fournisseur / Dossier / configuration

DONNÉE CALCULÉE
→ produite par le backend, non saisie librement

SNAPSHOT HISTORIQUE
→ valeur conservée pour expliquer un état passé
```

Une donnée calculée ne doit pas devenir une saisie utilisateur simplement parce qu'un tableur historique comportait une cellule modifiable.

---

## 18. Paramètres métier

Le futur panneau de paramètres n'est pas requis pour démarrer la V1.

Le modèle doit cependant éviter de figer les valeurs candidates dans le code métier.

La portée possible d'un paramètre doit être étudiée explicitement :

```text
système
Workspace
dossier / magasin
fiche
```

Les portées ne seront pas toutes implémentées automatiquement.

---

## 19. Extensibilité

Le modèle doit préserver les données nécessaires aux extensions identifiées :

- alertes de variation ;
- graphiques historiques ;
- comparaison fournisseur ;
- OCR / import de mercuriales ;
- optimisation de marge ;
- suggestions IA ;
- reverse recipe ;
- analyses transversales ;
- infographies process.

Invariant :

> Préparer la compatibilité structurelle ne signifie pas implémenter prématurément les extensions.

---

## 20. Invariants métier déjà établis

1. Un Produit n'est pas un prix.
2. Un Produit n'est pas un article fournisseur.
3. Le catalogue est mutualisé dans le Workspace.
4. Le contexte magasin détermine les conditions commerciales applicables.
5. Les prix doivent être historisés.
6. Les modifications Produit doivent être traçables.
7. Le % de recette est calculé.
8. Le taux de rendement est distinct du % de recette.
9. Le rendement de référence appartient au Produit et est réutilisé automatiquement.
10. La gamme n'est renseignée que lorsqu'elle est pertinente.
11. Les unités mathématiques et les conditionnements commerciaux sont distincts.
12. La composition technique et la valorisation économique sont distinctes.
13. Une valorisation historique ne doit pas être détruite par une modification future.
14. Les calculs métier ont leur autorité côté backend.
15. Les extensions futures doivent rester possibles sans sur-conception immédiate.

---

## 21. Questions de domaine encore ouvertes

Avant création d'un premier modèle Mongoose, il reste notamment à trancher :

- dossier exactement égal à magasin ?
- données minimales du magasin ;
- catégories et cardinalités ;
- unités supportées ;
- types de conditionnement ;
- quantité nette vs quantité brute dans une ligne de fiche ;
- règles de conversion et de rendement ;
- sélection de fournisseur/article ;
- fournisseur/article privilégié ;
- calculs financiers exacts ;
- TVA ;
- marge semi-nette ;
- emballages ;
- frontière fiche technique / fiche process ;
- lifecycle et versionnement des fiches ;
- V1 / hors V1 ;
- rôles métier ;
- capabilities et quotas ;
- intégrations ;
- contraintes réglementaires.

Aucune de ces questions ne doit être résolue implicitement dans le code.
