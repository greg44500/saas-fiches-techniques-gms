# M-002 — Stratégie de tests

> **CONTRAT FINAL 2026-09-24** — La source de vérité actuelle est `docs/m002/M-002-FINAL-CONTRACT.md`. Toute section historique de ce document qui décrit `Gamme 1..5 + usageType PAI/PAE`, un nom de référence calculé, une catégorie obligatoire, un seed v3 final ou « Mon référentiel » est obsolète lorsqu'elle contredit ce contrat final.

> **RECARDAGE QA 2026-09-24** — `docs/m002/M-002-RECARDAGE-QA.md` est désormais prioritaire pour `CUT`, CanonicalProduct sans variante, Gammes 1..5, PAI/PAE séparé, seed v3, liste groupée et dépendance Core de navigation Platform. Les contrats techniques ci-dessous doivent être réalignés pendant le prochain bloc d'implémentation avant d'être considérés définitifs.

**Statut : ALIGNÉE SUR DIMENSIONS STRUCTURÉES + CONTRIBUTION SEMI-AUTOMATIQUE — exécution finale requise**

## 1. Risques prioritaires

- doublon sémantique global ;
- confusion entre identité racine, Variété, Présentation, Gamme et autres Caractéristiques ;
- double Caractéristique du même type dans une déclinaison ;
- mutation globale via une autorité Workspace/Platform non habilitée ;
- confusion entre lifecycle `ACTIVE/ARCHIVED` des références et `PENDING_REVIEW/APPROVED/REJECTED` des contributions ;
- approbation non atomique ;
- perte de provenance Workspace ;
- import contournant la déduplication/contribution ;
- confusion import temporaire / stockage durable ;
- migration destructive ou collision silencieuse ;
- divergence frontend/backend des registres métier.

## 2. Unitaires / validation

### Normalisation et recherche

Couvrir :

- casse, accents, apostrophes, tirets ;
- singulier/pluriel raisonnable ;
- fautes en fallback ;
- synonymes métier gouvernés ;
- mots composés ;
- recherche complexe : carotte botte, mini carotte, carotte nantaise, carotte surgelée ;
- signatures basées sur IDs.

### Zod

Couvrir :

- nouvelle identité Workspace sans alias utilisateur ;
- catégorie obligatoire ;
- déclinaison existante avec `varietyId` / `characteristicIds[]` ;
- refus de doublons d'IDs ;
- Gamme / État ;
- rendement borné ;
- mappings import structurés ;
- décisions import ;
- ObjectIds ;
- champs système refusés.

### Registries

Couvrir :

- `ACTIVE/ARCHIVED` ;
- kinds de Caractéristiques ;
- classifications/status/types de contribution ;
- Gammes ;
- unités ;
- permissions Workspace ;
- permissions Application Global ;
- capabilities.

## 3. Modèles / indexes

Vérifier :

- aucune ownership Workspace sur les références globales ;
- provenance `contributedFromWorkspace` distincte de l'ownership ;
- `ProductVariety` rattaché au Produit ;
- `ProductCharacteristic` rattaché au Produit + kind fermé ;
- absence de `ProductVariant.presentation` persistant ;
- unicité ProductVariant par signature structurée ;
- unicité `workspace + productVariant` ;
- contraintes des contributions ;
- TTL/import session ;
- indexes M-002.

## 4. Services / intégration

Couvrir :

- création directe globale transactionnelle ;
- nouveau CanonicalProduct Workspace → `REVIEW_REQUIRED` sans publication ;
- rejet → aucune référence publiée ;
- approbation atomique → publication/réutilisation + `APPROVED` dans la même transaction ;
- revalidation lorsque le référentiel change entre soumission et décision ;
- rollback si le contexte devient invalide ;
- provenance `WORKSPACE_CONTRIBUTION` ;
- faute de Variété → `EXISTING` ;
- nouvelle Variété non conflictuelle → `AUTO_PUBLISHABLE` ;
- Présentation/format auto-publiable selon politique ;
- Caractéristique gouvernée → `REVIEW_REQUIRED` ;
- lifecycle Variétés/Caractéristiques ;
- refus d'archiver une dimension utilisée par une déclinaison active ;
- création Déclinaison avec IDs structurés ;
- tri avant pagination ;
- rattachement/retrait Workspace idempotent ;
- archive globale non destructive ;
- import global sans `WorkspaceProduct` ;
- import Workspace utilisant le moteur de contribution.

## 5. Autorisation

### Workspace

- `product:read` ;
- `product:catalog:manage` ;
- `product:contribute` ;
- `product_reference_access` ;
- `product_catalog_import` ;
- `product_contribution`.

### Application Global

- sans permission → refus ;
- Super Admin Platform seul → refus ;
- Owner Workspace seul → refus ;
- `ApplicationGlobalMember` Produit → autorisé ;
- aucune fuite implicite vers des données privées Workspace.

## 6. HTTP Supertest

Couvrir :

- metadata / summary ;
- search WORKSPACE / REFERENCE ;
- detail / dimensions ;
- duplicate-check ;
- création root Workspace ;
- contributions Workspace ;
- création Déclinaison structurée ;
- rattachement/retrait ;
- imports Workspace ;
- accès global ;
- list/review contributions ;
- catégories ;
- Produits/Variétés/Caractéristiques/Déclinaisons globales ;
- imports globaux ;
- 400/401/403/404/409 ;
- pagination/filtres.

## 7. Frontend RTL

### Workspace

- aucune saisie Alias utilisateur ;
- création Produit → Soumettre la proposition ;
- exact match / candidats proches ;
- Variété/Caractéristiques sélectionnées par IDs ;
- Gamme/État backend-driven ;
- ajout dimension via moteur de contribution ;
- cas `AUTO_PUBLISHABLE`, `EXISTING`, `REVIEW_REQUIRED`, `INVALID` ;
- import structuré ;
- tableau Produit / Déclinaison / Gamme / Actions ;
- drawer Produit ;
- Dashboard.

### Global

- route protégée ;
- Référentiel / Contributions / Catégories ;
- création Produit ;
- gestion Variétés/Caractéristiques ;
- correction des synonymes métier ;
- approbation/refus contributions ;
- correction/lifecycle ;
- import global.

Tests dédiés ajoutés notamment :

```text
product-dimension-contribution-dialog.test.jsx
product-dimension-edit-dialog.test.jsx
product-reference-page.test.jsx
product-variant-fields.test.jsx
product-import-dialog.test.jsx
```

## 8. Import

Couvrir :

- CSV/XLS/XLSX ;
- fichier corrompu ;
- antivirus indisponible ;
- nettoyage temporaire ;
- mapping Produit + Variété + cinq kinds ;
- résolution par synonymes métier existants ;
- catégorie/Gamme/unité par défaut ;
- `ATTACH_EXISTING` ;
- création globale structurée ;
- `REVIEW_REQUIRED` gouvernance ;
- preview obsolète ;
- commit idempotent ;
- droits calculés ;
- détection M-003 ;
- aucun `File` durable pour le fichier source.

## 9. Migration / seed

Migration :

- lifecycle legacy ;
- sémantique `form/preservation` ;
- Présentation historique → `ProductCharacteristic(PRESENTATION)` ;
- `variety=null` par défaut historique ;
- recalcul signature structurée ;
- collision détectée avant écriture finale ;
- transaction ;
- idempotence ;
- indexes.

Seed :

- dataset réel `ready:true` ;
- catégorie Fruits et légumes ;
- au moins 30 Produits ;
- Pomme avec Golden/Gala/Granny Smith ;
- Carotte avec dimensions structurées ;
- aucun prix/fournisseur/conditionnement ;
- aucun rendement inventé ;
- version/hash/idempotence.

## 10. E2E critiques

### E2E 1 — contribution Workspace

```text
Owner Workspace
→ Créer un Produit
→ vérifier l'existant
→ catégorie + première déclinaison
→ Soumettre la proposition
→ PENDING_REVIEW
→ gouverneur Application Global
→ Contributions
→ Approuver
→ Produit visible globalement
→ Owner Workspace
→ Ajouter à Mon référentiel
→ référence visible
```

### E2E 2 — création directe globale

```text
gouverneur Application Global
→ créer catégorie
→ créer Produit
→ Produit ACTIVE visible globalement
```

Ces scénarios existent dans le code mais ne sont pas déclarés verts avant exécution réelle.

## 11. Gate finale

Avant PR :

```text
npm run release:verify
npm run lint
npm test -- --no-file-parallelism
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run test:e2e
```

Aucun résultat n'est déclaré vert sans preuve d'exécution.
