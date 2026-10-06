# M-002 — Audit sémantique du corpus professionnel v9

**Date :** 2026-10-06
**Dataset :** `backend/seeds/data/m002-reference.v9.json`
**Source identitaire :** corpus professionnel v8, conservé sans ajout ni retrait

## 1. Objet

Le v9 rend explicite le sens métier des Références Produit dont
`referenceUnit = UNIT`.

`UNIT` reste le code technique de la dimension dénombrable. Les champs
`countUnitLabelSingular` et `countUnitLabelPlural` permettent de l'afficher
comme « tranche / tranches », « œuf / œufs », « pain / pains », etc.

Cette évolution ne modifie ni l'identité des Produits, ni leur déduplication,
ni les règles de calcul M-004.

## 2. Contrôle du corpus

Le v9 conserve exactement la baseline v8 :

```text
16 catégories
381 Produits
488 Références Produit
64 Références dont referenceUnit = UNIT
```

Les 64 Références `UNIT` possèdent un libellé singulier et pluriel. Les autres
unités n'en possèdent aucun.

Exemples structurants :

```text
Pain bruschetta surgelé
→ UNIT
→ tranche / tranches

Œuf coquille calibre L
→ UNIT
→ œuf / œufs

Bun brioché surgelé
→ UNIT
→ pain / pains
```

## 3. Frontière M-002 / M-003

Ces libellés désignent l'unité réellement comptée dans une recette. Ils ne
décrivent jamais un contenant d'achat.

```text
tranche, œuf, pain
→ unité de référence M-002

carton, paquet, sac, boîte
→ conditionnement commercial M-003
```

Le dataset v9 ne contient aucun fournisseur, prix, marque commerciale,
colisage ou nombre de pièces par paquet/carton.

## 4. Provenance et limites

La provenance professionnelle et les règles d'identité restent celles du v8,
documentées dans `docs/m002/M-002-SEED-V8-SOURCE.md`.

Les libellés v9 proviennent d'un audit interne déterministe des noms de
Références existants. Ils ne constituent ni une observation de marché, ni une
preuve de conditionnement fournisseur.

## 5. Prix repères

Le v9 n'ajoute aucun montant. Le dataset économique M-003 v3 conserve :

```text
362 Prix repères de démonstration existants
126 Références sans Prix repère global
```

Une valeur absente reste absente tant qu'une calibration économique
documentée n'a pas été validée.
