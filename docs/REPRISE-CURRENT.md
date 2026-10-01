# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-01  
**Lot courant :** BLOC A — intégration Core post-v1.2.1 de la navigation Platform par sections  
**Branche :** `core-update/post-v1.2.1-6581e57`  
**Base produit réalignée :** `main@59aa1492710ec72435338a5640137f5468c45ed1`

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats M-001/M-002/M-003/M-004
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. M-002 est clôturé

Le correctif/consolidation M-002 est fusionné dans `main` :

~~~text
PR #29
merge = 59aa1492710ec72435338a5640137f5468c45ed1
Core Gate PR #157 = success
Core Gate post-merge #158 = success
~~~

M-002 ne doit pas être rouvert sauf régression directement causée par un lot ultérieur.

## 3. Provenance Core du BLOC A

Core source :

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = 6581e573c6a6885790b23fe502bd34d8199ea6ba
~~~

Le tag `v1.2.1` reste inchangé. Le commit `6581e57...` est un commit post-tag compatible ; le tag ne doit jamais être déplacé.

`core-origin.json` enregistre désormais le SHA exact réellement intégré.

## 4. Historique Core préservé

La réparation de filiation Core a déjà été effectuée et ne doit pas être rejouée.

Commit de rattachement historique :

~~~text
8af1862ae32aca73f85730fe50fba64a691492af
~~~

Commit de merge Core :

~~~text
57a138d4e80bef560394c13ee1e9a84a8d315bb1
~~~

Parents :

~~~text
8af1862ae32aca73f85730fe50fba64a691492af
6581e573c6a6885790b23fe502bd34d8199ea6ba
~~~

Le second parent Core `6581e57...` doit rester dans l'histoire Git.

## 5. Réalignement avec le main M-002

Après clôture M-002, la branche Core était 25 commits derrière `main`.

Le nouveau `main` a été mergé explicitement dans la branche Core, sans rebase :

~~~text
merge = d3d1c8ab6dae0e2e38311e701acc304cd8bec178
parent Core-update = 57a138d4e80bef560394c13ee1e9a84a8d315bb1
parent main        = 59aa1492710ec72435338a5640137f5468c45ed1
~~~

Le working tree local a été confirmé propre après ce merge, puis la branche distante a été mise à jour.

## 6. Primitive Core intégrée

La primitive générique ajoutée est :

~~~text
type: 'section'
~~~

Contrat :

- organisation visuelle non repliable ;
- `id`, `label`, `items` ;
- visibilité optionnelle ;
- suppression d'une section sans enfant visible ;
- nettoyage des séparateurs ;
- mode expanded : libellé de section ;
- mode compact : séparation visuelle sans titre inutile ;
- compatibilité avec les anciens `item` et `group` ;
- navigation uniquement, sans autorité de sécurité ;
- permissions Platform et Application Global toujours distinctes.

Fichiers Core concernés :

~~~text
docs/derived-saas/DERIVED-SAAS.md
docs/derived-saas/EXTENSION-POINTS.md
frontend/src/app/application-platform-navigation.js
frontend/src/app/application-platform-navigation.test.js
frontend/src/components/shared/app-sidebar.jsx
frontend/src/features/platform/lib/platform-navigation.js
frontend/src/features/platform/lib/platform-navigation.test.js
frontend/src/features/workspace/components/workspace-sidebar.test.jsx
~~~

## 7. État du BLOC A

Réalisé :

~~~text
filiation Core réparée
→ Core 6581e57 mergé avec second parent réel
→ main M-002 réaligné dans la branche Core
→ provenance core-origin mise à jour
→ documentation de reprise mise à jour
~~~

Reste à réaliser :

~~~text
npm run release:check
→ QA visuelle éventuelle de la sidebar
→ une PR BLOC A
→ Core Gate PR
→ merge
→ Core Gate post-merge
~~~

Le BLOC A n'est clos qu'après la Core Gate post-merge verte.

## 8. BLOC B — après clôture du BLOC A uniquement

Créer une branche Produit propre depuis `main`.

Objectif :

~~~text
Sidebar Platform
→ une seule entrée « Gestion des référentiels »

Page
→ [ Produits | Fournisseurs ]
~~~

Règles :

- réutiliser les surfaces M-002 et M-003 existantes ;
- ne pas recréer les écrans Produits/Fournisseurs ;
- conserver les permissions Application Global existantes ;
- utiliser la primitive Core `section` ;
- gérer Produits seul / Fournisseurs seul / les deux / aucun droit ;
- ne donner aucun droit métier implicite au Super Admin Platform ;
- préserver les routes historiques lorsque nécessaire ;
- vérifier le Help Center existant ;
- une branche, une PR, un merge.

## 9. Lots explicitement séparés

- exports/diffusion M-004 : CSV, XLSX, PDF, impression, e-mail ;
- enrichissement massif du seed M-002 : nouvelle version de dataset ;
- dette Core DataTable `GMS-CORE-UX-001` ;
- production : billing, observabilité, stockage, conformité.

## 10. Discipline de reprise

~~~text
un lot cohérent
→ une branche
→ tests
→ une PR
→ une Core Gate
→ un merge
→ une Core Gate post-merge
~~~

Ne pas créer de micro-PR. Ne pas poller les Core Gates : l'utilisateur communique leur résultat.
