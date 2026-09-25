# M-002 — Référentiel Produits / Produits canoniques

> **CONTRAT FINAL 2026-09-24** — La source de vérité actuelle est `docs/m002/M-002-FINAL-CONTRACT.md`. Toute section historique de ce document qui décrit `Gamme 1..5 + usageType PAI/PAE`, un nom de référence calculé, une catégorie obligatoire ou « Mon référentiel » est obsolète lorsqu'elle contredit ce contrat final.

**Statut : RECADRAGE QA VALIDÉ — adaptation du code requise avant validation finale**  
**Branche :** `feature/m002-catalogue-produits`  
**Contrat complémentaire canonique :** `docs/m002/M-002-RECARDAGE-QA.md`

## 1. Objectif

M-002 fournit un référentiel global, partagé et non commercial, puis une sélection de variantes par Workspace.

## 2. Modèle cible

```text
CanonicalProduct
→ identité racine globale
→ peut exister sans ProductVariant

ProductVariety
→ variété/cultivar

ProductCharacteristic
→ PRESENTATION
→ COMMERCIAL_TYPE
→ SIZE_FORMAT
→ COLOR
→ QUALITY_DESIGNATION
→ CUT (Pièce / découpe)

ProductVariant
→ variété éventuelle
→ caractéristiques structurées
→ Gamme 1..5
→ État / transformation
→ usageType éventuel PAI / PAE
→ unité de référence
→ rendement facultatif

WorkspaceProduct
→ rattachement Workspace d'une ProductVariant

ReferenceContribution
→ proposition Workspace gouvernée
```

## 3. CanonicalProduct et granularité

Une identité racine reste générique : `Bœuf`, `Agneau`, `Poulet`, `Carotte`, `Pomme`.

Le système ne crée plus de variante vague uniquement pour rendre l'identité exploitable. Lorsque la pièce/découpe est nécessaire, elle est structurée par `CUT` avant rattachement au Workspace.

## 4. Caractéristiques structurées

`CUT` décrit la pièce/découpe ; `PRESENTATION` décrit la forme de mise en œuvre.

Exemples :

```text
Bœuf + Paleron + Cubes
Agneau + Gigot + Tranché
Carotte + Râpée
```

Une variante porte au maximum une caractéristique de chaque type.

## 5. Gammes et PAI/PAE

Gammes : 1 Frais, 2 Conserves, 3 Surgelés, 4 Sous-vide cru/épluchés, 5 Sous-vide cuit.

PAI/PAE est séparé de la Gamme et peut se combiner avec elle. Il n'est ni une catégorie Produit ni une Gamme.

## 6. Signature

```text
canonicalProduct
+ varietyId
+ characteristicIds
+ foodRange
+ normalized(processingState)
+ usageType
```

Unité et rendement restent hors signature.

## 7. Catégories

La catégorie décrit la famille métier : Charcuteries, Viandes et volailles, Produits laitiers, Condiments/sauces/aides culinaires, etc.

`Jambon blanc` et `Bacon` restent par exemple en `Charcuteries`. Une forme tranchée relève de la Présentation, pas d'un reclassement PAI/PAE automatique.

## 8. Recherche et déduplication

Les synonymes métier persistent uniquement sous gouvernance. Casse, accents, pluriels et fautes relèvent du moteur de recherche.

Le champ utilisateur n'expose jamais le terme Alias.

## 9. Gouvernance

Workspace : `product:contribute` + capability `product_contribution`.

Global : `product:reference:read` / `product:reference:manage` via Application Global.

Le Fondateur reçoit explicitement `product_reference_governor`; Super Admin seul n'accorde rien implicitement.

## 10. Seed / migration

`v1` et `v2` restent immuables. `v3` corrige le référentiel, autorise `variants: []` et traite la disparition de Gamme 6 sans invention de données.

## 11. UX structurante

La liste principale est groupée par Produit, variantes en sous-lignes, pagination par Produit. Recherche : `Rechercher un produit…`.

## 12. Dépendance Core

La navigation Platform doit devenir extensible génériquement dans le Core avant d'exposer `Référentiel Produits` dans l'administration Platform.

Aucun changement de version/tag Core n'est prévu pour ce lot ; intégration ultérieure par SHA exact.

## 13. Frontière M-003

Fournisseurs, catalogues fournisseur, références commerciales, conditionnements et prix restent strictement M-003.
