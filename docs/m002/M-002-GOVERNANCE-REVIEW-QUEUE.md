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

### Historique

L'historique reste distinct de la file active.

Dans ce bloc, la surface globale Historique réutilise l'historique des
`ReferenceContribution` déjà persisté. L'historique détaillé des Dimensions
reste disponible dans l'onglet Historique du Produit via
`ProductReferenceEvent`.

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
- décision Contribution et disparition de la file.

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
