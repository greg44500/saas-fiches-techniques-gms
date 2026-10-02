# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-02
**Lot courant :** intégration Core post-tag `v1.2.1` jusqu’à `054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3`
**Branche :** `core-update/v1.2.1-post-tag-054ecd5`
**Base produit :** `main@957438c8f522b9e342158a17a7a4a6aa4bd7d3a2`

## 1. Autorité

~~~text
Git/code/DB
→ tests et Core Gates réellement exécutés
→ contrats métier validés
→ Core réellement intégré
→ dette active
→ présente reprise
~~~

## 2. Provenance Core de l’upgrade

Le produit reste basé sur la release stable :

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
~~~

Le tag `v1.2.1` n’est pas déplacé. Le champ `commit` trace explicitement le descendant post-tag réellement intégré.

Commit de merge Core dans la branche produit :

~~~text
dfc14c1c5b49f4f4893a421c905ddb409a792e2d
parents :
- 957438c8f522b9e342158a17a7a4a6aa4bd7d3a2
- 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
~~~

L’historique Core réel est donc conservé.

## 3. Contenu de l’upgrade Core

Le delta intégré est générique et frontend / Design System :

- `ToggleGroup` Base UI ;
- `SegmentedControl` réutilisable ;
- variante `Button warning` ;
- primitive partagée `NavigationQuickAccess` ;
- `WorkspaceQuickAccess` dans la topbar Workspace ;
- factorisation des helpers de navigation Workspace ;
- unification de l’accès rapide Platform sur la primitive partagée ;
- retrait du widget générique de résumé d’abonnement du Dashboard Workspace ;
- documentation Core dérivée et guidelines frontend associées.

Aucune migration MongoDB nouvelle n’est introduite par ce delta.

## 4. Conflits et résolution

Le merge Git réel depuis `upstream-core` a produit un seul conflit manuel :

~~~text
docs/REPRISE-CURRENT.md
~~~

La reprise Produit a été conservée puis remplacée par le présent état courant.

Les fichiers suivants ont été auto-fusionnés puis contrôlés :

~~~text
frontend/src/features/workspace/components/workspace-sidebar.jsx
frontend/src/features/workspace/components/workspace-topbar.jsx
frontend/src/features/workspace/components/workspace-topbar.test.jsx
~~~

Les adaptations Produit conservées comprennent notamment l’identité visuelle du SaaS et la hauteur `h-16` de la topbar Workspace ; les nouvelles primitives Core et `WorkspaceQuickAccess` sont intégrées.

## 5. État de M-004 pendant l’upgrade

Le développement métier M-004 est volontairement suspendu pendant cette intégration Core.

Branche à reprendre après merge Core :

~~~text
feature/m004-valuation-ux-stabilization
HEAD avant pause = 7f503333271554595ec4b6c6ff46654ab9e3d4d4
~~~

Travail M-004 déjà cadré avant la pause :

- header de Fiche harmonisé : retour devant le titre, badges sous le titre, libellé `Retour vers Dossiers` ;
- TVA V1 limitée à `5,5 %` / `10 %`, défaut `5,5 %`, valeurs pilotées par metadata backend ;
- Marge sur coût de fabrication HT calculée par unité de vente et sur la production ;
- écart à la marge cible exposé en points et en euros ;
- plancher économique conservé comme seuil de diagnostic, sans masquer une situation déficitaire ;
- besoin UX validé de graphiques utilisant les couleurs de palette ;
- diagnostic marge attendu : success si cible atteinte/dépassée, warning si marge positive sous cible, destructive si marge sur coût de fabrication négative ;
- infobulles métier des sigles à piloter depuis les metadata backend ;
- feedback de remplacement Produit à renforcer ;
- bouton Annuler à basculer sur la variante Core `warning` ;
- TVA à rendre avec le nouveau `SegmentedControl` Core ;
- `WorkspaceQuickAccess` désormais fourni par le Core, donc aucune duplication métier à créer.

## 6. Validation de l’upgrade Core

La gate canonique de la PR produit est :

~~~text
npm run release:check
~~~

Elle couvre :

- `release:verify` ;
- lint backend/scripts/e2e ;
- tests backend ;
- lint frontend ;
- tests frontend ;
- build frontend ;
- E2E Playwright.

Aucun résultat vert n’est présumé dans cette reprise avant retour réel de la Core Gate.

## 7. Séquence de sortie

~~~text
documentation / provenance
→ PR unique core-update → main
→ Core Gate PR
→ merge unique après validation utilisateur
→ Core Gate post-merge
→ mise à jour finale de la reprise
→ retour sur M-004
~~~

Ne pas reprendre M-004 avant la clôture de ce bloc Core.
