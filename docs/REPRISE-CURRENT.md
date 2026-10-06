# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-06
**Lot courant :** corpus professionnel v9 + conditionnements M-003 + Prix repères globaux lisibles par les Workspaces
**Branche de travail :** `feature/a2-professional-reference-corpus`  
**Base vérifiée :** `main@3634b9b76c4b019f9458f3827cd6d29d20cf6e3f`  
**Version produit :** `0.1.0` — channel `development`

## 1. Autorité

~~~text
Git / code réel / contraintes DB
→ tests et Core Gates réellement exécutés
→ contrats fonctionnels validés
→ contrat Core correspondant à la version réellement intégrée
→ architecture / sécurité / guidelines
→ dette active
→ documentation opérationnelle
→ présente reprise
~~~

Si une synthèse ou un ancien document contredit le code, Git ou les tests réellement exécutés, le code/Git/tests priment.

## 2. Provenance Core active

~~~text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = 054ecd5bff1f3e61e7e1871700fae05bcdc0bdd3
integrated = 2026-10-02T11:53:12.000Z
~~~

Aucun changement générique Core ne doit être introduit silencieusement dans le produit dérivé. Tout besoin générique doit être qualifié Core puis traité dans `saas-core-api` avant réintégration par une branche `core-update/*`.

## 3. État réel de `main`

Le `main` produit vérifié est :

~~~text
3634b9b76c4b019f9458f3827cd6d29d20cf6e3f
~~~

Ce commit correspond au merge de la PR #36 :

~~~text
PR #36
feat(m003): add global reference pricing
merge = 3634b9b76c4b019f9458f3827cd6d29d20cf6e3f
head PR = 4866cfa80ca8f1e0b8e40e2c68c8f6f72244fae7
Core Gate du head PR : success
~~~

La PR #36 a livré le Prix repère global M-003, son fallback M-004 et un corpus
initial de 264 Prix repères aligné sur le bootstrap M-002 v6.

## 4. Clôture M-004 hors Exports et diffusion

La stabilisation UX/UI de valorisation M-004 a été fusionnée par la PR #34 :

~~~text
PR #34
fix(m004): finalize technical sheet valuation UX
merge = 0562ff94506b7715fd848b89691c0a001b1cadd7
Core Gate PR #177 : success
~~~

La Core Gate post-merge #178 a ensuite échoué sur un scénario E2E M-001 avant toute opération métier de suppression/restauration. L'analyse a montré que l'arbre Git testé par la PR et le merge était identique et que l'échec portait sur le bootstrap navigateur du helper E2E, pas sur le lifecycle Dossier.

La PR #35 a stabilisé ce harnais E2E et la Core Gate post-merge #180 est désormais verte.

Conséquence :

~~~text
M-004 Fiches techniques + valorisation
→ clôturé pour le périmètre hors Exports et diffusion

Exports et diffusion V1
→ restent un bloc séparé
→ aucun code Export n'est ouvert dans le lot courant
~~~

Décisions M-004 à préserver :

- cockpit sticky responsive ;
- titre non écrasé et contrôles capables de se replier sur les largeurs intermédiaires ;
- badge positif `Valorisée` volontairement masqué ;
- seuls les états `Non valorisée`, `Valorisation incomplète` et `Calcul à actualiser` restent des états d'attention ;
- garde-fous économiques : CF HT, CMU HT, CFU HT, Prix retenu TTC, %MR, Écart € vs cible ;
- `MR` signifie Marge réelle ;
- %MR rouge sous la cible, vert au-dessus, neutre à l'égalité ou non calculable ;
- l'écart € est fourni par le backend et cumulé sur la production HT ;
- les calculs économiques restent backend-only ;
- lorsque les données économiques changent avant validation, le backend peut répondre `409 TECHNICAL_SHEET_VALUATION_REFRESHED` ; l'utilisateur doit alors vérifier les valeurs recalculées puis valider de nouveau ;
- M-003 reste l'autorité de résolution du Prix applicable.

## 5. Lot Produits globaux en cours

Le cadrage utilisateur du 2026-10-03 a validé un enrichissement du corpus sans
refonte du contrat M-002.

Règle Git du lot :

~~~text
une branche unique
→ plusieurs blocs cohérents
→ validation locale / visuelle
→ une seule PR finale
→ un seul merge
~~~

Branche :

~~~text
feature/a2-professional-reference-corpus
~~~

### 5.1 M-002 — corpus professionnel v9

Le dataset actif sur la branche est désormais :

~~~text
m002-reference-v9
16 catégories
381 Produits
488 Références Produit
64 Références UNIT nommées au singulier et au pluriel
~~~

Le v9 conserve exactement les identités du v8. Le delta identitaire v8 par
rapport au v7 reste historique :

~~~text
+61 Produits
+126 nouvelles Références Produit
-6 anciennes Références génériques de fonds de tarte
+120 Références nettes
~~~

Domaines complétés :

- œufs et ovoproduits ;
- matières premières de pâtisserie / glacerie ;
- purées et coulis de fruits ;
- sauces de snacking ;
- fruits secs / fruits à coque ;
- fonds de tartes et tartelettes avec diamètre ou format explicite.

Le modèle reste inchangé :

~~~text
CanonicalProduct
→ concept / racine globale

ProductVariant
→ Référence Produit exploitable

WorkspaceProduct
→ Favori Workspace
~~~

Le v9 conserve les racines multi-Références du v8 et ajoute uniquement le
libellé métier des unités dénombrables. `UNIT` reste l'unité technique de
calcul ; paquet et carton restent des conditionnements M-003.

Sources et règles :

~~~text
docs/m002/M-002-SEED-V8-SOURCE.md
docs/m002/M-002-SEED-V9-SOURCE.md
~~~

### 5.2 Réconciliation v1-v8 → v9

La migration canonique reste :

~~~text
npm run migration:m002-catalog
~~~

Le runner utilise désormais :

~~~text
reconcileM002BootstrapToV9
~~~

Règles :

- datasets v1 à v8 historiques ;
- cible v9 ;
- aucune suppression physique ;
- Favoris archivés uniquement lorsqu'une ancienne Référence bootstrap est
  réellement retirée ;
- données utilisateur non confondues avec les données bootstrap ;
- logique rejouable / fail-closed.

Le seed actif reste :

~~~text
npm run seed:m002-reference
~~~

et charge désormais v9.

### 5.3 M-003 — Prix repères v3

Le corpus actif sur la branche est :

~~~text
m003-global-indicative-prices.v3.json
362 Prix repères hérités
488 Références v9
126 Références volontairement sans Prix repère
6 anciennes entrées de prix génériques retirées
~~~

Les datasets v1 et v2 restent historiques et immuables.

Aucun nouveau montant n'a été inventé pour les 126 Références sans Prix
repère. Les 362 valeurs conservées restent explicitement fictives /
indicatives de démonstration, sans attribution à un fournisseur ni
prétention d'observation de marché.

La commande opérationnelle reste :

~~~text
npm run migration:m003-indicative-pricing
~~~

Le bootstrap conserve la règle existante : un Prix repère actif déjà maintenu
par le gestionnaire n'est jamais écrasé.

La migration M-003 exécute aussi `reconcileM003GlobalIndicativePricesToV3` : elle archive uniquement les anciens Prix repères bootstrap v2 des 6 fonds de tarte génériques retirés du v8 et préserve les corrections manuelles.

### 5.4 M-003 — conditionnements et lecture Workspace

Le conditionnement commercial V1 est structuré sur un seul niveau calculable :

~~~text
nombre de sous-unités × quantité par sous-unité × unité M-002
~~~

Le libellé fournisseur conserve les niveaux supplémentaires. Les Prix
indicatifs, y compris globaux, acceptent une base `PACKAGE`, ce
conditionnement plat et une provenance structurée
`sourceOrganization/sourceUrl/observedAt/source`.

Les Workspaces disposent d'une lecture seule des Prix repères globaux via :

~~~text
GET /api/workspaces/:workspaceId/supplier-pricing/global-indicative-prices
~~~

Cette lecture utilise la permission Workspace M-003 existante et ne dépend
pas d'un Favori `WorkspaceProduct`.

## 6. Validation du bloc avant PR

Contrôles structurels déjà effectués directement sur la branche :

- v9 parseable comme dataset JSON ;
- 16 catégories ;
- 381 Produits ;
- 488 Références ;
- identités v9 strictement identiques au v8 ;
- 64 Références `UNIT` nommées ;
- aucun doublon de nom normalisé détecté ;
- aucune catégorie vide ;
- 362 Prix repères v3 compatibles avec les Références v9 ;
- 126 Références sans montant inventé ;
- aucune unité M-002 / M-003 incohérente sur les 362 prix conservés ;
- bootstrap M-002 par défaut pointant sur v9 ;
- bootstrap M-003 par défaut pointant sur v3 ;
- réconciliation pointant sur v9 avec v1-v8 dans l'historique ;
- réconciliation M-003 v3 présente et câblée avant le seed v3 ;
- aucun Prix v3 orphelin ou avec unité incohérente lors du contrôle statique ;
- Références demandées (ovoproduits, purées/coulis, sauces, poudres/fruits secs,
  fonds de tartes dimensionnés) présentes dans le dataset final.

Preuve exécutée dans l'environnement de travail le 2026-10-06 :

~~~text
Frontend ciblé : 9 fichiers / 65 tests verts
Backend sans base : 6 fichiers / 37 tests verts
~~~

Les six suites backend dépendant de MongoDB ont été bloquées avant collecte
car cet environnement ne fournit ni `.env.test` ni serveur MongoDB. Le lint
complet, le build, les intégrations MongoDB et l'E2E restent à exécuter
localement par l'utilisateur après récupération de la branche. Ils ne sont
pas déclarés verts ici.

## 7. Reprise locale du Bloc B

Le corpus A2/v9 complète désormais le référentiel professionnel avant la PR
unique du lot. Les changements du sous-bloc Produits globaux portent sur le
dataset v9, la réconciliation bootstrap v1-v8 → v9, le corpus économique v3
et l'archivage contrôlé des anciens Prix repères bootstrap attachés aux
6 fonds de tarte génériques retirés.

Deux réconciliations produit sont désormais câblées dans les commandes
existantes, sans créer de nouvelle commande opératoire :

~~~text
npm run migration:m002-catalog
→ reconcileM002BootstrapToV9

npm run migration:m003-indicative-pricing
→ reconcileM003GlobalIndicativePricesToV3
→ seed m003-global-indicative-prices.v3
~~~

Pour récupérer uniquement le travail courant :

~~~text
git status --short
git fetch origin
git switch feature/a2-professional-reference-corpus
git pull --ff-only origin feature/a2-professional-reference-corpus
~~~

Si `git status --short` est vide après le pull, lancer les contrôles ciblés
avant la QA visuelle.

Backend corpus v9 / Prix repères v3 à exécuter en priorité :

~~~text
npx vitest run \
  backend/tests/seeds/m002Reference.seed.test.js \
  backend/tests/seeds/m002ProfessionalReferenceV7.seed.test.js \
  backend/tests/seeds/m002ProfessionalReferenceV8.seed.test.js \
  backend/tests/seeds/m002ProfessionalReferenceV9.seed.test.js \
  backend/tests/migrations/m002BootstrapV9.migration.test.js \
  backend/tests/seeds/m003GlobalIndicativePrices.seed.test.js \
  backend/tests/migrations/m003GlobalIndicativePricesV3.migration.test.js
~~~

Backend gouvernance ciblé :

~~~text
npx vitest run \
  backend/tests/modules/productCatalog/productCatalog.registry.test.js \
  backend/tests/modules/productCatalog/productCatalog.validation.test.js \
  backend/tests/modules/productCatalog/productCatalog.integration.test.js \
  backend/tests/modules/productCatalog/productCatalog.http.test.js \
  backend/tests/modules/productCatalog/productReferenceContribution.integration.test.js \
  backend/tests/modules/productCatalog/productReferenceReviewQueue.integration.test.js \
  backend/tests/modules/productCatalog/productCatalogGlobal.http.test.js
~~~

Frontend ciblé :

~~~text
cd frontend
npx vitest run \
  src/features/products/api/product-catalog-api.test.js \
  src/features/products/components/product-variant-create-dialog.test.jsx \
  src/features/products/components/product-details-drawer.test.jsx \
  src/features/products/components/product-reference-review-queue.test.jsx \
  src/features/products/components/product-reference-details-drawer.test.jsx \
  src/features/products/pages/product-reference-page.test.jsx
cd ..
~~~

Puis lancer l'application :

~~~text
# terminal backend — racine
npm run dev

# terminal frontend
npm --prefix frontend run dev
~~~

## 8. Bloc B — Gouvernance Produit unifiée

Le Bloc B reste sur la même branche, sans PR intermédiaire.

Contrat :

~~~text
docs/m002/M-002-GOVERNANCE-REVIEW-QUEUE.md
~~~

### 8.1 File « À contrôler »

Le backend agrège toujours les sources techniques existantes :

~~~text
ReferenceContribution PENDING_REVIEW
+
ProductVariety / ProductCharacteristic
qualityReviewStatus = PENDING
~~~

Mais l'interface gestionnaire expose uniquement des données métier :

~~~text
Type
→ Produit
→ Référence
→ Dimension

Donnée à valider
Contexte
Rapprochement
Action → Examiner
~~~

Décisions validées :

- aucune colonne Origine/Workspace/auteur dans la file principale ;
- avec `origins=omit`, l'API ne renvoie plus inutilement ces données dans les
  lignes de la file ;
- une demande orpheline dont la cible provisoire n'est plus actionnable est
  exclue ;
- `Examiner` ouvre la cible exacte dans le drawer ;
- Référence → filtre `À contrôler` + focus warning ;
- Dimension → filtre `À contrôler` + focus warning ;
- le tableau ne valide/refuse/fusionne plus hors contexte.

### 8.2 Nouvelle Référence Workspace

Workflow :

~~~text
Workspace saisit une Référence
→ doublon exact : réutilisation de l'existant
→ proximité lexicale : proposition de rapprochement
→ utilisateur confirme éventuellement une création distincte
→ ProductVariant PROVISIONAL
→ utilisable immédiatement dans son Workspace
→ ReferenceContribution VARIANT PENDING_REVIEW
→ gestionnaire Platform contrôle la Référence
~~~

Le cas `Galla` alors que `Gala` existe est couvert :

- rapprochement proposé ;
- aucune fusion automatique ;
- l'utilisateur peut confirmer que la Référence est différente ;
- le gestionnaire peut ensuite la corriger, la valider ou la fusionner avec
  `Gala`.

### 8.3 Drawer ciblé

Pour la donnée exacte examinée :

~~~text
badge warning → À contrôler

Modifier
Valider
Fusionner avec <candidat> si rapprochement
Refuser si décision de gouvernance
~~~

Après validation, le badge devient `Validée` lorsque la donnée est réellement
passée par un contrôle humain.

Une Dimension `NOT_REQUIRED` n'est pas présentée comme validée par un humain.

Une Dimension provisoire approuvée par la gouvernance passe aussi
`qualityReviewStatus = REVIEWED`, ce qui supprime le double contrôle qui
existait dans le premier workflow.

### 8.4 Alias

Les alias/synonymes restent disponibles pour la normalisation et la recherche,
mais ne sont plus affichés dans les drawers Produit utilisateur/Platform.

### 8.5 Traçabilité après contrôle

L'onglet global `Historique` est retiré de la navigation Platform.

Les décisions restent persistées dans les modèles/audits backend existants
pour support, diagnostic et traçabilité. Aucun bouton de vidange manuelle
n'est ajouté en V1.

Une donnée validée, fusionnée ou refusée disparaît simplement de
`À contrôler`.

### 8.6 RBAC / Core

Aucune nouvelle permission :

~~~text
product:reference:read
→ lecture Référentiel / À contrôler / Catégories

product:reference:manage
→ correction et décision de gouvernance
~~~

Aucune primitive Notification métier parallèle n'a été créée. Le compteur
`À contrôler` reste le signal in-app. Une notification générique persistée
reste un sujet Core éventuel.

### 8.7 Couverture ajoutée mais non encore exécutée dans cette conversation

Backend :

- validation Zod du contexte de rapprochement Référence ;
- file Produit / Référence / Dimension ;
- cible exacte ;
- exclusion des demandes orphelines ;
- validation de Référence provisoire ;
- fusion de Références et repointage des dépendances ;
- scénario `Galla → Gala` ;
- correction avant décision ;
- validation de Dimension en une seule décision ;
- permission HTTP et réponse sans origine lorsque `origins=omit`.

Frontend :

- file métier simplifiée ;
- routage `Examiner` ;
- filtre Références `À contrôler` ;
- badge `À contrôler` uniquement dans les contextes généralistes, pas dans
  les lignes de la file déjà filtrée ;
- correction / validation / fusion / refus dans le drawer ;
- confirmation d'une Référence proche côté Workspace ;
- alias absent du détail ;
- boutons Favoris en étoile vide/pleine ;
- Historique global absent de la navigation ; traçabilité backend conservée.

E2E existant M-002 adapté au nouveau principe :

~~~text
Workspace propose un Produit
→ Platform le voit dans À contrôler
→ Examiner
→ drawer ciblé
→ Valider
→ disparition de la file
→ Produit global exploitable
~~~

Aucune de ces suites n'est déclarée verte ici tant qu'elle n'a pas été
réellement exécutée localement ou par la Core Gate.

## 9. Point de reprise validé — avant demande complémentaire Produits globaux

Branche courante :

~~~text
feature/a2-professional-reference-corpus
HEAD vérifié avant mise à jour de cette reprise :
085783cb46f553e0d1633f7ebd8debb434846384
main de base : 3634b9b76c4b019f9458f3827cd6d29d20cf6e3f
PR ouverte : aucune
~~~

Le Bloc B a été validé visuellement par itérations utilisateur sur les points
suivants :

- Alias retiré du drawer Produit utilisateur ;
- nouvelles Références Workspace identifiables comme provisoires ;
- file Platform `À contrôler` simplifiée en
  `Type | Donnée à valider | Contexte | Rapprochement | Action` ;
- absence d'Origine/Workspace/auteur dans la file ;
- décision déplacée dans le drawer ciblé ;
- rapprochement/fusion explicite conservés ;
- Historique global retiré de la navigation Platform ;
- badge `À contrôler` retiré des lignes de la file déjà filtrée ;
- Favori dans l'onglet Références représenté par une étoile compacte à côté
  du nom, sans augmentation de hauteur ;
- étoile vide = non favori ; étoile pleine = favori ;
- ajouter/retirer un favori depuis `Références` ne change jamais automatiquement d'onglet ; le compteur `Favoris (n)` se met à jour sans interrompre la sélection successive ;
- survol/focus : l'étoile vide se remplit pour ajouter et l'étoile pleine se vide pour retirer ;
- tooltip visuel conservé ;
- dans l'onglet Favoris, le bouton étoile encadré reste aligné avec les autres
  actions.

État de preuve tests à préserver :

- une suite frontend ciblée antérieure a été explicitement déclarée verte par
  l'utilisateur ;
- le backend ciblé avait initialement 67 tests verts / 1 échec de fixture ;
  l'échec a été corrigé car le nom de test déclenchait légitimement le moteur
  de rapprochement ;
- plusieurs micro-ajustements UX ont été ajoutés après ces preuves ;
- le résultat final automatisé du HEAD courant n'a pas été explicitement
  fourni dans cette conversation ;
- ne jamais déclarer les suites finales vertes sans nouvelle preuve locale ou
  Core Gate.

Avant de commencer le prochain bloc, vérifier le dépôt réel puis, seulement si
nécessaire pour sécuriser le HEAD courant, exécuter les tests ciblés impactés
par les derniers ajustements :

~~~text
npx vitest run backend/tests/help/applicationHelp.registry.test.js

npm --prefix frontend run test -- \
  src/features/products/components/product-details-drawer.test.jsx \
  src/features/products/components/product-reference-review-queue.test.jsx \
  src/features/products/pages/product-reference-page.test.jsx
~~~

Ne pas lancer de PR, de merge ni de `release:check` avant la demande
complémentaire Produits globaux.

### 9.1 Demande complémentaire Produits globaux — traitée

La demande complémentaire a été cadrée et implémentée sur la même branche.

Contraintes déjà validées :

~~~text
même branche
→ feature/a2-professional-reference-corpus

même future PR unique
→ pas de PR intermédiaire
→ pas de micro-version
→ pas de merge avant ce bloc complémentaire
~~~

Périmètre retenu : sémantique des unités `UNIT`, conditionnement commercial
plat M-003, provenance structurée et lecture Workspace des Prix repères
globaux.

Contrôles appliqués pendant l'implémentation :

1. lire `KB-START-HERE.md` ;
2. lire cette reprise ;
3. vérifier GitHub, le HEAD réel et l'absence de divergence avec `main` ;
4. auditer l'existant M-002 pour l'ajout global (UI, API, permissions,
   déduplication, gouvernance, seeds) ;
5. reformuler la demande exacte de l'utilisateur et faire valider le périmètre
   si nécessaire ;
6. classer chaque besoin entre données de bootstrap, création manuelle globale,
   Référence Produit et Dimension ;
7. réutiliser le moteur de rapprochement/déduplication existant ;
8. ne jamais créer un doublon exact ni fusionner automatiquement une proximité ;
9. préserver le contrat `CanonicalProduct → ProductVariant → WorkspaceProduct` ;
10. ne pas dupliquer une primitive Core.

Si la demande modifie le corpus bootstrap :

- ne pas réécrire silencieusement `m002-reference.v8.json` ;
- versionner le nouveau corpus après validation du périmètre ;
- préserver l'historique des datasets précédents ;
- prévoir la réconciliation idempotente vers la nouvelle version ;
- vérifier catégories, Produits, Références, noms normalisés et unités ;
- si de nouvelles Références deviennent exploitables par M-003, vérifier la
  couverture du corpus de Prix repères sans écraser les prix déjà maintenus ;
- ne jamais inventer de fournisseur ni présenter un prix fictif comme
  observation de marché.

Si la demande porte sur l'ajout manuel par le gestionnaire métier :

- réutiliser `product:reference:manage` et les surfaces M-002 existantes ;
- ne pas créer une nouvelle couche Platform générique ;
- appliquer la même déduplication / proximité / gouvernance que pour les autres
  créations de référentiel ;
- conserver la séparation Produit racine / Référence exploitable / Dimensions.

Après implémentation du bloc Produits globaux :

~~~text
tests ciblés
→ QA visuelle utilisateur
→ corrections éventuelles sur la même branche
→ release:check unique
→ PR unique
→ Core Gate PR
→ merge
→ Core Gate post-merge
~~~

### 9.2 État final du lot du 2026-10-06

Le code et les tests couvrent désormais :

- `m002-reference.v9.json`, identique au v8 sur les identités et enrichi pour
  les 64 Références `UNIT` ;
- la réconciliation M-002 v1-v8 vers v9 ;
- la saisie et la restitution des conditionnements plats d'Articles ;
- les Prix indicatifs `PACKAGE` avec provenance structurée ;
- l'endpoint Workspace de lecture seule des Prix repères globaux ;
- leur affichage sur une Référence globale même non favorite ;
- la propagation du libellé `UNIT` dans M-004 et dans les snapshots validés,
  sans modification des formules.

La branche doit être validée localement puis faire l'objet de la PR unique
prévue. Aucun merge n'est réalisé par ce lot.

## 10. Exports et diffusion — ordre ultérieur

Périmètre V1 à cadrer séparément :

~~~text
CSV
XLSX
PDF
impression
envoi e-mail
~~~

Les primitives Core existantes devront être réutilisées avant toute création
de mécanisme de stockage ou diffusion parallèle.
