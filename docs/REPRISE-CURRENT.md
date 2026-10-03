# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-10-02  
**Lot courant :** Bloc A — Référentiel global valorisable / Prix repère global M-003  
**Branche de travail :** `docs/product-global-audit-and-reprise`  
**Base vérifiée :** `main@ca222ff0a4ba8759ffb35109616456dcb2f51f71`  
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

Le `main` produit est stabilisé au commit :

~~~text
ca222ff0a4ba8759ffb35109616456dcb2f51f71
~~~

Ce commit correspond au merge de la PR #35 :

~~~text
PR #35
test(m001): stabilize dossier E2E session bootstrap
merge = ca222ff0a4ba8759ffb35109616456dcb2f51f71
Core Gate PR #179        : success
Core Gate post-merge #180: success
~~~

La correction #35 ne modifie aucune règle métier M-001. Elle supprime une navigation document intermédiaire inutile dans le scénario E2E Dossier afin d'éviter deux bootstraps de session rapprochés. Aucun timeout n'a été augmenté et aucune assertion métier n'a été retirée.

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

## 5. Prochaine priorité : Produits globaux

La prochaine étape n'est pas M-005 et n'est pas encore le bloc Exports.

Ordre validé :

~~~text
1. audit réel des Produits globaux existants
2. cadrage avec l'utilisateur
3. validation explicite du périmètre
4. seulement ensuite : éventuelle implémentation Produit
5. après ce lot : reprise du cadrage Exports et diffusion M-004
~~~

Le contrat M-002 actuel reste l'autorité tant qu'un nouveau cadrage n'a pas été validé. L'audit ne doit donc pas modifier silencieusement les invariants existants.

## 6. Contrat Produit actuellement en vigueur

Source canonique :

~~~text
docs/m002/M-002-FINAL-CONTRACT.md
~~~

État connu :

~~~text
CanonicalProduct
→ concept / racine globale

ProductVariant
→ rôle métier actif : Référence Produit exploitable
→ nom technique conservé pour compatibilité

WorkspaceProduct
→ lien Workspace ↔ Référence Produit
→ présenté côté métier comme Favori
~~~

Règles actives à ne pas modifier sans validation :

- Référence Produit exploitable avec nom persistant et normalisé ;
- Conservation obligatoire ;
- unité de référence obligatoire ;
- Catégorie facultative ;
- dimensions avancées facultatives ;
- déduplication fondée sur le nom normalisé de la Référence Produit ;
- référentiel global partagé ;
- les Workspaces ne copient pas l'identité Produit lorsqu'ils utilisent/favorisent une référence ;
- données commerciales fournisseur et prix hors M-002, sous l'autorité M-003 ;
- seed actif `m002-reference-v6` issu du corpus alimentaire validé ;
- gouvernance globale via autorisation Application Global.

## 7. Audit Produit à réaliser avant toute modification

L'audit doit montrer l'état réel du produit existant :

1. modèles Mongoose et contraintes/indexes ;
2. services et règles de déduplication ;
3. validations Zod et metadata exposées ;
4. routes/controllers/API ;
5. permissions Application Global et Workspace ;
6. frontend Workspace et Platform ;
7. migrations ;
8. seeds actifs et historiques ;
9. tests backend/frontend/E2E réellement présents ;
10. impacts M-003 et M-004 si le modèle Produit évolue.

Questions à cadrer avec l'utilisateur après l'audit :

- que signifie exactement « Produit global » dans l'UX cible ;
- la séparation `CanonicalProduct / ProductVariant` reste-t-elle pertinente ou doit-elle être rendue invisible à l'utilisateur ;
- quelles informations doivent être visibles et modifiables ;
- catégories, variantes/états, dimensions et unités ;
- règles de doublons et rapprochements ;
- gouvernance de création, contribution, validation, archivage/réactivation ;
- rôle exact des utilisateurs Workspace et de l'autorité globale ;
- recherche, filtres et administration Platform ;
- impact des références existantes et du seed actif ;
- compatibilité M-003 Fournisseurs/Articles/Prix ;
- compatibilité M-004 Fiches techniques.

Aucune solution ne doit être choisie avant cette discussion. Le lot ne doit pas être nommé arbitrairement `M-002.1`, nouveau module ou refonte tant que la nature réelle du besoin n'est pas validée.

## 8. Dette Produit pertinente pendant l'audit

`docs/DEBT.md` contient déjà des points UX concernant le Référentiel Produits, notamment :

- lisibilité des Catégories ;
- compteur de Produits actifs par Catégorie ;
- navigation vers les Produits empêchant l'archivage ;
- simplification du tableau Référentiel ;
- clarification du terme `Référence Produit` pour éviter la confusion avec les références fournisseur M-003 ;
- maintien du `DataTable` partagé ;
- dette fiscale séparée `GMS-TAX-001`, à ne pas intégrer silencieusement au modèle Produit.

Ces dettes constituent des entrées d'audit, pas des décisions d'implémentation automatiques.

## 9. Exports et diffusion — ordre ultérieur

Le bloc Exports et diffusion sera repris seulement après le lot Produits globaux.

Périmètre V1 à cadrer séparément :

~~~text
CSV
XLSX
PDF
impression
envoi e-mail
~~~

Le cadrage devra distinguer explicitement :

- données métier ;
- document généré ;
- génération temporaire ;
- fichier persisté ;
- permissions ;
- nommage ;
- modèles/templates ;
- impression ;
- destinataires e-mail ;
- conservation/rétention ;
- audit.

Les primitives Core existantes doivent être réutilisées avant toute création de mécanisme de stockage ou diffusion parallèle.

## 10. Méthode de travail du lot courant

~~~text
audit réel
→ restitution de l'existant
→ questions de cadrage
→ décisions utilisateur
→ contrat écrit
→ validation explicite
→ seulement ensuite branche d'implémentation si nécessaire
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E selon le risque
→ Core Gate
→ PR unique
→ merge
→ documentation
~~~

Le cadrage du Prix repère global a été validé le 2026-10-03 et son implémentation est en cours sur la branche courante. La livraison reste soumise à la Core Gate canonique avant fusion.

Décisions fermées du Bloc A :

- conserver `CanonicalProduct / ProductVariant` sans champ prix M-002 ;
- étendre l'objet M-003 `IndicativePrice` avec la portée globale ;
- conserver l'unité de référence portée par `ProductVariant` ;
- dernier fallback = `INDICATIVE_GLOBAL` / « Prix repère global » ;
- aucun Fournisseur ou Article fournisseur fictif ;
- corpus initial de 264 prix fictifs/indicatifs clairement identifié comme démonstration ;
- maintenance Platform via `product:reference:manage` ;
- le bootstrap ne réécrase jamais une correction du gestionnaire ;
- conditionnements génériques différés ;
- gouvernance unifiée Contributions / À contrôler = Bloc B séparé après validation du Bloc A.

Source contractuelle :

~~~text
docs/m003/M-003-GLOBAL-INDICATIVE-PRICING.md
~~~
