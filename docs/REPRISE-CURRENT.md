# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-23  
**Lot actif :** M-002 — Référentiel Produits / Produits canoniques  
**Branche :** `feature/m002-catalogue-produits`  
**Checkpoint code avant synchronisation documentaire :** `14a5f791a436bcabb8c6ce82a1f0d0a578f873c9`

## 1. Autorité de reprise

```text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ contrats M-002
→ Core exact intégré
→ documentation de reprise
```

Ne jamais déclarer un test vert sans exécution réelle.

## 2. Core intégré

```text
repository : greg44500/saas-core-api
version    : 1.2.0
tag        : v1.2.0
commit     : c428fbec1edfa21a8860fcf8283072e45719832b
```

Ce SHA contient notamment Application Global authorization et le téléversement temporaire sécurisé configurable utilisés par M-002.

Aucun besoin Core supplémentaire n'a été démontré par le recadrage actuel.

## 3. Contrat M-002 courant

Le workflow historique de validation humaine systématique est supprimé.

```text
recherche anti-doublon
→ exact match : utiliser/refuser la duplication
→ candidats proches : revue explicite
→ aucun équivalent crédible : création immédiate ACTIVE
```

Modèle :

```text
CanonicalProduct
→ global SaaS

ProductVariant
→ global SaaS

WorkspaceProduct
→ ownership Workspace
→ référentiel Produit Workspace

ProductCategory
→ global SaaS

ProductReferenceEvent
→ historique métier

ProductImportSession
→ session temporaire WORKSPACE ou GLOBAL
```

Lifecycle courant :

```text
ACTIVE ↔ ARCHIVED
```

Les anciens `PENDING_REVIEW/REJECTED` ne font plus partie du registre opérationnel.

## 4. Création Workspace

Une création depuis un Workspace autorisé :

1. contrôle l'existant ;
2. exige la revue des candidats proches ;
3. exige une catégorie active ;
4. crée `CanonicalProduct ACTIVE` ;
5. crée la première `ProductVariant ACTIVE` ;
6. crée `WorkspaceProduct ACTIVE`.

La nouvelle identité est immédiatement partagée dans le référentiel commun.

Aucun Produit n'est Dossier-owned en M-002.

## 5. Autorité globale Produit

API :

```text
/api/product-reference
```

Permissions :

```text
product:reference:read
product:reference:manage
```

Autorité :

```text
ApplicationGlobalRole
ApplicationGlobalMember
```

Invariant :

```text
Super Admin Platform
≠ gouverneur Produit automatique

Owner Workspace
≠ gouverneur Produit automatique
```

Un membre Platform dédié peut donc alimenter le référentiel commun, mais uniquement avec un membership Application Global Produit explicite.

Le Fondateur E2E reçoit cette autorité via le seed M-002 ; son rôle Platform n'est jamais utilisé comme preuve d'autorisation Produit.

## 6. Import

M-002 réutilise le même pipeline sécurisé CSV/XLS/XLSX pour deux scopes :

```text
WORKSPACE
→ rattacher l'existant
→ créer Produit/Déclinaison si autorisé
→ alimenter le référentiel Workspace

GLOBAL
→ alimenter directement le référentiel commun
→ aucun WorkspaceProduct
```

Classifications :

```text
ATTACH_EXISTING
CREATE_PRODUCT
CREATE_VARIANT
REVIEW_REQUIRED
INVALID
```

Les dimensions Fournisseur/référence/conditionnement/prix restent hors M-002.

## 7. Migration M-002

Commande :

```text
npm run migration:m002-catalog
```

Elle réalise :

1. backfill lifecycle legacy ;
2. création/vérification des indexes M-002 ;
3. synchronisation des permissions Workspace système enregistrées.

Backfill :

```text
ancien PENDING_REVIEW complet
→ ACTIVE

ancien PENDING_REVIEW incomplet
→ ARCHIVED

ancien REJECTED
→ ARCHIVED
→ identityActive historique conservé
```

Aucune catégorie n'est inventée et aucun document n'est supprimé.

## 8. Frontend courant

Workspace :

```text
/workspaces/:workspaceId/products
```

- Référentiel global en premier onglet ;
- Mon référentiel en second onglet ;
- Créer un Produit ;
- Importer ;
- détail Produit ;
- création de déclinaison ;
- ajout/retrait de Mon référentiel ;
- Dashboard M-002.

Global :

```text
/product-reference
```

- hors PlatformLayout ;
- Référentiel ;
- Catégories ;
- création Produit ;
- import global ;
- détail/correction ;
- archive/réactivation ;
- aucune file « À valider ».

Les clients RTK Query M-002 étendent désormais `baseApi` selon le pattern Core et déclarent les tags `ProductCatalog/ProductReference`.

## 9. E2E ajoutés

Deux scénarios critiques sont présents :

```text
1. Owner Workspace
   → crée un Produit
   → Produit ACTIVE
   → visible dans Mon référentiel

2. Fondateur E2E explicitement bootstrapé Application Global Produit
   → /product-reference
   → crée catégorie
   → crée Produit global
   → Produit visible sans file de validation
```

Ils ne sont PAS encore déclarés verts après les derniers commits.

## 10. Vérité des tests

Confirmé antérieurement par l'utilisateur, avant le dernier recadrage complet :

- suites backend M-002 ciblées vertes en exécution séquentielle ;
- frontend ciblé vert ;
- lint frontend vert ;
- build frontend vert.

Depuis les commits de refonte création ACTIVE, migration legacy, RTK Query et E2E, ces résultats ne suffisent plus comme preuve finale.

Aucun status CI automatique n'est attaché au HEAD de branche au moment de cette reprise.

Le problème connu de tests backend parallèles reste séparé : `backend/tests/setup.js` vide les collections avant chaque test et peut créer des interférences entre fichiers Vitest. Ne pas modifier silencieusement cette stratégie dans le produit.

## 11. Validation locale à faire maintenant

Après pull du HEAD de la branche :

```powershell
git switch feature/m002-catalogue-produits
git pull --ff-only
```

Puis appliquer sur la base de développement :

```powershell
npm run migration:m002-catalog
npm run seed:m002-governance
```

Tests backend M-002 ciblés, séquentiels :

```powershell
npx vitest run backend/tests/modules/productCatalog/productCatalog.registry.test.js backend/tests/modules/productCatalog/productCatalog.validation.test.js backend/tests/modules/productCatalog/productCatalog.integration.test.js backend/tests/modules/productCatalog/productCatalog.http.test.js backend/tests/modules/productCatalog/productCatalogGovernance.integration.test.js backend/tests/modules/productCatalog/productCatalogGlobal.http.test.js backend/tests/modules/productCatalog/productCatalogImport.integration.test.js backend/tests/modules/productCatalog/productCatalogImportAccess.service.test.js backend/tests/migrations/m002ProductLifecycleBackfill.migration.test.js --no-file-parallelism
```

Frontend ciblé :

```powershell
npm --prefix frontend run test -- src/features/products
```

Puis gates :

```powershell
npm run lint
npm test -- --no-file-parallelism
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run test:e2e
npm run release:verify
```

Ne lancer `npm run release:check` qu'après compréhension de l'interaction avec le parallélisme backend connu ; ne pas considérer un échec de parallélisme comme une régression métier sans l'isoler.

## 12. Validation visuelle après tests ciblés

Démarrer l'application locale et vérifier :

- page Produits visible avec les capabilities M-002 ;
- création Produit avec recherche anti-doublon ;
- catégorie obligatoire ;
- Produit créé immédiatement actif ;
- première déclinaison ;
- Produit ajouté au référentiel Workspace ;
- référentiel commun ;
- absence de « Proposer », « Envoyer en validation », « En validation » ;
- accès global `/product-reference` uniquement avec Application Global ;
- création et import globaux ;
- catégories ;
- archive/réactivation ;
- Dashboard Produit.

L'erreur historique du fichier `Tarif_SCAL_avril_2026.csv` n'est pas à traiter comme import Produit M-002 sans inspecter son contenu : un fichier tarifaire fournisseur relève probablement du prochain module s'il contient Fournisseur/référence/conditionnement/prix.

## 13. Point M-003 déjà identifié

À traiter après fermeture M-002 :

```text
Fournisseur
→ Catalogue / édition identifié
→ Article fournisseur
→ référence
→ conditionnement
→ prix
→ rattachement ProductVariant
```

Exigence UX déjà validée :

- un catalogue SYSCO doit être identifié comme SYSCO ;
- les produits/articles issus d'un catalogue doivent conserver cette provenance ;
- l'utilisateur doit pouvoir filtrer par Fournisseur ;
- l'utilisateur doit disposer d'une liste de catalogues/éditions identifiés et sélectionner un catalogue précis ;
- plusieurs catalogues d'un même Fournisseur doivent rester distinguables.

Ne pas injecter ces concepts dans `CanonicalProduct`.

## 14. Discipline Git

```text
feature/m002-catalogue-produits
→ tests locaux
→ QA visuelle
→ corrections démontrées uniquement
→ documentation finale si nécessaire
→ UNE PR M-002
→ gate
→ UNE fusion
```

Ne pas créer de micro-PR.
