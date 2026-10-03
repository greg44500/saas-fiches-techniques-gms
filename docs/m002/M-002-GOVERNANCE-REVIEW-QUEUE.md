# M-002 — Gouvernance Produit unifiée / file « À contrôler »

**Statut : VALIDÉ POUR IMPLÉMENTATION SUR LA BRANCHE PRODUITS GLOBAUX**  
**Date : 2026-10-03**  
**Branche :** `feature/a2-professional-reference-corpus`

## 1. Objectif

Unifier, dans une seule surface Platform, les informations Produit qui
nécessitent encore une intervention du gestionnaire global.

Les primitives métier existantes restent les autorités :

```text
ReferenceContribution
→ gouvernance d'une contribution Workspace
→ APPROVE / MERGE / REJECT

ProductVariety / ProductCharacteristic
→ revue qualité d'une valeur automatiquement publiée
→ PENDING / REVIEWED

ProductReferenceEvent
→ historique immuable des décisions Produit
```

Le bloc ne crée pas de nouveau modèle de gouvernance et ne duplique pas ces
responsabilités.

## 2. File « À contrôler »

La file est un **read model agrégé**, non une nouvelle collection MongoDB.

Elle agrège :

```text
ReferenceContribution.status = PENDING_REVIEW

+

ProductVariety / ProductCharacteristic
qualityReviewStatus = PENDING
status = ACTIVE
identityActive = true
```

Une Dimension provisoire déjà portée par une `ReferenceContribution`
`PENDING_REVIEW` ne doit apparaître qu'une seule fois : comme Contribution.

Cela évite qu'un gestionnaire traite deux fois la même information.

## 3. Types d'éléments

Types de file :

```text
CONTRIBUTION
→ proposition Workspace soumise à gouvernance

DIMENSION_REVIEW
→ Variété ou Caractéristique déjà publiée mais à vérifier
```

Une Dimension précise ensuite :

```text
VARIETY
CHARACTERISTIC
```

Pour une Caractéristique, le `kind` M-002 reste exposé.

## 4. Données visibles

Chaque élément expose au minimum :

- nature de l'élément ;
- valeur proposée / valeur à vérifier ;
- Produit concerné lorsque disponible ;
- Workspace d'origine ;
- auteur d'origine lorsque disponible ;
- motif métier lorsqu'il existe ;
- date depuis laquelle l'action est nécessaire.

La provenance technique interne n'est pas transformée en bruit utilisateur.

Pour une contribution de type `CANONICAL_PRODUCT`, le contexte Produit
correspond au Produit provisoire créé pour le Workspace. Le service de
contribution renseigne aujourd'hui `canonicalProduct` avec cette identité
provisoire ; le read model conserve néanmoins un fallback sur
`provisionalEntityId` pour rester robuste face aux données historiques ou
incomplètes. L'utilisateur Platform peut ainsi ouvrir directement le Produit
à examiner au lieu d'obtenir un contexte « Produit indisponible ».

## 5. Actions

### Contribution

Réutiliser strictement les actions existantes :

```text
Approuver
Fusionner
Refuser
```

La correction reste portée par le workflow de gouvernance existant lorsque le
contrat de la contribution l'autorise.

### Dimension à vérifier

Actions :

```text
Marquer comme vérifiée
Ouvrir le Produit pour corriger / archiver / supprimer
```

Aucune seconde mutation de revue n'est créée.

## 6. UX Platform

La page Produits devient :

```text
Référentiel
À contrôler
Historique
Catégories
```

### À contrôler

- compteur global ;
- filtre par type ;
- filtre par Workspace d'origine ;
- pagination serveur ;
- accès direct au Produit ;
- actions disponibles selon le type ;
- états chargement / erreur / vide.

La file est ordonnée par ancienneté afin de rendre visibles en premier les
éléments en attente depuis le plus longtemps.

Le filtre « statut » étudié pendant le cadrage n'est pas retenu dans la file
active : toutes les lignes y ont, par définition, le même statut fonctionnel
« intervention requise ». Pour les Contributions, `PENDING_REVIEW` est la
condition d'entrée ; pour les Dimensions, `PENDING` est la condition
d'entrée. Les statuts terminaux sont consultés dans Historique. Un troisième
filtre dupliquerait donc le filtre de type sans apporter de décision
supplémentaire.

Le regroupement visuel strict par Produit n'est pas retenu en V1 afin de
préserver une pagination serveur simple, stable et ordonnée par ancienneté.
La colonne Produit et l'accès direct au drawer fournissent le contexte sans
charger toutes les lignes d'un Produit côté frontend.

### Historique

L'historique reste distinct de la file active.

Dans ce bloc, la surface globale Historique réutilise l'historique des
`ReferenceContribution` déjà persisté. Par défaut elle charge ensemble les
Contributions `APPROVED` et `REJECTED`, puis permet de filtrer le résultat.
Une fusion reste persistée avec le statut `APPROVED`, mais la décision
fonctionnelle affichée est dérivée de la résolution et rendue comme
`Fusionnée`.

L'historique détaillé des Dimensions reste disponible dans l'onglet Historique
du Produit via `ProductReferenceEvent`.

Aucun événement existant n'est réécrit.

## 7. Pagination et performance

La file est agrégée côté backend et paginée avant enrichissement des données
liées.

Aucun chargement exhaustif de toutes les Contributions ou Dimensions n'est
autorisé côté frontend.

Des indexes globaux de revue sont ajoutés sur Variétés et Caractéristiques
pour éviter une lecture transversale basée sur l'index par Produit.

## 8. RBAC

Aucune nouvelle permission n'est créée.

```text
product:reference:read
→ lire Référentiel / À contrôler / Historique

product:reference:manage
→ traiter une Contribution
→ vérifier / corriger une Dimension
```

Le Workspace ne reçoit aucune autorité globale supplémentaire.

## 9. Notification

L'audit du Core v1.2.1 montre qu'aucune primitive générique de notification
applicative persistée n'est fournie. Le Core classe les notifications étendues
dans la dette conditionnelle D-008.

Décision de ce bloc :

- le compteur « À contrôler » constitue le signal in-app Produit ;
- aucun nouveau modèle `Notification` métier n'est créé dans le dérivé ;
- si une notification générique persistée / lue-non-lue / distribuée est
  confirmée comme besoin, elle sera traitée dans `saas-core-api` puis
  réintégrée par une branche Core-update.

## 10. Tests

Backend :

- agrégation Contribution + Dimension ;
- déduplication Contribution / Dimension provisoire ;
- pagination ;
- filtres type / Workspace ;
- origine Workspace / auteur ;
- ordre ancienneté ;
- permissions HTTP ;
- revue d'une Dimension et disparition de la file ;
- décision Contribution et disparition de la file ;
- concurrence : une seule décision terminale peut gagner sur une même Contribution.

Frontend :

- compteur « À contrôler » ;
- filtres ;
- pagination ;
- actions Contribution ;
- validation directe d'une Dimension ;
- ouverture directe du Produit ;
- états vide / erreur / chargement ;
- lecture seule sans `product:reference:manage`.

E2E critique :

```text
Workspace crée une contribution
→ gestionnaire global la voit dans « À contrôler »
→ il la traite
→ l'élément quitte la file
→ la Référence globale résultante reste exploitable
```

## 11. Hors périmètre

- nouveau moteur de notification ;
- e-mail / push ;
- état lu / non lu ;
- duplication de l'historique Produit ;
- nouvelle permission ;
- nouvelle collection de gouvernance ;
- modification des invariants M-002.


## 12. UX de contrôle ciblé — décision validée le 2026-10-03

Le gestionnaire métier ne doit pas manipuler le concept technique de
« Contribution ». Il contrôle des données métier du référentiel.

La file `À contrôler` présente donc :

```text
Type
→ Produit
→ Référence
→ Dimension · <type>

Donnée à valider
→ valeur exacte créée

Contexte
→ Produit parent lorsque nécessaire

Rapprochement
→ aucun
→ ou candidat(s) proche(s) déjà détecté(s)

Action
→ Examiner
```

L'origine Workspace, l'auteur et les identifiants techniques restent
disponibles pour l'audit backend mais ne sont plus affichés dans la file
principale.

### 12.1 Références Produit créées depuis un Workspace

Une nouvelle Référence Produit créée sous un Produit global existant devient
désormais une identité `PROVISIONAL` du Workspace d'origine et génère une
demande de contrôle de type `VARIANT`.

Elle reste immédiatement exploitable dans le Workspace d'origine, mais n'est
pas publiée aux autres Workspaces avant validation globale.

Le moteur de rapprochement utilisé à la création Workspace est réutilisé pour
la gouvernance Platform :

```text
exact
→ réutiliser l'existant

proximité lexicale / Levenshtein
→ proposer les candidats
→ l'utilisateur peut confirmer une création distincte

création confirmée
→ Référence PROVISIONAL
→ candidat(s) conservé(s) dans la demande de contrôle

gestionnaire Platform
→ corriger
→ valider comme nouvelle Référence
OU
→ fusionner avec une Référence existante proche
```

Aucune proximité lexicale ne provoque de fusion automatique.

### 12.2 Drawer contextualisé

`Examiner` ouvre directement le drawer sur l'objet qui demande une décision :

```text
Produit
→ onglet Produit

Référence
→ onglet Références
→ filtre À contrôler
→ focus sur la Référence concernée

Dimension
→ onglet Dimensions
→ filtre À contrôler
→ focus sur la Dimension concernée
```

Pour les Références, le drawer expose :

```text
Références (N)   À contrôler (M)

[Toutes] [À contrôler]
```

Une Référence `PROVISIONAL` porte le badge warning `À contrôler`.
Une Référence `APPROVED` porte le badge positif `Validée` dans son détail.

Même principe pour les Dimensions : `À contrôler` avant revue puis
`Validée` après revue lorsque la valeur reste affichée.

### 12.3 Actions de décision

La table `À contrôler` ne prend plus de décision hors contexte. Son action
principale est `Examiner`.

Dans le drawer :

```text
Modifier
→ corriger l'orthographe ou la donnée métier
→ ne remplace pas l'acte explicite de validation d'une Contribution

Valider
→ approuver la donnée

Fusionner avec <candidat>
→ résoudre explicitement un rapprochement

Refuser
→ action secondaire lorsque la donnée ne doit pas rejoindre le référentiel
```

Après succès :

- toast explicite `Produit/Référence/Dimension validé(e)` ;
- compteur `À contrôler` décrémenté ;
- disparition de la vue filtrée `À contrôler` ;
- donnée toujours accessible dans la vue complète ;
- décision visible dans l'Historique.

### 12.4 Données orphelines

Une `ReferenceContribution PENDING_REVIEW` dont la cible provisoire n'existe
plus ou n'est plus `PROVISIONAL` ne doit pas être présentée comme une action
valide au gestionnaire.

Le read model de la file doit exclure ces demandes incohérentes. Elles restent
traçables en base pour diagnostic/audit mais ne peuvent produire un bouton de
décision qui échoue au clic.

### 12.5 Alias

Les alias/synonymes restent des données techniques utiles à la recherche,
normalisation et déduplication.

Ils ne sont plus affichés dans le drawer Produit ou dans la file de contrôle,
sauf futur besoin métier explicitement validé.
