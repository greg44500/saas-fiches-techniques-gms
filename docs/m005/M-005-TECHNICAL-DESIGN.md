# M-005 — Design technique — Atelier d’optimisation

**Date : 2026-10-07**  
**Contrat : `docs/m005/M-005-FINAL-CONTRACT.md`**

## 1. Décision d’architecture

M-005 reste un sous-module de `technicalSheet`. Aucun nouveau bounded context, catalogue ou aggregate Mongo autonome n’est créé.

Flux :

```text
TechnicalSheetDraft
→ technicalSheetOptimizerProjection.service
→ technicalSheetOptimizerScenario.service / technicalSheetOptimizerAuto.service
→ technicalSheetOptimizer.service (orchestration)
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

Retourne le DRAFT courant, une valorisation fraîche, la plage autorisée d’ajustement économique, les contraintes et les alternatives admissibles.

L’ancien payload `curvePoints / neutralCurve` disparaît : le profil global est construit à partir des projections de lignes et des intentions locales.

Une valorisation de référence incomplète provoque un 409 explicite : l’utilisateur doit d’abord résoudre l’approvisionnement/valorisation dans M-004.

### POST simulate

Entrée :

```text
expectedRevision
mode MANUAL | AUTO
lines
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
economicAdjustmentPercent
minNetQuantity
maxNetQuantity
locked
localNetQuantity|null
productVariantId|null
supplierArticleId|null
```

`economicAdjustmentPercent` est un entier borné par la plage M-005. Il vaut `0` par défaut.

Le serveur recharge toujours la ligne réelle à partir de `lineId`.

Le client ne fournit ni unité autoritative, ni rendement, ni prix, ni coût.

## 7. Profil économique

Le composant historique de courbe à cinq ancres est remplacé par un profil de points par ingrédient.

Données du profil :

```text
x = economicAdjustmentPercent
y = materialCostSharePercent de la projection affichée
point = lineId
```

Le point sélectionné est synchronisé avec la ligne de la Fiche et l’inspecteur.

Le profil n’interpole rien entre deux ingrédients. Toute ligne éventuellement dessinée entre des points est interdite si elle suggère une continuité mathématique.

Interaction directe :

- clic/focus → sélection ;
- déplacement horizontal → mise à jour de `economicAdjustmentPercent` ;
- clavier gauche/droite → modification par pas déterministe ;
- tooltip → avant/après de la ligne.

Le calcul de quantité reste côté backend via l’arithmétique rationnelle M-005.

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
5. traduction de `economicAdjustmentPercent` en quantité par le backend ;
6. application des garde-fous facultatifs ;
7. override local éventuel, prioritaire ;
8. `buildTechnicalSheetValuation` ;
9. projection avant/après ;
10. fingerprint.

Le coût de référence est lui aussi recalculé fraîchement au début de la requête.

## 11. Simulation AUTO

V1 construit des transformations élémentaires candidates :

- 25 % du chemin de la quantité de référence vers `qMin` ;
- une alternative Produit admissible ;
- un autre Article fournisseur admissible.

La génération est bornée à 60 candidats élémentaires par simulation Auto afin de conserver un coût serveur maîtrisé.

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

Éléments M-005 sous `frontend/src/features/technical-sheets/` :

```text
pages/technical-sheet-optimizer-page.jsx
components/technical-sheet-optimization-profile.jsx
components/technical-sheet-optimizer-controls-panel.jsx
components/technical-sheet-optimizer-inspector.jsx
components/technical-sheet-optimizer-recipe-preview.jsx
components/technical-sheet-optimizer-picker-dialog.jsx
lib/technical-sheet-optimizer.js
```

RTK Query conserve :

```text
getTechnicalSheetOptimization
simulateTechnicalSheetOptimization
applyTechnicalSheetOptimization
```

État de simulation : local React. Aucun slice Redux global.

Desktop :

- shell Atelier borné à la hauteur du viewport ;
- colonne gauche dominante : indicateurs économiques compacts puis Fiche technique simulée ;
- colonne droite `minmax(32rem, 36rem)`, alignée sur la largeur d’un drawer de détail ;
- profil économique global intégré en tête du panneau droit et toujours visible ;
- choix Manuel / Auto sous le profil ;
- bandeau horizontal d’outils ;
- contenu contextuel seul scrollable si nécessaire ;
- actions de scénario fixées en pied du panneau.

L’inspecteur possède un état local `activeTool` :

```text
ADJUSTMENT
PRODUCT
SOURCING
CONSTRAINTS
```

Le changement d’outil ne modifie ni route, ni ingrédient sélectionné, ni scénario.

La Fiche simulée réemploie le vocabulaire visuel M-004 : Produit, quantité nette, unité, PU HT, coût HT et %CM. Elle reste une projection en lecture seule ; les intentions de réglage sont pilotées depuis le panneau droit.

Les champs décimaux optionnels sont normalisés côté frontend. Tant qu’une saisie transitoire n’est pas un décimal strictement positif complet, `buildOptimizationRequest` ne produit pas de payload et aucune requête de simulation n’est envoyée.

Petit écran : le même panneau de pilotage, profil compris, est rendu dans la Sheet existante.

## 16. Réactivité

Les changements d’ajustement/inspecteur sont debounce côté React.

Un compteur de requête permet d’ignorer une réponse plus ancienne qu’une intention déjà envoyée.

L’interface expose explicitement les états « Recalcul en cours », « Simulation à jour » et « Simulation à vérifier ». Une erreur de recalcul automatique conserve le dernier résultat valide au lieu de revenir silencieusement aux valeurs de référence.

Le slider et le point du profil modifient la même propriété `economicAdjustmentPercent`. Il n’existe qu’une seule source d’intention locale côté frontend.

Le profil utilise les valeurs économiques retournées par le serveur. Aucun coût, aucune marge et aucun %CM autoritatif ne sont recalculés dans React.

## 17. Entrées UX

Liste Fiches :

```text
Voir | Modifier | Optimiser | Exporter
```

Toutes les actions « Optimiser / Atelier d’optimisation » utilisent l’icône baguette magique.

Poste de travail Fiche : bouton `Optimiser` dans le panneau de contrôle.

Page Dossier/Fiches : bouton `Atelier d’optimisation` ouvrant un sélecteur de Fiche.

Sidebar Workspace, groupe Dossiers : entrée `Atelier d’optimisation` vers `technical-sheets/optimization`. Cette surface sélectionne d’abord le Dossier actif puis la Fiche active, avant d’ouvrir la route Dossier canonique.

Une Fiche validée sans DRAFT passe d’abord par `POST /:id/draft`, puis l’Atelier est ouvert.

## 18. Découpage de maintenance

Le moteur backend est volontairement réparti par responsabilité :

```text
technicalSheetOptimizerProjection.service.js
→ chargement, valorisation fraîche et projection des données

technicalSheetOptimizerScenario.service.js
→ scénario Manuel, transformations et fingerprint

technicalSheetOptimizerAuto.service.js
→ génération bornée et classement des candidats Auto

technicalSheetOptimizerAlternative.service.js
→ alternatives Produit et approvisionnement

technicalSheetOptimizerMath.service.js
→ bornes, ajustement proportionnel et arithmétique rationnelle

technicalSheetOptimizer.service.js
→ orchestration des routes context / simulate / apply
```

Ce découpage évite de concentrer le module dans un service monolithique et laisse M-004/M-003 comme autorités de calcul et de prix.

## 19. Tests

Créer des tests M-005 dédiés plutôt que gonfler artificiellement les tests M-004 :

```text
backend/tests/modules/technicalSheet/technicalSheetOptimizer.integration.test.js
backend/tests/modules/technicalSheet/technicalSheetOptimizer.http.test.js
frontend/.../technical-sheet-optimizer-page.test.jsx
```

Compléter les tests API/routes et un scénario Playwright critique dans un fichier M-005 dédié.

Aucun test n’est annoncé vert sans exécution locale.
