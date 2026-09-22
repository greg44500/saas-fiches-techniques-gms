# M-002 — Catalogue Produits / Produits canoniques

**Statut : PROPOSÉ — validation métier globale requise avant tout modèle Mongoose**
**Date : 2026-09-22**
**Branche de travail :** `feature/m002-catalogue-produits`

## 1. Objectif

M-002 fournit un référentiel Produit partagé à l'échelle du SaaS et un catalogue d'usage propre à chaque espace de travail.

Principe fermé par le cadrage transversal :

```text
SaaS
→ référentiel Produit canonique partagé

Espace de travail
→ catalogue d'usage
→ références vers le référentiel partagé
→ aucune copie de l'identité Produit

Dossier
→ consomme le catalogue de son espace de travail
→ aucune donnée commerciale locale dans M-002
```

M-002 ne contient ni fournisseur, ni article fournisseur, ni conditionnement commercial, ni tarif, ni prix magasin.

## 2. Acteurs

### Membre d'un espace de travail

Selon ses permissions M-002, il peut :

- rechercher les Produits disponibles ;
- consulter le catalogue de son espace de travail ;
- rattacher ou retirer une déclinaison du catalogue ;
- proposer un nouveau Produit ou une nouvelle déclinaison lorsque le référentiel ne couvre pas le besoin.

### Gouvernance Plateforme

La gouvernance Platform du référentiel partagé peut :

- consulter les contributions en attente ;
- corriger les données génériques partagées ;
- gérer les catégories ;
- approuver ou rejeter une contribution ;
- archiver ou réactiver un Produit ou une déclinaison globale.

Cette gouvernance ne donne aucun accès implicite aux données commerciales privées d'un espace de travail.

## 3. Modèle conceptuel proposé

### 3.1 CanonicalProduct — Produit canonique

Identité générique globale d'une denrée ou d'un composant.

Exemples :

```text
Carotte
Oignon
Farine
Film alimentaire
```

Responsabilités :

- nom canonique ;
- clé normalisée ;
- alias de recherche ;
- catégorie globale ;
- statut de gouvernance ;
- provenance de contribution et audit ;
- aucun prix, fournisseur choisi, référence magasin ou donnée tenant confidentielle.

Le Produit canonique n'a pas de champ `workspace` d'ownership.

### 3.2 ProductVariant — Déclinaison Produit

Une déclinaison représente la même identité canonique avec une réalité d'usage structurée différente.

Axes structurés proposés :

```text
forme
→ entière / râpée / rondelles / dés / filet / ...

état / transformation
→ brute / pelée / cuite / blanchie / prête à l'emploi / ...

conservation
→ fraîche / surgelée / appertisée / sèche / sous vide / ...
```

Ces valeurs restent des champs structurés distincts mais ne sont pas enfermées dans un enum exhaustif en M-002. Elles sont normalisées afin d'éviter les doublons lexicaux.

Attributs de la déclinaison :

- Produit canonique parent ;
- forme facultative ;
- état/transformation facultatif ;
- conservation facultative ;
- gamme alimentaire 1 à 5 facultative ;
- unité de référence ;
- rendement facultatif lorsqu'une valeur objective est connue ;
- statut ;
- audit.

La gamme ne détermine jamais automatiquement un rendement.

### 3.3 WorkspaceProduct — Entrée du catalogue d'usage

Relation appartenant à l'espace de travail.

```text
Espace de travail
→ WorkspaceProduct
→ ProductVariant
→ CanonicalProduct
```

Le rattachement est volontairement porté au niveau de la déclinaison réellement utilisable. L'interface regroupe les entrées par Produit canonique.

Aucune propriété globale du Produit n'est copiée dans cette relation.

Le retrait du catalogue archive la relation d'usage ; il n'archive jamais le Produit global.

### 3.4 ProductCategory — Catégorie

Référentiel global de classement.

Décisions proposées pour la V1 :

- une seule catégorie principale par Produit canonique ;
- taxonomie plate en M-002 ;
- pas de hiérarchie anticipée ;
- catégories gérées par la Plateforme ;
- une contribution peut être temporairement non classée tant qu'elle est en attente ;
- un Produit `ACTIVE` doit posséder une catégorie `ACTIVE`.

La liste métier initiale des catégories doit provenir du bootstrap validé ; elle ne sera pas inventée dans le code.

## 4. Frontière Produit / Déclinaison

Critère proposé :

```text
même composant / même denrée
+ changement de forme, préparation ou conservation
+ composition fondamentale inchangée
→ Déclinaison

formulation ou composition propre
+ ingrédients supplémentaires
+ fonction métier réellement distincte
→ nouveau Produit canonique
```

Exemples :

```text
Carotte entière
Carotte râpée
Carotte pelée prête à l'emploi
Carotte surgelée en rondelles
→ déclinaisons de Carotte

Purée 100 % carotte
→ peut rester une déclinaison si la composition est exclusivement Carotte

Purée de carotte industrielle avec lait, amidon ou assaisonnement
→ Produit canonique distinct
```

Un changement de marque, de fournisseur ou de conditionnement ne crée jamais un Produit canonique ni une déclinaison M-002 : ces notions appartiennent à M-003.

## 5. Rendement

Décision proposée :

- le rendement appartient à la déclinaison, pas au Produit canonique racine et pas au Workspace ;
- il est partagé uniquement lorsqu'il décrit objectivement la déclinaison générique ;
- il est facultatif si aucune valeur fiable n'est disponible ;
- le backend ne devine jamais un rendement absent ;
- une valeur connue est strictement supérieure à 0 et inférieure ou égale à 100 % ;
- un rendement calculable objectivement à partir de données fournisseur sera calculé en M-003, puis pourra alimenter la donnée applicable selon le contrat qui sera cadré alors.

Exemples :

```text
Farine — rendement 100 %
Carotte entière brute — rendement renseigné seulement si une valeur de référence fiable est décidée
Produit prêt à l'emploi — 100 % seulement lorsque ce fait est explicitement établi
```

## 6. Unités de référence

Registre backend-driven proposé :

```text
Masse
→ g
→ kg

Volume
→ ml
→ cl
→ l

Nombre
→ unité
```

Chaque unité possède une dimension et un facteur de conversion vers l'unité de base de sa dimension.

Les conditionnements commerciaux tels que carton, sac, boîte, seau ou barquette appartiennent à M-003.

## 7. Gamme alimentaire

Valeur facultative :

```text
1
2
3
4
5
null = non applicable / non renseigné
```

La gamme est un attribut de la déclinaison lorsqu'elle est pertinente. Elle n'est jamais obligatoire pour les Produits non concernés et ne calcule pas le rendement.

## 8. Lifecycle proposé

### Produit canonique

```text
PENDING_REVIEW
→ ACTIVE | REJECTED

ACTIVE
→ ARCHIVED

ARCHIVED
→ ACTIVE

REJECTED
→ terminal
```

### Déclinaison

Même lifecycle :

```text
PENDING_REVIEW
→ ACTIVE | REJECTED

ACTIVE
→ ARCHIVED

ARCHIVED
→ ACTIVE

REJECTED
→ terminal
```

### WorkspaceProduct

```text
ACTIVE
↔ ARCHIVED
```

Une entrée peut être réactivée sans créer une nouvelle identité globale.

## 9. Contribution et visibilité

Une contribution Workspace crée :

- soit un nouveau Produit `PENDING_REVIEW` et sa première déclinaison ;
- soit une nouvelle déclinaison `PENDING_REVIEW` d'un Produit `ACTIVE` existant.

La contribution est visible dans le catalogue du Workspace contributeur avec l'état « En validation ».

Elle n'est pas exposée aux autres Workspaces tant qu'elle n'est pas `ACTIVE`.

Une déclinaison en attente n'est pas considérée comme opérationnelle par les futurs modules M-003/M-004.

## 10. Archivage et remplacement

Un Produit ou une déclinaison globale archivée :

- n'est plus proposée pour de nouveaux rattachements ;
- reste lisible dans les historiques autorisés ;
- ne provoque aucune suppression des relations existantes ;
- peut indiquer un Produit/déclinaison de remplacement.

La fusion physique de deux Produits globaux déjà actifs est volontairement différée : le graphe complet M-003/M-004 n'existe pas encore. M-002 ferme donc la politique en interdisant une fusion destructrice prématurée.

## 11. Import en masse et frontière avec M-003

M-002 couvre un import en masse de données Produit au format CSV / XLS / XLSX lorsqu'il sert à alimenter le catalogue d'usage et le référentiel Produit sans introduire de données commerciales fournisseur.

Le pipeline M-002 réutilise obligatoirement les mêmes invariants que la création unitaire :

```text
fichier
→ mapping des colonnes
→ normalisation
→ recherche exact match
→ recherche de proximité
→ rattachement à l'existant
→ proposition de nouvelles identités/déclinaisons uniquement si nécessaire
→ prévisualisation
→ confirmation
```

Aucune ligne d'import ne contourne la gouvernance `PENDING_REVIEW`.

Les colonnes fournisseur, référence article, conditionnement, tarif, marque commerciale ou édition de catalogue ne deviennent jamais des propriétés du Produit canonique.

Le scénario de catalogue fournisseur commun à plusieurs dossiers appartient à M-003 et respecte déjà la frontière métier validée :

```text
Espace de travail
→ catalogue fournisseur / édition importée une seule fois
→ références communes réutilisables par tous les dossiers autorisés

Dossier A
→ éventuel Tarif négocié A pour tout ou partie des références

Dossier B
→ éventuel Tarif négocié B pour tout ou partie des références

Dossier C
→ aucun Tarif négocié local
→ Tarif fournisseur de référence selon la politique de prix applicable
```

Le même catalogue fournisseur n'est jamais copié dossier par dossier.

Les prix négociés et futurs Prix facturés restent strictement contextualisés au dossier/magasin et ne peuvent jamais servir de fallback dans un autre dossier.

Contrat détaillé : `docs/m002/M-002-IMPORTS-BOUNDARY-M003.md`.

## 12. Hors périmètre M-002

- Fournisseurs ;
- Articles fournisseur ;
- références fournisseur ;
- conditionnements commerciaux ;
- tarifs catalogue ;
- tarifs négociés ;
- prix facturés ;
- disponibilité magasin ;
- OCR/import fournisseur complet ;
- favoris magasin ;
- Fiches techniques ;
- purge physique d'un Produit référencé ;
- fusion destructive d'identités actives ;
- stockage de photo globale tant qu'une stratégie média partagée hors tenancy Workspace n'est pas validée.

La photo reste une capacité métier future, mais le Core Files actuel est Workspace-scoped et ne doit pas être détourné pour une ressource globale.
