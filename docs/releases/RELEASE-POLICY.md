# SAAS-CORE-API — Politique de versionnement et de release

**Statut :** canonique — D-015 validée  
**Dernière mise à jour :** 2026-09-18  
**Périmètre :** versionnement du Core, release candidate, tags, provenance et notes de version

---

## 1. Objectif

Cette politique rend le cycle de release du Core explicite et reproductible sans confondre :

```text
version de développement
release candidate
release stable
version d’un SaaS dérivé
version du Core intégrée dans un SaaS dérivé
```

D-015 — gouvernance de release —, D-016 — E2E Core Playwright — et D-017 — dérivation et upgrade réel d’un SaaS pilote — sont validées. La première release stable `v1.0.0` a été publiée le 2026-09-17 après validation des critères de la présente politique.

---

## 2. Source de vérité de version

L’identité machine-readable du Core est :

```text
/core-release.json
```

Le champ `version` doit rester strictement aligné avec :

```text
package.json
package-lock.json
frontend/package.json
frontend/package-lock.json
```

Un écart entre ces fichiers doit faire échouer la gate de release.

Le fichier `core-release.json` contient uniquement une identité de release stable à committer :

```text
schemaVersion
name
repository
version
channel
```

Il ne contient pas le SHA du commit qui le contient lui-même. La provenance immuable d’une release est portée par le tag Git et le commit qu’il référence.

Cette cohérence concerne l’identité de release du Core. Dans un SaaS dérivé, les `package.json` et lockfiles hérités restent des métadonnées techniques du Core afin de limiter les divergences récurrentes lors des upgrades. Ils ne portent pas l’identité commerciale ni la version applicative du produit dérivé.

L’identité/version applicative du dérivé est portée séparément par `product-release.json`, décrit en section 9.

---

## 3. SemVer

Le Core utilise SemVer :

```text
PATCH
1.0.0 → 1.0.1
→ correction compatible

MINOR
1.0.0 → 1.1.0
→ fonctionnalité compatible

MAJOR
1.x.x → 2.0.0
→ rupture de contrat nécessitant une migration explicite
```

Avant la première version stable :

```text
0.x.y
→ développement

1.0.0-rc.N
→ release candidate

1.0.0
→ première release stable
```

Le préfixe de tag est toujours :

```text
v<version>
```

Exemples :

```text
v1.0.0-rc.1
v1.0.0
v1.0.1
v1.1.0
```

---

## 4. Canaux

`core-release.json` accepte les canaux suivants :

```text
development
rc
stable
```

Règles :

```text
development
→ version 0.x.y pendant la préparation initiale

rc
→ version 1.0.0-rc.N ou autre prerelease explicitement décidée

stable
→ version SemVer sans suffixe prerelease
```

La release stable courante publiée avant la préparation de `v1.1.0` est :

```text
version = 1.0.1
channel = stable
```

Une version présente dans `main` n’est considérée comme publiée qu’après création du tag immuable et de la GitHub Release correspondante.

La présence de ces métadonnées dans une branche ou un commit ne constitue pas à elle seule une publication. La gouvernance de release ne crée jamais automatiquement `v1.0.0` : le tag et la GitHub Release ne sont créés qu’après validation du commit `main` concerné.

---

## 5. Release candidate Core 1.0

D-015 a préparé le mécanisme de release candidate et D-016 a intégré les parcours E2E du Core à la gate canonique.

Le premier tag `v1.0.0-rc.N` ne doit être créé que lorsqu’un HEAD précis a satisfait les gates requises pour la candidate concernée et que la stratégie de dérivation/upgrade attendue par D-017 est effectivement prête à être exercée.

Une correction après une RC produit une nouvelle candidate :

```text
v1.0.0-rc.1
→ corrections
→ v1.0.0-rc.2
```

`v1.0.0` a été publiée après validation de D-017, absence de blocker Core 1.0 actif et Core Gate post-merge verte sur le commit `dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff`. Les releases ultérieures restent soumises aux mêmes principes de validation applicables à leur version.

---

## 6. Git tags et GitHub Releases

Chaque RC ou release stable doit posséder :

```text
1 tag Git annoté ou release GitHub attachée à un tag immuable
+
1 GitHub Release
+
notes de version structurées
```

Un tag publié ne doit pas être déplacé vers un autre commit.

Une erreur dans une release publiée se corrige par une nouvelle version, pas par réécriture silencieuse du tag existant.

---

## 7. Notes de version obligatoires

Chaque release destinée aux applications dérivées documente au minimum :

```text
version
commit/tag source
résumé fonctionnel
changements de contrats observables
correctifs de sécurité pertinents
migrations requises
ordre pre-deploy / post-deploy
variables d’environnement ajoutées/modifiées
changements de dépendances significatifs
instructions d’upgrade
rollback / reprise
contrôles post-déploiement
```

Une migration ou une variable d’environnement ne doit pas être découverte seulement après intégration du code par un SaaS dérivé.

---

## 8. Changelog

Le dépôt utilise `CHANGELOG.md` comme historique humain des releases formelles.

Avant la première RC, l’historique détaillé de développement reste dans Git. Le changelog ne prétend pas reconstruire artificiellement une chronologie de releases qui n’a jamais existé.

À partir de la première RC, chaque version publiée reçoit une entrée datée.

---

## 9. Provenance du Core dans un SaaS dérivé

Le Core expose son identité courante via `core-release.json`.

Un SaaS dérivé doit conserver sa propre provenance d’intégration dans :

```text
core-origin.json
```

Contrat cible :

```json
{
  "schemaVersion": 1,
  "repository": "greg44500/saas-core-api",
  "version": "1.0.0-rc.1",
  "tag": "v1.0.0-rc.1",
  "commit": "<sha du tag Core intégré>",
  "integratedAt": "<date ISO>"
}
```

Le SaaS dérivé met à jour ce fichier après intégration validée d’une nouvelle version du Core.

La version applicative du produit dérivé reste indépendante de la version du Core. Cette identité est déclarée dans :

```text
product-release.json
```

Contrat :

```json
{
  "schemaVersion": 1,
  "name": "saas-example-product",
  "repository": "owner/saas-example-product",
  "version": "0.1.0",
  "channel": "development"
}
```

Règles :

```text
core-release.json
→ identité/version du Core

core-origin.json
→ provenance exacte du Core intégré dans le produit

product-release.json
→ identité/version applicative propre au produit
```

`product-release.json` utilise SemVer et les canaux `development`, `rc` et `stable` selon les mêmes contraintes de forme que les releases Core, mais sa version n’est pas comparée à celle de `core-release.json` ni aux versions des packages Core hérités.

La gate `release:verify` exige désormais `product-release.json` lorsqu’un dépôt contient `core-origin.json`. Inversement, `product-release.json` n’est pas accepté dans le dépôt Core sans `core-origin.json`.

Un produit dérivé ne doit donc pas renommer ou reversionner les packages Core uniquement pour porter son identité applicative. Cette séparation réduit les conflits lors des futurs merges `core-update/vX.Y.Z`.

D-017 a validé la provenance via `core-origin.json` sur le dépôt dérivé réel `saas-core-derived-pilot`. Le contrat `product-release.json` complète cette séparation pour les produits dérivés réels créés après la stable 1.0.

---

## 10. Branche de travail et intégration

Une évolution de release doit être développée sur une branche dédiée puis intégrée dans `main` après validation.

Pour les mises à jour du Core dans un produit dérivé :

```text
upstream-core
→ branche core-update/<version>
→ tests et migrations
→ Pull Request du produit
→ main du produit
```

Une release Core n’est jamais injectée directement dans le `main` d’un produit dérivé sans revue.

---

## 11. Gate de release

La commande canonique du dépôt est :

```bash
npm run release:check
```

Elle couvre actuellement :

```text
cohérence des métadonnées de release
cohérence de l’inventaire des migrations
lint backend / tooling de release / E2E
tests backend
lint frontend
tests frontend
build frontend
Playwright E2E Core
```

Les E2E Playwright sont installés sous `e2e/`, exécutés par `npm run test:e2e` et inclus dans la commande canonique depuis D-016.

`npm run format:check` reste disponible comme contrôle qualité séparé. Il n’est pas ajouté comme blocker de `release:check` tant qu’une baseline globale du dépôt n’a pas été explicitement validée verte ; la gouvernance de release ne doit pas créer une nouvelle gate rouge uniquement par convention.

Une gate locale et une CI doivent exécuter la même commande canonique afin d’éviter deux définitions concurrentes du mot « vert ».

---

## 12. Protection de `main`

Le ruleset GitHub `Main protection` est actif sur la branche par défaut.

La gouvernance distante actuelle impose notamment :

```text
Pull Request obligatoire
+
required status check : Core Gate
+
suppression de la branche protégée interdite
+
non-fast-forward interdit
```

La configuration distante reste une donnée GitHub et ne peut pas être déduite uniquement des fichiers versionnés. Elle doit être vérifiée lorsque la gouvernance de release ou les règles du dépôt sont modifiées.

---

## 13. Règles de stabilité

Une release stable ne doit pas être créée si l’un des éléments suivants reste faux :

```text
version et provenance cohérentes
gate de release verte
migrations documentées
release notes prêtes
tag cible inexistant avant publication
D-017 validée
aucun blocker Core 1.0 actif
```

`v1.0.0` signifie que la stratégie de distribution et d’upgrade du Core a été réellement éprouvée ; ce n’est pas seulement un changement de nombre dans `package.json`.
