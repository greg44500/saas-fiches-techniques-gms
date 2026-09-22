# M-002 — Critères d'acceptation et ordre de reprise

**Statut : RECADRAGE VALIDÉ — implémentation existante partiellement à corriger avant finalisation**  
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

- [ ] supprimer `platform:products:read` et `platform:products:manage` ;
- [ ] retirer le module Produit du registre de permissions Platform ;
- [ ] supprimer/repositionner `/api/platform/products` ;
- [ ] supprimer/repositionner `/platform/products` ;
- [ ] conserver les services de gouvernance utiles mais les rendre indépendants de Platform ;
- [ ] fermer le mécanisme d'autorisation de la gouvernance globale métier ;
- [ ] vérifier si ce mécanisme nécessite réellement une primitive Core générique avant de l'implémenter dans le produit.

## 4. Capabilities commerciales à intégrer

Le produit déclare ses features via le registre de capabilities applicatives du Core :

```text
product_reference_access
product_catalog_import
product_contribution
```

Critères :

- [ ] features enregistrées dans le produit sans modifier les constantes Core ;
- [ ] Plans capables de les activer/désactiver ;
- [ ] `EntitlementOverride` continue de fonctionner sur ces features ;
- [ ] backend contrôle réellement les entitlements ;
- [ ] RBAC Workspace reste un contrôle distinct ;
- [ ] `product_catalog_import` reste la capability métier vendable ;
- [ ] l'import ne nécessite pas l'activation d'un stockage documentaire durable ;
- [ ] un temporaire d'import ne consomme pas un quota commercial de stockage utilisateur ;
- [ ] les limites de taille/TTL/concurrence restent des garde-fous techniques.

Exemple commercial initial à conserver comme configuration, non comme constante : Free peut accéder au référentiel global ; Premium peut en plus importer et contribuer.

## 5. Import — correction obligatoire

Le pipeline métier inspect → preview → commit est conservé.

À corriger :

- [ ] supprimer le pipeline parallèle `multer.memoryStorage()` M-002 ;
- [ ] réutiliser les primitives Core de téléversement temporaire sécurisé ;
- [ ] conserver CSV / XLS / XLSX comme politique métier d'import ;
- [ ] ne pas créer de `File` durable pour le seul import ;
- [ ] ne pas introduire un second quota/capacité de stockage pour les imports ;
- [ ] supprimer le temporaire après traitement ;
- [ ] conserver la session d'import métier et les données Produit résultantes ;
- [ ] si le Core v1.1.2 ne permet pas cette composition sans duplication de sécurité, traiter une unique évolution générique dans `saas-core-api`, puis l'intégrer au produit.

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

À reconstruire sur la bonne frontière :

- [ ] liste/détail complet du référentiel ;
- [ ] file de contributions ;
- [ ] catégories ;
- [ ] approve/reject Produit ;
- [ ] approve/reject Déclinaison ;
- [ ] correction ;
- [ ] archivage/réactivation ;
- [ ] historique métier ;
- [ ] surface frontend d'administration métier hors `PlatformLayout` ;
- [ ] contrôles d'autorisation métier globale.

## 8. Bootstrap / migrations

- [x] seed versionné ;
- [x] moteur idempotent présent ;
- [ ] dataset réel nettoyé/revu — différé, `m002-reference.v1.json` reste `ready: false` ;
- [x] aucune donnée M-003 injectée comme attribut Produit ;
- [x] migration indexes présente ;
- [x] manifest migration synchronisé ;
- [ ] toute mention de gouvernance Platform supprimée des contrats et du bootstrap.

## 9. Tests à revoir

Les tests existants ne doivent pas être déclarés verts sans exécution.

À corriger/compléter :

- [ ] supprimer les attentes `platform:products:*` ;
- [ ] tester l'autorité métier globale retenue ;
- [ ] tester les trois capabilities M-002 et les overrides ;
- [ ] tester capability + RBAC ensemble ;
- [ ] tester le pipeline sécurisé temporaire CSV/XLS/XLSX ;
- [ ] vérifier absence de `File` durable pour import ;
- [ ] frontend RTL Workspace ;
- [ ] frontend RTL administration métier globale ;
- [ ] E2E critiques M-002 ;
- [ ] isolation cross-tenant / PENDING ;
- [ ] tests de non-régression M-001/Core applicables.

## 10. Ordre de reprise

```text
Phase 1 — recadrage technique
→ vérifier Core v1.1.2 réel
→ fermer autorisation métier globale
→ fermer stratégie de téléversement temporaire sécurisé
→ décider s'il existe un vrai besoin Core générique

Phase 2 — correction backend
→ retirer Platform Produits
→ intégrer capabilities M-002
→ corriger import sécurisé
→ repositionner gouvernance globale
→ conserver services métier valides

Phase 3 — tests backend
→ autorisation
→ capabilities / overrides
→ tenancy
→ import sécurisé
→ gouvernance
→ régression

Phase 4 — correction/finalisation frontend Workspace
→ routes/navigation/dashboard
→ catalogue/référentiel
→ contributions/import

Phase 5 — administration métier globale
→ route/surface hors Platform
→ référentiel/catégories/contributions
→ droits globaux métier

Phase 6 — tests frontend + E2E
→ parcours critiques
→ plans/capabilities
→ isolation

Phase 7 — qualité finale
→ revue taille/architecture fichiers
→ documentation
→ lint/tests/build/E2E/release:check réellement exécutés
→ validation visuelle

Phase 8 — livraison
→ UNE PR M-002
→ Core Gate
→ UNE fusion
```

## 11. Règle en cas de besoin Core

Si la Phase 1 démontre une primitive réellement générique manquante, ne pas la bricoler dans le produit.

Créer alors un seul lot Core cohérent, le tester/versionner/intégrer, puis reprendre la même branche M-002. Ne pas créer une succession de micro-versions Core pour des corrections de tests isolées.
