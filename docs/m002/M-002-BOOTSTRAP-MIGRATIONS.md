# M-002 — Indexes, migration et bootstrap

**Statut : RECADRÉ — lifecycle actif/archivé et backfill legacy intégrés ; dataset initial encore non validé**

## 1. Backfill M-002 legacy

M-001 ne nécessite toujours aucune transformation.

En revanche, les premières itérations de développement M-002 ont pu persister des statuts `PENDING_REVIEW` ou `REJECTED`. Le workflow de validation humaine ayant été supprimé, la migration M-002 les normalise avant finalisation :

```text
PENDING_REVIEW + catégorie ACTIVE + identité active
→ ACTIVE

PENDING_REVIEW sans catégorie ACTIVE ou identité désactivée
→ ARCHIVED

REJECTED
→ ARCHIVED
→ identityActive reste inchangé
→ les références historiquement rejetées restent donc désactivées
```

Aucune catégorie n'est créée ou devinée par la migration. Aucun document n'est supprimé.

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
npm run migration:m002-catalog
```

Responsabilités :

1. normaliser les anciens statuts M-002 vers `ACTIVE/ARCHIVED` ;
2. migrer la sémantique des déclinaisons :
   - `form → presentation` ;
   - suppression de `preservation` ;
   - État / transformation recalculé depuis la Gamme lorsqu'elle existe ;
   - nouvelle signature `presentation + gamme + état` ;
3. créer/vérifier les indexes M-002 ;
4. synchroniser les permissions système Workspace enregistrées.

La migration refuse une collision de signatures actives avant toute fusion implicite. Pour respecter l'index unique historique pendant la réécriture, les seules variantes à migrer passent transactionnellement par une signature temporaire unique avant leur signature finale. Elle ne devine pas une Gamme absente et reste rejouable sans réécriture au second passage.

Le runner sera ajouté au manifest des migrations du produit selon le processus Core de release.

## 4. Bootstrap de la gouvernance Produit

La gouvernance globale utilise `ApplicationGlobalRole` / `ApplicationGlobalMember`.

Commande produit :

```text
npm run seed:m002-governance
```

Précondition : le Fondateur Platform actif doit déjà exister et les indexes Application Global doivent être disponibles.

Le seed :

- résout le Fondateur Platform actif uniquement comme identité de bootstrap ;
- synchronise le rôle système produit `product_reference_governor` ;
- attribue `product:reference:read` et `product:reference:manage` ;
- crée explicitement le membership Application Global correspondant ;
- est idempotent lorsque le même membership actif existe déjà ;
- conserve les garde-fous Core face à un historique global incompatible.

Invariant : le Fondateur n'obtient pas ces permissions parce qu'il est Super Admin Platform. Le seed matérialise une autorité métier globale distincte et persistée.

Ce bootstrap est un seed produit, pas une migration de schéma ; il ne rejoint donc pas `migration-manifest.json`.

## 5. Bootstrap Produit

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

Le moteur de bootstrap est implémenté et versionné. Le fichier
`backend/seeds/data/m002-reference.v1.json` reste volontairement avec
`ready: false` et sans données tant que le premier référentiel bêta n'a pas été nettoyé et validé.

Le bootstrap :

- normalise ;
- contrôle les doublons ;
- crée/actualise idempotemment les références prévues ;
- ne contourne pas les indexes ;
- trace la version installée et le hash du dataset dans ProductReferenceBootstrapRun ;
- ne contient aucun prix/fournisseur/conditionnement.

## 6. Source réelle disponible

Le jeu de données utilisateur existant pourra servir à produire le premier référentiel bêta après nettoyage.

Il ne doit pas être injecté ligne pour ligne : certaines désignations mélangent Produit, marque, conditionnement, ancienne information de conservation et informations fournisseur.

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

## 7. Catégories

La taxonomie initiale n'est pas inventée dans le code.

Elle est fournie dans le fichier bootstrap validé ou créée par la gouvernance métier globale.

Une nouvelle identité ACTIVE exige immédiatement une catégorie ACTIVE. Il n'existe plus de contribution PENDING dans le parcours opérationnel.

## 8. Données de développement et tests

Vitest/Supertest :

```text
saas_fiches_techniques_gms_test
```

Playwright :

```text
saas_fiches_techniques_gms_e2e_test
```

Aucun test destructif n'utilise la base de développement.


## 9. Import utilisateur de Produits

M-002 prévoit également un flux utilisateur CSV / XLS / XLSX distinct du bootstrap technique.

Ce flux :

- ne persiste pas le fichier source comme ressource métier durable ;
- réutilise les primitives Core de téléversement temporaire sécurisé au lieu de maintenir un pipeline de sécurité parallèle ;
- analyse et prévisualise avant toute mutation ;
- réutilise le moteur de normalisation/déduplication M-002 ;
- rattache les références existantes au référentiel du Workspace ;
- crée les nouvelles identités/déclinaisons en `ACTIVE` après contrôle anti-doublon et catégorie valide ;
- conserve les lignes ambiguës ou invalides en attente de décision utilisateur ;
- n'importe jamais silencieusement des données fournisseur dans le modèle Produit.

La logique d'import ne constitue pas un second moteur de création.

## 10. Préparation de M-003

Lorsqu'un fichier contient Fournisseur + référence + conditionnement + tarif, il est classé comme catalogue fournisseur et sera traité par M-003.

M-003 devra importer une édition de catalogue une seule fois au niveau Workspace puis réutiliser ses lignes dans plusieurs Dossiers.

Les conditions commerciales propres à un Dossier seront stockées séparément du catalogue fournisseur de référence.
