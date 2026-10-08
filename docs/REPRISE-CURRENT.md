# Reprise courante — M-005 Atelier d’optimisation des Fiches techniques

**Date : 2026-10-08**  
**Branche : `feature/m005-technical-sheet-optimizer-v1`**  
**État Git vérifié : branche en avance sur `main`, aucune PR/merge M-005 à réaliser avant validation utilisateur.**

## 1. Point de départ

M-001 à M-004 constituent les fondations métier déjà intégrées. M-005 réutilise strictement :

- M-002 pour les Références Produit et les rendements ;
- M-003 pour les Articles fournisseur et les Prix applicables contextualisés par Dossier ;
- M-004 pour la composition, les calculs, la valorisation, la concurrence optimiste, les snapshots validés et le cycle DRAFT / VALIDATED.

Core intégré :

~~~text
v1.2.1
commit 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
~~~

Aucune évolution Core n’est requise par M-005.

## 1.1 Recadrage UX validé le 2026-10-07

La QA a invalidé le contrôle à cinq ancres de %CM. La direction désormais contractuelle est :

```text
profil économique global = instantané de toute la Fiche
1 point = 1 ingrédient
x = ajustement économique local
y = contribution au coût matière de la projection
```

Le profil n’est pas une fonction continue et n’interpole rien entre ingrédients.

Le réglage principal est local à la ligne via `economicAdjustmentPercent`. Le backend traduit cette intention en quantité, applique les garde-fous et revalorise avec M-004.

Desktop :

```text
Fiche simulée dominante à gauche
→ KPI économiques compacts au-dessus
→ drawer de pilotage large à droite
   → profil global toujours visible
   → Manuel / Auto
   → bandeau horizontal d’outils
   → inspecteur dynamique
   → actions fixes
```

Outils : Réglage, Produit, Approvisionnement, Contraintes.

Objectif UX : pas de scroll documentaire de la page Atelier sur desktop ; seule la liste de lignes peut disposer de son propre viewport lorsque la recette dépasse la hauteur disponible.

## 1.2 Recadrage UX QA du 2026-10-08

Le second passage QA conserve la Fiche à gauche et le drawer à droite, mais compacte fortement le panneau :

```text
Profil économique + [Manuel | Auto]
→ spectre coloré compact
→ icônes outils seules avec tooltip
→ grande zone contextuelle
→ actions sur une seule rangée
```

Le sous-titre explicatif du profil disparaît. `%CM` devient le libellé de l’axe Y. Réduction / Référence / Augmentation portent une aide contextuelle. Les termes de qualité ou de valeur ne sont pas utilisés car M-005 ne calcule aucun score de qualité.

Le profil adopte une esthétique de spectre/histogramme : une trace indépendante par ingrédient, avec un sommet positionné sur les vraies coordonnées `ajustement / %CM`. Aucun ingrédient n’est relié à un autre.

La plage libre par défaut reste `-99 % → +100 %`, soit presque zéro à deux fois la quantité de référence. Aucun min/max n’est inventé. L’ancien état non verrouillé `min = max = référence` est neutralisé ; le verrouillage explicite passe uniquement par `locked`.

## 1.3 Ajustements QA du 2026-10-08 — lisibilité

Le profil à courbes décoratives est remplacé par des barres horizontales indépendantes, ancrées sur Référence et positionnées verticalement par %CM. La couleur change selon réduction / augmentation. Le détail au survol est docké hors de la zone de tracé : il reste dans le panneau mais ne masque plus les barres ni leurs poignées.

Un indicateur économique global est ajouté sous l’axe. Il ne fait pas la moyenne des ajustements de lignes : il reprend directement `savings.percent` calculé par le backend sur le Coût de fabrication HT. Centre = référence, gauche = économie, droite = surcoût.

Autres ajustements :

- en-tête Atelier sur une ligne ;
- colonne « QT nette » ;
- suppression de « Lecture résultat simulé » ;
- min/max : champs uniquement numériques ou vides, explications dans les aides `(i)` ;
- KPI dynamique : Économie estimée / Surcoût estimé / Écart estimé selon le signe de `before - after`.

## 2. Contrats canoniques M-005

~~~text
docs/m005/M-005-FINAL-CONTRACT.md
docs/m005/M-005-TECHNICAL-DESIGN.md
~~~

Décisions structurantes :

- feature commerciale dédiée : `technical_sheet_optimizer` ;
- baseline/Free : feature absente par défaut ;
- aucun quota de simulation V1 ;
- RBAC : `technical-sheet:update` pour l’Atelier et `technical-sheet:sourcing:manage` pour changer explicitement d’Article ;
- simulation exclusivement sur le DRAFT courant ;
- aucune mutation avant `Appliquer au brouillon` ;
- `TechnicalSheetValidation` reste immuable ;
- min/max/verrouillage persistés sur les lignes du DRAFT et snapshottés lors de la validation ;
- %CM = part relative du Coût Matière, jamais composition physique ;
- l’ajustement M-005 est porté par chaque ligne Ingrédient ; l’ancien contrôle à cinq ancres est abandonné ;
- à Produit/prix/rendement constants, la variation de coût se traduit directement en variation proportionnelle de quantité ;
- min/max sont des garde-fous facultatifs et leur absence ne neutralise pas l’ajustement local ;
- aucune compensation physique obligatoire lors d’une réduction de quantité ;
- alternative Produit V1 = même `CanonicalProduct`, même `referenceUnit`, Référence ACTIVE et visible dans le Workspace ;
- alternative d’approvisionnement = même Référence Produit, Article revalorisé avec le Prix applicable du Dossier courant ;
- mode Auto V1 = meilleur prochain mouvement élémentaire économiquement favorable, sans score de goût ni solveur opaque.

## 3. Backend implémenté

Fichiers principaux :

~~~text
backend/modules/technicalSheet/technicalSheetOptimizer.registry.js
backend/modules/technicalSheet/technicalSheetOptimizer.validation.js
backend/modules/technicalSheet/technicalSheetOptimizerMath.service.js
backend/modules/technicalSheet/technicalSheetOptimizerAlternative.service.js
backend/modules/technicalSheet/technicalSheetOptimizerProjection.service.js
backend/modules/technicalSheet/technicalSheetOptimizerScenario.service.js
backend/modules/technicalSheet/technicalSheetOptimizerAuto.service.js
backend/modules/technicalSheet/technicalSheetOptimizer.service.js
~~~

Le service initial trop volumineux a été découpé par responsabilités :

~~~text
projection / contexte
→ chargement du DRAFT, valorisation fraîche, projection avant/après

scénario Manuel
→ ajustement local, contraintes, override local, substitutions, fingerprint

stratégie Auto
→ génération bornée des candidats et sélection du meilleur prochain mouvement

orchestration
→ contexte API, simulate, apply transactionnel
~~~

Routes :

~~~text
GET  /workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/optimization
POST /workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/optimization/simulate
POST /workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/optimization/apply
~~~

Sécurité des routes :

~~~text
authenticate
→ validation Zod
→ contexte Workspace
→ technical-sheet:update
→ access mode Workspace
→ feature technical_sheet_optimizer
→ contexte Dossier autorisé
→ Dossier opérationnel
~~~

Durcissements intégrés :

- fingerprint simulation recalculé lors de l’Apply, y compris après changement du Prix applicable ;
- `expectedRevision` obligatoire ;
- modification explicite d’Article protégée par `technical-sheet:sourcing:manage` et couverte par un test de refus ;
- plafond de 60 candidats élémentaires en Auto V1 ;
- Articles sans Prix applicable exclus des alternatives M-005 au lieu de faire échouer tout le contexte ;
- une édition M-004 normale de Produit/quantité réinitialise une ancienne enveloppe devenue incohérente ;
- aucune sélection automatique arbitraire de l’Article fournisseur le moins cher dans M-003.

## 4. Persistance et historique

`TechnicalSheetDraft.lines[].optimization` :

~~~text
minNetQuantity
maxNetQuantity
locked
~~~

La même enveloppe est ajoutée à `TechnicalSheetValidation.linesSnapshot[]`.

Effets :

- l’Apply M-005 écrit le DRAFT dans une transaction et incrémente sa révision ;
- la validation M-004 snapshotte ensuite l’enveloppe ;
- une nouvelle révision restaurée depuis une validation conserve les contraintes de recette ;
- une copie inter-Dossier conserve l’enveloppe de recette mais jamais les données économiques source.

Aucune nouvelle collection MongoDB M-005.

## 5. Frontend implémenté

Nouveaux éléments :

~~~text
frontend/src/features/technical-sheets/pages/technical-sheet-optimizer-page.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-route.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimization-profile.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-inspector.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-picker-dialog.jsx
frontend/src/features/technical-sheets/lib/technical-sheet-optimizer.js
~~~

Fonctions visibles :

- page Atelier dédiée ;
- bandeau économique avant / après avec état de recalcul ;
- profil économique global à points, un point par ingrédient, utilisé comme instantané de la simulation ;
- Fiche technique simulée comme surface principale avec barres de contribution ;
- panneau droit largeur drawer avec profil toujours visible, bandeau horizontal d’outils et inspecteur dynamique ;
- réglages en Sheet sur petit écran ;
- garde-fous quantité facultatifs ;
- calques Produit / rendement et approvisionnement ;
- bornes min/max ;
- verrouillage ;
- override local ;
- alternatives Produit ;
- alternatives d’approvisionnement selon permission ;
- modes Manuel / Auto ;
- Réinitialiser / Comparer / Appliquer au brouillon ;
- reprise d’une suggestion Auto en Manuel.

Entrées UX :

~~~text
Fiche technique
→ bouton Optimiser

Dossier → Fiches techniques
→ action Optimiser sur une ligne
→ bouton Atelier d’optimisation + sélecteur de Fiche

Sidebar Workspace → Dossiers
→ Atelier d’optimisation (baguette magique)
→ sélection Dossier
→ sélection Fiche
~~~

Une Fiche validée sans DRAFT passe d’abord par le workflow M-004 de création d’un nouveau brouillon.

## 6. Tests ajoutés

Backend :

~~~text
backend/tests/modules/technicalSheet/technicalSheetOptimizerMath.test.js
backend/tests/modules/technicalSheet/technicalSheetOptimizer.integration.test.js
backend/tests/modules/technicalSheet/technicalSheetOptimizer.http.test.js
backend/tests/plans/applicationCapability.registry.test.js
~~~

Frontend :

~~~text
frontend/src/features/technical-sheets/api/technical-sheets-api.test.js
frontend/src/features/technical-sheets/pages/technical-sheet-optimizer-page.test.jsx
frontend/src/features/technical-sheets/components/technical-sheet-control-panel.test.jsx
frontend/src/features/technical-sheets/components/technical-sheet-optimizer-route.test.jsx
frontend/src/app/application-routes.test.js
~~~

E2E :

~~~text
e2e/tests/technical-sheets-m005-optimizer.spec.js
~~~

Le scénario E2E vérifie notamment :

~~~text
simulation
→ avant/après visible
→ aucun changement persistant après reload

puis Apply
→ retour Fiche
→ quantité réellement modifiée dans le DRAFT
~~~

Les tests ajoutés n’ont pas été exécutés à distance. Aucun statut vert n’est revendiqué.

## 7. État de validation

État actuel :

~~~text
cadrage M-005
→ fait

implémentation backend
→ faite

implémentation frontend
→ faite

tests ajoutés
→ faits

revue statique manuelle
→ faite ; derniers durcissements intégrés

tests locaux utilisateur
→ à faire

QA visuelle utilisateur
→ à faire

PR
→ interdite avant validation utilisateur

merge
→ interdit avant validation utilisateur
~~~

## 8. Ordre de reprise immédiat

1. récupérer la branche localement ;
2. lancer les tests M-005 ciblés ;
3. corriger les éventuels échecs sur cette même branche ;
4. lancer les gates globales applicables ;
5. lancer l’application avec `npm run dev` et le frontend ;
6. effectuer la QA visuelle de l’Atelier ;
7. seulement après validation explicite de l’utilisateur : PR unique puis merge unique réalisés par l’utilisateur.

Ne pas créer de micro-version, de PR intermédiaire ou de merge technique pour corriger un test.


### Ajustements QA du 2026-10-08 — compacité et repérage

- Chaque ingrédient conserve une teinte déterministe à partir de son identifiant de ligne ; la teinte s'assombrit proportionnellement à la distance de la référence, dans chaque direction. La couleur ne constitue pas une évaluation qualitative.
- La zone SVG est compactée et les trois aides d'axe ont une typographie identique.
- L'indicateur de coût global conserve son calcul serveur ; son titre « Impact global » est positionné à gauche de la barre sur deux lignes.
- « Réinitialiser » est désormais à côté de Manuel / Auto ; le pied ne conserve que « Comparer » et « Appliquer au brouillon ».


## 1.5 QA du 2026-10-08 — cohérence entre profil et Fiche

- Le repère de couleur de chaque ingrédient dans la Fiche utilise le même helper par lineId que la poignée du profil. Les teintes restent stables indépendamment de l’ordre de présentation.
- Le titre et le surtitre redondants disparaissent du header interne du tableau ; Production et Portions y restent visibles, ainsi que le bouton mobile Réglages.
- Un badge « Simulation en cours » accompagne le titre principal de l’Atelier.
- Le bandeau est renommé « Impacts économiques ».
- Dans l’indicateur global, le libellé est centré verticalement avec la barre. La mention « Référence économique » n’est plus affichée en état neutre ; le libellé accessible « Aucun écart » reste disponible.
