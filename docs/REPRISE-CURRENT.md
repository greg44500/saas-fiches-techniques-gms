# Reprise courante — cohérence des unités (2026-10-16)

## Lot actif M-002/M-003/M-004
**QA ergonomie M-003/M-004 — correspondance 1 pour 1 et mention d'origine (2026-10-21) :** accord produit intégré : 1 unité du colis = 1 pièce de recette propose dynamiquement le nombre d'unités commerciales sans saisie dupliquée, sous confirmation humaine ; nombre différent avec champ conditionnel ; correspondance inconnue avec avertissement de non-valorisation ; équivalences existantes initialisées selon leur valeur ; changement de mode/colisage retire la confirmation. `packaging.supplierLabel` devient « Mention du conditionnement fournisseur (facultatif) » dans le volet « Informations complémentaires », ouvert si déjà renseigné. Mutation, modèles, calculs backend et historique inchangés. Tests React Testing Library des trois modes, des données existantes, des validations et de la mention ajoutés. Gates locaux non exécutés par l'assistant.

**QA M-003 — test checkbox après modification du colisage (2026-10-21) :** échec Vitest constaté localement : le test gardait une référence vers la checkbox montée avant la suppression temporaire de l'édition des pièces (unitCount effacé => canVerifyRecipeUnits=false). La checkbox remonte lorsque le nombre d'unités est de nouveau renseigné. Correction du test : vérifier son démontage au vidage, relire la checkbox du DOM courant et vérifier qu'elle est décochée ; ajout d'une régression distincte où la quantité par unité change sans démontage, pour confirmer l'invalidation de la confirmation existante. Aucune modification fonctionnelle nécessaire ni modification Core/backend ; gates locaux non exécutés par l'assistant.

**M-003 / M-004 — mise en évidence de l'équivalence pièce/colis (2026-10-21) :** l'édition d'un Article fournisseur UNIT présente désormais la correspondance de valorisation dès l'ouverture, avant les champs de conditionnement, avec la confirmation humaine visible. Les précisions sur l'unité du Référentiel et le risque de compter les sachets au lieu des pièces sont dans deux aides contextuelles InfoTooltip. Le reste du formulaire utilise des libellés outlined animés en mode feature-local (aucune primitive Core modifiée). La fenêtre est élargie sur desktop, seule la zone de champs défile et Annuler/Enregistrer restent hors défilement. La règle de vérification des pièces, l'invalidation de confirmation lorsque le colisage change, la mutation fournisseur et les tarifs historiques restent inchangés. Tests RTL ajoutés et gates locaux/recette visuelle à confirmer.

**QA M-002 — correction complète du contrôle guidé (2026-10-21) :** après le correctif de navigation E2E, le scénario a échoué sur « Masquer le contrôle ». Deux défauts identifiés par lecture de la chaîne entière : (1) le endpoint RTK Query `restoreProductReferenceReviewContext` omettait `dimensionType`, pourtant exigé par Zod pour `dataType=DIMENSION` ; (2) l'attribut `aria-label` restait sur « Examiner ... » après sélection, masquant le libellé accessible « Masquer ... ». Les deux corrigés en une intervention, avec test API du corps HTTP, test du passage de paramètre depuis la page, test du libellé accessible, et assertion E2E sur la requête/réponse de reprise. Aucune modification du Core, du backend ou des données métier. Résultats des gates et du E2E local encore à confirmer ; aucune PR.

**Correction navigation E2E du contrôle guidé — 2026-10-21 :** le scénario Playwright ne pouvait pas trouver l'onglet Références, car l'autocomplétion ne fait que filtrer le tableau. Le test ouvre désormais explicitement le drawer via l'action « Voir » de la ligne Produit, puis vérifie son titre avant de sélectionner l'onglet. Aucun changement de contrat ni de comportement applicatif. Échec local initial constaté (timeout 30 s) ; relance locale requise après pull.

**Cohérence des onglets M-002 — 2026-10-21 :** les Dimensions PROVISIONAL sont désormais signalées dans l'onglet Dimensions par une action distincte « Identité à examiner » même si qualityReviewStatus vaut REVIEWED. Le compteur À contrôler conserve son sens de revue qualité, et une Contribution de gouvernance ouvre la Dimension dans le filtre Toutes. Test RTL dédié ajouté, validation locale requise.

**E2E ciblé gouvernance M-002 — 2026-10-21 :** un scénario Playwright initialise exclusivement la base `_e2e_test` avec une Dimension provisoire déjà REVIEWED dont la Contribution a disparu, une Référence liée PROVISIONAL, puis exerce le contrôle guidé jusqu'aux deux validations distinctes. Le scénario doit encore être exécuté localement ; aucune réussite de gate n'est revendiquée.

**Invariant de validation explicite M-002 (2026-10-21) :** une résolution de Dimension ne peut pas promouvoir automatiquement une Référence encore PROVISIONAL. La mise à jour de signature des Références préserve cet état jusqu'à une décision explicite de Contribution. Test d'intégration étendu, scénario frontend de double bouton « Valider » rendu non ambigu. Gates locaux encore non exécutés.

**UX implémentée — contrôle guidé M-002 (2026-10-21) :** depuis l'onglet Références, le panneau de gouvernance identifie Produit parent et Dimensions avec leur statut d'identité, autorise une revue ciblée dans la même carte, puis la validation finale seulement si les dépendances sont approuvées. La revue qualité reste distincte et les quatre onglets sont conservés. Les décisions et liens de reprise réutilisent les mutations existantes sous permission Application Global MANAGE ; tests frontend ajoutés, gates locaux et QA visuelle à confirmer.

**Lot QA gouvernance M-002 — 2026-10-21 :** le parcours guidé de validation d'une Référence conserve les quatre onglets, expose les dépendances Produit/Dimensions et réutilise les décisions individuelles auditables. Le backend étend la reprise idempotente de Contribution aux Dimensions PROVISIONAL déjà REVIEWED, et remplace l'erreur générique par le nom des identités bloquantes ; contrat M-002 complété. Vérification E2E/RTL et gates locaux requis avant PR.

**QA contrôle vide M-002 — 2026-10-21 :** correction ciblée des champs outlined sans options (Variété, Caractéristiques). Le libellé « Aucune valeur disponible » est une option sentinelle, pas une sélection réelle : elle ne doit plus forcer le label en haut. Les champs concernés restent désactivés et affichent le libellé au centre au repos ; au survol, le libellé monte sur la bordure et le motif d'indisponibilité apparaît. Pas de faux focus ni de sélection autorisée. Les listes non désactivées continuent de flotter au focus. Tests de structure RTL mis à jour ; recette locale requise.

**QA finition M-002 — 2026-10-21 :** la fenêtre « Corriger » affiche désormais le nom initial de la Référence Produit et aligne « Enrichir le référentiel » avec son titre, sans sous-titre redondant. Dans le prototype outlined, les libellés des champs réellement vides restent à l'intérieur puis montent au focus (transition CSS, respect de reduced motion) ; ils restent en haut en présence d’une valeur et redescendent lorsqu’un champ redevient vide. Les listes sans valeur exploitable évitent de masquer leurs libellés ; les listes désactivées conservent l'explication de leur indisponibilité. Tests RTL/E2E ajustés ; résultats à confirmer par l’utilisateur en local avant PR.

**QA prototype UX M-002 — 2026-10-21 :** les libellés flottants « outlined » sont essayés uniquement dans la correction des Références Produit, via un habillage feature-local de Field/Input/Select existants ; le parcours de création conserve les libellés classiques. L'avertissement sur le changement d'unité est compacté avec une aide contextuelle conservant les conséquences complètes et une courte mention visible, sans retirer la confirmation explicite. Corrections ESLint associées : la fonction de réutilisation de Produit n'est plus préfixée par `use` (ce n'est pas un Hook) et le faux `<select>` natif du test devient un bouton de simulation. À valider en RTL, ESLint et recette visuelle locale ; aucune évolution Core ni API.

**QA ergonomie M-002 — 2026-10-21 :** la fenêtre « Corriger la référence Produit » débordait de la hauteur de l'écran et masquait « Annuler » / « Enregistrer ». Le dialogue est élargi sur ordinateur, limité à la hauteur visible, avec une zone de champs défilante et des actions/erreurs de validation conservées hors défilement. Ajustement uniquement frontend métier, sans évolution Core ni du contrat économique. Régression RTL et E2E écran bas ajoutées ; résultats locaux à confirmer par l'utilisateur avant PR.

Branche : `feature/m002-m003-m004-unit-consistency`. Les quatre règles métier (unité M-002 imposée dans les Fiches, preuve de pièces par colis, aucune conversion estimative de poids, correction gouvernée des Références déjà utilisées) sont **validées par l'utilisateur**. Contrat transversal : `docs/m004/M-002-M-003-M-004-UNIT-CONSISTENCY-CADRAGE.md`.

Implémentation préparée : `SupplierArticle.recipeUnitEquivalence`, normalisation `UNIT` par colis vérifié et compatible avec le snapshot tarifaire, historisation des nouveaux prix négociés/facturés, interface Article (titre, aide, « Nb d'unités par colis », unité de fiche en lecture seule, confirmation conditionnelle), garde-fou sur changement interdimensionnel M-002, tests backend/frontend, audit DB en lecture seule. Core inchangé v1.2.1.

**Revue intégration du 2026-10-16 :** le scénario croissant doit distinguer la politique par défaut `NEGOTIATED_PRICE`, la politique `SUPPLIER_TARIFF` (conversion impossible lorsque la preuve ne correspond plus), puis `INVOICED_PRICE` (facture validée seulement). L'affichage commercial des Articles et le Prix applicable suivent les mêmes exigences de preuve pour les conversions `UNIT` des tarifs sans snapshot. Tests locaux à relancer ; aucune réussite annoncée.

**QA M-002 — correction de navigation du 2026-10-16 :** dans le dialogue standard « Créer un Produit », les Produits proches ne présentaient que « Différent » malgré un callback `onUseExisting` déjà relié aux pages Workspace et Application Global. Correction frontend : action « Ouvrir ce Produit » pour les suggestions accessibles ; conservation de « Différent », du parcours contextuel M-003 et des restrictions des Produits archivés. Tests RTL et E2E M-002 étendus. Aucun backend/Core modifié pour cette anomalie. Vérification locale du lot requise avant PR.

**Complément QA M-002 du 2026-10-16 (validé pour implémentation)** : l'utilisateur a constaté que la Référence « Croissant individuel PAI » est passée de `G` à `KG` malgré l'association Article BRIDOR. La règle backend passe du blocage interdimensionnel au blocage de **tout changement d'unité** si un usage existe. L'ouverture d'un Produit retrouvé par la déduplication doit cibler directement l'onglet Références. L'Application Global présente « À contrôler » en petit bouton outline neutre ouvrant la décision existante via une recherche ciblée par `targetId`. Le dialogue de correction déplace le sous-titre technique vers une infobulle métier. Audits locaux, RTL, tests backend, E2E et gates restent à confirmer avant toute PR.

**QA 2026-10-16 :** un correctif encadre maintenant le changement d’unité d’une Référence sans Fiche ni Prix historique, même si des Articles fournisseur restent associés. Confirmation explicite, maintien des tarifs source et invalidation des anciennes équivalences. Le petit bouton warning « À contrôler » peut retrouver ou rétablir une contribution manquante, avec audit et sans validation automatique. Tests locaux indispensables avant PR.

**Validation encore attendue** : audit local de la Référence « Croissant individuel PAI » avant toute correction de données ; exécution locale des tests ciblés, lint, build, E2E et QA visuelle ; corrections sur la même branche. Aucun test vert ni migration effectuée par l'assistant. **Aucune PR/merge avant accord utilisateur.** Les archives ci-dessous peuvent décrire des états plus anciens et ne priment pas sur cet état actuel.

---

---

## Archive — reprise M-002/M-003 au 2026-10-14

**Date : 2026-10-14**  
**Dépôt : `greg44500/saas-fiches-techniques-gms`**  
**Dernier `main` métier vérifié : `962177905bcc198e439a316d9610b23c60dd53cd` (PR #44)**  
**Core intégré : v1.2.1 — `054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3` (`core-origin.json`)**

## Chantier actif — Association Produit depuis Article fournisseur

- Branche : `feature/m002-m003-supplier-product-creation`, créée depuis `a759fac`.
- Complément M-002/M-003 : création de Produits/Références provisoires depuis
  un Article fournisseur privé, sans capability Produit supplémentaire lorsque
  l'import fournisseur est accessible avec les permissions M-003 pertinentes.
- APIs contextuelles sécurisées + réutilisation des services de contribution
  M-002 ; lectures Produits contextuelles ; frontend à dialogues successifs ;
  association automatique et réessai sans recréer la contribution.
- Tests backend/frontend et E2E ajoutés, mais **aucun n'a encore été exécuté**.
  La QA locale, les gates globales et la validation visuelle restent nécessaires.
- Contrat : `docs/m003/M-003-ARTICLE-PRODUCT-CREATION-ADDENDUM.md`.
- Pas d'évolution Core ni de modification de `core-origin.json`.
- Interdiction de fusionner cette branche avant retour des gates et validation
  explicite de l'utilisateur. Le complément impression/email M-004 reprendra
  après la clôture du présent lot.

## État réel vérifié

- **M-001 à M-005 intégrés.** Le complément M-003 est fusionné par la [PR #44](https://github.com/greg44500/saas-fiches-techniques-gms/pull/44).
- [Core Gate PR #44](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/38537453030) : success sur `f40a054b4462167af66f28dc2426b329f7a064f6`.
- [Core Gate post-merge](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/38539141748) : **success à la tentative 2** sur `962177905bcc198e439a316d9610b23c60dd53cd`. Première tentative échouée sur une interaction du sélecteur `Base de vente` du test M-004 ; code du test et composants inchangés avant/après le merge. Cela signale une intermittence potentielle, non une régression métier démontrée.
- Aucune version Core ou provenance Core n'a été changée par la PR #44. Ne pas inférer que les migrations de la PR ont été jouées sur chaque base locale ou de production.

## Clôture fonctionnelle M-003

Imports directs d'Articles et mercuriales (avec ou sans catalogue), association à la Référence Produit facultative à l'import, corrections de listes privées historisées et auditées, choix explicite du tarif courant/expiré, prix normalisés et par pièce, recherche côté serveur, drawer Article à onglets, UX import Produit harmonisée et avertissement M-004 de tarif expiré.

**Dettes différées :** suppression contrôlée d'import/catalogue, renouvellements tarifaires prospectifs, gestion des conflits prix privé/global ; `docs/DEBT.md`.

## Prochain travail métier : complément de diffusion M-004

Les exports CSV, XLSX et PDF sont **déjà présents** dans le code et documentés dans `docs/m004/M-004-EXPORTS-FINAL-CONTRACT.md` et `docs/m004/M-004-EXPORTS-TECHNICAL-DESIGN.md`. Il reste à auditer/cadrer l'**impression** et l'**envoi par e-mail** de la Fiche validée. Avant toute implémentation : vérifier snapshot `TechnicalSheetValidation`, permissions, capability/quota, confidentialité, destinataires, stockage temporaire, traçabilité, réutilisation des rendus et tests. Ne pas redévelopper les formats existants ; pas de nouveau modèle/Core sans raison démontrée. Les Fiches process seront cadrées séparément.

## Opérations Git convenues

Créer puis fusionner une PR **strictement documentaire**. Ensuite seulement, aligner le clone local sur `main` et nettoyer les **branches déjà fusionnées** après vérification du statut Git, des refs et de l'absence de changements non sauvegardés. Ne pas effacer une branche non fusionnée ; ne pas effacer `main` ni modifier le remote `upstream-core`. L'utilisateur garde le contrôle des opérations locales et des merges.

## Archives historiques

Les sections suivantes documentent des états antérieurs des travaux M-003/M-005. Leurs mentions « tests en attente », « branche active » ou « PR interdite » ne s'appliquent plus à l'état courant. Le code et les gates réels priment.

---

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

## UX M-003 — drawer Article à onglets (2026-10-14)

Retour visuel utilisateur validé : ne plus empiler les blocs
d'informations Article / association / tarif dans le même drawer ;
réutiliser la navigation à onglets des autres drawers.

Lot frontend ciblé :
- `Infos Article` par défaut : référence, Fournisseur, marque,
  conditionnement, statut et modification autorisée ; désignation
  conservée dans le titre du drawer ;
- `Association` : Produit lié ou état « Non associé », action
  conditionnée par RBAC et statut, conséquences économiques accessibles
  via `InfoTooltip` près de l'action sans bandeau permanent ;
- `Tarif fournisseur` : prix principal et complémentaires, provenance,
  dates et avertissement d'expiration ; correction du prix et de la
  période selon les droits ; historique replié et hauteur bornée ;
- navigation réinitialisée à `Infos Article` lors de la réouverture,
  onglet Tarif entièrement absent sans permission de lecture.

Fichiers impactés : drawer, tests RTL, contrat M-003, conception et
synthèse de reprise. Aucun changement Core, backend, migrations ou
règles de valorisation. Les tests sont à exécuter par l'utilisateur
localement ; ne pas annoncer de gate verte sans résultat réel.

## Ajustement UX M-003 — actions dans la carte Tarif (2026-10-14)

Retour visuel : « Corriger le prix » et « Modifier la période »
figuraient sous la carte alors que les autres onglets plaçaient
leurs actions en haut à droite de la zone métier. Déplacement
des deux boutons dans l'en-tête de la carte « Prix fournisseur HT »,
avec alignement à droite et adaptation aux petites largeurs.
Le prix principal, les prix complémentaires, la provenance,
l'expiration et l'historique replié sont conservés.

La garde existante (permission de correction, liste privée
`PRICE_LIST`, Article actif) et les callbacks restent inchangés.
Test RTL renforcé sur la position des actions à l'intérieur de
l'en-tête de la carte et leur absence pour les prix Catalogue.
Aucun Core, backend, API ou modèle touché.
Tests, lint et build à effectuer localement par l'utilisateur.
