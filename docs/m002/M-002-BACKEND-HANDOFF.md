# M-002 — Handoff de reprise après recadrage

**Branche :** `feature/m002-catalogue-produits`  
**Core intégré :** `v1.1.2` — commit `193e632d62cb048f3988e073665759cce8dd379f`  
**État Git vérifié le 2026-09-22 :** branche 30 commits devant `main`, 0 derrière avant le commit documentaire de recadrage.  
**Dernier commit applicatif avant recadrage :** `ca02a1e428e43ec98da4c0ae168585f78d61e5f6`.

## 1. Ce qui reste valide

- `CanonicalProduct`, `ProductVariant`, `ProductCategory` globaux métier ;
- `WorkspaceProduct` tenant-scoped ;
- `ProductReferenceEvent` pour l'historique global métier ;
- `ProductImportSession` temporaire ;
- normalisation / anti-doublon / proximité ;
- contributions `PENDING_REVIEW` ;
- API Workspace M-002 dans son principe ;
- Mon catalogue / Tout le référentiel ;
- import inspect → preview → commit dans son principe métier ;
- frontière M-003 fournisseur/référence/conditionnement/tarifs ;
- Dashboard M-002 Workspace.

## 2. Ce qui est explicitement invalide et doit être corrigé

La branche contient actuellement une fausse frontière Platform :

```text
platform:products:read
platform:products:manage
/api/platform/products
/platform/products
productCatalogPlatform.*
composants/tests frontend Platform Produits
```

Le référentiel global est une donnée métier du produit, pas une donnée Platform.

Les personnes de l'équipe Platform peuvent recevoir une autorité métier Produit, mais celle-ci ne doit pas être accordée implicitement par leur rôle Platform.

## 3. Capabilities commerciales validées pour le recadrage

À enregistrer via le point d'extension Core des capabilities :

```text
product_reference_access
product_catalog_import
product_contribution
```

Le moteur Plans / Entitlements / EntitlementOverrides reste Core.

Exemple commercial initial :

```text
Free
→ référentiel global

Premium
→ référentiel global
→ import catalogue
→ contribution Produit/déclinaison
```

Cette matrice reste configurable par plan.

Le produit ne doit pas créer deux capacités de stockage.

`product_catalog_import` est la fonctionnalité métier vendable. Elle utilise un temporaire technique sécurisé, sans activer un espace documentaire durable ni consommer un quota commercial de stockage utilisateur.

La capability générique Core `file_upload`, si elle reste disponible pour d'autres SaaS ou un futur besoin documentaire durable, n'est pas une précondition commerciale de M-002.

## 4. Import fichier — anomalie technique actuelle

`backend/modules/productCatalog/productCatalogImport.middleware.js` utilise actuellement :

```text
multer.memoryStorage()
```

Ce pipeline contourne les primitives Core de quarantaine / checksum / antivirus / nettoyage.

Le Core v1.1.2 dispose déjà de briques génériques (`createUploadSingleFile`, inspection, malware scan, temporaryFileService), mais son pipeline File durable est configuré pour PDF/JPEG/PNG.

La reprise doit vérifier le moyen professionnel de composer ces briques pour CSV/XLS/XLSX sans dupliquer la sécurité générique. Si une factory configurable manque réellement, le besoin est générique et doit être corrigé dans `saas-core-api` en un seul lot Core, puis intégré au produit.

Le fichier importé reste temporaire ; les Produits et relations créés/mis à jour restent persistants. Taille maximale, TTL et concurrence éventuelle sont des garde-fous techniques, pas une capacité de stockage vendue.

Pour les futurs modules de Fiches techniques, ne pas réutiliser `storage_bytes` pour mesurer les brouillons ou fiches validées : le besoin commercial validé est de limiter leur **nombre** via des métriques/quota métier dédiés déclarés par le produit et évalués par le moteur Core. Les seuils seront fermés en M-004.

## 5. Point d'architecture encore à fermer

Le Core v1.1.2 possède :

- RBAC Workspace ;
- RBAC Platform ;
- routes `authenticatedRoutes`, `workspaceRoutes`, `platformRoutes` ;
- points d'extension applicatifs.

Il ne possède pas de contrat canonique explicitement nommé « RBAC métier global ».

Avant de réécrire la gouvernance globale, déterminer si :

1. les primitives existantes permettent une composition métier propre ; ou
2. un point d'extension générique minimal est réellement nécessaire dans le Core.

Ne pas inventer un second RBAC dans le produit sans cette vérification.

## 6. Phases de reprise

1. vérifier Git/KB/Core v1.1.2 et les contrats M-002 recadrés ;
2. fermer autorisation globale + stratégie d'ingestion temporaire ;
3. corriger backend Platform/capabilities/import ;
4. corriger tests backend ;
5. finaliser frontend Workspace existant ;
6. reconstruire administration métier globale hors Platform ;
7. corriger tests frontend ;
8. ajouter E2E critiques ;
9. exécuter gates applicables ;
10. validation visuelle ;
11. documentation finale ;
12. une seule PR M-002 et une seule fusion.

## 7. Tests / gates

Aucun test ajouté récemment sur cette branche ne doit être déclaré vert par simple présence dans Git.

À la fin du bloc seulement, exécuter les gates réellement prévues par le dépôt, dont au minimum :

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

Éviter les micro-validations et PR intermédiaires ; utiliser des tests ciblés pendant le développement uniquement lorsqu'ils apportent un signal utile, puis faire la validation globale en fin de bloc.
