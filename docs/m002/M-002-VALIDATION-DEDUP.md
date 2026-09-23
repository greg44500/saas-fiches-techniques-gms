# M-002 — Validation, identité et prévention des doublons

**Statut : ALIGNÉ SUR PRÉSENTATION/GAMME — exécution finale requise**

## 1. Normalisation

La normalisation backend est déterministe : trim, NFKD, suppression des diacritiques, minuscules, normalisation des séparateurs et espaces.

Elle s'applique aux noms/alias et aux dimensions textuelles de déclinaison.

## 2. Identité Produit

`searchKeys` regroupe nom normalisé et alias normalisés. Un exact match interdit la création. Les candidats proches imposent une revue explicite ; aucune fusion automatique n'est réalisée.

## 3. Signature de déclinaison

```text
canonicalProductId
+ normalized(presentation)
+ foodRange
+ normalized(processingState)
```

L'unité de référence et le rendement restent des attributs corrigibles et ne participent pas à la signature.

Le champ Conservation n'existe plus dans le contrat courant.

## 4. Gamme et État / transformation

`foodRange` est validé depuis le registre backend 1..6.

Le backend résout `processingState` :

- valeur absente → `defaultProcessingState` de la Gamme ;
- valeur fournie → doit correspondre à une valeur autorisée de `processingStates` ;
- combinaison incompatible → conflit métier.

Le frontend ne peut pas étendre cette nomenclature par une liste locale.

## 5. Zod

### Produit

- `name` : trim, 1..120 ;
- `aliases` : array unique, max 20 ;
- `categoryId` obligatoire ;
- corps strict.

### Déclinaison — création

- `presentation` : nullable string 1..80 ;
- `foodRange` : enum métier backend 1..6, obligatoire ;
- `processingState` : nullable string 1..80 ; résolution métier côté service ;
- `referenceUnit` : enum backend, obligatoire ;
- `yieldPercent` : null ou nombre > 0 et <= 100.

### Déclinaison — modification

Les mêmes dimensions sont modifiables. Un changement de Gamme sans État explicite recalcule l'État par défaut de la nouvelle Gamme.

## 6. Import

Le mapping M-002 expose `presentation`, `foodRange`, `processingState`, `referenceUnit`, `yieldPercent`.

Une ligne de création sans Gamme mappée ou Gamme par défaut est invalide.

## 7. Migration

La migration de l'ancien contrat recalcule la nouvelle signature. Elle vérifie toutes les signatures actives **avant écriture** et échoue si deux anciennes variantes convergent vers la même identité.

## 8. Erreurs

Les conflits anti-doublon, catégorie inactive, déclinaison dupliquée ou combinaison Gamme/État invalide conservent le contrat HTTP Core 400/401/403/404/409.