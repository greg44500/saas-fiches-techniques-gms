# M-002 — Source et règles du seed alimentaire v5

**Statut : VALIDÉ POUR QA M-002**  
**Source :** `SANS PRIX-IPCOLL-SEC-SEPT 2026.pdf`  
**Date source :** septembre 2026

## Objectif

Le seed `m002-reference-v5` doit fournir un référentiel immédiatement utile à une cuisine collective sans transformer M-002 en catalogue fournisseur.

Le PDF est utilisé comme **échantillon métier réel**, pas comme import fournisseur.

## Périmètre retenu

Pages exploitées :

```text
3-34
38-43
```

Pages explicitement exclues :

```text
35-37 — Non Alimentaire
```

Les gobelets, assiettes, serviettes, emballages, sacs, lavettes, papiers, produits d'hygiène et autres consommables non alimentaires n'entrent donc pas dans le seed M-002.

## Transformation fournisseur → M-002

Exemple source :

```text
CAROTTES RÂPÉES COUPE TRAITEUR
LES JARDINS D'ADRIEN
Pack de 3
01854
```

M-002 conserve :

```text
Carottes râpées
```

M-003 portera ultérieurement :

```text
fournisseur / marque
référence 01854
conditionnement Pack de 3
prix
```

Même principe pour toutes les références du PDF.

## Familles couvertes

Le v5 couvre notamment :

- fruits et légumes frais ;
- légumes préparés ;
- viandes, volailles et découpes ;
- charcuteries ;
- poissons et produits de la mer ;
- œufs et préparations à base d'œufs ;
- produits laitiers et fromages ;
- céréales, féculents et légumineuses ;
- pains et boulangerie ;
- matières grasses ;
- sauces, condiments et aides culinaires ;
- épicerie salée ;
- plats préparés et alternatives végétales ;
- épicerie sucrée, desserts, biscuits et pâtisserie ;
- boissons.

## Conservation

Le PDF ne porte pas systématiquement une méthode de conservation exploitable pour chaque désignation.

Les valeurs `FRAIS / REFRIGERE / SURGELE / CONSERVE / SEC` du seed sont donc des **valeurs de modélisation bootstrap**, établies uniquement lorsque le type de denrée permet une affectation suffisamment claire pour la QA.

Elles ne doivent pas être interprétées comme la conservation contractuelle d'un article fournisseur précis.

Lors de M-003, les données fournisseur pourront préciser ou compléter les contraintes de stockage de chaque offre commerciale.

## Règles de qualité v5

Le dataset actif doit respecter :

```text
aucun Produit sans Référence exploitable
aucun nom de Référence dupliqué
aucun usageType actif
aucune donnée fournisseur
aucun non-alimentaire
aucun prix
aucun conditionnement commercial
```

Les datasets v1 à v4 restent historiques et immuables.

## Volumétrie v5

```text
14 catégories
220 Produits racines
302 Références Produit exploitables
```

Cette volumétrie reste volontairement un **bootstrap**. Le PDF lui-même n'est qu'un échantillon du marché ; le référentiel global continuera à s'enrichir par gouvernance et, plus tard, par les imports M-002/M-003 cadrés.
