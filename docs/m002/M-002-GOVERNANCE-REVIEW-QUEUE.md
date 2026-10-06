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

La file expose des types métier, pas les sources techniques internes :

```text
Produit
Référence
Dimension · Variété
Dimension · <kind Caractéristique>
```

Le read model continue en interne à agréger :

```text
ReferenceContribution
+
DIMENSION_REVIEW
```

mais ces termes techniques ne structurent pas l'interface gestionnaire.

## 4. Données visibles

Chaque élément expose au minimum :

- type métier ;
- donnée exacte à contrôler ;
- Produit parent lorsque nécessaire ;
- rapprochement(s) éventuel(s) ;
- action `Examiner`.

Le Workspace d'origine, l'auteur, les identifiants techniques et les données
d'audit restent persistés mais ne sont pas affichés dans la file principale.
La provenance ne doit pas devenir du bruit pour le gestionnaire métier.

Pour une contribution de type `CANONICAL_PRODUCT`, le contexte Produit
correspond au Produit provisoire créé pour le Workspace. Le service de
contribution renseigne aujourd'hui `canonicalProduct` avec cette identité
provisoire ; le read model conserve néanmoins un fallback sur
`provisionalEntityId` pour rester robuste face aux données historiques ou
incomplètes. L'utilisateur Platform peut ainsi ouvrir directement le Produit
à examiner au lieu d'obtenir un contexte « Produit indisponible ».

## 5. Actions

La table `À contrôler` ne décide pas hors contexte.

Action de ligne :

```text
Examiner
```

Le drawer ciblé porte la décision :

```text
Modifier
→ corriger la donnée métier

Valider
→ publier / approuver la donnée

Fusionner avec <candidat>
→ uniquement lorsqu'une valeur existante pertinente est proposée

Refuser
→ action secondaire lorsque la donnée ne doit pas rejoindre le référentiel
```

Pour une Dimension automatiquement publiée et soumise uniquement à revue
qualité, le drawer propose `Modifier` et `Valider`.

Une Dimension provisoire portée par une Contribution ne subit pas deux
contrôles successifs : sa validation de gouvernance clôt aussi sa revue qualité.

## 6. UX Platform

La page Produits devient :

```text
Référentiel
À contrôler
Catégories
```

### À contrôler

- compteur global ;
- colonnes `Type / Donnée à valider / Contexte / Rapprochement / Action` ;
- pagination serveur ;
- action unique `Examiner` ;
- ouverture du drawer sur la cible exacte ;
- aucun affichage Workspace/auteur ;
- états chargement / erreur / vide.

La file est ordonnée par ancienneté afin de rendre visibles en premier les
éléments en attente depuis le plus longtemps.

Aucun filtre d'origine n'est retenu : l'origine Workspace n'aide pas la
décision métier. Le besoin de filtre de type pourra être réévalué avec le
volume réel, sans modifier le contrat de gouvernance.

Le drawer porte les filtres opérationnels nécessaires :

```text
Références
→ Toutes
→ À contrôler

Dimensions
→ À contrôler
→ Actives
→ Archivées
→ Toutes
```

### Traçabilité après décision

Les décisions de gouvernance restent persistées dans les primitives backend
existantes (`ReferenceContribution`, `ProductReferenceEvent`, audit Core)
mais ne sont plus exposées comme onglet principal.

Décision UX V1 :

- une donnée traitée disparaît de `À contrôler` ;
- aucune action utilisateur de vidange de l'historique n'est ajoutée ;
- la traçabilité reste disponible pour audit, support et diagnostic ;
- une surface d'activité contextuelle pourra être ajoutée ultérieurement si
  un besoin métier concret le justifie.

L'absence d'onglet Historique ne supprime ni ne réécrit aucune donnée
persistée.


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
→ lire Référentiel / À contrôler / Catégories

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

- agrégation des demandes de gouvernance et revues qualité ;
- exclusion des Contributions orphelines ;
- absence de doublon Contribution / Dimension ;
- pagination ;
- classement métier Produit / Référence / Dimension ;
- rapprochement Référence avec le moteur existant ;
- scénario `Galla → Gala` sans fusion automatique ;
- correction de la donnée avant décision ;
- validation / fusion / refus et disparition de la file ;
- une validation de Dimension provisoire clôt aussi la revue qualité ;
- concurrence : une seule décision terminale gagne ;
- permissions HTTP.

Frontend :

- tableau métier sans origine/auteur ;
- aucun badge `À contrôler` redondant dans les lignes de la file ;
- compteur `À contrôler` ;
- `Examiner` uniquement dans la table ;
- routage vers la cible exacte ;
- filtre `À contrôler` dans le drawer Références ;
- focus warning ;
- badges `À contrôler` / `Validée` ;
- `Modifier / Valider / Fusionner / Refuser` dans le drawer ;
- rapprochements visibles sans score technique ;
- Alias absent du détail utilisateur ;
- Historique global absent de la navigation principale ;
- traçabilité backend conservée.

E2E critique :

```text
Workspace crée une donnée nouvelle
→ rapprochement éventuel proposé
→ l'utilisateur peut confirmer une création distincte
→ la donnée devient utilisable localement et À contrôler
→ gestionnaire ouvre la cible exacte
→ corrige / valide / fusionne
→ la donnée quitte À contrôler
→ décision conservée en traçabilité backend
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
- décision conservée dans la traçabilité backend.

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
