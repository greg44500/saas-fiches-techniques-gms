# M-002 — Critères d'acceptation et ordre de finalisation

**Statut : IMPLÉMENTATION STRUCTURÉE — tests/gates et validation visuelle encore à exécuter**  
**Module : Référentiel Produits / Produits canoniques**  
**Branche :** `feature/m002-catalogue-produits`

## 1. Discipline du lot

```text
un bloc fonctionnel M-002
→ plusieurs commits cohérents
→ tests + QA
→ une seule PR M-002
→ une seule fusion
```

Aucune micro-PR de réparation.

## 2. Contrat fonctionnel implémenté

- [x] `CanonicalProduct` global sans ownership Workspace ;
- [x] `ProductVariety` pour les vraies variétés/cultivars ;
- [x] `ProductCharacteristic` contrôlé par registre ;
- [x] `ProductVariant` structuré par IDs de Variété/Caractéristiques ;
- [x] Présentation persistée comme `ProductCharacteristic(PRESENTATION)`, pas comme texte de variante ;
- [x] `WorkspaceProduct` distinct de l'identité globale ;
- [x] six Gammes backend-driven + État/transformation ;
- [x] unité backend-driven ;
- [x] rendement facultatif et jamais inventé ;
- [x] signatures stables indépendantes des libellés ;
- [x] synonymes métier gouvernés, formes de recherche générées ;
- [x] recherche complexe et proximité ;
- [x] aucun concept M-003 dans l'identité M-002 ;
- [x] lifecycle des références `ACTIVE ↔ ARCHIVED` ;
- [x] lifecycle des contributions séparé.

## 3. Contribution Workspace

- [x] `product:contribute` + `product_contribution` requis ;
- [x] moteur `EXISTING / AUTO_PUBLISHABLE / REVIEW_REQUIRED / INVALID` ;
- [x] nouveau CanonicalProduct Workspace → `REVIEW_REQUIRED` par défaut ;
- [x] aucune publication immédiate de cette identité ;
- [x] `ReferenceContribution` distincte ;
- [x] approbation/refus Application Global ;
- [x] revalidation atomique avant publication ;
- [x] provenance Workspace conservée sans ownership ;
- [x] rattachement à Mon référentiel explicite après publication.

## 4. Autorité globale

- [x] `product:reference:read` ;
- [x] `product:reference:manage` ;
- [x] `ApplicationGlobalRole` / `ApplicationGlobalMember` ;
- [x] Super Admin Platform seul ≠ gouverneur Produit ;
- [x] Owner Workspace seul ≠ gouverneur Produit ;
- [x] rôle bootstrap `product_reference_governor` ;
- [x] route frontend `/product-reference` hors PlatformLayout ;
- [x] Référentiel / Contributions / Catégories ;
- [x] gestion Produits ;
- [x] gestion Variétés/Caractéristiques/synonymes ;
- [x] gestion Déclinaisons ;
- [x] revue Contributions ;
- [x] historique métier.

## 5. Workspace

- [x] metadata ;
- [x] summary Dashboard ;
- [x] search WORKSPACE / REFERENCE ;
- [x] detail + dimensions ;
- [x] duplicate-check ;
- [x] soumission nouveau Produit ;
- [x] contribution dimension ;
- [x] création Déclinaison structurée ;
- [x] ajout/retrait de Mon référentiel ;
- [x] import inspect/preview/commit ;
- [x] Référentiel global / Mon référentiel ;
- [x] recherche prédictive ;
- [x] pagination/filtres ;
- [x] tableau Produit / Déclinaison / Gamme / Actions ;
- [x] aucun champ Alias ordinaire ;
- [x] aucun filtre d'appartenance redondant.

## 6. Imports

- [x] chaîne temporaire sécurisée Core ;
- [x] CSV/XLS/XLSX ;
- [x] aucun `File` durable pour la source ;
- [x] mapping Variété + Caractéristiques contrôlées ;
- [x] synonymes Workspace non librement créés ;
- [x] réutilisation du moteur de contribution ;
- [x] preview revalidée au commit ;
- [x] import global protégé par `product:reference:manage` ;
- [x] aucun `WorkspaceProduct` lors d'un import global ;
- [x] colonnes M-003 signalées et non absorbées.

## 7. Migration et bootstrap

Commande migration :

```text
npm run migration:m002-catalog
```

Elle couvre :

1. lifecycle legacy ;
2. sémantique historique ;
3. Présentation → `ProductCharacteristic(PRESENTATION)` ;
4. signatures structurées ;
5. indexes ;
6. permissions système Workspace.

- [x] aucune fusion silencieuse ;
- [x] transaction ;
- [x] idempotence ;
- [x] seed gouvernance ;
- [x] seed référentiel versionné ;
- [x] dataset `m002-reference-v1` `ready:true` ;
- [x] 39 Produits, catégorie Fruits et légumes ;
- [x] Pomme/Carotte/Tomate/Pomme de terre structurées ;
- [x] aucun rendement inventé ;
- [x] aucune donnée M-003.

## 8. Tests présents dans le corpus

Backend notamment :

```text
productCatalog.registry.test.js
productCatalog.normalization.test.js
productVariantSemantics.test.js
productCatalog.validation.test.js
productCatalog.models.test.js
productCatalog.integration.test.js
productCatalog.http.test.js
productCatalogGovernance.integration.test.js
productCatalogGlobal.http.test.js
productCatalogImport.integration.test.js
productCatalogImportAccess.service.test.js
productReferenceContribution.integration.test.js
productReferenceDimension.integration.test.js
m002ProductLifecycleBackfill.migration.test.js
m002VariantSemantics.migration.test.js
m002VariantCharacteristics.migration.test.js
m002Catalog.migration.test.js
m002Reference.seed.test.js
```

Frontend notamment :

```text
product-create-dialog.test.jsx
product-variant-fields.test.jsx
product-import-dialog.test.jsx
product-dimension-contribution-dialog.test.jsx
product-dimension-edit-dialog.test.jsx
products-dashboard-widget.test.jsx
product-presentation.test.js
products-page.test.jsx
product-reference-page.test.jsx
product-reference-route.test.jsx
```

**Aucune suite n'est déclarée verte sur le HEAD final tant qu'elle n'a pas été réellement exécutée.**

## 9. Gates à exécuter

### Migration / seeds

```text
npm run migration:m002-catalog
npm run seed:m002-governance
npm run seed:m002-reference
```

### Backend ciblé

Utiliser la commande détaillée de `docs/REPRISE-CURRENT.md` avec `--no-file-parallelism`.

### Frontend ciblé

```text
npm --prefix frontend run test -- src/features/products
npm --prefix frontend run lint
npm --prefix frontend run build
```

### Global

```text
npm run lint
npm test -- --no-file-parallelism
npm --prefix frontend run test
npm run test:e2e
npm run release:verify
```

## 10. QA visuelle avant PR

Valider explicitement :

- Référentiel global / Mon référentiel ;
- recherche complexe ;
- Produit / Déclinaison / Gamme / Actions ;
- création Workspace → Soumettre la proposition ;
- absence du Produit avant approbation ;
- Contributions globales ;
- approbation/refus ;
- ajout explicite à Mon référentiel ;
- Pomme Golden/Gala/Granny Smith ;
- Carotte structurée ;
- ajout Reinette / recherche Reinnette ;
- lifecycle dimensions ;
- import structuré ;
- seed visible ;
- responsive.

## 11. Clôture

Seulement après :

```text
migration + seeds OK
→ backend ciblé vert
→ frontend ciblé vert
→ lint/build verts
→ suites globales vertes
→ E2E verts
→ release verify vert
→ QA visuelle utilisateur validée
→ une seule PR M-002
→ gate PR
→ une seule fusion
→ gate post-merge
```

Puis seulement cadrer M-003.
