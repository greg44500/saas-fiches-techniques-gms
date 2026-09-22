# M-002 — Indexes, migration et bootstrap

**Statut : PROPOSÉ — à valider avant implémentation DB**

## 1. Aucun backfill métier historique

M-002 introduit de nouvelles collections.

Aucune donnée existante M-001 n'a besoin d'être transformée.

## 2. Indexes proposés

### CanonicalProduct

- index unique multikey sur `searchKeys` pour les statuts non rejetés ;
- `status + category + updatedAt` ;
- `contributedFromWorkspace + status + createdAt` ;
- index multikey sur `searchGrams`.

### ProductVariant

- unique `canonicalProduct + normalizedSignature` pour les statuts non rejetés ;
- `canonicalProduct + status` ;
- `status + updatedAt`.

### WorkspaceProduct

- unique `workspace + productVariant` ;
- `workspace + status + updatedAt`.

### ProductCategory

- unique `normalizedKey` ;
- `status + name`.

### ProductReferenceEvent

- `entityType + entityId + createdAt` ;
- `action + createdAt`.

## 3. Migration idempotente

Script proposé :

```text
npm run migration:m002-indexes
```

Responsabilités :

- créer/vérifier les indexes M-002 ;
- échouer explicitement en cas de conflit de données ;
- ne supprimer aucune donnée ;
- pouvoir être rejoué sans effet destructeur.

Le runner sera ajouté au manifest des migrations du produit selon le processus Core de release.

## 4. Bootstrap Produit

Le bootstrap M-002 utilise les mêmes services/invariants que les flux normaux.

Structure versionnée proposée :

```text
backend/seeds/data/m002-reference.v1.json
backend/seeds/seedM002Reference.js
```

Contenu conceptuel :

```text
version
categories[]
products[]
  name
  aliases
  categoryKey
  variants[]
```

Le bootstrap :

- normalise ;
- contrôle les doublons ;
- crée/actualise idempotemment les références prévues ;
- ne contourne pas les indexes ;
- trace la version installée ;
- ne contient aucun prix/fournisseur/conditionnement.

## 5. Source réelle disponible

Le jeu de données utilisateur existant pourra servir à produire le premier référentiel bêta après nettoyage.

Il ne doit pas être injecté ligne pour ligne : certaines désignations mélangent Produit, marque, conditionnement, conservation et informations fournisseur.

La préparation du fichier bootstrap doit donc :

```text
extraire les identités candidates
→ normaliser
→ rapprocher les doublons
→ séparer les dimensions M-002
→ exclure les données M-003
→ produire un fichier versionné revu
```

Aucune ligne fournisseur ne crée automatiquement un Produit canonique.

## 6. Catégories

La taxonomie initiale n'est pas inventée dans le code.

Elle est fournie dans le fichier bootstrap validé ou créée par la gouvernance Platform.

Une contribution PENDING peut être non classée ; l'approbation ACTIVE exige une catégorie ACTIVE.

## 7. Données de développement et tests

Vitest/Supertest :

```text
saas_fiches_techniques_gms_test
```

Playwright :

```text
saas_fiches_techniques_gms_e2e_test
```

Aucun test destructif n'utilise la base de développement.
