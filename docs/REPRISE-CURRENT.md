# SAAS-FICHES-TECHNIQUES-GMS — Reprise courante

> **Statut : reprise produit — bootstrap technique en cours**
>
> **Dernière mise à jour : 2026-09-18**
>
> Le code réel, les contraintes DB, les tests/gates réellement exécutés et les contrats canoniques priment sur cette synthèse.
>
> **Aucun module métier n’a encore été implémenté.**

---

## 1. Autorité et méthode

Ordre d’autorité :

1. code réel + contraintes DB ;
2. tests/gates réellement exécutés ;
3. contrats fonctionnels validés ;
4. contrats Core de la version intégrée ;
5. architecture/sécurité/guidelines ;
6. dette active ;
7. documentation opérationnelle ;
8. présente reprise.

À chaque nouvelle conversation : lire la base de connaissance, lire cette reprise, vérifier GitHub, identifier le lot en cours, puis seulement modifier.

Principe directeur :

```text
Core = fondations génériques
Produit = métier
```

Tout besoin générique doit être traité dans le Core, testé/versionné, puis intégré au produit via une branche `core-update/vX.Y.Z`.

---

## 2. Produit et provenance

Dépôt produit :

```text
greg44500/saas-fiches-techniques-gms
```

Répertoire local :

```text
C:\Users\gregd\Documents\Web-Projects\saas-fiches-techniques-gms
```

Le dépôt Core local reste séparé :

```text
C:\Users\gregd\Documents\Web-Projects\saas-core-api
```

Le pilote `saas-core-derived-pilot` reste uniquement une preuve de dérivation/upgrade.

Core source :

```text
greg44500/saas-core-api
version : 1.0.0
tag     : v1.0.0
commit  : dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff
```

Remotes produit :

```text
origin        → https://github.com/greg44500/saas-fiches-techniques-gms.git
upstream-core → https://github.com/greg44500/saas-core-api.git
```

Le produit a été créé en conservant l’historique Git complet du Core puis en positionnant `main` sur `v1.0.0`. Les tags Core n’ont pas été poussés dans le dépôt produit.

Ne jamais faire de `git pull` aveugle depuis `upstream-core/main`.

---

## 3. core-origin.json

Le produit contient :

```json
{
  "schemaVersion": 1,
  "repository": "greg44500/saas-core-api",
  "version": "1.0.0",
  "tag": "v1.0.0",
  "commit": "dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff",
  "integratedAt": "2026-09-18T08:58:51Z"
}
```

Contrôles effectués :

- JSON valide ;
- UTF-8 sans BOM ;
- provenance exacte ;
- aucun autre fichier dans le commit.

Commit :

```text
e7627b511c5f8cc532121c01397251c9ffd5ffb9
chore: record Core v1.0.0 provenance
```

---

## 4. PR #1 et gates GitHub

PR :

```text
#1 — Bootstrap — Enregistrer la provenance Core v1.0.0
branche : chore/bootstrap-product
```

Première Core Gate PR : un seul test frontend hérité du Core a échoué :

```text
platform-subscription-grant-trial-form.test.jsx
Unable to find an accessible element with the role "option" and name "Beta"
```

Cette tentative avait tout de même :

```text
backend  : 330 fichiers / 1565 tests passés
frontend : 237/238 fichiers / 814/815 tests passés
```

Le même test était identique dans Core `v1.0.0` et le `main` Core et avait passé dans les gates Core de référence. Une réexécution sans changement de code a réussi :

```text
Core Gate #2
run     : 35328016494
attempt : 2
result  : success
```

Conclusion : incident très probablement intermittent/flaky dans un test Core hérité. Aucune correction n’a été faite dans le produit.

La PR #1 a été fusionnée.

Main produit de référence :

```text
8d7fb89d81393d54be63373baf1ed278b0a57c7c
```

Gate post-merge :

```text
Core Gate #3
run        : 35329384101
head       : 8d7fb89d81393d54be63373baf1ed278b0a57c7c
conclusion : success
```

---

## 5. État local avant arrêt

Le local a été réaligné sur le main distant :

```text
8d7fb89d (HEAD -> main, origin/main)
working tree clean
```

Après le build frontend, une nouvelle vérification `git status --short` reste à faire à la reprise.

Versions contrôlées :

```text
Node : v24.19.0
npm  : 10.9.2
```

Contrat Core : Node `>=24.7 <25`. Version conforme.

---

## 6. Dépendances installées

Racine :

```text
npm ci
309 packages
6 vulnerabilities : 4 moderate, 2 high
```

Ces mêmes alertes étaient présentes dans des gates Core vertes. Aucun `npm audit fix` automatique n’a été lancé.

Frontend :

```text
npm --prefix frontend ci
309 packages
0 vulnérabilité
```

E2E :

```text
npm --prefix e2e ci
3 packages
0 vulnérabilité
```

Après les installations, Git restait propre.

---

## 7. MongoDB local et bases dédiées

Infrastructure existante réellement vérifiée :

```text
127.0.0.1:27017
replica set : rs0
ping        : 1
```

Aucun nouveau serveur/port/cluster/replica set n’a été créé.

Bases produit :

```text
développement  : saas_fiches_techniques_gms_dev
tests backend  : saas_fiches_techniques_gms_test
E2E cible      : saas_fiches_techniques_gms_e2e_test
```

Les E2E doivent toujours utiliser une base terminant strictement par `_e2e_test`.

---

## 8. .env local

Aucun `.env` n’existait initialement.

Un `.env` local a été créé ; il est ignoré par Git et contient des secrets locaux générés aléatoirement. Ne jamais afficher, copier ou versionner ces secrets.

URI dev :

```text
mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_dev?replicaSet=rs0
```

Le fichier est organisé avec des commentaires professionnels par blocs : application, DB, JWT, workspaces, SMTP, fichiers, ClamAV, trial, sécurité dev.

Choix provisoire conservé pendant le bootstrap :

```text
JWT_ACCESS_ISSUER   = saas-core-api
JWT_ACCESS_AUDIENCE = saas-core-api
```

Ne pas renommer avant audit de l’identité produit versionnée.

Validation Zod réelle :

```text
ENV_OK
```

SMTP dev :

```text
localhost:1025
```

---

## 9. Baseline manuelle

Backend :

```text
npm run start
```

Endpoint santé :

```text
GET http://localhost:5000/api/health
status  : success
message : API opérationnelle
```

Frontend :

```text
npm --prefix frontend run dev
```

Vite utilise par défaut `http://localhost:5000` pour le proxy `/api`. Aucun `frontend/.env` n’a été nécessaire.

Interface visuelle : visible et fonctionnelle.

---

## 10. Tests locaux déjà validés

Premier `npm test` : refus de sécurité normal parce que le `.env` pointait vers la base dev.

Le Core impose une base contenant `_test` pour les tests Mongoose.

Overrides temporaires utilisés dans le terminal de test :

```powershell
$env:NODE_ENV="test"
$env:MONGODB_URI="mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_test?replicaSet=rs0"
```

Le `.env` de développement n’a pas été modifié.

Backend final :

```text
Test Files : 330 passed (330)
Tests      : 1565 passed (1565)
```

Frontend :

```text
Test Files : 238 passed (238)
Tests      : 815 passed (815)
```

Build frontend :

```text
vite v8.2.2
2734 modules transformed
built in 1.51s
SUCCESS
```

Avertissement non bloquant hérité :

```text
Some chunks are larger than 500 kB after minification
index-BfKpZlmJ.js : 567.78 kB / gzip 164.28 kB
```

Aucune optimisation de bundle n’a été entreprise dans le produit.

---

## 11. Ce qui reste à faire AVANT le métier

La baseline technique n’est pas encore clôturée.

### A. Reprise immédiate

1. vérifier GitHub réel ;
2. vérifier l’état de la branche/PR documentaire `docs/reprise-bootstrap-current` ;
3. réaligner le local si nécessaire ;
4. exécuter `git status --short` après le build.

### B. E2E locaux

Les dépendances E2E sont installées mais Chromium Playwright n’a pas encore été installé/vérifié dans cette séquence.

À faire :

1. installer/vérifier Chromium Playwright ;
2. définir une URI E2E produit :
   `mongodb://127.0.0.1:27017/saas_fiches_techniques_gms_e2e_test?replicaSet=rs0` ;
3. exécuter les E2E ;
4. ne jamais utiliser la base dev pour un nettoyage E2E.

### C. Gate canonique locale

`npm run release:check` n’a pas encore été exécuté localement sur la baseline produit.

Attention :

- le `.env` pointe vers `_dev` ;
- les tests backend de la gate doivent recevoir la base `saas_fiches_techniques_gms_test` via variables du terminal ;
- les E2E doivent recevoir `saas_fiches_techniques_gms_e2e_test` ;
- ne jamais annoncer une gate verte sans preuve.

### D. Identité technique versionnée du produit

Plusieurs éléments hérités portent encore l’identité `saas-core-*` :

- package racine ;
- package frontend ;
- `core-release.json` ;
- JWT CI/E2E ;
- bases CI/E2E par défaut ;
- noms SMTP CI/E2E ;
- autres métadonnées éventuelles.

Avant toute modification :

1. relire `docs/derived-saas/DERIVED-SAAS.md` ;
2. relire `docs/releases/RELEASE-POLICY.md` ;
3. inspecter le pilote réel ;
4. comprendre `release:verify` et `core-release.json` ;
5. distinguer métadonnée de provenance Core et identité applicative du produit.

Ne pas casser `release:check` par un renommage naïf.

### E. .env.example produit

Le `.env.example` versionné est encore celui du Core. Il devra être adapté après l’audit ci-dessus, avec commentaires professionnels, base produit, placeholders non secrets et cohérence Zod/CI/E2E.

### F. Gouvernance Git et documentation produit

Encore à traiter :

- `AGENTS.md` produit ;
- guidelines architecture/backend/frontend/UIUX/tests ;
- protection/ruleset de `main` ;
- PR/checks obligatoires selon la gouvernance retenue.

Le Core `v1.0.0` ne contient pas forcément les documents ajoutés après sa release sur `upstream-core/main`. Ne pas cherry-pick aveuglément ces évolutions.

### G. Cadrage produit global

Avant le premier modèle métier Mongoose, créer/adapter et valider :

```text
docs/PRODUCT-SCOPE.md
docs/ROADMAP.md
docs/DEBT.md
docs/REPRISE-CURRENT.md
docs/domain/GLOSSARY.md
docs/domain/DOMAIN-MODEL.md
```

Aucun module métier n’est cadré ou codé à ce stade.

Le cadrage global doit couvrir : problème, utilisateurs, valeur, V1/hors V1, domaines, vocabulaire, tenancy/ownership, rôles, capabilities, quotas, intégrations, contraintes réglementaires, roadmap.

Seulement après validation globale : cadrer `M-001`.

---

## 12. Règle Core / produit

```text
générique et réutilisable → candidat Core
spécifique au produit     → produit
```

Si une évolution générique est nécessaire :

1. la traiter dans `saas-core-api` ;
2. la tester et la versionner ;
3. l’intégrer ensuite par `core-update/vX.Y.Z`.

Le test Select Base UI intermittent de la PR #1 illustre cette règle.

---

## 13. État synthétique

```text
Provenance Core                       VALIDÉE
PR #1                                 FUSIONNÉE
Core Gate #2 attempt 2                SUCCESS
Core Gate #3 post-merge               SUCCESS
Node/npm local                        CONFORMES
Dépendances racine/frontend/e2e       INSTALLÉES
MongoDB rs0                           VALIDÉ
.env Zod                              ENV_OK
Backend manuel + /api/health          OK
Frontend manuel                       OK
Tests backend                         330/330 — 1565/1565
Tests frontend                        238/238 — 815/815
Build frontend                        SUCCESS
E2E locaux                            À FAIRE
release:check local                   À FAIRE
Identité produit versionnée           À AUDITER
.env.example produit                  À ADAPTER
Gouvernance produit                   À METTRE EN PLACE
Cadrage métier                        NON COMMENCÉ
```

---

## 14. Point de départ de la prochaine conversation

La prochaine conversation doit reprendre **avant les E2E locaux**.

Ordre recommandé :

```text
1. lire KB-START-HERE / base de connaissance
2. lire cette reprise
3. vérifier GitHub réel et HEAD main
4. vérifier/terminer la PR de cette reprise documentaire
5. réaligner le local
6. vérifier git status --short
7. auditer identité produit héritée / contrats de release
8. installer/vérifier Chromium Playwright
9. exécuter E2E sur saas_fiches_techniques_gms_e2e_test
10. exécuter lint/gates applicables
11. exécuter release:check avec environnement sûr
12. finaliser bootstrap technique
13. adapter identité/.env.example/gouvernance
14. cadrer le produit global
15. seulement ensuite cadrer M-001
```

Ne pas coder de métier avant la clôture et la preuve de cette baseline.
