# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-01  
**Lot courant :** stabilisation post-merge du BLOC A  
**Branche :** `fix/post-merge-test-stability`  
**Base :** `main@42f91e844974e2d0c6d374f2bb307077210b2614`

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats M-001/M-002/M-003/M-004
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. BLOC A fusionné

Le BLOC A d’intégration Core post-`v1.2.1` est fusionné :

~~~text
PR #30
Core Gate PR #159 = success
merge = 42f91e844974e2d0c6d374f2bb307077210b2614
~~~

Provenance Core inchangée :

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = 6581e573c6a6885790b23fe502bd34d8199ea6ba
~~~

Le tag `v1.2.1` reste inchangé et ne doit pas être déplacé.

## 3. Pourquoi le lot de stabilisation est ouvert

La Core Gate post-merge #160 a échoué deux fois, sur deux symptômes différents.

Tentative 1 :

~~~text
2 E2E M-001 en échec
→ attente du heading « Dossiers » après navigation
→ 20/22 E2E verts
~~~

Les deux scénarios M-001 suivants, utilisant le même helper, ont ensuite réussi dans la même exécution.

Tentative 2 :

~~~text
1 test frontend M-002 en échec
→ ProductVariantFields
→ Select « Unité de référence »
→ option « PCE » non montée après clic
→ 1079/1080 tests frontend verts
→ E2E non atteints
~~~

Le même test `ProductVariantFields` était vert sur la Core Gate #159 et sur la première tentative post-merge.

Conclusion opérationnelle : le lot vise la stabilité des tests et non une modification du métier.

## 4. Correctifs Produit du lot

### Test frontend M-002

Le test `ProductVariantFields` adopte le pattern déjà utilisé par les tests du Select partagé :

~~~text
trigger Base UI
→ bounding rect déterministe
→ clic utilisateur
→ attente asynchrone findByRole(option)
~~~

La valeur canonique `UNIT` et sa présentation `PCE` restent inchangées.

### E2E M-001

Le helper `openDossiersPage()` ne charge plus directement la route métier à froid.

Le parcours devient :

~~~text
Workspace dashboard chargé
→ lien Dossiers visible dans le shell autorisé
→ navigation applicative
→ URL /dossiers
→ heading Dossiers
~~~

Cela resynchronise explicitement le contexte Workspace et les permissions avant d’entrer dans le module métier, sans augmenter arbitrairement le timeout de 15 secondes.

## 5. Frontière Core / Produit

La conservation automatique des screenshots, vidéos et traces Playwright en cas d’échec GitHub Actions est générique et réutilisable.

Elle appartient donc à un futur lot Core :

~~~text
saas-core-api
→ workflow Core Gate
→ upload d’artifacts sur échec
→ version/test Core
→ intégration ultérieure dans le produit
~~~

Aucun patch générique du workflow Core n’est introduit directement dans ce produit.

## 6. Validation attendue

Une seule validation globale est attendue via la PR de ce lot :

~~~text
Core Gate PR
→ npm run release:check complet
→ backend
→ frontend
→ build
→ 22 E2E
~~~

Ne pas multiplier les relances locales isolées sauf diagnostic nécessaire.

## 7. Sortie du lot

~~~text
une branche
→ une PR
→ Core Gate PR verte
→ merge
→ Core Gate post-merge verte
→ BLOC A définitivement clos
~~~

Le BLOC B ne démarre qu’après cette clôture.

## 8. BLOC B — ensuite uniquement

Objectif :

~~~text
Sidebar Platform
→ une seule entrée « Gestion des référentiels »

Page
→ [ Produits | Fournisseurs ]
~~~

Règles déjà validées :

- réutiliser les surfaces M-002 et M-003 existantes ;
- ne pas recréer les écrans Produits/Fournisseurs ;
- conserver les permissions Application Global existantes ;
- utiliser la primitive Core `section` ;
- gérer Produits seul / Fournisseurs seul / les deux / aucun droit ;
- ne donner aucun droit métier implicite au Super Admin Platform ;
- préserver les routes historiques si nécessaire ;
- vérifier le Help Center ;
- une branche, une PR, un merge.
