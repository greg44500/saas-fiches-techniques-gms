# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-24  
**Lot actif :** M-002 — Référentiel Produits / Produits canoniques  
**Branche métier :** `feature/m002-catalogue-produits`  
**HEAD après réalignement Core :** `5958ed6264ae90524d0b9b94bd5bed15705b47a0`

## 1. Ordre d'autorité

```text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests réellement exécutés
→ docs/m002/M-002-RECARDAGE-QA.md
→ contrats M-002
→ Core réellement intégré
→ présente reprise
```

En cas de contradiction, Git/code/tests priment.

## 2. État Git et Core réellement validé

Produit : `greg44500/saas-fiches-techniques-gms`

État `main` validé après intégration Core :

```text
main
→ fc422ac500c2005b5e6b38090c92cef712f69768
→ Merge pull request #19 from greg44500/core-update/platform-navigation-db55f83
```

Branche métier après réalignement :

```text
feature/m002-catalogue-produits
→ 5958ed6264ae90524d0b9b94bd5bed15705b47a0
→ chore(m002): resync with validated Core db55f83
```

État comparé à `main` après le push :

```text
ahead  = 190
behind = 0
merge-base = fc422ac500c2005b5e6b38090c92cef712f69768
```

Le Core réellement intégré est :

```text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = db55f8342837d7fe3d333fd962bdc7939a8c4603
```

`db55f834…` est un commit compatible postérieur au tag stable `v1.2.1`. Aucun tag ni numéro `1.2.2` n'a été inventé.

L'historique Git Core est réellement conservé dans le produit.

Séquence de validation terminée :

```text
Core Gate #122
→ PR #19
→ verte

finalisation core-origin.json + reprise
→ HEAD 590dd4d46b8381a61c4c754a3962853f1ce8455d

Core Gate #124
→ PR #19
→ verte

merge PR #19
→ fc422ac500c2005b5e6b38090c92cef712f69768

Core Gate #125
→ main / fc422ac
→ verte
```

`core-origin.json` est désormais l'autorité de provenance du Core intégré.

La branche M-002 a été réalignée sur ce `main` validé sans recréation de branche et sans perte d'historique.

## 3. Travail déjà présent sur la branche M-002

Le module contient déjà une implémentation importante : CanonicalProduct, ProductVariety, ProductCharacteristic, ProductVariant, WorkspaceProduct, ReferenceContribution, recherche/déduplication, imports, gouvernance globale, migrations, seeds, frontend et E2E.

Correctifs récents présents :

- conversion de la Présentation initiale vers `ProductCharacteristic(PRESENTATION)` verrouillée par tests ;
- scénario E2E de recherche prédictive réaligné sur le `combobox` et la suggestion ;
- affichage du sélecteur Gamme simplifié à `Gamme 1`, `Gamme 2`, etc. ;
- dataset `m002-reference-v2` ajouté avec 12 catégories et 135 Produits ;
- bootstrap par défaut basculé sur v2 avec test de passage v1 → v2.

Attention : une partie de la v2 est désormais **à reprendre** à cause du recadrage QA validé. Ne pas considérer le seed v2 comme contrat métier final.

## 4. Vérité des tests

Ont été explicitement rapportés verts avant le recadrage final :

- tests backend ciblés Présentation ;
- campagne backend M-002 ciblée ;
- tests frontend Produits ciblés ;
- lint frontend ;
- build frontend ;
- scénario E2E M-002 ciblé après correction de la recherche prédictive.

Une suite E2E complète exécutée avant cette dernière correction avait donné `12 passed / 1 failed`; l'échec restant était le clic obsolète sur le bouton `Rechercher` du scénario M-002. Le scénario ciblé corrigé a ensuite été rapporté vert.

**La suite E2E complète postérieure à cette correction n'a pas été explicitement confirmée dans la conversation.**

Après les changements Gamme simplifiée + seed v2, aucune nouvelle campagne globale complète n'est considérée verte tant qu'elle n'est pas rejouée.

Le réalignement Core sur `5958ed62…` n'a pas encore de preuve de gate M-002 complète. Les tests M-002 doivent donc être rejoués après l'implémentation du recadrage ci-dessous.

## 5. Recadrage métier validé pendant la QA

Le document canonique est :

```text
docs/m002/M-002-RECARDAGE-QA.md
```

Décisions :

### A. Pièce / découpe

`ProductCharacteristic` gagne `CUT` — libellé UX `Pièce / découpe`.

Une identité racine comme `Bœuf` ne doit plus recevoir automatiquement une variante vague. Un `CanonicalProduct` peut exister sans variante opérationnelle.

### B. Gammes et PAI/PAE

```text
Gamme 1 → Frais
Gamme 2 → Conserves
Gamme 3 → Surgelés
Gamme 4 → Sous-vide cru / épluchés
Gamme 5 → Sous-vide cuit
```

La Gamme 6 disparaît.

`PAI / PAE` devient une classification d'usage indépendante, conceptuellement `usageType = null | PAI | PAE`, combinable avec une Gamme physique.

### C. Seed v3

`m002-reference-v1` et `v2` restent immuables. Créer `m002-reference-v3` avec taxonomie corrigée, variantes réellement précises et aucune donnée inventée.

La migration depuis des variantes `foodRange=6` doit être fail-closed lorsqu'aucune conversion déterministe n'est possible.

### D. Recherche

Placeholder : `Rechercher un produit…`. Aucun mot `alias` visible.

### E. Liste groupée

Un Produit apparaît une seule fois ; ses déclinaisons sont affichées dessous. Pagination principale par Produit, actions de rattachement au niveau des variantes.

### F. Gouvernance globale visible

Le Fondateur garde une autorisation explicite via `product_reference_governor`; le statut Super Admin ne donne pas implicitement les permissions métier.

Le besoin de faire apparaître `Référentiel Produits` dans la navigation Platform est désormais couvert par le point d'extension Core validé au commit `db55f834…`.

## 6. Dépendance Core — RÉSOLUE

Le besoin générique de composition de la navigation Platform a été traité dans `greg44500/saas-core-api`, puis intégré et validé dans le produit.

Le Core fournit désormais :

```text
frontend/src/app/application-platform-navigation.js
```

avec une composition explicite de la navigation Platform Core + application.

Le contexte Platform expose séparément :

```text
permissions
→ permissions Platform Core

applicationGlobalPermissions
→ permissions globales applicatives du produit
```

Invariant conservé :

```text
Super Admin Platform
≠
autorisation globale Produit implicite
```

La visibilité de l'entrée `Référentiel Produits` devra dépendre de :

```text
applicationGlobalPermissions.has('product:reference:read')
```

Cette visibilité ne remplace jamais l'autorisation backend.

La route métier globale `/product-reference` conserve son propre contrôle Application Global et ne doit pas être placée aveuglément sous `PlatformGuard`.

Aucune nouvelle évolution Core n'est nécessaire pour reprendre le bloc M-002 actuellement cadré.

## 7. Réalignement M-002 sur le Core validé — TERMINÉ

Le merge effectué est :

```text
main validé
fc422ac500c2005b5e6b38090c92cef712f69768

→ merge dans

feature/m002-catalogue-produits

→ 5958ed6264ae90524d0b9b94bd5bed15705b47a0
```

La branche M-002 existante a été conservée.

Le contrôle local :

```text
git merge-base --is-ancestor fc422ac500c2005b5e6b38090c92cef712f69768 HEAD
→ 0
```

est confirmé côté GitHub par :

```text
merge-base = fc422ac500c2005b5e6b38090c92cef712f69768
behind = 0
```

Le seul conflit lors du merge concernait `docs/REPRISE-CURRENT.md`. Aucun fichier de code métier M-002 n'a été en conflit avec le lot Core.

## 8. Bloc d'implémentation M-002 après Core

Travailler d'un seul bloc cohérent :

```text
1. modèle
   → CUT
   → foodRange 1..5
   → usageType PAI/PAE séparé
   → CanonicalProduct autorisé sans variante

2. migration
   → suppression logique de Gamme 6 du contrat
   → migration fail-closed des données existantes
   → signatures recalculées avec usageType

3. seed v3
   → catégories corrigées
   → aucune variante artificielle
   → pièces/découpes seulement lorsqu'elles sont validées

4. backend recherche/liste
   → groupement par CanonicalProduct
   → pagination par Produit
   → Produit sans variante visible dans le global si pertinent

5. frontend
   → placeholder Rechercher un produit…
   → groupes Produit + variantes
   → CUT
   → usageType
   → gouvernance globale accessible depuis navigation Platform via extension Core

6. imports/contribution/dedup
   → mapping CUT
   → mapping usageType
   → mêmes règles gouvernées

7. tests
   → backend
   → frontend
   → permissions/gouvernance
   → migration
   → seed
   → E2E

8. QA visuelle
9. documentation finale
10. une seule PR M-002
```

## 9. Invariants à préserver

- pas de fournisseur, catalogue fournisseur, référence fournisseur, conditionnement commercial ni prix dans M-002 ;
- pas de données inventées pour satisfaire un seed ;
- pas d'autorisation métier implicite via Super Admin ;
- pas de modification Core spécifique au Produit ;
- pas de nouveau moteur RBAC ;
- pas de champ Alias dans les formulaires Workspace ordinaires ;
- backend autorité des registres ;
- aucune PR finale M-002 avant gates + QA visuelle.

## 10. Suite immédiate

La dépendance Core est résolue, fusionnée et validée. La branche M-002 est réalignée.

La prochaine étape est donc la reprise du recadrage M-002, en un seul lot cohérent :

```text
vérifier l'état réel des modèles / migrations / seeds / API / frontend existants
→ implémenter CUT
→ limiter foodRange à 1..5
→ séparer usageType PAI/PAE
→ autoriser CanonicalProduct sans variante
→ migration fail-closed
→ seed m002-reference-v3
→ recherche et pagination groupées par Produit
→ UX Produit + variantes
→ navigation Platform Référentiel Produits
→ imports / contribution / déduplication
→ tests ciblés puis globaux
→ E2E
→ QA visuelle
→ documentation finale
→ une seule PR M-002
```

Ne pas rouvrir le chantier Core sauf si une nouvelle lacune générique est démontrée par le code ou les tests.
