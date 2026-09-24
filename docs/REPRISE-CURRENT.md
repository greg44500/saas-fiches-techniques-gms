# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-24  
**Lot actif :** M-002 — Référentiel Produits / Produits canoniques  
**Branche métier à préserver :** `feature/m002-catalogue-produits`  
**Checkpoint code avant ce recadrage documentaire :** `c4c7e570e6d7cf09053d643081390d35e968280d`

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

## 2. État Git réel vérifié avant le commit documentaire

Produit : `greg44500/saas-fiches-techniques-gms`

```text
main
→ 2fb8273311fc91e81153c0537d28279d234f9229

feature/m002-catalogue-produits
→ c4c7e570e6d7cf09053d643081390d35e968280d
```

Le `main` produit contient Core v1.2.1. La branche M-002 a déjà été synchronisée avec ce main via le merge `93fd6f0021d7b6f19c77e742dd9fa735b974c33b`.

Core public réel au moment du recadrage :

```text
greg44500/saas-core-api
main = ec6714035b76b6b78910a3763c2d94446cf2238c
version stable = 1.2.1
tag = v1.2.1
```

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

Le besoin de faire apparaître `Référentiel Produits` dans la navigation Platform démontre un point d'extension générique manquant dans le Core.

## 6. Dépendance Core — À TRAITER AVANT M-002

Le Core actuel possède une extension des routes Platform mais pas de composition générique de la navigation Platform.

Cette évolution est générique. Elle doit être réalisée dans `greg44500/saas-core-api`, pas directement dans le produit.

### Règle de livraison décidée

```text
PAS de version Core
PAS de tag
PAS de GitHub Release
PAS de mini-version

1 branche Core cohérente
→ 1 PR Core
→ 1 merge
→ relever le SHA exact
```

Le lot Core doit :

1. introduire un point d'extension générique de navigation Platform, analogue dans l'esprit aux autres points de composition ;
2. ne connaître aucune permission Produit ;
3. permettre à un module dérivé de contrôler la visibilité de son entrée sans affaiblir les guards/routes ;
4. ajouter les tests Core ;
5. mettre à jour `docs/derived-saas/EXTENSION-POINTS.md` et les docs Core réellement concernées ;
6. clarifier la provenance d'un dérivé intégrant un commit compatible post-tag sans inventer un nouveau tag/version.

Le Core `core-release.json`, les versions package et `v1.2.1` ne doivent pas changer pour ce lot.

## 7. Intégration du commit Core dans le produit

Après merge Core, utiliser **le SHA exact du commit fusionné**.

Dans le produit :

```text
main produit
→ branche dédiée : core-update/platform-navigation-extension
→ fetch upstream-core
→ merge du SHA Core exact
→ adaptations produit strictement nécessaires
→ tests/gates
→ une seule PR d'intégration Core
→ merge main
```

Ne pas intégrer le Core directement dans `feature/m002-catalogue-produits`.

`core-release.json` reste à la version stable 1.2.1. La mise à jour de `core-origin.json` doit tracer le commit exact et suivre le contrat de provenance post-tag clarifié par la PR Core ; aucun nouveau numéro ou tag ne doit être inventé.

Après fusion de cette intégration dans `main`, synchroniser la branche M-002 avec le nouveau main sans perdre son historique.

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

## 10. Prochaine conversation

La prochaine conversation de travail doit commencer dans le projet **saas-core-api**.

Objectif immédiat : construire et fusionner en une seule PR le point d'extension générique de navigation Platform, sans version/tag/release, puis revenir dans `saas-fiches-techniques-gms` pour intégrer le SHA exact et reprendre M-002 en un seul bloc.
