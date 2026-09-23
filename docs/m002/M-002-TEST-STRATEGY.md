# M-002 — Stratégie de tests

**Statut : ALIGNÉE SUR LE WORKFLOW DE CRÉATION ACTIVE — exécution finale requise**

## 1. Risques prioritaires

M-002 partage un référentiel global entre Workspaces. Les risques majeurs sont :

- doublon sémantique global ;
- création globale sans catégorie valide ;
- mutation globale autorisée par erreur via un rôle Workspace ou Platform ;
- fuite de données Workspace ;
- collision de rattachements ;
- import Workspace ou global contournant la déduplication ;
- confusion entre import temporaire et stockage durable ;
- régression du lifecycle après suppression de l'ancienne validation humaine ;
- backfill legacy destructif ;
- divergence frontend/backend des règles de normalisation.

## 2. Tests unitaires

### Normalisation

Couvrir :

- accents ;
- casse ;
- apostrophes/tirets ;
- espaces ;
- alias ;
- variantes orthographiques couvertes ;
- stabilité des signatures de Déclinaison ;
- registre des Gammes 1..6 ;
- résolution Gamme → État / transformation ;
- refus d'une combinaison incompatible.

### Validation Zod

Couvrir :

- catégorie obligatoire à la création ;
- champs système refusés ;
- unités backend-driven ;
- rendement borné ;
- Gamme obligatoire sur les nouvelles déclinaisons ;
- ancien champ Conservation refusé ;
- mappings import stricts ;
- décisions import ;
- ObjectIds.

### Registries

Couvrir :

- statuts opérationnels `ACTIVE/ARCHIVED` ;
- permissions Workspace ;
- permissions Application Global ;
- scopes import `WORKSPACE/GLOBAL` ;
- capabilities commerciales.

## 3. Tests modèles et indexes

Vérifier :

- aucune ownership Workspace sur `CanonicalProduct`, `ProductVariant`, `ProductCategory` ;
- ownership Workspace uniquement sur `WorkspaceProduct` ;
- unicité `searchKeys` ;
- unicité signature Déclinaison ;
- unicité `workspace + productVariant` ;
- TTL des sessions import ;
- index `scope + workspace + actor`.

## 4. Tests services/intégration

Couvrir :

- création Produit ACTIVE transactionnelle ;
- rollback si la Déclinaison échoue ;
- doublon exact refusé ;
- candidats proches exigeant une revue ;
- visibilité immédiate du nouveau Produit dans un autre Workspace via REFERENCE ;
- création Déclinaison ACTIVE ;
- tri alphabétique avant pagination ;
- ajout/retrait/réactivation de Mon référentiel idempotent ;
- archive globale non destructive ;
- catégorie archivée non utilisable ;
- création globale via autorité métier ;
- import global sans `WorkspaceProduct`.

## 5. Tests autorisation

### Workspace

- `product:read` ;
- `product:catalog:manage` ;
- `product:contribute` ;
- capabilities correspondantes ;
- séparation rattachement existant / création nouvelle au commit import.

### Application Global

- utilisateur sans permission refusé ;
- Super Admin Platform seul refusé ;
- Owner Workspace seul refusé ;
- membre Platform explicitement inscrit comme `ApplicationGlobalMember` Produit autorisé ;
- autorité globale Produit sans accès implicite aux données privées d'un Workspace.

## 6. Tests HTTP Supertest

Couvrir :

- metadata ;
- summary ;
- search WORKSPACE / REFERENCE ;
- detail ;
- duplicate-check ;
- création Produit ;
- création Déclinaison ;
- catalogue ;
- imports Workspace ;
- accès global ;
- catégories ;
- création/correction/archive globales ;
- imports globaux ;
- 400/401/403/404/409 ;
- pagination/filtres.

## 7. Tests frontend RTL

### Workspace

- catalogue ;
- référentiel ;
- recherche serveur ;
- filtres ;
- création Produit ;
- formulaire Présentation/Gamme/État backend-driven sans Conservation ;
- correspondance exacte ;
- revue candidats proches ;
- catégorie obligatoire ;
- création Déclinaison ;
- import ;
- drawer Produit ;
- Dashboard ;
- absence de vocabulaire « validation ».

### Référentiel global

- accès via `product:reference:read` ;
- actions mutation seulement avec `product:reference:manage` ;
- Référentiel / Catégories ;
- création Produit ;
- import global ;
- détail ;
- correction ;
- archive/réactivation ;
- aucune file « À valider ».

## 8. Tests import

Couvrir :

- CSV ;
- XLS ;
- XLSX ;
- fichier corrompu ;
- antivirus indisponible ;
- nettoyage temporaire ;
- mapping invalide ;
- catégorie par défaut ;
- `ATTACH_EXISTING` ;
- `CREATE_PRODUCT` ;
- `CREATE_VARIANT` ;
- `REVIEW_REQUIRED` ;
- preview devenue obsolète ;
- commit idempotent ;
- droits calculés selon mutations ;
- détection fournisseur/référence/conditionnement/prix M-003 ;
- aucun document `File` durable créé.

## 9. Tests migration

Le backfill doit prouver :

- PENDING legacy + catégorie active → ACTIVE ;
- PENDING legacy incomplet → ARCHIVED ;
- REJECTED legacy → ARCHIVED ;
- `identityActive=false` historique préservé ;
- aucun ancien statut restant ;
- migration rejouable ;
- migration `form/preservation → presentation/gamme/état` ;
- collision de nouvelles signatures refusée avant écriture ;
- indexes M-002 présents.

## 10. E2E critiques

### E2E 1 — rattacher un Produit existant

```text
Owner Workspace
→ Référentiel global
→ Ajouter
→ Mon référentiel
→ référence visible
```

### E2E 2 — créer un Produit

```text
Owner Workspace
→ Créer un Produit
→ recherche anti-doublon
→ catégorie
→ première déclinaison
→ création
→ Produit visible dans Mon référentiel
→ Produit visible dans le référentiel commun
```

### E2E 3 — administration globale explicite

```text
Utilisateur avec membership Application Global Produit
→ /product-reference
→ création ou import
→ Produit visible globalement
```

Le scénario doit rester distinct d'un simple rôle Platform.

### E2E 4 — import Workspace

```text
fichier Produit
→ inspect
→ mapping
→ preview
→ ambiguïté revue si nécessaire
→ commit
→ Mon référentiel mis à jour
```

## 11. Gate finale

Avant PR :

```text
npm run release:verify
npm run lint
npm test
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run test:e2e
```

Aucun résultat n'est déclaré vert sans preuve d'exécution.
