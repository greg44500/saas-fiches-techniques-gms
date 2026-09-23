# M-002 — Critères d'acceptation et ordre de finalisation

**Statut : IMPLÉMENTATION ALIGNÉE SUR LE CONTRAT RECADRÉ — gates et validation visuelle encore à exécuter**  
**Module : Catalogue Produits / Produits canoniques**  
**Branche :** `feature/m002-catalogue-produits`

## 1. Discipline du lot

```text
un bloc fonctionnel M-002
→ plusieurs commits cohérents
→ une seule PR M-002
→ une seule fusion après validation complète
```

Aucune micro-PR de réparation ne doit être créée pour les ajustements de ce lot.

## 2. Contrat fonctionnel désormais implémenté

- [x] Produit canonique global sans ownership Workspace ;
- [x] Déclinaison séparée de l'identité canonique ;
- [x] `WorkspaceProduct` référence une déclinaison sans copie ;
- [x] catégorie globale obligatoire pour toute nouvelle identité ACTIVE ;
- [x] rendement porté par la déclinaison et jamais deviné ;
- [x] unité normalisée backend-driven ;
- [x] aucun fournisseur/catalogue fournisseur/référence fournisseur/conditionnement/prix M-003 dans M-002 ;
- [x] anti-doublon exact + proximité + revue explicite ;
- [x] création Workspace immédiatement ACTIVE après contrôle ;
- [x] création globale immédiatement ACTIVE après contrôle ;
- [x] suppression du workflow quotidien de validation humaine ;
- [x] lifecycle opérationnel `ACTIVE ↔ ARCHIVED` ;
- [x] archive globale non destructive ;
- [x] fusion destructive différée.

## 3. Autorisation et frontière globale

- [x] aucune permission métier Produit dérivée implicitement d'un rôle Platform ;
- [x] `/api/product-reference` utilise Application Global ;
- [x] permissions :
  - `product:reference:read` ;
  - `product:reference:manage` ;
- [x] un membre Platform peut recevoir explicitement ces droits via `ApplicationGlobalMember` ;
- [x] un Super Admin Platform sans membership Application Global Produit reste refusé ;
- [x] un Owner Workspace n'obtient pas ces droits globaux ;
- [x] frontend global hors `PlatformLayout` sur `/product-reference` ;
- [x] bootstrap initial explicite du gouverneur Produit.

## 4. RBAC Workspace et capabilities

Permissions Workspace :

```text
product:read
product:catalog:manage
product:contribute
```

Capabilities commerciales :

```text
product_reference_access
product_catalog_import
product_contribution
```

Les clés `product:contribute` et `product_contribution` sont conservées pour stabilité contractuelle. Leur sémantique actuelle est la création de nouvelles identités/déclinaisons dans le référentiel partagé après contrôle anti-doublon ; elles ne correspondent plus à une file d'approbation.

Critères :

- [x] RBAC, capability et quota restent distincts ;
- [x] `product_catalog_import` contrôle l'accès commercial à l'import Workspace ;
- [x] `product_contribution` contrôle les créations nouvelles depuis un Workspace ;
- [x] l'autorité Application Global ne dépend d'aucun plan Workspace ;
- [x] aucun stockage documentaire durable n'est requis pour le fichier source d'import.

## 5. Import Workspace

Pipeline :

```text
inspect
→ mapping
→ preview
→ revue des ambiguïtés
→ commit
```

Classifications cibles :

```text
ATTACH_EXISTING
CREATE_PRODUCT
CREATE_VARIANT
REVIEW_REQUIRED
INVALID
```

Droits calculés au commit :

```text
ATTACH_EXISTING
→ product:catalog:manage

CREATE_PRODUCT / CREATE_VARIANT
→ product:contribute
→ product_contribution
```

Critères :

- [x] chaîne de téléversement temporaire sécurisé Core réutilisée ;
- [x] CSV/XLS/XLSX ;
- [x] aucun `File` durable créé pour le seul import ;
- [x] aucune seconde capacité de stockage commerciale ;
- [x] preview revalidée au commit ;
- [x] catégorie active requise pour une création ;
- [x] colonnes M-003 signalées mais non absorbées.

## 6. Import global Produit

- [x] `POST /api/product-reference/imports/inspect` ;
- [x] `POST /api/product-reference/imports/:importId/preview` ;
- [x] `POST /api/product-reference/imports/:importId/commit` ;
- [x] protection par `product:reference:manage` ;
- [x] aucune capability Workspace ;
- [x] aucune création de `WorkspaceProduct` ;
- [x] même déduplication que le flux Workspace ;
- [x] même chaîne de sécurité fichier ;
- [x] session explicitement scopée `GLOBAL`.

## 7. Workspace M-002

Implémenté :

- [x] metadata ;
- [x] summary Dashboard ;
- [x] search WORKSPACE / REFERENCE ;
- [x] detail ;
- [x] duplicate-check ;
- [x] création Produit ;
- [x] création Déclinaison ;
- [x] ajout/retrait catalogue ;
- [x] import inspect/preview/commit ;
- [x] navigation Produits ;
- [x] Mon catalogue / Tout le référentiel ;
- [x] recherche, filtres, pagination ;
- [x] drawer Produit ;
- [x] widget Dashboard sans compteur de validation.

Ces éléments restent à confirmer par exécution des tests et QA visuelle.

## 8. Administration globale

Implémenté :

- [x] liste/détail du référentiel ;
- [x] création Produit ;
- [x] duplicate-check ;
- [x] création Déclinaison ;
- [x] import global ;
- [x] correction Produit/Déclinaison ;
- [x] archivage/réactivation ;
- [x] gestion des catégories ;
- [x] historique `ProductReferenceEvent` ;
- [x] surface frontend `/product-reference` ;
- [x] aucune file « À valider » ;
- [x] aucune action Valider/Rejeter dans le parcours courant.

## 9. Migration et bootstrap

Commande :

```text
npm run migration:m002-catalog
```

Elle réalise désormais :

1. backfill des statuts legacy ;
2. vérification/création des indexes M-002 ;
3. synchronisation des permissions système Workspace enregistrées.

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

- [x] aucune catégorie inventée ;
- [x] aucune suppression de document ;
- [x] seed de gouvernance Application Global ;
- [x] seed référentiel versionné ;
- [ ] dataset bêta réel nettoyé/revu — différé volontairement.

## 10. Tests

Le corpus a été réaligné sur le nouveau contrat, mais aucun test n'est déclaré vert tant qu'il n'a pas été exécuté après ces commits.

À exécuter :

### Backend ciblé

```text
productCatalog.registry.test.js
productCatalog.validation.test.js
productCatalog.integration.test.js
productCatalog.http.test.js
productCatalogGovernance.integration.test.js
productCatalogGlobal.http.test.js
productCatalogImport.integration.test.js
productCatalogImportAccess.service.test.js
m002ProductLifecycleBackfill.migration.test.js
```

### Frontend ciblé

```text
product-create-dialog.test.jsx
product-import-dialog.test.jsx
products-dashboard-widget.test.jsx
product-presentation.test.js
products-page.test.jsx
product-reference-page.test.jsx
product-reference-route.test.jsx
```

### Gates globales

```text
npm run lint
npm test
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm run test:e2e
npm run release:verify
```

## 11. QA visuelle avant PR

Vérifier au minimum :

- création Workspace ;
- catégorie obligatoire ;
- anti-doublon exact et candidats proches ;
- ajout automatique au catalogue ;
- création d'une déclinaison ;
- import Workspace ;
- détection colonnes M-003 ;
- accès `/product-reference` selon Application Global ;
- création/import global ;
- absence de toute file de validation ;
- catégories ;
- archive/réactivation ;
- Dashboard.

## 12. Étape suivante après fermeture M-002

Une fois M-002 validé et fusionné, cadrer M-003 :

```text
Fournisseur
→ Catalogue fournisseur identifié/versionné
→ Article fournisseur
→ référence / conditionnement / prix
→ rattachement ProductVariant
→ filtres Fournisseur / Catalogue
```

Aucun de ces concepts ne doit être ajouté au modèle `CanonicalProduct`.
