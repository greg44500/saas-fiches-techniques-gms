# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : bootstrap technique validé — cadrage produit métier en cours**
>
> **Dernière mise à jour : 2026-09-19**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.
>
> **Aucun module métier n’a encore été implémenté. Aucun modèle métier Mongoose n’a été créé.**

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
9f2b6326c66d8d10460789a19602b70f00066d1e
Merge pull request #4 from greg44500/docs/reprise-after-core-1.0.1
```

Validation post-merge associée :

```text
Core Gate #10
run        : 35366434371
conclusion : success
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

Le contrat Core 1.0.1 distingue :

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

`AGENTS.md` est adapté au produit et rappelle explicitement la frontière Core / métier.

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

Validation post-merge upgrade :

```text
Core Gate #8
run        : 35364254446
head       : 644c76b8c3db408ace0e494f1f50caf52107181d
conclusion : success
```

La mise à jour documentaire post-upgrade a ensuite été fusionnée via la PR #4 et le `main` `9f2b6326...` a été validé par la Core Gate #10.

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

Aucun module M-001 / M-002 / ... n’a encore été cadré ou implémenté.

Les tests Core ne remplaceront jamais les futurs tests métier.

Le cadrage global du produit a en revanche commencé le 2026-09-19.

---

## 8. Cadrage métier désormais formalisé

Branche documentaire de travail :

```text
docs/product-business-framing-foundation
```

Documents ajoutés en statut DRAFT :

```text
docs/PRODUCT-SCOPE.md
docs/ROADMAP.md
docs/domain/GLOSSARY.md
docs/domain/DOMAIN-MODEL.md
```

Ils formalisent les décisions métier validées sans transformer les points ouverts en hypothèses techniques.

### 8.1 Organisation

Orientation actuelle :

```text
Workspace
→ plusieurs dossiers
→ contexte magasin
```

Le Workspace conserve un catalogue commun de produits.

Les conditions commerciales sont contextualisées par magasin/dossier.

### 8.2 Produit

Principes déjà établis :

- nom métier directement compréhensible ;
- nom simple pour un produit entier / standard ;
- précision de préparation dans le nom lorsqu’elle est nécessaire ;
- catégorie ;
- gamme alimentaire uniquement lorsqu’elle est pertinente ;
- unité de référence ;
- rendement produit ;
- photo facultative ;
- dates/auteurs de création et modification ;
- historique des changements significatifs.

Exemple :

```text
Oignon
→ produit entier

Oignon émincé
→ produit préparé distinct
```

La farine constitue un exemple de produit pour lequel la gamme peut être non applicable avec un rendement de 100 %.

### 8.3 Fiabilité et calculs

Principe métier validé :

> L’utilisateur déclare les faits nécessaires ; le système calcule tout ce qui peut être déduit.

Le backend reste l’autorité des calculs et validations.

Le pourcentage de recette est calculé à partir des quantités.

Le taux de rendement est distinct du pourcentage de recette.

Le rendement de référence est défini sur le produit et utilisé automatiquement dans la fiche technique.

### 8.4 Fournisseurs et prix

Le modèle doit séparer :

```text
Produit
Fournisseur
Article / offre fournisseur
Conditionnement
Condition commerciale magasin
```

Le prix n’est pas une propriété directe et intemporelle du Produit.

Une mise à jour de prix doit préserver l’historique et permettre l’analyse des écarts et des fiches impactées.

### 8.5 Fiche technique

Les principes suivants sont déjà retenus :

- fiche structurée, non simple document ;
- composition distincte de la valorisation économique ;
- recalcul avec les prix courants ;
- conservation d’une lecture historique ;
- distinction matières premières / emballages-économat ;
- calcul automatique maximal ;
- valeurs et formules non démontrées non implémentées par hypothèse.

### 8.6 Extensibilité

Les extensions identifiées doivent rester possibles sans obligation de les développer immédiatement.

Sont notamment identifiés :

- alertes et graphiques d’évolution ;
- comparaison fournisseurs ;
- import de mercuriales ;
- OCR facture / catalogue ;
- reverse recipe ;
- optimisation de marge par IA ;
- analyse de portefeuille de fiches ;
- assistant process ;
- infographies ;
- rappels ;
- recherche globale ;
- exports avancés.

### 8.7 Paramètres métier

Le panneau de paramètres peut être différé.

Les candidats identifiés — TVA, marge par défaut, arrondis, seuils, unités, catégories, conditionnements — ne doivent cependant pas être codés comme des constantes rigides sans validation de leur portée.

---

## 9. Points métier restant à cadrer

Le cadrage global n’est pas terminé.

Prochaines décisions prioritaires :

1. Fournisseur ;
2. Article / référence fournisseur ;
3. Conditionnement / colisage ;
4. Prix par magasin ;
5. Historique et sélection de l’offre applicable ;
6. calculs exacts de la fiche technique ;
7. frontière fiche technique / fiche process ;
8. utilisateurs et rôles métier ;
9. capabilities et quotas ;
10. intégrations ;
11. contraintes réglementaires ;
12. périmètre V1 / hors V1 ;
13. roadmap finale.

Aucune de ces questions ne doit être tranchée implicitement pendant l’implémentation.

---

## 10. Points techniques non bloquants à suivre

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

## 11. Gate avant tout code métier

Avant tout modèle métier Mongoose :

```text
PRODUCT-SCOPE validé
+
GLOSSARY validé
+
DOMAIN-MODEL validé
+
V1 / hors V1 validé
+
rôles / capabilities / quotas cadrés
+
contraintes réglementaires cadrées
+
ROADMAP validée
↓
cadrage M-001
```

Seulement après validation de M-001 :

```text
branche
→ backend
→ tests backend
→ frontend
→ tests frontend
→ E2E si nécessaire
→ gate
→ PR
→ documentation
```

---

## 12. Point de reprise immédiat

Reprendre le cadrage métier à partir de :

```text
Fournisseur
→ Article fournisseur
→ Conditionnement
→ Prix magasin
→ Historique
```

Puis finaliser les calculs détaillés de la fiche technique.

Ne pas repartir dans des travaux Core génériques en l’absence de blocage réel du produit.
