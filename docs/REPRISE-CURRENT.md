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

### 8.4 Fournisseurs, articles, conditionnements et tarifs

Le modèle sépare :

```text
Produit
Fournisseur
Article fournisseur
Conditionnement
Tarif fournisseur de référence
Tarif spécifique magasin
Prix observé
```

Règles validées :

- un même Produit peut avoir plusieurs Articles chez un même Fournisseur ;
- un même Produit peut être proposé par plusieurs Fournisseurs ;
- le conditionnement doit être structuré pour permettre les conversions ;
- le libellé fournisseur original peut être conservé sans devenir l'unique source de calcul ;
- un Tarif fournisseur de référence peut exister sans connaître de magasin ;
- un Tarif spécifique magasin est optionnel et reste séparé ;
- un Prix observé peut provenir notamment d'une facture ;
- la provenance, la date et le contexte éventuel du magasin sont conservés ;
- l'OCR est une extension future qui doit alimenter le même historique tarifaire après contrôles ;
- les prix d'achat utilisés pour les coûts matière sont HT ;
- les prix unitaires et normalisés sont affichés avec exactement 3 décimales ;
- le moteur conserve une précision interne suffisante et n'arrondit pas prématurément.

Le prix n’est pas une propriété directe et intemporelle du Produit.

Une mise à jour tarifaire ajoute une nouvelle valeur historisée et ne détruit pas silencieusement l'ancienne.

Le point encore ouvert est la priorité exacte permettant de déterminer le Prix applicable lorsqu'il existe plusieurs sources valides.

### 8.5 Fiche technique et coûts

Les principes suivants sont désormais validés :

- fiche structurée, non simple document ;
- l'utilisateur saisit la quantité nette réellement présente dans la recette ;
- la quantité brute est calculée automatiquement : `quantité nette / rendement` ;
- le % de recette est calculé sur les quantités nettes ;
- les pertes de rendement influencent la quantité brute et le coût, pas la composition proportionnelle ;
- le prix d'achat HT normalisé sert de base au coût matière ;
- le coût HT d'une ligne ingrédient = quantité brute × prix d'achat HT normalisé ;
- Coût Matière (CM) = somme des coûts HT des lignes d'ingrédients ;
- l'Économat regroupe les consommables achetés nécessaires à la fabrication, au conditionnement ou à la commercialisation ;
- les consommables utilisent, lorsque pertinent, les mêmes mécanismes Fournisseur / Article / Conditionnement / Tarif ;
- les consommables n'utilisent pas les attributs alimentaires non pertinents ;
- l'utilisateur renseigne leur quantité réellement consommée ;
- le système calcule leur coût à partir du prix normalisé ;
- Coût total de fabrication = CM + Économat ;
- l'énergie est exclue de cette définition ;
- composition distincte de la valorisation économique ;
- recalcul avec les prix courants ;
- conservation d’une lecture historique ;
- calcul automatique maximal ;
- valeurs et formules non démontrées non implémentées par hypothèse.

Restent notamment à cadrer : prix applicable, TVA, marge, coefficient, prix théorique, prix conseillé/retenu, marge semi-nette et arrondis des totaux.

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

Le bloc Produit / approvisionnement / coûts directs est désormais avancé.

Prochaines décisions prioritaires :

1. règle du Prix applicable entre tarif fournisseur de référence, tarif spécifique magasin et prix observé ;
2. TVA et portée de la TVA ;
3. objectif de marge ;
4. coefficient / prix théorique ;
5. prix de vente conseillé / retenu ;
6. marge réelle et marge semi-nette ;
7. règles d'arrondi des montants agrégés ;
8. versionnement / validation d'une fiche technique ;
9. frontière fiche technique / fiche process ;
10. dossier / magasin et données minimales ;
11. utilisateurs et rôles métier ;
12. capabilities et quotas ;
13. intégrations ;
14. contraintes réglementaires ;
15. périmètre V1 / hors V1 ;
16. roadmap finale.

Points d'approvisionnement encore ouverts :

- données minimales définitives du Fournisseur ;
- règles d'unicité/lifecycle d'un Article fournisseur ;
- Article privilégié éventuel ;
- liste/gouvernance finale des types de conditionnement.

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

## 12. Granularité Git / PR

Règle de travail validée :

> Une PR correspond à un lot fonctionnel cohérent et vérifiable, pas à une couche technique isolée.

Un modèle Mongoose et une validation Zod peuvent faire l'objet de commits sur une branche, mais ne justifient pas à eux seuls une PR par défaut.

La PR #5 constitue le lot documentaire global de cadrage en cours. Il ne faut pas multiplier les PR documentaires pendant cette phase.

En développement, viser des vertical slices cohérentes : backend, permissions, frontend, tests et documentation du lot lorsque cela est pertinent.

---

## 13. Point de reprise immédiat

Reprendre le cadrage métier à partir de :

```text
Prix applicable
→ TVA
→ marge / coefficient
→ prix théorique
→ prix de vente conseillé / retenu
→ marge réelle / semi-nette
→ arrondis
→ versionnement de la fiche
```

Puis poursuivre avec :

```text
Fiche process
→ Dossier / magasin
→ utilisateurs / RBAC / capabilities / quotas
→ intégrations / réglementation
→ V1 / hors V1
→ validation globale
→ cadrage M-001
```

Ne pas créer de modèle métier avant validation du cadrage global.

Ne pas repartir dans des travaux Core génériques en l’absence de blocage réel du produit.
