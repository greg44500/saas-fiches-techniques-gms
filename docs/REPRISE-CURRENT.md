# Reprise courante — M-005 fusionné ; audit de roadmap à engager

**Date : 2026-10-08**  
**Branche de référence : `main`**  
**M-005 : PR #39 fusionnée ; commit de merge `5d0a3d9692343d60ccfec0e46759383d595680dd` ; comparaison avec `main` : identique lors du contrôle documentaire.**

## État courant et prochaines actions

1. Vérifier le résultat de la Core Gate post-merge M-005 : preuve non obtenue lors de la présente révision (les recherches de runs/checks sur le commit de merge n'ont pas fourni de résultat exploitable). Ne pas déclarer cette gate verte sans preuve.
2. M-005 est intégré ; conserver ses contrats canoniques `docs/m005/M-005-FINAL-CONTRACT.md` et `docs/m005/M-005-TECHNICAL-DESIGN.md`. Ne pas rouvrir son développement sans anomalie démontrée.
3. Selon le retour fonctionnel du responsable produit du 2026-10-08, les exports CSV, XLSX et PDF sont déjà réalisés. Vérifier leur présence dans le code sans les redévelopper. Concentrer le prochain audit/cadrage sur les deux parcours restant à livrer au sein de M-004 (complément diffusion V1) : impression et envoi par e-mail. Le contrat M-004, section 37, porte explicitement ces cinq fonctions ; leur livraison avait été organisée en bloc séparé après la stabilisation des fiches. Ne pas numéroter automatiquement ce complément comme un nouveau module métier. Vérifier réutilisation des services, stockage, autorisations, capabilities, quotas, API, UI et tests.
4. Présenter les écarts prouvés et proposer un seul prochain lot métier, avec périmètre et critères d'acceptation à valider avant toute implémentation. Les Fiches process restent candidates ensuite.
5. Respecter « un lot cohérent → une branche → une PR → un merge ». L'utilisateur réalise les tests locaux et garde la validation des PR/merges.

## Archive de reprise M-005 (état antérieur à la fusion)

Les sections ci-dessous documentent le chantier et la QA avant fusion. Leurs formulations « branche active », « PR interdite » et « tests à faire » sont **historiques et ne décrivent plus l'état courant**. Pour le statut opérationnel, seule la section précédente fait foi.

---

# Archive — M-005 Atelier d’optimisation des Fiches techniques

**Date : 2026-10-08**  
**Branche : `feature/m005-technical-sheet-optimizer-v1`**  
**État historique au moment de la rédaction : branche en avance sur `main`, avant fusion de la PR #39.**

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


## QA palette par ingrédient — 2026-10-08

La palette par ligne INGREDIENT est attribuée une fois depuis l'ordre de la baseline, partagée entre le tableau et le graphique. Le repère du produit, la barre %CM et le profil ont la même couleur de base ; la couleur du graphique peut être renforcée près des extrêmes. Aucun usage de la couleur ne représente un score qualitatif. La palette boucle après dix ingrédients.


## Correctif QA — couleurs des ingrédients et barre %CM (2026-10-08)

Les ingrédients reçoivent des teintes distinctes depuis l'ordre de la baseline sans répétition cyclique de la palette de dix couleurs. Les mêmes teintes identifient les ingrédients dans les pastilles et dans le profil (avec foncement aux extrêmes). Les barres de `%CM` utilisent exclusivement `bg-primary/75`, couleur du thème de l’application, sans style de couleur injecté.


## QA E2E finale (2026-10-08)

- M-005 : la comparaison visuelle des quantités utilise désormais une valeur d'origine barrée et une valeur simulée contiguë, sans flèche ; E2E contrôle explicitement ces deux états et le rechargement non persistant.
- M-003 : l'inspection CSV nécessite toujours un vrai verdict ClamAV CLEAN. Le 503 FILE_INSPECTION_FAILED en environnement Windows signale un moteur indisponible ou en échec. Le runner E2E accepte `CLAMAV_BINARY_PATH` depuis l'environnement utilisateur (défaut `clamscan`). Aucun mock ni bypass antivirus n'est autorisé. Vérifier également les signatures locales ClamAV avant une nouvelle exécution E2E.

---

## Complément M-003 en cours — 2026-10-09

Branche unique : `feature/m003-catalog-management-and-import-ux`.
Lot « Importer une liste d'Articles fournisseur » implémenté côté modèle,
API, frontend Workspace/global et tests ajoutés. Fonctionnalité non validée
tant que le responsable produit n'a pas exécuté les tests locaux et la QA visuelle.

Invariants : fournisseur et référence normalisée ; produit M-002 facultatif
au stade import et obligatoire à l'usage économique ; déduplication au réimport ;
aucune édition Catalogue ou tarif créé par le flux Articles ; séparation stricte
GLOBAL_SHARED / WORKSPACE_PRIVATE. Tests à mener avec ClamAV fonctionnel et base
de test dédiée, migration M-003 des nouveaux indexes à exécuter sur l'environnement
de développement. Ne pas ouvrir de PR ni merger avant validation utilisateur.

---

## Reprise UX des imports — travail en attente de QA locale (2026-10-13)

Branche active : `feature/m003-catalog-management-and-import-ux`.
Complément UX implémenté pour les trois assistants d'import métier : Produits,
Articles fournisseur, Catalogues fournisseur. Stepper quatre étapes avec état
actif visuellement affirmé (bordure, couleur, typographie), coches d'étapes
terminées et `aria-current`; information métier en infobulle accessible ;
sélecteur de fichier francisé et formats acceptés ; footer commun ; récapitulatif
final visible pour les parcours Fournisseurs.

Les modifications sont frontend / tests / documentation, sans changement Core,
API ou modèle DB dans ce complément. Les suites de tests existantes et E2E M-003
ont été adaptées, avec nouveaux tests unitaires des composants d'import.
**Aucun test local ou gate n'est déclaré vert à cette étape.** L'utilisateur
exécute ensuite pull, lint, tests et QA visuelle sur Windows. Corriger les
éventuels échecs sur la même branche ; une seule PR finale après accord.


---

## Complément M-003 — création rapide d'un Fournisseur depuis les imports (2026-10-13)

Branche : `feature/m003-catalog-management-and-import-ux`.

- Les assistants d'import Articles fournisseur et Catalogues utilisent désormais un sélecteur partagé de Fournisseur avec recherche serveur par nom. Il évite de dépendre uniquement des cent premiers Fournisseurs chargés par la page.
- Lorsque l'utilisateur possède les droits de création de Fournisseur de la portée concernée (Workspace ou Application Global), il peut créer une fiche minimale par son nom et la sélectionner immédiatement, sans interrompre l'import.
- Les API existantes de création sont réutilisées, sans changement de modèle, de Core, de permissions ou de contrat d'import.
- La nouvelle identité reste respectivement WORKSPACE_PRIVATE ou GLOBAL_SHARED selon le contexte. La création globale reste réservée aux administrateurs habilités par Application Global.
- Aucun nouveau statut de validation n'a été introduit : le contrat actuel ne connaît que ACTIVE/ARCHIVED. Le workflow de vérification métier distinct (rôle du valideur, règles de disponibilité des Articles et prix, gestion des homonymes et éventuels blocages) doit faire l'objet d'une décision fonctionnelle et d'un avenant contractuel avant tout code.
- Le contrôle d'homonyme dans le sélecteur est une aide UX et non une garantie d'unicité serveur.
- Tests des dialogues et E2E adaptés ; tests nouveaux pour la sélection, les permissions et la création rapide. **Aucune exécution locale ni gate n'est déclarée verte**.

QA nécessaire : recherche d'un Fournisseur au-delà de la première page, sélection d'un fournisseur existant, création privée, création globale habilitée, refus sans droits, éventuelle homonymie, conservation du fichier et des correspondances, import confirmé, isolation Workspace, absence de régression.


### QA en cours — noms et doublons Fournisseurs (2026-10-13)

Demande produit : stocker et présenter les noms Fournisseurs en majuscules, rapprocher les noms proches et empêcher les doublons, y compris en dehors de l'import. Le code du service Fournisseurs a été adapté pour normaliser le nom et refuser les homonymes normalisés lors de la création ou du renommage, en tenant compte du global et du Workspace. Les deux formulaires de création concernés mettent désormais la saisie en majuscules.

**Non clôturé :**
- La détection phonétique/approchée et la décision explicite sur les rapprochements `TRANSGOURMET` / `TRANSGOURMETS` ne sont pas implémentées. Ne pas fusionner automatiquement ces deux identités.
- Aucune contrainte unique MongoDB n'a été activée : audit préalable des homonymes existants (y compris archives) et migration d'index requise pour garantir les écritures concurrentes.
- Les données historiques ne sont pas converties en majuscules.
- Les tests locaux de ces nouveaux changements ne sont pas exécutés ; la gate n'est pas vérifiée.
- Ne pas ouvrir de PR ou fusionner avant stabilisation, tests backend/frontend/E2E et QA utilisateur.

Le contrôle actuel est une réduction du risque, **pas encore une garantie absolue contre tous les doublons**.


### Durcissement Fournisseurs — identité et audit DB (2026-10-13)

- Les nouveaux noms Fournisseurs sont enregistrés en majuscules ; le service refuse les doublons normalisés lors de la création et du renommage, en incluant la visibilité globale pour un Workspace.
- Les variations simples avec ou sans `s` final (ex. TRANSGOURMET(S)) sont bloquées par le service avec HTTP 409 et demande de revue ; il ne s'agit PAS d'un système général de similarité phonétique ou sémantique.
- Deux index uniques partiels (global par normalizedName ; privé par workspace + normalizedName) ont été déclarés. Ils ne protègent pas les collisions cross-scope global/privé concurrentes, qui sont refusées par le service applicatif mais sans garantie atomique commune.
- Commande d'audit préalable, sans écriture : `npm run audit:m003-supplier-names`. Elle signale les doublons existants, incohérences de normalisation et bloque le déploiement des nouveaux index si elle échoue. Vérifier l'URI MONGODB_URI et la base cible avant toute commande.
- `npm run migration:m003-supplier-catalog` n'est à exécuter qu'après audit sans collisions ; la migration échoue volontairement si les noms historiques nécessitent une résolution manuelle. Aucune fusion, suppression ou conversion automatique des données historiques.
- Tests backend spécifiques ajoutés mais non exécutés localement. Revalider les tests historiques dont les attentes de casse changent, l'indexation en base de test, les autorisations, l'UX, E2E et les gates. Aucune PR/merge autorisée sans QA.

---

## Travail en cours — prix fournisseurs hors catalogue et UX Articles (2026-10-13)

Branche : `feature/m003-catalog-management-and-import-ux`.
Référence Core inchangée : v1.2.1.

**Cadrage utilisateur validé :** importer une liste tarifaire fournisseur
avec période de validité (ex. un an), sans créer d'édition catalogue.
Le frontend n'effectue aucune conversion ou présentation calculée des prix :
les montants et textes métier dérivés proviennent du backend.

Code enregistré sur GitHub : `SupplierTariff` accepte l'origine `PRICE_LIST`
avec import, libellé source et période, sans catalogue. L'import Articles
accepte prix, base monétaire, provenance et dates ; absence de prix reste
compatible. Le backend bloque les chevauchements visibles et conserve
l'historique ; le résolveur Prix applicable comprend les deux origines,
sans inventer de prix normalisé lorsqu'il est impossible de le calculer.
La liste Articles reçoit les projections tarifaires et libellés consolidés
côté serveur. L'onglet Articles affiche les badges d'association et les prix ;
les compteurs Fournisseurs/Articles actifs exploitent les totaux serveur.

**Avant QA locale :** vérifier `MONGODB_URI`, puis
`npm run audit:m003-supplier-names`; en l'absence d'anomalies,
`npm run migration:m003-supplier-catalog` pour migrer l'ancien index
tarifaire et appliquer les index de listes. Ne pas faire de migration dans
une base contenant des doublons de Fournisseurs non résolus.

Tests ajoutés : import sans édition, projection prix/kg, périodes en conflit,
isolation tarifaire de deux Workspaces pour un Article global, libellé de
conditionnement, interface de saisie, badges/compteurs. **Aucune exécution
locale, build ni gate verte n'est affirmée.**

Attention : correction/archivage d'une liste déjà importée non livré ;
le conflit est volontairement bloquant. Le prix « fournisseur de référence »
ne constitue pas le Prix applicable d'un Dossier. Ne pas ouvrir de PR ni
merger avant QA explicite et preuve des gates.

Contrôle ajouté : `SupplierTariff.packagingSnapshot` conserve les poids/quantités
au moment de la liste ; projections et Prix applicable utilisent cet
instantané plutôt que le conditionnement courant de l'Article.


## Correction UX complémentaire — option A validée (2026-10-13)

Suite au retour QA sur le formulaire des Articles : calendrier natif
`type=date` supprimé et composant existant `components/forms/date-picker.jsx`
réutilisé, avec affichage français `jj/mm/aaaa`.

Lorsque la colonne prix est mappée, une case « Importer les prix présents
dans le fichier » permet de n'importer que les Articles si elle est décochée.
Lorsque les prix sont importés, une seconde case « Ces prix ont une période
de validité définie » (décochée par défaut) ouvre les champs détaillés.
Sans période renseignée, `validityMode=FROM_IMPORT` est traité côté
backend : `validFrom` est déterminé à la confirmation par le serveur et
`validTo=null`, avec nom de source en français. Avec période définie,
`validityMode=DEFINED` exige nom et début ; l'ancienne forme du contrat
reste acceptée.

Le champ technique « Base tarifaire par défaut » est présenté comme
« À quoi correspond le prix indiqué dans le fichier ? ». Aucune logique
de prix n'est déplacée dans le frontend.

Tests frontend étendus (avec/sans période, import prix désactivé) ;
tests HTTP étendus (horodatage serveur sans expiration, rejet de date
client imposée). **Exécution locale, lint et gate non encore vérifiés.**
Conserver la branche M-003, ne pas ouvrir de PR avant validation utilisateur.

---

## Reprise M-003 — gestion corrective des Articles (2026-10-13)

Sur `feature/m003-catalog-management-and-import-ux`, reprise après
interruption de connexion. Fichiers vérifiés directement sur GitHub avant
reprise, Core toujours v1.2.1 et non modifié.

Nouveau complément :
- tableau Articles : désignation fournisseur prioritaire, référence
  secondaire ; retrait de la provenance d'import sous le prix ;
- fiche détail Article avec action de réassociation/dissociation Produit,
  édition des champs fournisseur et du conditionnement ;
- révisions immuables de corrections d'erreurs de prix pour les
  `SupplierTariff` privés de type `PRICE_LIST` : motif, acteur,
  événement d'audit, ancienne valeur non effacée, même période ;
- liste d'historique privée au Workspace et RBAC explicite ;
- migration de l'index partiel des listes de prix avant validation
  locale ; l'index `supplier_price_list_import_article_revision_unique`
  protège le numéro de révision et le verrou Commerce transactionnel
  garantit une seule révision courante lors des écritures métier ;
- tests backend d'association, correction, révision obsolète, RBAC
  et tenancy ; tests UI d'ordre d'affichage et de correction.

**Important :** les nouveaux prix avec date d'effet distincte,
l'archivage d'une liste et les corrections de tarifs issus de catalogues
ne sont PAS livrés dans cette correction de saisie. Aucun prix historique
n'est réécrit. Les workflows restent à cadrer.

Aucun test, lint, build, E2E ou gate n'a été exécuté par l'assistant.
L'utilisateur effectue le pull et tous les tests localement.
Ne pas ouvrir de PR ni effectuer de merge sans sa validation explicite.

Ordre recommandé : vérifier `MONGODB_URI`, audit Fournisseurs,
migration index M-003, tests backend ciblés, tests frontend ciblés,
lint/backend+frontend, build, E2E et QA manuelle.

Dernière vérification : le résolveur de prix applicable recalcule le montant
normalisé à la lecture après toute correction d'association Produit, depuis
le prix source et son conditionnement figé. Les nouveaux tarifs issus de
Catalogues figent eux aussi désormais le conditionnement dans
`packagingSnapshot`. Les anciens tarifs Catalogue qui ne possèdent pas
cet instantané restent un point à auditer avant correction rétrospective.

## QA locale M-003 — correction transactionnelle des tarifs (2026-10-13)

Les 4 suites backend ciblées ont été lancées par l'utilisateur : 31 tests
réussis sur 32, échec HTTP 500 sur la première correction tarifaire.
L'analyse de code montre que l'index unique partiel de la révision courante
conserve la même clé lors du remplacement transactionnel et peut déclencher
E11000. Le correctif remplace cet index par une unicité
import/Article/numéro de révision et conserve le verrou Commerce commun à
l'import et à la correction. La migration retire l'index précédent.
Le test HTTP vérifie maintenant deux corrections successives, trois
révisions historisées et une seule version courante.

Ce correctif reste **en attente de vérification locale** : d'abord l'audit
sur la base cible, ensuite migration des index si applicable, puis relance
des tests ciblés. Aucun test vert n'est revendiqué par l'assistant.

## QA visuelle M-003 — simplification des Articles et tarifs (2026-10-13)

Sur la branche M-003 : recherche serveur progressive (300 ms, page 1,
effacement du filtre, pas de bouton), champ réduit et alignement de
Recherche/Statut ; drawer Article sans la ligne Fournisseur/référence
redondante, référence placée dans la carte Informations de l’article ;
avertissement de valorisation en couleur sémantique warning ; provenance,
dates de validité et historique dans le Collapsible partagé fermé par défaut
avec animation tenant compte de reduced motion.

Correction tarifaire : explication métier dans InfoTooltip, motif facultatif
(zéro caractère minimum, maximum 500), absent ou vide normalisé à null,
sans changement des règles de montant et de provenance historique.
Tests HTTP, validations, recherche, correction et drawer à vérifier en local.
Aucun test, lint, build, E2E ou gate n'est déclaré vert à ce stade.

## Complément M-003 — projection conditionnement/prix par pièce (2026-10-13)

Retour QA utilisateur : la liste Articles affiche déjà le prix du colis
et le prix normalisé kg/L/UNIT, mais pas celui de chaque élément d'un
carton de plaques de 300 g ; la quantité totale du conditionnement doit
apparaître sous son libellé. L'Article et sa Référence M-002 ne sont pas
reparamétrés à cet effet.

Évolution ciblée :
- présentation de masse totale en kg, de volume total en L ou de
  quantité UNIT ; aucune masse inventée pour une donnée volumique ;
- poids net déclaré incohérent conservé comme information à vérifier,
  séparément de la quantité calculée ; ne pas masquer une anomalie ;
- prix par pièce calculé sans arrondi intermédiaire depuis le prix
  du colis et son nombre d'éléments lorsque le conditionnement explicite
  est complet ; nul si les prérequis ne sont pas réunis ;
- conservation des prix du colis et du prix normalisé, y compris lorsque
  le tarif possède un instantané historique de conditionnement ;
- affichage harmonisé dans le tableau Articles et le drawer Article ;
- tests ciblés backend des masses, volumes, prix pièce, cas incomplets
  et instantanés, ainsi que tests frontend de présentation.

Core v1.2.1 inchangé ; pas de migration ni nouveau stockage ;
une seule branche de livraison M-003.
**Aucun test local ou gate n'est revendiqué vert sur ce lot** :
l'utilisateur exécute les validations localement après pull.

## Densification du tableau Articles M-003 — popovers (2026-10-13)

Après retour QA utilisateur, les colonnes Conditionnement et Tarif
fournisseur HT ne doivent plus empiler plusieurs lignes dans la liste.
Seuls le libellé du conditionnement et le prix du colis restent visibles.
Les informations secondaires déjà projetées par le backend sont dans
deux popovers métier utilisant la primitive UI existante :
- `PackageSearch` : total massique, volumique ou UNIT et anomalie
  éventuelle du poids net déclaré (icône au ton `warning` si besoin) ;
- `Calculator` : prix par pièce et prix normalisé au kg/L/UNIT,
  uniquement si calculables ; aucune nouvelle règle économique.

Activation au survol sur desktop et au clic/toucher ou au clavier.
Les icônes n'apparaissent que si elles portent un complément exploitable.
Aucun composant partagé/Core, backend, modèle ou index n'est modifié.
Tests frontend mis à jour pour vérifier la compacité, les popovers,
les warnings et l'absence d'icône si aucune donnée secondaire.
Validations locales, lint, build, QA et gates encore à exécuter.

## QA M-003 — reprise après interruption et décision prix expiré (2026-10-14)

L'utilisateur valide explicitement :
- dernier tarif expiré visible sur l'Article, prix secondaires conservés ;
- recours au dernier tarif connu expiré dans la valorisation
  des Fiches techniques, avec alerte explicite et traçable ;
- correction historisée des dates de période par l'utilisateur ;
- barre Articles compacte sans labels Recherche/Statut, filtre
  Fournisseur recherché côté serveur + Statut + recherche Article.

Implémentation sur `feature/m003-catalog-management-and-import-ux`
sans upgrade Core ni nouveau modèle/index :
`supplierTariffSelection`, tarif expiré dans les listes,
résolveur de prix M-003 avec alerte, endpoint de correction des dates,
formulaire DatePicker, filtre Fournisseur Popover, avertissement dans
carte prix Dossier et icône d'avertissement sur prix unitaire
dans la composition FT M-004. Les contrôles de chevauchement import
s'appuient sur la même règle de dates civiles Europe/Paris.

Les tests sont préparés ; **aucune exécution locale, lint, build, E2E
ni Core Gate n'est attestée à ce stade**. L'utilisateur réalisera les
tests localement puis décidera de la PR et du merge. Pas de
modification silencieuse de main.

## Correctif ciblé QA locale M-003 — 2026-10-14

Retour utilisateur après le commit `d9ced965` :
- backend ciblé : 44 tests réussis sur 45, inspection CSV du nouveau
  test de correction de période en HTTP 400 ; le test contenait
  les caractères littéraux `\\n` au lieu d'un saut de ligne CSV ;
- frontend ciblé : 36 tests exécutés et réussis, mais suite drawer
  non collectée à cause d'une accolade fermante JSX manquante
  après le bandeau « Dernier prix connu — expiré ».

Corrections limitées à la chaîne de test et à la syntaxe JSX.
Pas d'évolution de règle économique, d'API, de données ou de Core.
Après correction : tests ciblés puis lint, build et gates globaux
à relancer par l'utilisateur ; aucune réussite non démontrée.

## Correction du filtre MongoDB de révision tarifaire — 2026-10-14

Résultat utilisateur au commit `319286ed` :
- suite backend `supplierArticleImport.http.test.js` : 15/16 verts ;
- le test `corrige une période expirée...` passe l'inspection CSV,
  l'import, le contrôle des permissions et du Workspace, mais échoue
  sur l'API de correction avec un HTTP 500 au lieu de 200.

Cause identifiée dans le code (à confirmer par le prochain test) :
`backend/config/db.js` active `mongoose.set('sanitizeFilter', true)` ;
le service de correction de période introduisait un filtre interne
`_id: { $ne: prior._id }` sans `mongoose.trusted`. Avec la
sanitisation, cet opérateur peut être requalifié et provoquer une
erreur de conversion au moment de la requête MongoDB.

Correction ciblée : déclarer ce `$ne` construit et contrôlé par le
service comme fiable via `mongoose.trusted({ $ne: prior._id })`.
La sanitisation globale est conservée. Le test HTTP existant est
renforcé pour vérifier également la création de l'événement d'audit
et son rattachement à la nouvelle révision. Aucun changement de
contrat, de schéma, de Core ou de migration. Tests locaux à rejouer
par l'utilisateur ; succès non revendiqué avant exécution.
