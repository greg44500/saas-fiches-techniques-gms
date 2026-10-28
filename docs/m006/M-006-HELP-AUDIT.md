# M-006 — Audit du centre d’aide utilisateur

**Date :** 2026-10-28  
**Périmètre :** application `saas-fiches-techniques-gms`, branche `feature/m006-help-center`.  
**Références Git :** PR #51 et PR #52 fusionnées, Core v1.2.1 dans `core-origin.json`.  
**Statut actualisé :** Core Gate #238 réussie sur le lot d'aide initial ; le Core aligné par PR #54 est dans main (Core Gate #241 verte). Le commit combiné doit être à nouveau testé, et la QA manuelle reste nécessaire. Les mentions de non-exécution ci-dessous sont historiques.

## 1. Architecture et inventaire

Le Core gère les schémas d'aide, la composition, l'affichage et la recherche, le filtrage par permissions et capabilities et l'accès normal/remédiation. Le point d'extension produit est `backend/config/applicationHelp.registry.js` : il compose explicitement les registres métier avec les fiches génériques du Core. Les données du catalogue sont filtrées côté serveur avant de parvenir à l'interface.

Inventaire des modules enregistrés après le lot :

| Module | Contexte | Procédures |
| --- | --- | ---: |
| Core | Workspace et Platform | 33 |
| Dossiers M-001 | Workspace | 2 |
| Gestion des référentiels | Platform | 0 (catégorie de regroupement) |
| Produits M-002 | Workspace et Platform | 4 |
| Fournisseurs M-003 | Workspace et Platform | 4 |
| Fiches techniques M-004, avec accès M-005 | Workspace | 10 |
| Fiches process M-006 | Workspace | 9 |
| **Total** | | **62** |

Les neuf catégories Workspace (quatre Core, cinq métier) restent sous la limite contractuelle de dix. Le corpus Platform conserve six catégories. Aucune catégorie ou primitive Core nouvelle n'est nécessaire.

Les dix aides M-004 existantes couvrent création, calculs, validation, lecture, export, optimisation M-005, copie, corbeille, restauration et purge. L'audit de ce lot n'a pas donné lieu à une réécriture générale de ces fiches. Le point manquant était l'absence d'aide M-006.

## 2. Sources fonctionnelles vérifiées

- Consultation, recherche et création : `frontend/src/features/process-sheets/pages/process-sheets-page.jsx`, `process-sheet-create-dialog.jsx`, `processSheet.service.js`.
- Actions de ligne : `process-sheet-row-actions.jsx` ; la suppression autonome est visiblement désactivée.
- Ateliers et édition : `process-sheet-draft-editor.jsx`, `process-sheet-phase-tree.jsx`, `process-sheet-editor-fields.jsx`, `process-step-details-dialog.jsx`.
- Intitulés partagés : `process-phase-picker.jsx` et `processPhaseTitles.routes.js`.
- Suivi des ingrédients : `process-ingredient-rail.jsx`.
- Panneau de contrôle : `process-sheet-control-panel.jsx` ; export PDF présent mais désactivé.
- Validation, réconciliation et statut : `processSheetValidation.service.js`, `processSheetDraft.service.js`, `processSheetReconciliation.service.js`.
- Autorisation effective : `processSheet.routes.js`, `processSheetPermission.registry.js`, `help.registry.js`, `help.service.js`.

## 3. Procédures produites

| Identifiant (suffixe) | Parcours utilisateur | Permissions du catalogue |
| --- | --- | --- |
| `read` | Retrouver, consulter, prévisualiser | `process-sheet:read` |
| `create` | Créer depuis une Fiche technique éligible | `process-sheet:read`, `process-sheet:create`, `technical-sheet:read` |
| `organize` | Organiser phases, étapes et instructions | `process-sheet:read`, `process-sheet:edit` |
| `phase_titles` | Choisir et créer un intitulé de phase | `process-sheet:read`, `process-sheet:edit` |
| `ingredients` | Associer les occurrences d'ingrédients | `process-sheet:read`, `process-sheet:edit` |
| `save` | Enregistrer et traiter un conflit | `process-sheet:read`, `process-sheet:edit` |
| `validate` | Valider ou revalider | `process-sheet:read`, `process-sheet:validate` |
| `reconcile` | Actualiser l'identité des ingrédients | `process-sheet:read`, `process-sheet:edit`, `process-sheet:validate` |
| `states` | Comprendre statuts et actions indisponibles | `process-sheet:read` |

Les permissions du catalogue sont nécessaires pour afficher une procédure, mais ne remplacent pas les contrôles de Dossier ni les guards des actions métier. Aucune feature commerciale spécifique n'est inventée : le catalogue applique les permissions et le mode d'accès du Core ; les routes métier restent autoritatives.

Le contenu distingue :
- les modifications locales de l'enregistrement manuel ;
- l'état Brouillon/Validée de la mention Enregistré ;
- les occurrences distinctes d'ingrédient et l'avertissement non bloquant ;
- les changements d'identité nécessitant une réconciliation des changements économiques neutres ;
- les versions M-004 immuables de l'absence d'historique métier M-006.

Les modèles de phases/étapes des bibliothèques internes ne sont pas annoncés comme un parcours de gestion autonome dans cette interface : seul le sélecteur d'intitulés est documenté comme action vérifiée. Une évolution d'une bibliothèque n'actualise pas un process existant.

## 4. Exclusions et risques contrôlés

Aucune procédure ne présente comme fonctionnels : export PDF M-006, suppression autonome, images, galerie, infographie, assistant IA ou diffusion. Aucune modification du Core, des schémas Mongoose, des services de fabrication, des API, de la tenancy ou des permissions.

**Tests ajoutés :** composition du registre, unicité et relations, permissions effectives, masquage des fiches interdites et des liens, refus 404, mode remédiation, règles éditoriales sensibles, recherche RTL et affichage/navigation RTL.

**Gates à exécuter sur une copie locale du dépôt (Node conforme, MongoDB selon les suites) :**

```powershell
npx vitest run backend/tests/help
npm --prefix frontend run test -- src/features/help/components
npm --prefix frontend run lint
npm --prefix frontend run build
npm run release:check
```

Compléter par une recette réelle sur un Workspace : lecture seule, édition, validation seule, Dossier non accessible, remédiation, navigation entre fiches, clavier et mobile. Aucune réussite de ces tests n'est présumée.

## 5. Suite

Une seule branche et une seule PR pour ce lot d'aide. Faire vérifier les gates, le diff et la QA avant merge. Ensuite seulement, traiter séparément la préparation au déploiement et les fonctionnalités M-006 différées.
