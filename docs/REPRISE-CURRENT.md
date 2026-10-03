# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-03  
**Lot courant :** Produits globaux — corpus professionnel v7 + gouvernance Produit unifiée  
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

### 5.1 M-002 — corpus professionnel v7

Le dataset actif sur la branche est désormais :

~~~text
m002-reference-v7
16 catégories
320 Produits
368 Références Produit
~~~

Delta par rapport au v6 :

~~~text
+2 catégories
+56 Produits
+104 Références Produit
0 Référence v6 retirée
~~~

Domaines ajoutés :

- matières premières de pâtisserie / boulangerie ;
- crémerie professionnelle ;
- pains et snacking.

Le modèle reste inchangé :

~~~text
CanonicalProduct
→ concept / racine globale

ProductVariant
→ Référence Produit exploitable

WorkspaceProduct
→ Favori Workspace
~~~

Le v7 exploite réellement plusieurs Références sous une même racine lorsque
la distinction est technique, par exemple Farine de blé, Beurre et Pain
burger.

Sources et règles :

~~~text
docs/m002/M-002-SEED-V7-SOURCE.md
~~~

### 5.2 Réconciliation v1-v6 → v7

La migration canonique reste :

~~~text
npm run migration:m002-catalog
~~~

Le runner utilise désormais :

~~~text
reconcileM002BootstrapToV7
~~~

Règles :

- datasets v1 à v6 historiques ;
- cible v7 ;
- aucune suppression physique ;
- Favoris archivés uniquement lorsqu'une ancienne Référence bootstrap est
  réellement retirée ;
- données utilisateur non confondues avec les données bootstrap ;
- logique rejouable / fail-closed.

Le seed actif reste :

~~~text
npm run seed:m002-reference
~~~

et charge désormais v7.

### 5.3 M-003 — Prix repères v2

Le corpus actif sur la branche est :

~~~text
m003-global-indicative-prices.v2.json
368 Prix repères
368 Références v7
0 Référence manquante
0 unité incohérente
~~~

Le v1 de 264 prix reste historique et immuable.

Les 104 nouvelles valeurs sont explicitement fictives / indicatives de
démonstration. Elles ne sont attribuées à aucun fournisseur et ne constituent
pas des observations de marché.

La commande opérationnelle reste :

~~~text
npm run migration:m003-indicative-pricing
~~~

Le bootstrap conserve la règle existante : un Prix repère actif déjà maintenu
par le gestionnaire n'est jamais écrasé.

## 6. Validation du bloc avant PR

Contrôles structurels déjà effectués directement sur la branche :

- v7 parseable comme dataset JSON ;
- 16 catégories ;
- 320 Produits ;
- 368 Références ;
- aucune Référence v6 perdue ;
- aucun doublon de nom normalisé détecté ;
- aucune catégorie vide ;
- 368 Prix repères v2 pour 368 Références v7 ;
- aucune Référence de prix supplémentaire ;
- aucune unité M-002 / M-003 incohérente ;
- bootstrap M-002 par défaut pointant sur v7 ;
- bootstrap M-003 par défaut pointant sur v2 ;
- réconciliation pointant sur v7 avec v6 dans l'historique.

Ces contrôles ne remplacent pas l'exécution Vitest/Supertest/Playwright.

L'environnement de cette conversation ne permet pas de cloner le dépôt pour
exécuter les suites. Aucun test local n'est donc déclaré vert à ce stade.

La validation automatisée réelle devra être fournie par les tests locaux
utilisateur puis la Core Gate de la future PR.

## 7. Reprise locale du Bloc B

Le corpus A2/v7 et les Prix repères ont déjà été vérifiés visuellement avant
ce sous-bloc. Les changements actuels portent sur la gouvernance
`À contrôler`, les nouvelles Références Workspace et le drawer ciblé.

**Aucune nouvelle migration n'a été ajoutée par ce sous-bloc.**

Pour récupérer uniquement le travail courant :

~~~text
git status --short
git fetch origin
git switch feature/a2-professional-reference-corpus
git pull --ff-only origin feature/a2-professional-reference-corpus
~~~

Si `git status --short` est vide après le pull, lancer les contrôles ciblés
avant la QA visuelle.

Backend ciblé :

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
npm --prefix frontend exec -- vitest run \
  src/features/products/api/product-catalog-api.test.js \
  src/features/products/components/product-variant-create-dialog.test.jsx \
  src/features/products/components/product-details-drawer.test.jsx \
  src/features/products/components/product-reference-review-queue.test.jsx \
  src/features/products/components/product-reference-details-drawer.test.jsx \
  src/features/products/pages/product-reference-page.test.jsx
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

## 9. QA visuelle attendue avant la prochaine conversation

Scénarios prioritaires :

1. vérifier qu'aucune ligne `Alias` n'apparaît dans le drawer Produit
   Workspace ;
2. créer une Référence nouvelle sous un Produit existant ;
3. vérifier qu'elle reste utilisable dans le Workspace et porte `À contrôler` ;
4. si une Référence proche existe, vérifier la proposition de rapprochement
   et la confirmation explicite d'une création distincte ;
5. Platform → `À contrôler` : vérifier les colonnes
   `Type | Donnée à valider | Contexte | Rapprochement | Action` ;
6. vérifier l'absence d'Origine/Workspace/auteur ;
7. cliquer `Examiner` sur une Référence et vérifier que seule la vue
   `Références > À contrôler` est affichée, avec focus sur la bonne ligne ;
8. vérifier `Modifier`, `Valider`, `Fusionner avec …`, `Refuser` selon le
   contexte ;
9. après validation/fusion/refus, vérifier la disparition de `À contrôler` ;
10. vérifier l'absence de l'onglet Historique dans la navigation Platform ;
11. vérifier une Dimension : une seule validation doit suffire ;
12. vérifier les étoiles Favoris : vide pour ajouter, pleine pour retirer ;
13. vérifier qu'aucun badge `À contrôler` n'est répété dans les lignes de la
    file `À contrôler`.

Après validation visuelle utilisateur :

~~~text
ne pas créer de PR
→ mettre à jour l'amorce de reprise
→ ouvrir une nouvelle conversation
→ traiter la demande spécifique d'ajout de Produits au référentiel global
→ rester sur feature/a2-professional-reference-corpus
→ conserver la future PR unique
~~~

Le `release:check`, la PR et le merge ne viennent qu'après ce lot
complémentaire demandé par l'utilisateur.

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
