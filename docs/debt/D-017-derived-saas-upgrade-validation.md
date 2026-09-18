# D-017 — Validation réelle de la dérivation et de l’upgrade du Core

**Statut :** VALIDÉ — 2026-09-17  
**Démarrage :** 2026-09-17  
**Clôture :** 2026-09-17  
**Périmètre :** Core 1.0 / distribution / SaaS dérivé pilote  
**Dépôt Core :** `greg44500/saas-core-api`  
**Dépôt pilote :** `greg44500/saas-core-derived-pilot`

---

## 1. Objectif et conclusion

D-017 devait démontrer par un exercice réel que `saas-core-api` peut servir de base à un SaaS dérivé, recevoir un module métier séparé, évoluer ensuite côté Core et être réintégré dans le produit dérivé sans perte fonctionnelle ni réécriture inutile du métier.

L’exercice est terminé et les critères de clôture sont démontrés.

Résultat :

```text
Core 1.0.0-rc.1
→ dépôt pilote avec historique Git commun
→ module métier catalog
→ évolution générique du Core
→ Core 1.0.0-rc.2
→ merge Git réel dans le pilote
→ 0 conflit manuel
→ provenance mise à jour après validation
→ gate canonique verte avant provenance
→ gate canonique verte après provenance
→ PR d’upgrade fusionnée
→ gate canonique verte post-merge sur main du pilote
```

Aucune anomalie révélée par l’exercice ne reste classée blocker Core 1.0.

D-017 valide la stratégie de dérivation et d’upgrade du Core. Elle ne signifie pas qu’un produit dérivé est automatiquement prêt pour la production : les dettes dépendantes du produit, de son infrastructure, de sa conformité et de son modèle commercial restent distinctes.

---

## 2. Point de départ validé

Référence Core avant D-017 :

```text
main : fe0c3821a7d2f9377066c98193df1e522131a0be
Core Gate #24
run : 35217570669
conclusion : success
```

D-015 et D-016 étaient déjà validées. L’audit final architecture / sécurité / qualité n’avait démontré aucun nouveau blocker applicatif Core 1.0.

---

## 3. Phase A — première Release Candidate Core

La première RC réelle a été publiée :

```text
version : 1.0.0-rc.1
tag : v1.0.0-rc.1
commit : 432fcfd88cd185234e6317a27df0d3d458f93f28
```

Cette RC a constitué la base immuable de dérivation du pilote.

Le dépôt pilote a été créé en conservant l’historique Git du Core. La provenance initiale a été enregistrée dans `core-origin.json` et fusionnée via la PR pilote #1.

Merge de provenance initiale :

```text
49094539ba91426637c1aba26dbbb0b7b1e7f13a
```

---

## 4. Phase B / C — dépôt pilote et module métier `catalog`

Le module métier minimal retenu est `catalog`.

PR pilote :

```text
#2 — D-017 — Add derived catalog pilot module
merge : f0bb28ce06d782d5b4bb125f659789b5fdb04e49
post-merge Core Gate : #6
résultat : success
```

Le module démontre les responsabilités attendues :

```text
Backend
- model
- validation Zod
- service
- controller
- routes
- permissions métier
- capability
- aide métier
- migration/backfill des rôles système persistés

Frontend
- RTK Query
- route Workspace
- navigation
- page
- widget Dashboard
- tests de composition

Permissions
- catalog:item:read
- catalog:item:create

Capability
- catalog
```

Les points d’extension applicatifs ont été utilisés pour les capabilities, permissions, routes backend, routes frontend, navigation, dashboard et centre d’aide.

Le centre d’aide du produit dérivé charge `catalogHelpModule` via `backend/config/applicationHelp.registry.js` et compose les catégories/fiches métier avec le corpus Core. Le corpus Core n’a pas été réécrit pour intégrer l’aide `catalog`.

La migration métier `backend/migrations/runBackfillCatalogSystemRolePermissionsMigration.js` reste propre au produit dérivé et demeure présente après l’upgrade.

---

## 5. Phase D — évolution Core post-dérivation

Une évolution générique réelle du Core a été développée après la dérivation :

```text
frontend/src/app/application-routes.js
```

Le registre frontend rejette désormais deux `path` strictement identiques dans une même surface :

```text
publicRoutes
authenticatedRoutes
workspaceRoutes
platformRoutes
```

Un même chemin reste autorisé sur deux surfaces différentes.

Cette évolution est :

- générique ;
- indépendante du module `catalog` ;
- compatible avec les points d’extension existants ;
- suffisamment réelle pour tester un upgrade Git effectif.

PR Core :

```text
#20 — D-017 — Harden frontend route composition before derived upgrade
merge : 4bac11cc2514858265327df2b5d288be4b927547
Core Gate #32 : success
```

---

## 6. Publication Core RC2

La nouvelle candidate a été préparée et publiée :

```text
version : 1.0.0-rc.2
tag : v1.0.0-rc.2
commit : 5c61c7066eeb56460adb164ba39ae0a0462bef53
GitHub Release : Core 1.0.0-rc.2
statut : pre-release
```

PR Core :

```text
#21 — Release — Préparation Core 1.0.0-rc.2
main : 5c61c7066eeb56460adb164ba39ae0a0462bef53
Core Gate #34
run : 35239618709
résultat : success
```

Le tag annoté `v1.0.0-rc.2` pointe sur ce commit et ne doit pas être déplacé ou réécrit.

Le diff Core `rc.1 → rc.2` comprend neuf fichiers :

```text
CHANGELOG.md
core-release.json
docs/releases/1.0.0-rc.1.md
frontend/package-lock.json
frontend/package.json
frontend/src/app/application-routes.js
frontend/src/app/application-routes.test.js
package-lock.json
package.json
```

---

## 7. Phase E — upgrade Git réel du pilote

L’upgrade a été réalisé dans le dépôt pilote sur :

```text
core-update/1.0.0-rc.2
```

Le workflow `Prepare Core Upgrade RC2` a exécuté réellement :

```text
git fetch upstream-core --tags
git merge v1.0.0-rc.2
```

Run :

```text
35241436448
résultat : success
```

Merge commit Core → pilote :

```text
c654c3e4e3b3f4821b9bd210cb3b21e2afbe37ea
```

Parents :

```text
pilote avant upgrade : cd13ab0f6a1a1b28a1b8e84102ae990ad0543ce1
Core rc.2            : 5c61c7066eeb56460adb164ba39ae0a0462bef53
```

Résultat Git :

```text
MERGE_CONFLICT_COUNT=0
```

Aucun conflit manuel n’a été nécessaire.

Git a notamment auto-fusionné des zones partagées réellement utilisées des deux côtés :

```text
frontend/src/app/application-routes.js
package.json
```

Les fichiers `catalog` sont restés présents et aucune modification fonctionnelle du module métier n’a été nécessaire pour accepter RC2.

---

## 8. Analyse migrations / configuration / dépendances

La RC2 n’introduit :

- aucune migration Core nouvelle ;
- aucune variable d’environnement nouvelle ;
- aucune dépendance ajoutée ;
- aucune dépendance supprimée ;
- aucune mise à niveau de dépendance ;
- aucun changement de contrat DB.

La migration métier `catalog` reste dans le produit dérivé. Elle n’a pas été absorbée par le Core ni supprimée par l’upgrade.

Conclusion : aucune intervention de migration Core ou de configuration produit n’était requise pour cet upgrade précis.

Cette absence d’intervention est un résultat de l’exercice, pas une règle générale : toute future version Core doit continuer à faire l’objet d’une revue explicite des migrations, variables d’environnement, dépendances et contrats persistés.

---

## 9. Validation de la PR d’upgrade pilote

PR pilote :

```text
#3 — D-017 — Upgrade derived pilot to Core 1.0.0-rc.2
base : main
branche : core-update/1.0.0-rc.2
```

### 9.1 Gate avant mise à jour de provenance

HEAD :

```text
c654c3e4e3b3f4821b9bd210cb3b21e2afbe37ea
```

Validation :

```text
Core Gate #9
run : 35242233294
conclusion : success
Run canonical Core gate : success
```

Cette étape démontre que `Core rc.2 + catalog` fonctionne avant même la mise à jour finale de provenance.

### 9.2 Mise à jour de provenance

Après la Gate #9 uniquement, `core-origin.json` a été mis à jour dans :

```text
bbf8c79bd803b9f31dd504388f8c7e98068b8a2e
```

Provenance finale :

```json
{
  "schemaVersion": 1,
  "repository": "greg44500/saas-core-api",
  "version": "1.0.0-rc.2",
  "tag": "v1.0.0-rc.2",
  "commit": "5c61c7066eeb56460adb164ba39ae0a0462bef53",
  "integratedAt": "2026-09-17T15:49:58Z"
}
```

Validation :

```text
Core Gate #10
run : 35242912831
conclusion : success
Run canonical Core gate : success
```

### 9.3 Fusion et validation post-merge

La PR #3 a été fusionnée dans `main` du pilote :

```text
merge commit : fd7a31d6532898e951b02e75940c09de1eec63ea
```

La gate post-merge a ensuite été réellement exécutée :

```text
Core Gate #11
run : 35243957546
HEAD : fd7a31d6532898e951b02e75940c09de1eec63ea
conclusion : success
Run canonical Core gate : success
```

La validation post-merge constitue la preuve finale que l’état réellement intégré dans `main` du SaaS dérivé reste vert.

---

## 10. Analyse des conflits et de la dérivabilité

Résultat :

```text
conflits manuels : 0
adaptations fonctionnelles catalog après upgrade : 0
```

Le pilote avait réellement modifié/composé certaines zones également touchées par RC2. Git a pourtant pu intégrer la nouvelle version sans conflit manuel.

L’exercice confirme que les points d’extension réduisent la divergence entre Core et produit dérivé : le métier reste principalement dans ses modules et registres applicatifs, tandis que le Core peut évoluer indépendamment.

Cela ne garantit pas qu’aucun futur upgrade ne produira de conflit. Le résultat démontre seulement que le mécanisme prévu fonctionne sur un exercice réel et qu’un conflit futur pourra être traité explicitement dans une branche `core-update/<version>`.

---

## 11. Tests et gates démontrés

Les validations pertinentes de D-017 comprennent notamment :

```text
Core avant D-017
Core Gate #24 : success

Core évolution générique
Core Gate #32 : success

Core RC2 post-merge
Core Gate #34 : success
run 35239618709

Pilote catalog avant upgrade
Core Gate #6 : success

Pilote après merge RC2, provenance encore RC1
Core Gate #9 : success
run 35242233294

Pilote après provenance RC2
Core Gate #10 : success
run 35242912831

Pilote main après fusion de l’upgrade
Core Gate #11 : success
run 35243957546
```

La gate canonique du pilote exécute `npm run release:check`, incluant les contrôles Core, les tests backend et métier présents dans le dépôt, le lint/tests/build frontend et les E2E Playwright applicables.

---

## 12. Critères de clôture

Tous les critères définis au démarrage sont démontrés :

- une RC Core réelle a été publiée ;
- le dépôt pilote distinct conserve l’historique Git du Core ;
- `core-origin.json` identifie exactement la RC intégrée ;
- le module `catalog` utilise réellement les points d’extension ;
- le centre d’aide accepte une extension métier sans réécriture du corpus Core ;
- une évolution Core post-dérivation a réellement été intégrée au pilote ;
- migrations/configuration/dépendances ont été examinées explicitement ;
- les tests Core et métier applicables sont verts ;
- les E2E pertinents inclus dans la gate canonique sont verts ;
- les conflits et divergences Core/métier ont été analysés ;
- aucune anomalie révélée par l’exercice ne reste blocker Core 1.0.

---

## 13. Décision finale

```text
D-017 = VALIDÉ
Blocage Core 1.0 lié à D-017 = levé
```

La stratégie de distribution peut désormais être considérée comme réellement testée :

```text
Core versionné
→ dérivation avec historique commun
→ métier séparé
→ provenance explicite
→ évolution Core
→ upgrade Git réel
→ validation complète
```

Au moment de la clôture de D-017, l’étape suivante était la préparation formelle de la release stable `1.0.0` selon le processus D-015.

Cette étape a ensuite été réalisée :

```text
PR de release : #23
commit stable : dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff
Core Gate post-merge : #38
run : 35248517242
conclusion : success
tag annoté : v1.0.0
GitHub Release : 390898671
```

D-017 reste la preuve de validation de la dérivation et de l’upgrade RC1 → RC2 ; la publication stable ultérieure ne modifie pas cette preuve historique.
