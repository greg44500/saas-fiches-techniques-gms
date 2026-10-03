# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-03  
**Lot courant :** Produits globaux — corpus professionnel v7 + Prix repères v2  
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

## 7. Ordre local pour la QA visuelle

Sur une base de développement déjà utilisée avec le v6 :

~~~text
git fetch origin
git switch feature/a2-professional-reference-corpus
git pull --ff-only origin feature/a2-professional-reference-corpus

npm run migration:m002-catalog
npm run seed:m002-reference
npm run migration:m003-indicative-pricing
~~~

Puis lancer l'application selon les deux processus de développement :

~~~text
# terminal backend — racine du dépôt
npm run dev

# terminal frontend
npm --prefix frontend run dev
~~~

Points visuels à vérifier :

1. Platform → Gestion des référentiels → Produits ;
2. recherche de `Farine de blé`, `Beurre`, `Pâte pure de pistache`,
   `Pain burger`, `Pain pita` ;
3. ouverture d'une racine multi-références et présence de toutes ses
   Références ;
4. présence du Prix repère global sur les nouvelles Références ;
5. Workspace / Fiche technique : sélection d'une nouvelle Référence et
   valorisation par `Prix repère global` lorsqu'aucune source locale plus
   précise n'existe.

## 8. Suite du lot après QA

Aucune PR intermédiaire ne doit être créée.

Après validation visuelle :

~~~text
retours QA éventuels
→ corrections sur la même branche
→ tests ciblés
→ release:check
→ PR unique
→ Core Gate PR
→ merge
→ Core Gate post-merge
→ documentation finale
~~~

Le prochain bloc fonctionnel après stabilisation du corpus professionnel reste
à traiter sur cette même PR selon le cadrage validé. Le bloc Exports et
diffusion M-004 reste ultérieur et séparé fonctionnellement.

## 9. Exports et diffusion — ordre ultérieur

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
