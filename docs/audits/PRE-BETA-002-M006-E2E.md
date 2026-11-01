# PRE-BETA-002 — Couverture E2E critique des Fiches process M-006

**Date :** 2026-11-01  
**Statut :** IMPLÉMENTATION PROPOSÉE — À TESTER EN LOCAL ; aucune gate verte revendiquée  
**Périmètre :** tests Playwright métier du SaaS GMS, pas de changement du Core ni du comportement applicatif.

## 1. Pourquoi ce lot

Le contrôle PRE-BETA-001 a confirmé que M-006 possède des services, permissions, routes et tests backend/frontend, mais aucun scénario Playwright propre à ses parcours critiques. Un test unitaire ou HTTP ne prouve pas que l'éditeur, le téléchargement et les dialogues de suppression fonctionnent ensemble dans le navigateur.

La validation manuelle du parcours commercial D-020 et des imports fournisseurs est conservée comme élément distinct ; ce lot n'y apporte aucune nouvelle fonctionnalité.

## 2. Périmètre et preuves recherchées

| Test | Parcours | Attendus |
| --- | --- | --- |
| M006-E2E-01 | Parent M-004 validé → création M-006 via UI → phase et étape via UI → sauvegarde → PDF brouillon → validation → PDF validé → suppression UI → recréation. | Contenu enregistré ; deux téléchargements PDF lisibles avec signature `%PDF-` ; refus 409 d'une suppression sur ancienne révision ; suppression effective ; parent M-004 conservé ; règle 1:1 libérée. |
| M006-E2E-02 | Rôle membre en lecture seule avec accès Dossier → lecture M-006 → refus export et suppression ; autre Workspace → refus lecture. | HTTP 200 sur lecture autorisée ; 403 pour mutations/export non autorisés et pour accès hors Workspace ; ressource intacte. |

**Hors périmètre :** nouvelle fonctionnalité M-006, tests de charge, conformité RGPD, facturation, recettage humain du rendu A4 multipage, restaurations de sauvegarde et déploiement. Ces contrôles demeurent ouverts dans PRE-BETA-001.

## 3. Sécurité des données

`e2e/support/process-sheet-fixtures.js` réutilise les fixtures existantes et crée une Fiche technique validée dans la base Playwright. Le script `test:prepare` remet à zéro **toutes les collections de la base E2E uniquement** puis y réinitialise les seeds nécessaires.

Le garde-fou `e2e/support/environment.js` impose un nom MongoDB finissant par `_e2e_test`, par défaut `saas_fiches_techniques_gms_e2e_test`. **Ne jamais rediriger `E2E_MONGODB_URI` vers la base `saas_fiches_techniques_gms_dev`.** Le superadministrateur et le référentiel global de produits de développement ne sont pas visés.

## 4. Vérifications locales attendues (PowerShell)

Depuis la racine du dépôt, sur la branche `test/pre-beta-002-m006-e2e` :

```powershell
git status --short
git diff --check origin/main...HEAD
cd e2e
npm run test:prepare
npx playwright test tests/process-sheets-m006.spec.js
cd ..
npm run release:check
```

La gate complète lance de nouveau `test:prepare` via les scripts E2E. Nécessite Node 24, MongoDB local `rs0`, et les dépendances/browsers Playwright installés.

**Résultat d'exécution :** non encore fourni ; toute anomalie devra être analysée et corrigée sur la même branche avant PR. Pas de PR/merge ni de déclaration « vert » sans preuve.

## 5. Frontière et suite

- Fichiers de tests : `e2e/tests/process-sheets-m006.spec.js` et `e2e/support/process-sheet-fixtures.js`.
- Modules métier et API : **inchangés**. Aucun modèle ou migration ajouté.
- Les écarts génériques éventuels (Auth, RBAC, stockage, navigateur) seront qualifiés séparément pour le Core ; ne pas les corriger silencieusement dans le dérivé.
- Après gate locale réussie : revue des résultats, PR unique, Core Gate GitHub, merge, puis réconciliation finale de la documentation si nécessaire.

## 6. Documents sources

- [PRE-BETA-001](PRE-BETA-READINESS.md)
- [Cadrage M-006](../m006/M-006-FINALISATION-PDF-SUPPRESSION-CADRAGE.md)
- [Roadmap](../ROADMAP.md)
- [Dettes](../DEBT.md)
- [Configuration E2E](../../e2e/support/environment.js)
