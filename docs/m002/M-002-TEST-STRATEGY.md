# M-002 — Stratégie de tests

**Statut : PROPOSÉ — à valider avant implémentation**

## 1. Risques principaux

M-002 est globalement partagé. Les risques prioritaires sont :

- pollution du référentiel commun ;
- doublons sémantiques ;
- fuite d'une contribution PENDING entre Workspaces ;
- modification globale par une permission Workspace ;
- collision de rattachements ;
- archivage global cassant des usages existants ;
- bootstrap non idempotent ;
- règles de normalisation divergentes frontend/backend.

## 2. Tests unitaires

### Normalisation

- accents ;
- casse ;
- espaces ;
- tirets/apostrophes ;
- ponctuation ;
- n-grammes ;
- distance de proximité ;
- aliases.

### Registries

- statuts ;
- unités ;
- gammes ;
- motifs de rejet ;
- permissions Workspace ;
- permissions Platform.

### Sérialisation

- aucune donnée interne sensible ;
- aucune provenance Workspace exposée aux autres tenants.

## 3. Tests modèles

### CanonicalProduct

- searchKeys ;
- unicité ;
- statut ;
- catégorie ;
- champs globaux uniquement.

### ProductVariant

- signature unique ;
- valeurs structurées ;
- rendement ;
- unité.

### WorkspaceProduct

- ownership Workspace ;
- unicité workspace+variant ;
- lifecycle ACTIVE/ARCHIVED.

### ProductCategory

- clé unique ;
- lifecycle.

### ProductReferenceEvent

- immutabilité.

## 4. Tests services

- exact duplicate refusé ;
- near duplicate exige revue ;
- revue obsolète refusée ;
- création PENDING transactionnelle ;
- création variant PENDING ;
- ajout catalogue idempotent ;
- retrait/réactivation ;
- approbation ;
- rejet DUPLICATE et repoint du WorkspaceProduct ;
- archive global sans suppression d'usage historique ;
- catégorie archivée non utilisable ;
- recherche WORKSPACE strictement tenant-scoped ;
- recherche REFERENCE sans fuite PENDING cross-tenant.

## 5. Tests RBAC

Workspace :

- read ;
- catalog manage ;
- contribute.

Platform :

- products read ;
- products manage ;
- permission Workspace insuffisante pour une route Platform ;
- permission Platform n'accorde pas automatiquement l'accès à un catalogue Workspace.

## 6. Tests HTTP Supertest

Couvrir l'ensemble des endpoints M-002 :

- validation Zod stricte ;
- ObjectId invalides ;
- pagination ;
- filtres ;
- 401/403/404/409 ;
- anti-énumération des PENDING ;
- mutations transactionnelles.

## 7. Tests frontend RTL

Workspace :

- Mon catalogue ;
- Référentiel ;
- recherche ;
- pagination ;
- filtres ;
- rattachement/retrait ;
- états loading/error/empty ;
- exact duplicate ;
- near duplicate et confirmation ;
- contribution PENDING ;
- drawer Produit.

Platform :

- file d'approbation ;
- approbation/rejet ;
- catégories ;
- permissions.

Dashboard :

- compteur catalogue ;
- contributions en validation ;
- accessibilité.

## 8. Tests import Produits

Couvrir au minimum :

- CSV valide ;
- XLS valide ;
- XLSX valide ;
- fichier invalide/corrompu ;
- mapping incomplet ;
- lignes vides ;
- exact duplicate ;
- near duplicate ;
- déclinaison existante ;
- nouvelle déclinaison ;
- nouvelle identité Produit ;
- colonnes fournisseur/prix détectées hors périmètre ;
- prévisualisation sans mutation ;
- commit revalidé côté serveur ;
- import concurrent ne créant pas de doublon ;
- rollback transactionnel sur échec ;
- aucune fuite entre Workspaces.

## 9. E2E critiques proposés

### E2E 1 — rattacher un Produit existant

Owner :

```text
Produits
→ Tout le référentiel
→ ajouter une déclinaison ACTIVE
→ visible dans Mon catalogue
```

### E2E 2 — contrôle doublon

Owner :

```text
proposer un nom proche
→ candidats affichés
→ création silencieuse impossible
```

### E2E 3 — contribution et gouvernance

Workspace Owner :

```text
contribution
→ En validation
```

Platform autorisée :

```text
approuve
→ produit ACTIVE
```

Workspace :

```text
référence désormais active
```

### E2E 4 — isolation PENDING

Workspace A contribue.

Workspace B recherche le référentiel.

Résultat :

```text
contribution PENDING A absente
```

## 10. Gate finale

Avant PR :

```text
npm run release:verify
npm run lint
npm test
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run test:e2e
npm run release:check
```

Ne jamais annoncer un résultat vert sans exécution réelle.
