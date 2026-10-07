# M-005 — Design technique — Atelier d’optimisation

**Date : 2026-10-07**  
**Contrat : `docs/m005/M-005-FINAL-CONTRACT.md`**

## 1. Décision d’architecture

M-005 reste un sous-module de `technicalSheet`. Aucun nouveau bounded context, catalogue ou aggregate Mongo autonome n’est créé.

Flux :

```text
TechnicalSheetDraft
→ technicalSheetOptimizer.service
→ buildTechnicalSheetValuation (M-004)
→ resolveApplicablePrice (M-003)
→ réponse de simulation
→ apply transactionnel sur le même Draft
```

## 2. Persistance

Extension de la sous-structure de ligne du DRAFT :

```js
optimization: {
    minNetQuantity: Decimal128 | null,
    maxNetQuantity: Decimal128 | null,
    locked: Boolean
}
```

Le même triplet est ajouté au snapshot de ligne `TechnicalSheetValidation`.

Aucune collection `OptimizationSimulation` n’est créée.

## 3. Capability

`TECHNICAL_SHEET_FEATURE.OPTIMIZER = 'technical_sheet_optimizer'`

Le descriptor est ajouté à `technicalSheetCapability.registry.js`.

Aucune métrique n’est ajoutée et aucune migration de limite n’est nécessaire.

Le seed baseline conserve `features: []`; l’activation commerciale est réalisée par les Plans/dérogations existants.

## 4. RBAC

Les routes M-005 utilisent `technical-sheet:update`.

La sélection d’un Article fournisseur différent est revérifiée dans le service à partir des permissions déjà résolues et exige `technical-sheet:sourcing:manage`.

Aucune permission nouvelle.

## 5. API

Sous le router Dossier M-004 existant :

```text
GET  /:technicalSheetId/optimization
POST /:technicalSheetId/optimization/simulate
POST /:technicalSheetId/optimization/apply
```

Les trois routes exigent :

```text
authenticate
→ validateRequest
→ loadWorkspaceContext
→ authorizePermission(technical-sheet:update)
→ enforceWorkspaceAccessMode
→ enforcePlanFeature(technical_sheet_optimizer)
→ loadAuthorizedDossierContext
→ enforceTechnicalSheetDossierOperational
```

### GET context

Retourne le DRAFT courant, une valorisation fraîche, les contraintes et les alternatives admissibles.

Une valorisation de référence incomplète provoque un 409 explicite : l’utilisateur doit d’abord résoudre l’approvisionnement/valorisation dans M-004.

### POST simulate

Entrée :

```text
expectedRevision
mode MANUAL | AUTO
curve
lineIntents
autoOptions
```

Aucune valeur de coût/marge/%CM n’est acceptée.

### POST apply

Même intention + `simulationFingerprint`.

La réponse renvoie le DRAFT M-004 sérialisé après application.

## 6. Intentions de ligne

Une intention contient :

```text
lineId
minNetQuantity
maxNetQuantity
locked
localNetQuantity|null
productVariantId|null
supplierArticleId|null
```

Le serveur recharge toujours la ligne réelle à partir de `lineId`.

Le client ne fournit ni unité autoritative, ni rendement, ni prix, ni coût.

## 7. Courbe

Ancrages fixes :

```text
0 / 25 / 50 / 75 / 100 %CM
```

La pression est un entier entre -100 et 100.

L’interpolation et les quantités utilisent les fractions rationnelles déjà disponibles dans `technicalSheetMath.service.js`. Les flottants JavaScript ne deviennent pas l’autorité d’un calcul métier.

## 8. Alternatives Produit

Le service charge la Référence courante et ses candidates par :

```text
same canonicalProduct
+ same referenceUnit
+ ACTIVE
+ identityActive
+ visibilité de gouvernance Workspace
```

Cette règle appartient à M-005 et ne modifie pas la recherche normale M-002.

## 9. Alternatives Article

`supplierPricing.service.js` expose une primitive de lecture explicite des Articles utilisables pour une Référence.

Cette primitive réutilise :

- `visibleArticleFilter` ;
- statuts Fournisseur/Article ;
- visibilité Workspace.

Chaque Article proposé est ensuite évalué par `resolveApplicablePrice({ workspaceId, dossierId, articleId })`.

Le comportement normal `resolveSupplierArticle` reste inchangé.

## 10. Simulation MANUAL

Ordre :

1. DRAFT réel ;
2. contraintes ;
3. substitution Produit ;
4. substitution Article ;
5. courbe globale sur les lignes Ingrédient non verrouillées ;
6. override local ;
7. `buildTechnicalSheetValuation` ;
8. projection avant/après ;
9. fingerprint.

Le coût de référence est lui aussi recalculé fraîchement au début de la requête.

## 11. Simulation AUTO

V1 construit des transformations élémentaires candidates :

- 25 % du chemin de la quantité de référence vers `qMin` ;
- une alternative Produit admissible ;
- un autre Article fournisseur admissible.

Chaque candidat repasse dans le moteur M-004.

Sont éliminés :

- scénario incomplet ;
- scénario plus cher ou économiquement identique ;
- candidat hors contraintes ;
- candidat inaccessible au Workspace/Dossier.

Le meilleur gain de CF HT est retenu ; égalité : moindre déformation, puis identifiant stable.

La réponse contient aussi la transformation retenue afin que React puisse la convertir en état Manuel sans recalcul local.

## 12. Fingerprint et concurrence

Le fingerprint M-005 est construit depuis :

```text
draft revision
+ valuation fingerprint baseline fraîche
+ normalized intent
+ valuation fingerprint scénario
```

`apply` recalcule ce fingerprint dans sa transaction.

Si :

- le DRAFT a changé ;
- une source tarifaire a changé ;
- un Article n’est plus disponible ;
- une Référence n’est plus admissible ;

alors l’application est refusée avec 409.

## 13. Apply transactionnel

Dans une transaction MongoDB :

1. assert Dossier opérationnel ;
2. charger Fiche ACTIVE ;
3. charger DRAFT avec `expectedRevision` ;
4. reconstruire le scénario ;
5. vérifier le fingerprint ;
6. persister les lignes revalorisées + contraintes ;
7. persister `valuationStatus`, `valuedAt`, fingerprint M-004 et snapshot économique ;
8. incrémenter la révision ;
9. écrire l’événement `TECHNICAL_SHEET_OPTIMIZATION_APPLIED`.

## 14. Snapshots et copie

`buildValidationLines` inclut l’enveloppe d’optimisation.

`createDraftFromValidatedState` la restaure.

`copyTechnicalSheet` copie l’enveloppe de recette mais continue de supprimer sourcing et valorisation, puis revalorise dans le Dossier cible.

## 15. Frontend

Nouveaux éléments sous `frontend/src/features/technical-sheets/` :

```text
pages/technical-sheet-optimizer-page.jsx
components/technical-sheet-optimization-curve.jsx
components/technical-sheet-optimizer-inspector.jsx
components/technical-sheet-optimizer-picker-dialog.jsx
lib/technical-sheet-optimizer.js
```

RTK Query ajoute :

```text
getTechnicalSheetOptimization
simulateTechnicalSheetOptimization
applyTechnicalSheetOptimization
```

État de simulation : local React. Aucun slice Redux global.

## 16. Réactivité

Les changements de courbe/inspecteur sont debounce côté React.

Un compteur de requête permet d’ignorer une réponse plus ancienne qu’une intention déjà envoyée.

Le SVG de courbe fournit :

- pointer events souris/tactile ;
- focus clavier sur les points ;
- flèches haut/bas pour modifier la pression ;
- sliders numériques équivalents sous la courbe.

## 17. Entrées UX

Liste Fiches :

```text
Voir | Modifier | Optimiser | Exporter
```

Poste de travail Fiche : bouton `Optimiser` dans le panneau de contrôle.

Page Dossier/Fiches : bouton `Atelier d’optimisation` ouvrant un sélecteur de Fiche.

Une Fiche validée sans DRAFT passe d’abord par `POST /:id/draft`, puis l’Atelier est ouvert.

## 18. Tests

Créer des tests M-005 dédiés plutôt que gonfler artificiellement les tests M-004 :

```text
backend/tests/modules/technicalSheet/technicalSheetOptimizer.integration.test.js
backend/tests/modules/technicalSheet/technicalSheetOptimizer.http.test.js
frontend/.../technical-sheet-optimizer-page.test.jsx
```

Compléter les tests API/routes et un scénario Playwright critique dans un fichier M-005 dédié.

Aucun test n’est annoncé vert sans exécution locale.
