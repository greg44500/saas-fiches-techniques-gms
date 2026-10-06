# M-002 — Contrat final du Référentiel Produits

**Statut : VALIDÉ ET GELÉ FONCTIONNELLEMENT — clôture acceptée le 2026-09-25**  
**Date : 2026-09-25**  
**Autorité : ce document remplace les décisions M-002 antérieures lorsqu'elles le contredisent.**

La clôture de M-002 gèle le contrat fonctionnel, pas le contenu du référentiel : de nouvelles données Produit peuvent continuer à être ajoutées via les flux gouvernés existants ou de nouveaux datasets versionnés. Les retouches purement visuelles non bloquantes n'autorisent pas de modification silencieuse de ce contrat.

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

Lorsque `referenceUnit = UNIT`, elle porte aussi les libellés métier de cette
unité dénombrable :

- `countUnitLabelSingular` ;
- `countUnitLabelPlural`.

Règles :

- le nom visible n'est jamais reconstruit automatiquement depuis les dimensions ;
- `normalizedName` est unique pour une référence active ;
- une collision exacte bloque la création ;
- les noms proches déclenchent la logique de revue/déduplication existante ;
- les dimensions servent à enrichir, filtrer et rechercher, pas à fabriquer l'identité.
- les libellés dénombrables servent uniquement à présenter et historiser
  `UNIT` comme « tranche(s) », « œuf(s) », « pain(s) », etc. ;
- ces libellés ne participent ni à l'identité, ni à la déduplication, ni aux
  conversions ;
- carton, paquet, sac et autres contenants restent des conditionnements
  commerciaux M-003, jamais des unités de référence M-002.

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

## 5. Gammes — compatibilité backend

La Gamme reste une donnée backend facultative conservée pour compatibilité et évolution future.
Elle n'est plus utilisée par le frontend actif M-002 : aucun affichage, filtre, champ de saisie ou mapping d'import ne doit dépendre de `foodRange`.

Valeurs backend conservées :

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

La gouvernance des valeurs est non bloquante : une nouvelle identité nécessitant contrôle peut être créée en `PROVISIONAL`, immédiatement exploitable dans le Workspace d'origine, puis validée, corrigée, fusionnée ou rejetée par la gouvernance Platform. Une proximité lexicale produit une confirmation utilisateur explicite et jamais une fusion automatique silencieuse.

Cette règle couvre désormais aussi une **Référence Produit** créée depuis un Workspace sous un Produit global existant : le `ProductVariant` est créé en `PROVISIONAL`, une `ReferenceContribution` de type `VARIANT` porte la demande de contrôle, et le moteur de rapprochement M-002 est réutilisé avant création puis lors de la gouvernance Platform. Une correspondance exacte réutilise l'existant ; une proximité telle que `Galla / Gala` reste une suggestion et nécessite une décision humaine explicite.

`Type commercial` reste dans le modèle M-002 et dans les données existantes, mais les nouveaux ajouts Workspace sont temporairement masqués tant que sa définition métier n'est pas validée.

## 6.1. Revue qualité Platform des Dimensions

Extension fonctionnelle validée le 2026-10-01.

La Platform doit pouvoir identifier et traiter individuellement les nouvelles Variétés et Caractéristiques ajoutées depuis un Workspace.

La revue qualité est distincte du lifecycle et de la gouvernance :

```text
Lifecycle
ACTIVE | ARCHIVED

Gouvernance
APPROVED | PROVISIONAL | RESOLVED | REJECTED

Revue qualité
NOT_REQUIRED | PENDING | REVIEWED
```

Règles :

- une Dimension créée directement par la Platform porte `NOT_REQUIRED` ;
- une Dimension créée depuis un Workspace porte `PENDING` ;
- la migration historique applique la même règle à partir de `contributedFromWorkspace` ;
- le tableau Platform expose uniquement un compteur des Dimensions actives encore `PENDING` ;
- cliquer sur cette pastille ouvre directement le drawer Produit sur `Dimensions > À contrôler` ;
- aucune action d'acquittement global n'est disponible dans le tableau Produit ;
- chaque ligne `PENDING` peut être marquée `REVIEWED` indépendamment ;
- corriger une ligne `PENDING` depuis la Platform vaut revue explicite et la passe à `REVIEWED` ;
- une Dimension erronée peut être supprimée de l'usage actif uniquement si aucune Référence Produit, active ou historique, ne la référence ;
- la suppression fonctionnelle préserve l'audit mais retire la Dimension des surfaces actives ;
- archiver reste distinct de supprimer : l'archivage conserve une valeur métier valide mais indisponible ;
- une Dimension archivée encore `PENDING` ne compte pas dans la pastille ; si elle est réactivée sans revue, elle redevient à vérifier ;
- les événements `PRODUCT_DIMENSION_REVIEWED` et `PRODUCT_DIMENSION_DELETED` alimentent l'historique Produit ;
- une revue qualité directe ne vaut jamais, à elle seule, approbation d'une identité `PROVISIONAL` ;
- lorsqu'une Dimension `PROVISIONAL` est elle-même l'objet d'une décision de gouvernance `APPROVE`, cette décision humaine clôt également sa revue qualité en la passant à `REVIEWED`, afin de ne jamais demander un second contrôle sur la même donnée.

La revue qualité et la gouvernance restent deux responsabilités backend distinctes ; une même décision humaine peut toutefois satisfaire les deux lorsqu'elles portent exactement sur la même Dimension provisoire.

## 6.2. Surface Platform unifiée « À contrôler »

La séparation des responsabilités backend est conservée, mais le gestionnaire
global dispose d'une file de travail unifiée :

```text
ReferenceContribution PENDING_REVIEW
+
ProductVariety / ProductCharacteristic PENDING
→ read model « À contrôler »
```

La file est agrégée et paginée côté serveur. Elle ne constitue ni une nouvelle
collection MongoDB, ni un nouveau lifecycle.

Le gestionnaire ne manipule pas le concept technique de Contribution. La vue
présente des **données métier à contrôler** :

```text
Type
→ Produit
→ Référence
→ Dimension · Variété / type de Caractéristique

Donnée à valider
Contexte Produit
Rapprochement éventuel
Action → Examiner
```

L'origine Workspace et l'auteur restent disponibles pour l'audit mais ne sont
pas affichés dans la file principale.

Une Dimension provisoire déjà liée à une `ReferenceContribution` en attente
n'apparaît qu'une seule fois. Une Contribution dont la cible provisoire
n'existe plus ou n'est plus `PROVISIONAL` est exclue de la file active afin
de ne jamais proposer une action vouée à échouer.

`Examiner` ouvre le drawer sur la cible exacte :

```text
Produit
→ onglet Produit

Référence
→ onglet Références
→ filtre À contrôler
→ focus sur la Référence

Dimension
→ onglet Dimensions
→ filtre À contrôler
→ focus sur la Dimension
```

La décision est prise dans le drawer avec le contexte nécessaire :

```text
Modifier
Valider
Fusionner avec une valeur proche
Refuser
```

La fusion reste toujours explicite. Le score ou la distance Levenshtein ne sont
jamais exposés comme une décision automatique.

Les décisions restent persistées dans les primitives backend de gouvernance et
d'audit, mais ne sont plus exposées comme onglet principal de la surface
Platform. Une donnée traitée disparaît de `À contrôler` ; la traçabilité reste
disponible pour audit, support et diagnostic.

Aucune nouvelle permission n'est créée : lecture par
`product:reference:read`, traitement par `product:reference:manage`.

Le contrat détaillé est
`docs/m002/M-002-GOVERNANCE-REVIEW-QUEUE.md`.

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

Filtres disponibles dans la liste Workspace :

- Recherche ;
- Catégorie ;
- Conservation.

Règles UX :

- la liste est ordonnée alphabétiquement par nom de Référence Produit par défaut ;
- aucun contrôle de tri alphabétique n'est affiché dans cette toolbar ;
- la Gamme n'est ni affichée ni éditée dans le frontend actif ;
- la recherche principale occupe l'espace prioritaire de la toolbar ;
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
```

Les dimensions avancées sont des enrichissements facultatifs.

Pour une création Workspace, le nom de la première Référence Produit est initialisé avec le nom saisi puis peut être corrigé explicitement.

## 9. Recherche et déduplication

La recherche utilise en priorité le nom persistant de Référence Produit, puis les dimensions comme termes secondaires.

L'unicité exacte porte sur `ProductVariant.normalizedName`.

Un import ou une création rencontrant exactement le même nom de Référence doit réutiliser cette référence plutôt que créer un doublon sous un autre `CanonicalProduct`.

## 10. Import et frontière M-003

L'import M-002 exposé dans le frontend peut mapper :

- nom de Référence Produit ;
- catégorie ;
- conservation ;
- unité ;
- dimensions M-002 facultatives.

Le backend conserve la compatibilité `foodRange`, mais le frontend ne propose plus de colonne ni de valeur par défaut « Gamme ».

Colonnes commerciales détectées mais non absorbées par M-002 :

- Fournisseur ;
- référence Article fournisseur ;
- conditionnement ;
- colisage ;
- prix.

Ces données sont réservées à M-003.

L'import M-002 reste temporaire et sécurisé ; il ne constitue pas un stockage durable de catalogues fournisseur.

## 11. Seed

Les datasets v1 à v8 sont historiques et restent immuables.

Le dataset actif sur la branche du lot Produits globaux est :

```text
m002-reference-v9
```

Le v9 reprend exactement les identités du v8 et enrichit uniquement les
Références `UNIT` avec leur unité de recette sémantique. Il ne crée aucun
conditionnement commercial.

État du corpus :

```text
16 catégories
381 Produits
488 Références Produit
64 Références UNIT nommées au singulier et au pluriel
```

Le v8 conserve sa provenance propre et reste immuable. Le v9 documente son
audit sémantique dans `docs/m002/M-002-SEED-V9-SOURCE.md`, sans transformer les
marques, références fournisseur, prix ou conditionnements en identité M-002.

Le corpus exploite explicitement la structure
`CanonicalProduct → plusieurs ProductVariant` lorsque plusieurs Références
techniquement distinctes appartiennent au même concept Produit, par exemple
Farine de blé, Beurre ou Pain burger.

Les imports fournisseur complets et les données commerciales restent traités
séparément selon la frontière M-002 / M-003.

## 12. Migration et remise à zéro locale pré-release

Les migrations historiques ne sont jamais réécrites.

M-002 n'étant pas encore livré, les bases locales ayant servi aux itérations v1 à v5 ne constituent pas des données de production à préserver. Lorsqu'elles contiennent des références expérimentales impossibles à migrer sans inventer une règle métier, la stratégie locale officielle est :

```text
reset M-002 local sécurisé
→ migration M-002 sur catalogue vide
→ seed m002-reference-v9
```

Le reset est strictement limité à `NODE_ENV=development`, à MongoDB local, à une base terminant par `_dev`, à `ALLOW_DEVELOPMENT_DATA_RESET=true` et à une confirmation explicite. Il ne touche qu'aux collections M-002.



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
- libellés singulier/pluriel obligatoires pour les 64 Références `UNIT` du v9 ;
- absence de libellés dénombrables sur les unités physiques ;
- seed v9 idempotent et réconciliation des anciens seeds v1 à v8 ;
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
- seed v9 ;
- déduplication Produit.

Toute évolution générique découverte ultérieurement doit continuer à être traitée dans `saas-core-api` puis intégrée par une branche `core-update/*`.
