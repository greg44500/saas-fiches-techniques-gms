# M-002 — Handoff backend vers frontend

**Branche :** `feature/m002-catalogue-produits`  
**Statut :** backend implémenté, gates backend à exécuter localement avant démarrage frontend.

## Backend disponible

- références globales : CanonicalProduct, ProductVariant, ProductCategory ;
- catalogue tenant : WorkspaceProduct ;
- historique global : ProductReferenceEvent ;
- import temporaire : ProductImportSession + TTL ;
- bootstrap versionné : ProductReferenceBootstrapRun ;
- RBAC Workspace : product:read, product:catalog:manage, product:contribute ;
- Platform : platform:products:read, platform:products:manage ;
- API Workspace + API Platform ;
- import CSV/XLS/XLSX en trois étapes inspect → preview → commit ;
- détection des colonnes M-003 hors périmètre ;
- bootstrap versionné et transactionnel, dataset réel non encore activé.

## Contrats frontend

- utiliser RTK Query pour l'état serveur ;
- ne pas hardcoder statuts, unités ou catégories exposés par metadata ;
- WORKSPACE = Mon catalogue ;
- REFERENCE = Tout le référentiel visible ;
- afficher PENDING_REVIEW en « En validation » ;
- ne jamais exposer une contribution PENDING d'un autre Workspace ;
- conserver le contrôle serveur des doublons ;
- aucun prix, fournisseur ou conditionnement dans M-002 ;
- import : inspect, mapping/preview, décisions, commit ;
- un commit d'import obsolète peut retourner 409 et exige une nouvelle preview.

## Tests backend présents

Normalisation, registries, modèles/indexes, validation Zod, services, rollback, tenancy, RBAC Workspace/Platform, HTTP Workspace/Platform, import CSV/XLS/XLSX, migration, bootstrap et prévisualisation obsolète.

Ils sont présents dans Git mais ne doivent être déclarés verts qu'après exécution locale.

## Validation backend avant frontend

```powershell
git switch feature/m002-catalogue-produits
git pull --ff-only
git status --short
npm ci
npm run release:verify
npm run lint
npm test
```

MONGODB_URI doit viser la base de test suffixée `_test` sur le replica set `rs0`.

## Suite frontend

1. RTK Query M-002 ;
2. navigation Produits ;
3. Mon catalogue / Tout le référentiel ;
4. recherche, filtres, pagination ;
5. drawer Produit ;
6. ajout/retrait catalogue ;
7. contribution et doublons ;
8. import inspect/preview/commit ;
9. gouvernance Platform Produits/catégories ;
10. Dashboard ;
11. RTL ;
12. E2E ;
13. release:check ;
14. validation visuelle ;
15. documentation finale ;
16. une seule PR M-002 et une seule fusion.
