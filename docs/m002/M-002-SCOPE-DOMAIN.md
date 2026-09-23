# M-002 — Catalogue Produits / Produits canoniques

**Statut : RECADRÉ — création sans validation humaine systématique — 2026-09-23**  
**Branche :** `feature/m002-catalogue-produits`

## 1. Objectif

M-002 fournit un référentiel Produit commun à l'échelle du SaaS et un catalogue d'usage propre à chaque Workspace.

```text
SaaS
→ référentiel Produit canonique partagé

Workspace
→ catalogue d'usage
→ références vers le référentiel partagé
→ aucune copie de l'identité Produit

Dossier
→ consomme le catalogue du Workspace
→ aucune identité Produit propre au Dossier
→ aucune donnée commerciale M-003 dans M-002
```

Décision structurante : lorsqu'un Workspace crée un Produit absent du référentiel après contrôle anti-doublon, il crée une nouvelle identité globale immédiatement utilisable. Il n'existe pas de second référentiel privé Workspace ou Dossier.

## 2. Acteurs

### Membre Workspace autorisé

Selon ses permissions et capabilities M-002, il peut :

- rechercher les Produits existants ;
- rattacher une déclinaison à son catalogue ;
- créer un nouveau Produit global lorsque aucun équivalent crédible n'existe ;
- créer une nouvelle déclinaison globale d'un Produit existant ;
- importer des données Produit génériques dans les limites de son offre.

Toute création est précédée par les contrôles serveur d'unicité sémantique.

### Autorité métier globale Produit

L'autorité globale peut :

- alimenter directement le référentiel commun ;
- créer des Produits et déclinaisons ;
- importer en masse des données Produit génériques ;
- gérer les catégories ;
- corriger les identités partagées ;
- archiver/réactiver ;
- traiter ultérieurement les doublons résiduels ;
- consulter l'historique métier.

Cette autorité utilise le pont Application Global du Core.

Une personne peut appartenir à l'équipe Platform et recevoir explicitement cette autorité métier, mais aucun rôle Platform — y compris Super Admin — ne lui confère automatiquement `product:reference:read` ou `product:reference:manage`.

## 3. Modèle métier

### CanonicalProduct

Identité générique globale.

Responsabilités :

- nom canonique ;
- normalisation ;
- alias ;
- clés/grams de recherche ;
- catégorie ;
- statut ;
- provenance et audit ;
- aucun fournisseur, référence fournisseur, conditionnement ou prix.

`contributedFromWorkspace` reste une provenance technique/audit lorsqu'une création provient d'un Workspace. Ce champ ne constitue jamais l'ownership.

### ProductVariant

Déclinaison structurée d'un Produit canonique :

- forme ;
- état/transformation ;
- conservation ;
- gamme facultative ;
- unité de référence ;
- rendement facultatif.

Une signature normalisée unique empêche deux déclinaisons équivalentes d'un même Produit.

### WorkspaceProduct

Relation d'usage appartenant au Workspace :

```text
Workspace
→ WorkspaceProduct
→ ProductVariant
→ CanonicalProduct
```

Elle ne copie aucune identité globale.

### ProductCategory

Taxonomie globale plate en M-002.

Un Produit `ACTIVE` doit avoir une catégorie `ACTIVE`.

## 4. Unicité et création

Avant toute création :

```text
normalisation
→ recherche exacte
→ alias
→ casse / accents
→ singulier-pluriel lorsque couvert par la normalisation
→ recherche de proximité
→ candidats proches
→ revue explicite des candidats
→ création seulement si aucun équivalent n'est retenu
```

L'unicité technique MongoDB complète le contrôle métier mais ne le remplace pas.

En cas de concurrence, la contrainte technique reste l'autorité finale et retourne un conflit plutôt que de créer un doublon.

## 5. Lifecycle

Lifecycle opérationnel V1 :

```text
ACTIVE
↔ ARCHIVED
```

Les créations Workspace et les créations de l'autorité globale deviennent `ACTIVE` dans la même transaction que leur création.

Le workflow quotidien `PENDING_REVIEW → approve/reject` est supprimé.

Les anciennes valeurs issues du développement précédent sont des données de migration, pas des états métier à conserver dans le parcours V1.

## 6. Création depuis un Workspace

Nouveau Produit :

```text
recherche préalable
→ contrôle anti-doublon serveur
→ catégorie ACTIVE obligatoire
→ CanonicalProduct ACTIVE
→ première ProductVariant ACTIVE
→ WorkspaceProduct ACTIVE
→ activité métier
```

Nouvelle déclinaison :

```text
Produit parent ACTIVE
→ signature de déclinaison unique
→ ProductVariant ACTIVE
→ WorkspaceProduct ACTIVE
→ activité métier
```

La provenance Workspace est conservée pour l'audit. Les autres Workspaces peuvent ensuite retrouver cette identité globale.

Un membre Workspace ne peut pas modifier directement une identité globale déjà partagée ; les corrections du référentiel commun relèvent de l'autorité Application Global.

## 7. Alimentation par l'autorité globale

L'autorité `product:reference:manage` peut alimenter le même référentiel :

- création unitaire ;
- ajout d'une déclinaison ;
- import CSV/XLS/XLSX de données Produit génériques.

Une personne de l'équipe Platform peut exercer cette fonction uniquement si un `ApplicationGlobalMember` lui attribue explicitement le rôle/les permissions Produit correspondants.

Le rôle Platform et l'autorité métier globale restent deux dimensions séparées.

## 8. Import M-002

Deux usages existent.

### Import Workspace

```text
Workspace
→ capability product_catalog_import
→ permission product:read
→ droits de mutation calculés à partir de la preview
→ rattachement existant ou création globale contrôlée
```

La clé technique `product_contribution` est conservée pour compatibilité du contrat commercial déjà intégré ; sa sémantique devient « autoriser la création de nouvelles identités/déclinaisons dans le référentiel partagé », sans file de validation humaine.

### Import global

```text
Application Global product:reference:manage
→ import de données Produit génériques
→ mêmes contrôles anti-doublon
→ aucune dépendance à un Workspace ou à son plan
→ aucune création de WorkspaceProduct
```

Le pipeline de sécurité fichier Core reste partagé : temporaire sécurisé, inspection, checksum, antivirus, parsing puis suppression du temporaire.

## 9. Frontière avec M-003

M-002 ne contient jamais :

- fournisseur ;
- catalogue fournisseur ;
- édition/version de catalogue fournisseur ;
- référence fournisseur ;
- conditionnement commercial ;
- prix catalogue ;
- prix négocié ;
- prix facturé.

Ces données appartiennent à M-003.

Un fichier comportant ces colonnes doit être identifié comme potentiellement fournisseur et ne doit jamais injecter ces valeurs dans `CanonicalProduct`.

## 10. Archivage

Archiver une identité globale :

- empêche les nouveaux rattachements ;
- conserve les historiques et relations existantes ;
- ne supprime aucune donnée commerciale aval ;
- reste réversible par l'autorité globale.

La fusion destructive de Produits déjà référencés reste différée tant que le graphe M-003/M-004 n'est pas complet.
