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
- cliquer sur cette pastille ouvre directement le drawer Produit sur `Dimensions > À vérifier` ;
- aucune action d'acquittement global n'est disponible dans le tableau Produit ;
- chaque ligne `PENDING` peut être marquée `REVIEWED` indépendamment ;
- corriger une ligne `PENDING` depuis la Platform vaut revue explicite et la passe à `REVIEWED` ;
- une Dimension erronée peut être supprimée de l'usage actif uniquement si aucune Référence Produit, active ou historique, ne la référence ;
- la suppression fonctionnelle préserve l'audit mais retire la Dimension des surfaces actives ;
- archiver reste distinct de supprimer : l'archivage conserve une valeur métier valide mais indisponible ;
- une Dimension archivée encore `PENDING` ne compte pas dans la pastille ; si elle est réactivée sans revue, elle redevient à vérifier ;
- les événements `PRODUCT_DIMENSION_REVIEWED` et `PRODUCT_DIMENSION_DELETED` alimentent l'historique Produit ;
- la revue qualité ne vaut jamais approbation d'une contribution `PROVISIONAL` ou `PENDING_REVIEW`.

La revue qualité des Dimensions et la gouvernance des Contributions restent deux responsabilités distinctes.

## 6.2. Surface Platform unifiée « À contrôler »

La séparation des responsabilités backend est conservée, mais le gestionnaire
global dispose d'une file de travail unifiée :

```text
ReferenceContribution PENDING_REVIEW
+
ProductVariety / ProductCharacteristic PENDING
→ À contrôler
```

La file est un read model agrégé et paginé côté serveur. Elle ne constitue ni
une nouvelle collection MongoDB, ni un nouveau lifecycle.

Une Dimension provisoire déjà liée à une `ReferenceContribution` en attente
n'apparaît qu'une seule fois dans la file, sous la forme de sa Contribution.

La file expose l'origine Workspace, le Produit, la nature de l'élément et sa
date de création. Les décisions réutilisent les mutations existantes.

L'historique est distinct de la file active. Une Contribution traitée expose
une décision dérivée `APPROVE | MERGE | REJECT` sans modifier les événements
historiques immuables.

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

Les datasets v1 à v6 sont historiques et restent immuables.

Le dataset actif sur la branche du lot Produits globaux est :

```text
m002-reference-v7
```

Le v7 reprend intégralement les 264 Références du v6 puis ajoute le corpus
professionnel validé autour de la pâtisserie / boulangerie, de la crémerie et
des pains / snacking.

État du corpus :

```text
16 catégories
320 Produits
368 Références Produit
+104 Références par rapport au v6
```

Le v6 conserve sa provenance propre et reste immuable. Le v7 ajoute des
sources professionnelles documentées dans
`docs/m002/M-002-SEED-V7-SOURCE.md` sans transformer les marques, références
fournisseur, prix ou conditionnements en identité M-002.

Le v7 exploite explicitement la structure
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
→ seed m002-reference-v6
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
- seed v7 idempotent et réconciliation des anciens seeds v1 à v6 ;
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
- seed v7 ;
- déduplication Produit.

Toute évolution générique découverte ultérieurement doit continuer à être traitée dans `saas-core-api` puis intégrée par une branche `core-update/*`.
