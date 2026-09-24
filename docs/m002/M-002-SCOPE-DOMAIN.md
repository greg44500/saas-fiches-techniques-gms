# M-002 — Référentiel Produits / Produits canoniques

**Statut : CHECKPOINT CARACTÉRISTIQUES VALIDÉ — implémentation en cours**  
**Branche :** `feature/m002-catalogue-produits`

## 1. Objectif

M-002 fournit un référentiel global, partagé et non commercial :

```text
SaaS
→ CanonicalProduct
→ ProductVariety éventuelle
→ ProductCharacteristic contrôlé
→ ProductVariant

Workspace
→ WorkspaceProduct
→ sélection d'une ProductVariant dans Mon référentiel
```

Le terme **catalogue** reste réservé aux catalogues fournisseurs de M-003.

## 2. Identité Produit

`CanonicalProduct` représente uniquement l'identité alimentaire générique.

Exemples :

- Carotte ;
- Pomme ;
- Tomate ;
- Pomme de terre.

Une désignation complexe ne devient jamais automatiquement un nouveau `CanonicalProduct` lorsque son Produit parent est identifiable.

Exemples interdits comme nouvelles identités racines par défaut :

- Carotte Nantaise ;
- Carotte en botte ;
- Mini carotte ;
- Carotte surgelée ;
- Pomme Golden.

## 3. ProductVariety

`ProductVariety` représente une véritable variété/cultivar rattachée à un Produit.

Exemples :

```text
Pomme → Golden
Pomme → Gala
Pomme → Granny Smith
Pomme de terre → Charlotte
```

Règles :

- relation globale vers `CanonicalProduct` ;
- facultative dans `ProductVariant` ;
- aucune fausse variété « Non précisée » ;
- unicité normalisée dans le Produit parent ;
- même nom autorisé sur deux Produits différents ;
- lifecycle `ACTIVE ↔ ARCHIVED` ;
- identité stable par ObjectId : un renommage ne modifie pas l'identité d'une variante.

`Nantaise`, appliqué à la carotte, est classé comme type commercial et non comme `ProductVariety`.

## 4. ProductCharacteristic contrôlé

Les exemples réels démontrent qu'une seule dimension Variété ne suffit pas.

`ProductCharacteristic` est une ressource globale rattachée à un `CanonicalProduct`. Son type appartient à un registre fermé :

```text
PRESENTATION
COMMERCIAL_TYPE
SIZE_FORMAT
COLOR
QUALITY_DESIGNATION
```

Ce modèle n'est pas un qualificatif libre et générique.

Classification validée :

| Désignation | Modélisation |
| --- | --- |
| Carotte | CanonicalProduct |
| Carotte Nantaise | Carotte + COMMERCIAL_TYPE:Nantaise |
| Carotte en botte | Carotte + PRESENTATION:En botte avec fanes |
| Carotte fanes | même Présentation canonique que « en botte / avec fanes » |
| Carotte des sables | Carotte + QUALITY_DESIGNATION:Carottes des sables, gouvernée |
| Carotte de couleur | Carotte + COLOR, valeur insuffisamment précise → revue |
| Mini carotte | Carotte + SIZE_FORMAT:Mini |
| Carotte râpée | Carotte + PRESENTATION:Râpée |
| Carotte surgelée | Carotte + Gamme 3 + état Surgelé |
| Pomme Golden | Pomme + ProductVariety:Golden |
| Pomme Gala | Pomme + ProductVariety:Gala |
| Pomme Granny Smith | Pomme + ProductVariety:Granny Smith |
| Tomate cerise | Tomate + COMMERCIAL_TYPE:Cerise |
| Tomate grappe | Tomate + PRESENTATION:En grappe |
| Tomate cœur de bœuf | Tomate + COMMERCIAL_TYPE:Cœur de bœuf |
| Pomme de terre grenaille | Pomme de terre + SIZE_FORMAT:Grenaille |
| Pomme de terre Charlotte | Pomme de terre + ProductVariety:Charlotte |

Dans la V1, une `ProductVariant` ne porte au maximum qu'une caractéristique de chaque type.

## 5. ProductVariant

Signature métier cible :

```text
CanonicalProduct
+ ProductVariety éventuelle
+ ProductCharacteristic[] structurées
+ foodRange
+ processingState
```

`referenceUnit` et `yieldPercent` restent hors signature.

La signature repose sur les identifiants stables de Variété et de Caractéristiques, pas sur leurs libellés. Un renommage ne crée donc pas une nouvelle identité métier.

La Présentation textuelle historique est migrée vers une `ProductCharacteristic(kind=PRESENTATION)`.

## 6. Gamme et état / transformation

Le registre backend conserve les six Gammes :

| Gamme | Nom | État initial |
| --- | --- | --- |
| 1 | Frais | Produit frais |
| 2 | Conserves | Conserve |
| 3 | Surgelés | Surgelé |
| 4 | Sous-vide cru / épluchés | Sous-vide cru / épluché |
| 5 | Sous-vide cuit | Sous-vide cuit |
| 6 | PAI / PAE | PAI / PAE |

Le frontend ne duplique jamais cette nomenclature.

## 7. Nom, synonymes et formes de recherche

`name` porte le libellé canonique affiché.

`aliases` ne contient que de vrais synonymes métier validés et relève de la gouvernance globale.

Ne sont pas des synonymes :

- casse ;
- accents ;
- apostrophes ;
- tirets ;
- ligatures ;
- singulier/pluriel raisonnablement dérivable ;
- fautes.

Les fautes sont traitées par la recherche approchée. Les formes techniques de recherche sont générées automatiquement et ne sont pas exposées comme alias métier.

Le champ Alias est supprimé des formulaires Workspace ordinaires.

## 8. Recherche complexe

La recherche décompose une saisie plutôt que de créer une nouvelle identité racine.

Exemples :

```text
carotte botte
→ Carotte
→ PRESENTATION:En botte avec fanes

carotte nantaise
→ Carotte
→ COMMERCIAL_TYPE:Nantaise

mini carotte
→ Carotte
→ SIZE_FORMAT:Mini

carotte surgelée
→ Carotte
→ Gamme 3 / Surgelé
```

Ordre conceptuel :

1. identifier le `CanonicalProduct` ;
2. identifier une Variété éventuelle ;
3. identifier les Caractéristiques contrôlées ;
4. identifier Gamme / État ;
5. déterminer uniquement ce qui est réellement nouveau.

## 9. Contribution semi-automatique

Un Workspace habilité n'obtient jamais un droit aveugle d'écriture globale.

Le moteur classe une contribution :

```text
EXISTING
AUTO_PUBLISHABLE
REVIEW_REQUIRED
INVALID
```

Le résultat est déterministe et justifié par des raisons explicites. Aucun score opaque de confiance n'est utilisé.

Baseline :

- nouvelle Variété non conflictuelle sous Produit existant → `AUTO_PUBLISHABLE` possible ;
- nouvelle Présentation simple sous Produit existant → `AUTO_PUBLISHABLE` possible ;
- faute rapprochée d'une référence connue → `EXISTING` ;
- caractéristique ambiguë ou difficile à classifier → `REVIEW_REQUIRED` ;
- nouveau `CanonicalProduct` → `REVIEW_REQUIRED` par défaut.

Une référence réelle reste `ACTIVE ↔ ARCHIVED`. Le statut de revue n'est jamais remis dans son lifecycle.

## 10. ReferenceContribution

Lorsqu'une revue humaine est requise, une ressource distincte `ReferenceContribution` trace au minimum :

- type de contribution ;
- Produit parent éventuel ;
- Workspace d'origine ;
- auteur ;
- dimension ciblée ;
- valeur proposée ;
- payload normalisé ;
- classification automatique ;
- raisons déterministes ;
- statut ;
- reviewer ;
- dates.

## 11. Autorisation

Workspace :

```text
RBAC       → product:contribute
Capability → product_contribution
Politique  → EXISTING / AUTO_PUBLISHABLE / REVIEW_REQUIRED / INVALID
```

Global :

```text
product:reference:read
product:reference:manage
ApplicationGlobalRole
ApplicationGlobalMember
```

Invariants :

```text
Super Admin Platform ≠ gouverneur Produit automatique
Workspace Owner       ≠ gouverneur Produit automatique
```

## 12. Imports

L'import M-002 accepte conceptuellement :

- Produit ;
- Variété éventuelle ;
- Caractéristiques contrôlées ;
- Gamme ;
- État / transformation ;
- unité ;
- rendement.

Il utilise le même moteur de normalisation, recherche, décomposition et contribution que les formulaires.

Les imports Workspace ne créent jamais librement des synonymes métier.

## 13. Frontière M-003

Restent strictement M-003 :

- Fournisseur ;
- Catalogue fournisseur / édition ;
- SupplierArticle ;
- référence fournisseur ;
- désignation commerciale ;
- conditionnement ;
- disponibilité fournisseur ;
- prix catalogue ;
- prix négocié ;
- prix facturé.

Un libellé commercial fournisseur ne modifie jamais l'identité M-002.

## 14. Migration

Les variantes historiques migrent avec :

```text
variety = null
presentation textuelle
→ ProductCharacteristic(PRESENTATION)
```

Garde-fous :

- aucune fusion silencieuse ;
- collisions détectées avant écriture finale ;
- transaction ;
- idempotence ;
- second passage sans réécriture indue.

## 15. Seed

`backend/seeds/data/m002-reference.v1.json` reste `ready:false` tant que Variété, Caractéristiques, recherche, contribution, imports et frontend ne sont pas finalisés.

Aucun rendement n'est inventé.