# REPRISE-CURRENT — saas-fiches-techniques-gms

**Date :** 2026-09-27  
**État :** intégration du hotfix Core de déterminisme des tests avant reprise de la clôture technique M-002  
**M-002 :** fonctionnellement terminé sur `feature/m002-catalogue-produits`, PR #20 ouverte  
**Prochain lot métier :** M-003 après fusion définitive de M-002

> Le code réel, GitHub, les contraintes DB et les tests/gates réellement exécutés priment sur cette synthèse.

## 1. Ordre d'autorité

```text
KB-START-HERE
→ GitHub réel
→ code / contraintes DB
→ tests et gates réellement exécutés
→ contrats fonctionnels validés
→ Core réellement intégré
→ documentation produit
→ présente reprise
```

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

## 2. Core ciblé par l'intégration en cours

Dépôt Core :

```text
greg44500/saas-core-api
```

Release stable de base :

```text
version = 1.2.1
tag     = v1.2.1
tag SHA = ec6714035b76b6b78910a3763c2d94446cf2238c
```

Le tag `v1.2.1` reste immuable.

Commit Core post-tag validé à intégrer :

```text
d90d8f1e6034cbbf4f63de2be7312eae69b1d698
```

Provenance attendue dans le produit :

```text
repository = greg44500/saas-core-api
version    = 1.2.1
tag        = v1.2.1
commit     = d90d8f1e6034cbbf4f63de2be7312eae69b1d698
```

Aucune version `1.2.2`, aucun nouveau tag et aucune nouvelle GitHub Release ne sont créés pour ce hotfix compatible post-tag.

## 3. Nature du hotfix Core

Le défaut concernait uniquement le déterminisme de la suite backend Vitest lorsqu'elle utilisait une base MongoDB de test partagée.

Symptômes observés sur le même HEAD M-002 selon les exécutions :

- disparition de fixtures comme des Users, Plans, Roles ou Members ;
- `Utilisateur cible introuvable` ;
- `E11000 duplicate key ... plans.key = "free"` ;
- nombre et nature des tests en échec variables entre reruns.

Correction Core :

```js
// vitest.config.js
fileParallelism: false
```

Cette configuration rend l'exécution inter-fichiers séquentielle pour la commande normale :

```bash
npm test
```

Aucune modification fonctionnelle n'a été faite sur Workspace, Subscription, Plan, les modèles MongoDB, les migrations, les API ou les modules métier M-001/M-002.

## 4. Validation du Core source

PR Core :

```text
#43 — fix(tests): make backend test execution deterministic
```

Preuves validées :

```text
HEAD PR Core
9849ed81370cfcc6070a6aa2c83b67e4db873ff2

Core Gate PR
#81 — success

merge main Core
d90d8f1e6034cbbf4f63de2be7312eae69b1d698

Core Gate post-merge
#82 — success
```

Le diff entre le commit Core précédemment intégré `db55f834…` et `d90d8f1…` est limité à `vitest.config.js`.

## 5. État Git du produit avant fusion de l'intégration

Dépôt :

```text
greg44500/saas-fiches-techniques-gms
```

`main` avant ce lot :

```text
fc422ac500c2005b5e6b38090c92cef712f69768
```

Branche d'intégration Core :

```text
core-update/test-determinism-d90d8f1
```

Le vrai merge Git du Core a été réalisé sur cette branche :

```text
d81330ba98868dcc44c5b0d5c4bc9a23dbfe83cf
```

Ce commit possède notamment comme parent Core :

```text
d90d8f1e6034cbbf4f63de2be7312eae69b1d698
```

Contrôle local effectué :

```text
git merge-base --is-ancestor d90d8f1e... HEAD
→ 0
```

Le diff de ce merge est limité à trois ajouts dans `vitest.config.js`.

## 6. M-002 à préserver

PR existante :

```text
#20 — feat(m002): deliver the shared product reference catalog
```

Branche :

```text
feature/m002-catalogue-produits
```

HEAD avant réalignement Core :

```text
5dec6403a4b8a93f175c85d55cb7e73d0528828d
```

M-002 est fonctionnellement terminé et gelé. Il ne faut pas profiter de ce hotfix Core pour modifier son contrat métier.

La Core Gate #126 relancée avant l'intégration du hotfix Core ne constitue pas la preuve finale de validation de M-002, car elle exécute l'ancien HEAD sans `fileParallelism: false`.

## 7. Séquence obligatoire restante

```text
PR unique d'intégration Core produit
→ Core Gate verte
→ merge vers main
→ Core Gate post-merge verte
→ réaligner feature/m002-catalogue-produits avec main
→ conserver la PR #20 existante
→ nouvelle Core Gate PR #20
→ merge M-002 uniquement si verte
→ Core Gate post-merge
→ clôture technique M-002
→ cadrage M-003
```

Ne pas créer de PR M-002 de remplacement.

## 8. Frontière M-002 / M-003

M-002 reste le référentiel Produit partagé.

M-003 portera notamment :

```text
Fournisseur
→ édition / catalogue identifié
→ Article fournisseur
→ rapprochement Référence Produit M-002
→ conditionnement
→ tarif de référence
→ contexte / prix Dossier
```

Aucun modèle M-003 ne doit être implémenté avant la fermeture propre de M-002 et la validation de son cadrage détaillé.
