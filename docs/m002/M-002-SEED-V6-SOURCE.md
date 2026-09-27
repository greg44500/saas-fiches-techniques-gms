# M-002 — Source et règles du seed alimentaire v6

**Statut : ACTIF — source canonique du bootstrap M-002**  
**Source unique :** `SANS PRIX-IPCOLL-SEC-SEPT 2026.pdf`  
**Date source :** septembre 2026

## Objectif

Le seed `m002-reference-v6` remplace le v5.

Règle validée :

```text
Le bootstrap actif ne contient que des denrées alimentaires présentes
dans le PDF fourni.
```

Une Référence provenant des seeds v1 à v5 mais absente du PDF ne doit plus
rester active uniquement parce qu'elle existait auparavant.

## Périmètre PDF

Pages exploitées :

```text
1
3-34
38-43
```

Pages exclues :

```text
2       sommaire / éditorial
35-37   Non Alimentaire
44-45   mentions et fin de document
```

Les produits non alimentaires sont donc exclus.

## Transformation vers M-002

Le PDF fournit des désignations fournisseur, des marques, des références,
des conditionnements et parfois des prix.

M-002 conserve uniquement l'identité Produit utile au métier.

Exemple :

```text
source :
CAROTTES RÂPÉES COUPE TRAITEUR
LES JARDINS D'ADRIEN
Pack de 3
01854

M-002 :
Carottes râpées
```

Restent hors M-002 :

- marque ;
- fournisseur ;
- référence fournisseur ;
- conditionnement commercial ;
- prix.

Ces données relèvent de M-003.

## Structure du v6

Le bootstrap v6 contient :

```text
14 catégories
264 Produits
264 Références Produit
1 Référence exploitable par Produit bootstrap
0 doublon de nom normalisé
0 Produit bootstrap sans Référence
0 Gamme forcée
```

Le choix d'une relation 1 Produit bootstrap → 1 Référence permet d'éviter de
réintroduire artificiellement les anciennes racines génériques lorsque le PDF
ne les porte pas comme références de catalogue.

## Anciennes données bootstrap

La migration `reconcileM002BootstrapToV6` :

- identifie les Références réellement issues des anciens seeds ;
- conserve celles présentes dans le v6 avec la structure cible ;
- archive les anciennes Références bootstrap absentes du PDF ;
- archive les Favoris Workspace qui pointent vers une Référence retirée ;
- archive les Produits historiques devenus sans Référence active ;
- n'archive pas une future Référence utilisateur simplement parce que son
  Produit parent existait déjà dans un ancien seed.

## Conservation

Le PDF n'expose pas toujours une méthode de conservation structurée.

Les valeurs `FRAIS / REFRIGERE / SURGELE / CONSERVE / SEC` du bootstrap sont
donc des classifications de QA du référentiel, utilisées lorsque la nature du
produit permet une affectation suffisamment claire.

Elles ne remplacent pas les contraintes de stockage d'un article fournisseur
qui seront portées plus tard dans le contexte M-003.

## Gamme

Le v6 ne force aucune Gamme :

```text
foodRange = null
```

La présence éventuelle d'une Gamme future devra venir d'une donnée métier
fiable ou d'une décision de gouvernance, pas d'une déduction automatique.

## Exemples présents

Le v6 contient notamment :

- Cumin moulu ;
- Carottes râpées ;
- Céleri râpé ;
- Roulé de surimi ;
- Gigot d'agneau ;
- Quinoa gourmand ;
- Crème dessert chocolat ;
- Jus multifruits à base de concentré.

Des références historiques absentes du PDF, par exemple `Moule` ou la
référence générique `Banane`, ne font plus partie du bootstrap actif.

## Critères de qualité

```text
source unique = PDF fourni
denrées alimentaires uniquement
aucun non-alimentaire
aucun Produit orphelin
aucun nom de Référence dupliqué
aucun usageType actif
aucune donnée fournisseur
aucun prix
aucun conditionnement commercial
aucune Gamme inventée
```
