# M-002 — Validation, identité et prévention des doublons

**Statut : ALIGNÉ SUR PRODUCTVARIETY + PRODUCTCHARACTERISTIC — implémentation en cours**

## 1. Normalisation

La normalisation technique backend reste déterministe : trim, NFKD, suppression des diacritiques, minuscules, normalisation des séparateurs et espaces.

Elle ne transforme pas les fautes en synonymes persistés.

## 2. Alias métier et formes de recherche

`aliases` est réservé aux synonymes métier validés.

Les formes dérivables — casse, accents, apostrophes, tirets, ligatures, singulier/pluriel raisonnable — sont générées pour la recherche mais ne deviennent pas des alias métier.

Les fautes sont gérées par recherche approchée.

## 3. Identité CanonicalProduct

`CanonicalProduct` est l'identité alimentaire racine.

Lorsqu'un Produit parent est identifiable dans une désignation complexe, le système ne propose pas automatiquement un nouveau Produit canonique.

Exemple :

```text
carotte des sables
→ Produit connu : Carotte
→ partie à classifier : des sables
```

## 4. Identité ProductVariety

Une Variété est unique dans son Produit parent selon sa valeur normalisée.

```text
canonicalProductId
+ normalized(variety.name)
```

Le même nom peut exister sous deux Produits distincts.

Les variantes utilisent l'ObjectId stable de la Variété dans leur signature.

## 5. Identité ProductCharacteristic

Un caractère est unique dans son Produit parent par :

```text
canonicalProductId
+ kind
+ normalized(characteristic.name)
```

Types V1 autorisés :

```text
PRESENTATION
COMMERCIAL_TYPE
SIZE_FORMAT
COLOR
QUALITY_DESIGNATION
```

Une `ProductVariant` ne peut pas référencer deux caractéristiques du même `kind`.

## 6. Signature ProductVariant

Signature cible :

```text
canonicalProductId
+ varietyId ou _
+ characteristicIds ordonnés par kind
+ foodRange
+ normalized(processingState)
```

La signature stockée dans `normalizedSignature` ne dépend pas du libellé de la Variété ni des Caractéristiques.

`referenceUnit` et `yieldPercent` n'entrent pas dans la signature.

## 7. Gamme / État

`foodRange` est validé depuis le registre backend 1..6.

`processingState` :

- absent → valeur par défaut de la Gamme ;
- fourni → doit être une valeur autorisée de cette Gamme ;
- incompatible → erreur métier.

## 8. Recherche complexe

La recherche suit ce pipeline :

```text
normalisation
→ détection CanonicalProduct
→ détection ProductVariety
→ détection ProductCharacteristic
→ détection Gamme / État
→ exact match
→ synonymes métier
→ formes dérivées
→ proximité
→ classification
```

Cas obligatoires à couvrir :

- carotte / carottes ;
- carote ;
- carotte botte ;
- mini carotte ;
- carotte nantaise ;
- carotte surgelée ;
- pomme golden ;
- tomate cerise ;
- pomme de terre grenaille.

## 9. Contribution

Classification :

```text
EXISTING
AUTO_PUBLISHABLE
REVIEW_REQUIRED
INVALID
```

Une décision doit exposer des raisons structurées et déterministes.

Aucun score opaque de confiance n'est autorisé.

## 10. Zod

Les payloads ordinaires Workspace ne saisissent pas d'alias métier.

Une déclinaison accepte à terme :

- `varietyId` nullable ;
- `characteristicIds[]` ;
- `foodRange` ;
- `processingState` nullable ;
- `referenceUnit` ;
- `yieldPercent` nullable.

La gouvernance globale possède des contrats séparés pour créer/corriger Variétés, Caractéristiques et synonymes métier.

## 11. Imports

L'import mappe les mêmes dimensions que l'API ordinaire et réutilise le même moteur de contribution.

Les colonnes M-003 restent signalées et non absorbées.

## 12. Migration

La migration :

1. crée/réutilise une `ProductCharacteristic(PRESENTATION)` pour chaque Présentation historique non vide ;
2. renseigne `variety = null` sur l'historique ;
3. renseigne `characteristics[]` ;
4. recalcule la signature cible ;
5. détecte toutes les collisions avant écriture finale ;
6. utilise une transaction ;
7. est idempotente.

Aucune collision n'est fusionnée automatiquement.