# M-002 — Critères d'acceptation et ordre de reprise

**Statut : BACKEND RECADRÉ/IMPLÉMENTÉ — validation ciblée des derniers commits puis frontend/E2E à poursuivre**  
**Module : Catalogue Produits / Produits canoniques**

## 1. Discipline du lot

Branche unique :

```text
feature/m002-catalogue-produits
```

Règle :

```text
un bloc fonctionnel M-002
→ plusieurs commits cohérents si nécessaire
→ aucune micro-PR
→ une seule PR M-002
→ une seule fusion après validation complète
```

Aucune PR de réparation séparée ne doit être créée pour les corrections décrites ici.

## 2. Fondations déjà conservées

- [x] Produit canonique global sans ownership Workspace ;
- [x] Déclinaison séparée de l'identité canonique ;
- [x] `WorkspaceProduct` référence une déclinaison sans copie d'identité ;
- [x] catégorie globale ;
- [x] rendement porté par la déclinaison et jamais deviné ;
- [x] unité normalisée backend-driven ;
- [x] aucun prix/fournisseur/conditionnement M-003 dans le modèle M-002 ;
- [x] contribution Workspace `PENDING_REVIEW` ;
- [x] anti-doublon, proximité et revue explicite ;
- [x] archive globale non destructive ;
- [x] fusion destructive différée.

## 3. Corrections d'architecture obligatoires

- [x] supprimer `platform:products:read` et `platform:products:manage` côté backend ;
- [x] retirer le module Produit du registre de permissions Platform ;
- [x] remplacer `/api/platform/products` par `/api/product-reference` ;
- [ ] supprimer/repositionner `/platform/products` côté frontend ;
- [x] conserver les services de gouvernance utiles mais les rendre indépendants de Platform ;
- [x] utiliser Application Global avec `product:reference:read/manage` ;
- [x] primitive Application Global fournie par Core 1.2.0 et intégrée ; aucun second RBAC produit.

## 4. Capabilities commerciales à intégrer

Le produit déclare ses features via le registre de capabilities applicatives du Core :

```text
product_reference_access
product_catalog_import
product_contribution
```

Critères :

- [x] features enregistrées dans le produit sans modifier les constantes Core ;
- [x] registre Core Plans/Entitlements capable de les activer/désactiver ;
- [x] `EntitlementOverride` reste le mécanisme d'override utilisé par M-002 ;
- [x] backend contrôle réellement les entitlements ;
- [x] RBAC Workspace reste un contrôle distinct ;
- [x] `product_catalog_import` reste la capability métier vendable ;
- [x] l'import ne nécessite pas l'activation d'un stockage documentaire durable ;
- [x] un temporaire d'import ne consomme pas un quota commercial de stockage utilisateur ;
- [x] les limites de taille/TTL restent des garde-fous techniques.

Exemple commercial initial à conserver comme configuration, non comme constante : Free peut accéder au référentiel global ; Premium peut en plus importer et contribuer.

## 5. Import — correction obligatoire

Le pipeline métier `inspect → preview → commit` est conservé.

- [x] supprimer le pipeline parallèle `multer.memoryStorage()` M-002 ;
- [x] réutiliser `createSecureTemporaryUploadService()` ;
- [x] conserver CSV / XLS / XLSX comme politique métier d'import ;
- [x] ne pas créer de `File` durable pour le seul import ;
- [x] ne pas introduire un second quota/capacité de stockage pour les imports ;
- [x] supprimer le temporaire après traitement ou erreur ;
- [x] conserver la session d'import métier et les données Produit résultantes ;
- [x] évolution Core générique réalisée et intégrée jusqu'au SHA `c428fbec...` sans nouvelle release ;
- [x] contrôle fin du commit : rattachement existant ≠ contribution nouvelle.

Le commit calcule les exigences réelles :

```text
ATTACH_EXISTING
→ product:catalog:manage

PROPOSE_PRODUCT / PROPOSE_VARIANT
→ product:contribute
→ product_contribution
```

## 6. Workspace M-002

À conserver et vérifier :

- [ ] metadata ;
- [ ] summary Dashboard ;
- [ ] search WORKSPACE / REFERENCE ;
- [ ] detail ;
- [ ] duplicate-check ;
- [ ] contribution Produit ;
- [ ] contribution Déclinaison ;
- [ ] ajout/retrait catalogue ;
- [ ] import inspect/preview/commit ;
- [ ] navigation Produits ;
- [ ] Mon catalogue / Tout le référentiel ;
- [ ] recherche, filtres, pagination ;
- [ ] drawer Produit ;
- [ ] flow contribution ;
- [ ] état En validation ;
- [ ] widget Dashboard.

Le frontend déjà présent sur la branche est un travail à vérifier, pas un résultat déclaré vert.

## 7. Gouvernance métier globale

- [x] liste/détail complet du référentiel côté backend ;
- [x] file de contributions portée par le service global côté backend ;
- [x] catégories côté backend global ;
- [x] approve/reject Produit côté backend ;
- [x] approve/reject Déclinaison côté backend ;
- [x] correction Produit/déclinaison côté backend ;
- [x] archivage/réactivation côté backend ;
- [x] historique métier `ProductReferenceEvent` conservé ;
- [ ] surface frontend d'administration métier globale hors `PlatformLayout` ;
- [x] contrôles Application Global backend + bootstrap explicite du premier gouverneur.

## 8. Bootstrap / migrations

- [x] seed versionné du référentiel ;
- [x] moteur idempotent présent ;
- [ ] dataset réel nettoyé/revu — différé, `m002-reference.v1.json` reste `ready: false` ;
- [x] aucune donnée M-003 injectée comme attribut Produit ;
- [x] migration indexes présente ;
- [x] manifest migration synchronisé ;
- [x] bootstrap de gouvernance Application Global ajouté (`seed:m002-governance`) ;
- [ ] anciennes surfaces/mentions frontend Platform Produits à retirer lors de la phase frontend.

## 9. Tests à revoir

Les tests existants ne doivent pas être déclarés verts sans exécution.

État :

- [x] pipeline sécurisé CSV/XLS/XLSX : quatre fichiers ciblés confirmés verts localement avant le bloc d'autorisation ;
- [x] attentes backend `platform:products:*` retirées/remplacées par Application Global ;
- [x] tests Application Global ajoutés — exécution locale des derniers commits encore requise ;
- [x] tests capabilities/overrides ajoutés — exécution locale des derniers commits encore requise ;
- [x] tests capability + RBAC du commit import ajoutés — exécution locale requise ;
- [x] architecture import distincte de `File` durable ;
- [ ] frontend RTL Workspace ;
- [ ] frontend RTL administration métier globale ;
- [ ] E2E critiques M-002 ;
- [ ] isolation cross-tenant / PENDING à revalider dans le corpus final ;
- [ ] tests de non-régression M-001/Core applicables.

Première campagne à exécuter au prochain démarrage :

```text
applicationCapability.registry.test.js
applicationGlobalPermission.registry.test.js
applicationPlatformPermission.registry.test.js
applicationRoutes.registry.test.js
productCatalogGlobal.http.test.js
productCatalog.http.test.js
productCatalogImportAccess.service.test.js
productCatalogGovernanceBootstrap.test.js
```

## 10. Ordre de reprise

```text
Phase 1 — validation backend du checkpoint courant
→ pull du HEAD réel
→ tests ciblés autorisation/capabilities/gouvernance/import
→ corriger uniquement de vrais échecs démontrés
→ une seule exécution backend globale npm test lorsque les ciblés sont verts

Phase 2 — frontend Workspace
→ aligner affichage/guards sur capabilities effectives
→ vérifier catalogue/référentiel/contribution/import
→ conserver sécurité backend comme autorité

Phase 3 — administration métier globale frontend
→ supprimer l'ancienne surface /platform/products
→ créer une surface métier hors PlatformLayout
→ appeler /api/product-reference
→ ne jamais déduire le droit global du rôle Platform

Phase 4 — tests frontend + E2E
→ RTL Workspace
→ RTL gouvernance globale
→ parcours import/contribution/approbation
→ isolation PENDING / cross-tenant

Phase 5 — qualité finale
→ revue architecture/taille des fichiers
→ documentation finale
→ lint/tests/build/E2E/release:check
→ validation visuelle

Phase 6 — livraison
→ UNE PR M-002
→ gate
→ UNE fusion
```

## 11. Règle en cas de besoin Core

Si la Phase 1 démontre une primitive réellement générique manquante, ne pas la bricoler dans le produit.

Créer alors un seul lot Core cohérent, le tester/versionner/intégrer, puis reprendre la même branche M-002. Ne pas créer une succession de micro-versions Core pour des corrections de tests isolées.
