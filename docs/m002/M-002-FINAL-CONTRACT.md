# M-002 — Contrat final du Référentiel Produits

**Statut : VALIDÉ — implémentation en cours de finalisation sur `feature/m002-catalogue-produits`**  
**Date : 2026-09-24**  
**Autorité : ce document remplace les décisions M-002 antérieures lorsqu'elles le contredisent.**

## 1. Objectif

M-002 fournit un référentiel Produit global, partagé et non commercial, immédiatement exploitable par les futurs modules métier, notamment les fiches techniques.

M-002 répond à la question :

```text
Qu'est-ce que le Produit ?
```

M-003 répondra séparément à :

```text
Comment ce Dossier achète-t-il ce Produit ?
```

Les fournisseurs, références fournisseur, conditionnements commerciaux, prix catalogue/négociés/facturés et mappings économiques Dossier restent donc hors périmètre M-002.

## 2. Modèle cible retenu

Le modèle existant est adapté sans créer une nouvelle collection redondante.

```text
CanonicalProduct
→ racine / concept Produit global
→ peut exister sans référence exploitable

ProductVariant
→ rôle métier actif = Référence Produit exploitable
→ porte un nom métier persistant
→ reste techniquement nommé ProductVariant pour compatibilité et maîtrise de migration

WorkspaceProduct
→ lien Workspace ↔ Référence Produit
→ rôle métier actif = Favori
→ ne copie jamais l'identité Produit
```

Les Variétés et Caractéristiques restent des dimensions facultatives d'enrichissement.

## 3. Identité d'une Référence Produit

Une Référence Produit exploitable porte obligatoirement :

- `name` : nom métier persistant ;
- `normalizedName` : normalisation technique ;
- `conservationType` ;
- `referenceUnit`.

Règles :

- le nom visible n'est jamais reconstruit automatiquement depuis les dimensions ;
- `normalizedName` est unique pour une référence active ;
- une collision exacte bloque la création ;
- les noms proches déclenchent la logique de revue/déduplication existante ;
- les dimensions servent à enrichir, filtrer et rechercher, pas à fabriquer l'identité.

Exemples de références distinctes :

```text
Carotte
Carotte râpée
Carotte en rondelles
Carotte surgelée
Farine de blé
Flocons d'avoine
Paleron de bœuf
Faux-filet de bœuf
```

## 4. Conservation

`conservationType` est obligatoire et indépendant de la Gamme.

Valeurs actives V1 :

```text
FRAIS       → Frais
REFRIGERE   → Réfrigéré
SURGELE     → Surgelé
CONSERVE    → Conserve
SEC         → Sec
```

Aucune conservation n'est inventée pendant une migration si elle ne peut pas être déterminée de façon fiable.

## 5. Gammes

La Gamme est facultative.

Valeurs actives :

```text
1 → Gamme 1
2 → Gamme 2
3 → Gamme 3
4 → Gamme 4
5 → Gamme 5
6 → Gamme 6 — PAI / PAE
```

Décision définitive :

- `usageType` n'appartient plus au contrat actif ;
- PAI/PAE n'est plus porté par un champ séparé ;
- `Gamme 6` représente PAI / PAE ;
- un Produit comme une farine peut ne porter aucune Gamme ;
- `processingState` reste facultatif et n'est plus déduit automatiquement de la Gamme.

Les constantes `PRODUCT_USAGE_TYPE*` ne peuvent subsister que pour compatibilité de migrations historiques déjà versionnées, jamais dans les API/UI actives.

## 6. Catégorie et dimensions

La catégorie est facultative à la création d'une Référence Produit.

Les dimensions suivantes restent facultatives :

- Variété ;
- Présentation ;
- Pièce / découpe ;
- Type commercial ;
- Calibre / format ;
- Couleur ;
- Désignation de qualité ;
- État / transformation ;
- Rendement.

Une référence reste exploitable sans devoir renseigner toutes ces dimensions.

## 7. UX Workspace

Deux vues :

```text
Tous les produits
Favoris
```

Liste opérationnelle :

```text
Produit | Conservation | Actions
```

Filtres disponibles :

- Recherche ;
- Catégorie ;
- Conservation ;
- Gamme ;
- Tri.

Règles UX :

- une ligne = une Référence Produit exploitable ;
- pas de catégorie répétée sous chaque nom ;
- pas de nom généré depuis les dimensions ;
- pas de bruit « non renseigné » lorsque la donnée peut simplement être omise ;
- les favoris sont gérés via `WorkspaceProduct`.

## 8. Création Produit

Le parcours nominal demande :

```text
Nom Produit
Conservation
Unité
Catégorie facultative
Gamme facultative
```

Les dimensions avancées sont des enrichissements facultatifs.

Pour une création Workspace, le nom de la première Référence Produit est initialisé avec le nom saisi puis peut être corrigé explicitement.

## 9. Recherche et déduplication

La recherche utilise en priorité le nom persistant de Référence Produit, puis les dimensions comme termes secondaires.

L'unicité exacte porte sur `ProductVariant.normalizedName`.

Un import ou une création rencontrant exactement le même nom de Référence doit réutiliser cette référence plutôt que créer un doublon sous un autre `CanonicalProduct`.

## 10. Import et frontière M-003

L'import M-002 peut lire :

- nom de Référence Produit ;
- catégorie ;
- conservation ;
- unité ;
- Gamme ;
- dimensions M-002 facultatives.

Colonnes commerciales détectées mais non absorbées par M-002 :

- Fournisseur ;
- référence Article fournisseur ;
- conditionnement ;
- colisage ;
- prix.

Ces données sont réservées à M-003.

L'import M-002 reste temporaire et sécurisé ; il ne constitue pas un stockage durable de catalogues fournisseur.

## 11. Seed

Les datasets historiques restent immuables :

```text
m002-reference-v1
m002-reference-v2
m002-reference-v3
```

Le contrat final utilise :

```text
m002-reference-v5\nm002-reference-v6
```

Les v1 à v5 sont historiques. Le v6 est le dataset actif et sa source unique est le PDF `SANS PRIX-IPCOLL-SEC-SEPT 2026.pdf`. Il ne contient que des denrées alimentaires présentes dans ce document ; aucune Référence des anciens seeds n'est conservée si elle n'est pas présente dans le PDF. Marques, références fournisseur, prix et colisages restent hors M-002.

Les catalogues PDF fournisseur serviront ultérieurement de source réelle d'enrichissement ; ils ne doivent pas être injectés avant validation finale M-002.

## 12. Migration

Les migrations historiques ne sont jamais réécrites.

Une migration additionnelle convertit le contrat actuel vers :

- nom persistant de Référence ;
- conservation obligatoire ;
- Gamme 6 lorsque l'ancien `usageType` le justifie ;
- suppression de `usageType` du document actif ;
- recalcul de signature.

Principe fail-closed :

- conversion déterministe → migration autorisée ;
- nom ou conservation ambiguë → échec explicite / revue métier ;
- aucune donnée métier n'est inventée silencieusement.

## 13. Tests obligatoires

Le lot final doit prouver au minimum :

- persistance du nom de Référence ;
- absence de nom calculé ;
- conservation obligatoire ;
- catégorie facultative ;
- Gamme facultative et Gamme 6 acceptée ;
- rejet/absence de `usageType` dans le contrat actif ;
- unicité du nom normalisé ;
- rattachement Favori sans copie de donnée ;
- recherche par nom et dimensions ;
- import sans doublon ;
- migration fail-closed ;
- seed v6 idempotent et réconciliation des anciens seeds ;
- permissions Workspace et Application Global ;
- E2E création/contribution/favoris.

Gates finaux attendus :

```bash
npm run release:verify
npm run lint
npm test -- --no-file-parallelism

cd frontend
npm run lint
npm test
npm run build
cd ..

npm run test:e2e
```

À la date de ce contrat, ces gates doivent encore être exécutés sur le HEAD final avant de déclarer M-002 vert.

## 14. Frontière Core / Produit

Ce recadrage est spécifique au modèle métier Produit.

Aucune nouvelle primitive Core n'est requise pour :

- l'identité Référence Produit ;
- Conservation ;
- Gamme 6 ;
- Favoris Produit ;
- seed v6 ;
- déduplication Produit.

Toute évolution générique découverte ultérieurement doit continuer à être traitée dans `saas-core-api` puis intégrée par une branche `core-update/*`.
