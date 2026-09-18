# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : bootstrap technique validé — cadrage produit métier à démarrer**
>
> **Dernière mise à jour : 2026-09-18**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.
>
> **Aucun module métier n’a encore été implémenté.**

---

## 1. Autorité et principe directeur

Ordre d’autorité :

1. code réel + contraintes DB ;
2. tests/gates réellement exécutés ;
3. contrats fonctionnels validés ;
4. contrats Core correspondant à la version intégrée ;
5. architecture/sécurité/guidelines ;
6. dette active ;
7. documentation opérationnelle ;
8. présente reprise.

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

Tout besoin générique doit être traité dans le Core, testé/versionné, puis intégré au produit via une branche `core-update/vX.Y.Z`.

---

## 2. Produit et état GitHub validé

Dépôt :

```text
greg44500/saas-fiches-techniques-gms
```

Main validé :

```text
644c76b8c3db408ace0e494f1f50caf52107181d
Merge pull request #3 from greg44500/core-update/v1.0.1
```

Remotes attendus :

```text
origin        → https://github.com/greg44500/saas-fiches-techniques-gms.git
upstream-core → https://github.com/greg44500/saas-core-api.git
```

Le pilote `saas-core-derived-pilot` reste uniquement une preuve de dérivation/upgrade et ne doit pas servir de base au produit réel.

---

## 3. Core intégré

Core source :

```text
repository : greg44500/saas-core-api
version    : 1.0.1
tag        : v1.0.1
commit     : 9613bdb0c70ee1950dfa7da68e5cbefa704e88f1
```

Le tag `v1.0.1` a été intégré par la branche :

```text
core-update/v1.0.1
```

Le conflit sur `docs/REPRISE-CURRENT.md` a été résolu en conservant la synthèse propre au produit. La synthèse du Core ne doit jamais remplacer celle du produit.

`core-origin.json` a été mis à jour uniquement après validation réelle de l’upgrade.

---

## 4. Identité de release

Le contrat Core 1.0.1 distingue désormais :

```text
core-release.json
→ identité/version du Core

core-origin.json
→ provenance exacte du Core intégré

product-release.json
→ identité/version propre au produit
```

Identité produit actuelle :

```text
name       : saas-fiches-techniques-gms
repository : greg44500/saas-fiches-techniques-gms
version    : 0.1.0
channel    : development
```

Les `package.json` et lockfiles conservent l’identité/version du Core conformément au contrat de dérivation.

`AGENTS.md` est maintenant adapté au produit et rappelle explicitement la frontière Core / métier.

---

## 5. Validation de l’upgrade Core v1.0.1

Validation locale réellement exécutée :

```text
npm run release:verify
→ SUCCESS

npm run release:check
→ SUCCESS
```

La gate locale complète a été exécutée avec une base MongoDB dédiée aux tests :

```text
mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_test?replicaSet=rs0
```

Le garde-fou MongoDB a correctement refusé une première exécution lorsque la base ne se terminait pas par `_test`.

PR d’upgrade :

```text
PR #3 — Core update: integrate v1.0.1
head : c2d08c3986d2c1580da71137d5a3fad3b3ecdb0d
```

Validation PR :

```text
Core Gate #6
run        : 35363449426
conclusion : success
```

Merge :

```text
main : 644c76b8c3db408ace0e494f1f50caf52107181d
```

Validation post-merge :

```text
Core Gate #8
run        : 35364254446
head       : 644c76b8c3db408ace0e494f1f50caf52107181d
conclusion : success
```

L’upgrade Core `v1.0.1` est donc validé de bout en bout.

---

## 6. Infrastructure locale validée

Versions contrôlées :

```text
Node : v24.19.0
npm  : 10.9.2
```

MongoDB local :

```text
127.0.0.1:27017
replica set : rs0
```

Bases produit :

```text
développement : saas_fiches_techniques_gms_dev
tests backend : saas_fiches_techniques_gms_test
E2E           : saas_fiches_techniques_gms_e2e_test
```

Le `.env` local reste non versionné et utilise la base de développement dédiée au produit.

---

## 7. État fonctionnel

Le socle Core est opérationnel et validé.

Aucun modèle métier GMS n’a encore été créé.

Aucun module métier n’a encore été cadré ou implémenté.

Les tests Core ne remplaceront jamais les futurs tests métier.

---

## 8. Points techniques non bloquants à suivre

Certains éléments hérités portent encore une identité technique Core, notamment selon les fichiers :

- valeurs par défaut JWT issuer/audience ;
- certaines valeurs CI/E2E ;
- `.env.example` ;
- identité visible frontend héritée ;
- noms SMTP hérités.

Ces éléments ne doivent pas être renommés aveuglément.

Ils seront adaptés lorsqu’un besoin produit explicite le justifiera, sans casser les contrats Core ni compliquer les futurs upgrades.

Toute évolution générique reste à traiter dans `saas-core-api`.

---

## 9. Prochaine étape : cadrage produit global

La prochaine étape prioritaire est désormais le cadrage du SaaS métier.

Avant tout modèle métier Mongoose, créer/adapter et valider :

```text
docs/PRODUCT-SCOPE.md
docs/ROADMAP.md
docs/DEBT.md
docs/REPRISE-CURRENT.md
docs/domain/GLOSSARY.md
docs/domain/DOMAIN-MODEL.md
```

Le cadrage doit couvrir au minimum :

- problème métier ;
- utilisateurs ;
- proposition de valeur ;
- périmètre V1 ;
- hors périmètre ;
- domaines fonctionnels ;
- vocabulaire métier ;
- ownership / tenancy ;
- rôles ;
- capabilities commerciales ;
- quotas éventuels ;
- intégrations externes ;
- contraintes réglementaires ;
- roadmap initiale.

Aucune entité métier ne doit être inventée avant validation de ce cadrage global.

---

## 10. Après validation du cadrage global

Seulement après validation des documents produit :

```text
cadrer M-001
→ branche dédiée
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E si nécessaire
→ gate
→ PR
→ documentation
```

Chaque module devra expliciter notamment les règles métier, invariants, ownership, tenancy, RBAC, capabilities, quotas, API, validation, audit, lifecycle, migrations et critères d’acceptation.

---

## 11. Point de départ de la prochaine conversation

Ordre recommandé :

```text
1. lire KB-START-HERE / base de connaissance
2. lire cette reprise
3. vérifier GitHub réel et HEAD main
4. confirmer que Core v1.0.1 reste la provenance intégrée
5. démarrer le cadrage produit global
6. créer/adapter PRODUCT-SCOPE, ROADMAP, DEBT, GLOSSARY et DOMAIN-MODEL
7. valider le cadrage avec l’utilisateur
8. seulement ensuite cadrer M-001
```

Ne pas repartir dans des travaux Core génériques en l’absence de blocage réel du produit.
