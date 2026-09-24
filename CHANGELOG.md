# Changelog

Ce fichier suit les releases formelles de `saas-core-api` à partir de D-015.

La première release candidate formelle du Core est `v1.0.0-rc.1`, publiée le 2026-09-17. L’historique détaillé antérieur à cette première candidate reste disponible dans Git ; il n’est pas reconstruit artificiellement comme une succession de versions qui n’ont jamais été publiées.

## Unreleased

Aucun changement supplémentaire documenté.

---

## 1.2.1 — 2026-09-24

Patch rétrocompatible isolant les suites Playwright E2E des quotas anti-abus destinés au runtime réel, sans modifier les protections de production.

### Fixed

- ajout du flag explicite `E2E_BYPASS_RATE_LIMITS`, désactivé par défaut ;
- activation autorisée uniquement avec `NODE_ENV=test` et une base MongoDB dont le nom se termine par `_e2e_test` ;
- l'environnement Playwright Core active explicitement ce flag ;
- les rate limiters restent montés et utilisent un predicate `skip` uniquement lorsque le contexte E2E sécurisé est actif ;
- le mécanisme couvre le limiter API global, register, login IP/email, forgot-password IP/email, reset-password et les acceptations d'invitations Workspace, Platform et commerciales ;
- les factories de rate limiting restent testables avec des seuils faibles et les tests de sécurité historiques continuent à exercer les vrais limiteurs.

### Security

- aucun plafond de production n'est relevé ;
- aucun bypass implicite fondé sur le seul `NODE_ENV=test` ;
- une activation du bypass en `development`, en `production` ou sur une base non `*_e2e_test` est refusée au démarrage ;
- les suites Vitest ne bénéficient pas automatiquement du bypass et conservent la couverture anti-abus.

### Impact

- nouvelle variable d'environnement `E2E_BYPASS_RATE_LIMITS`, `false` par défaut ;
- aucune migration MongoDB ;
- aucune dépendance ajoutée, supprimée ou mise à niveau ;
- aucun changement d'endpoint, payload ou contrat frontend ;
- aucun changement métier spécifique à un SaaS dérivé ;
- évolution rétrocompatible classée PATCH.

---

## 1.2.0 — 2026-09-22

Release mineure rétrocompatible ajoutant une troisième frontière d’autorisation pour les ressources métier globales des SaaS dérivés.

### Added

- registre code-owned `applicationGlobalPermission.registry.js` pour les permissions métier globales déclarées par le dérivé ;
- modèles persistants `ApplicationGlobalRole` et `ApplicationGlobalMember` ;
- résolution persistée `resolveApplicationGlobalAuthorization()` indépendante de Platform et des Workspaces ;
- guard backend `authorizeApplicationGlobalPermission()` ;
- services génériques de gouvernance des rôles et memberships avec anti-escalade ;
- primitives de synchronisation des rôles système et de bootstrap explicite ;
- AuditLogs dédiés ;
- migration d’index `migration:application-global-authorization-indexes` ;
- contrat canonique `docs/contracts/APPLICATION-GLOBAL-AUTHORIZATION.md`.

### Security

- aucune autorité métier globale n’est déduite de `PlatformRole`, `PlatformTeamMember`, `Role` ou `WorkspaceMember` ;
- permissions inconnues et collisions de scope refusées ;
- namespaces `platform:` et `workspace:` interdits aux permissions globales applicatives ;
- rôle archivé ou membership suspendu/révoqué : aucun droit ;
- les mutations ordinaires ne peuvent attribuer que des permissions déjà détenues par l’acteur ;
- les permissions réservées restent limitées aux rôles système code-owned.

### Impact

- aucune permission métier spécifique n’est ajoutée au Core ;
- aucune route métier GMS ni surface frontend Core n’est ajoutée ;
- deux nouvelles collections MongoDB sont introduites ;
- une migration d’index est requise avant activation en production ;
- aucune variable d’environnement ni dépendance supplémentaire ;
- évolution rétrocompatible classée MINOR.

---

## 1.1.2 — 2026-09-22

Patch rétrocompatible stabilisant les tests frontend qui interagissent avec des primitives Base UI rendues de façon asynchrone via Portal.

### Fixed

- les tests Select attendent désormais le montage de la première option avec `findByRole` lorsqu'elle est recherchée immédiatement après l'ouverture du popup ;
- les tests de sidebars utilisant un Popover Base UI attendent désormais le montage du contenu rendu via Portal avant interaction ;
- l'audit global des patterns analogues conserve les `getByRole` synchrones uniquement lorsque le contenu est déjà monté ;
- aucune temporisation artificielle, boucle de retry ou augmentation arbitraire de timeout n'est introduite.

### Impact

- changements limités aux tests frontend ;
- aucun changement de code de production ;
- aucune migration MongoDB ;
- aucune variable d'environnement ;
- aucune dépendance ajoutée, supprimée ou mise à niveau ;
- aucun changement de modèle ou d'index MongoDB ;
- aucun breaking change HTTP ;
- aucune modification métier spécifique à un SaaS dérivé.

---

## 1.1.1 — 2026-09-22

Patch rétrocompatible corrigeant une réinitialisation différée de pagination dans la liste des fichiers et stabilisant les tests Select Base UI sous jsdom.

### Fixed

- `WorkspaceFilesPage` ne programme plus de debounce lorsque la recherche normalisée est déjà identique à la recherche active ;
- la pagination serveur n’est plus ramenée à la page 1 après le montage initial avec une recherche vide ;
- le debounce réel de recherche et le retour page 1 lors d’un changement effectif de recherche sont conservés ;
- le harness Vitest/jsdom fournit désormais une géométrie de fallback aux combobox lorsque jsdom retourne `0 × 0`, ce qui stabilise globalement les Select Base UI sans modifier les composants de production ;
- les tests interactifs Select restent libres d’attendre le montage asynchrone des options via `findByRole` lorsque nécessaire.

### Impact

- aucune migration MongoDB ;
- aucune variable d’environnement ;
- aucune dépendance ajoutée, supprimée ou mise à niveau ;
- aucun changement de modèle ou d’index MongoDB ;
- aucun breaking change HTTP ;
- aucun changement du composant Select en production ;
- aucune modification métier spécifique à un SaaS dérivé.

---

## 1.1.0 — 2026-09-21

Release mineure rétrocompatible ajoutant un point d’extension transactionnel générique au lifecycle `WorkspaceMember`.

### Added

- nouveau composition root `backend/config/applicationWorkspaceMemberLifecycle.registry.js` ;
- nouveau registre générique `WorkspaceMember lifecycle` ;
- événement V1 volontairement limité à `onMemberRemoved` ;
- transmission au handler de `workspaceId`, `membershipId`, `userId`, `actorId`, de la session MongoDB active et du contexte HTTP disponible ;
- exécution déterministe et séquentielle des handlers applicatifs dans la transaction Core ;
- couverture des deux voies Core actuelles vers `WorkspaceMember.status = REMOVED` : retrait administratif et fermeture de compte.

### Changed

- un échec d’un handler applicatif de retrait est propagé afin de permettre le rollback transactionnel complet ;
- `SUSPENDED` ne déclenche pas `onMemberRemoved` ;
- la réactivation d’un ancien membership `REMOVED` par invitation reste inchangée et ne restaure aucune relation métier dérivée ;
- les contrats de dérivation documentent les contraintes de retry/idempotence des handlers transactionnels.

### Impact

- aucune migration MongoDB ;
- aucune variable d’environnement ;
- aucune dépendance ajoutée, supprimée ou mise à niveau ;
- aucun changement de modèle ou d’index MongoDB ;
- aucun breaking change HTTP ;
- les applications dérivées sans module lifecycle enregistré conservent le comportement Core existant.

---

## 1.0.1 — 2026-09-18

Patch de gouvernance des SaaS dérivés corrigeant l’écart entre le contrat 1.0 — version applicative du produit indépendante du Core — et la gate de release héritée.

### Changed

- ajout du contrat machine-readable `product-release.json` pour l’identité et la version applicative propres au produit dérivé ;
- `release:verify` exige ce fichier lorsqu’un `core-origin.json` est présent ;
- `product-release.json` est refusé dans le dépôt Core lorsqu’aucun `core-origin.json` n’existe ;
- validation SemVer et des canaux `development`, `rc` et `stable` pour la version produit ;
- maintien de `core-release.json` et des package/lockfiles comme métadonnées techniques du Core afin de limiter les conflits d’upgrade.

### Impact

- aucune migration MongoDB ;
- aucune variable d’environnement ;
- aucune dépendance ajoutée ou mise à niveau ;
- aucun changement de contrat DB ;
- aucun changement métier ou runtime de l’API.

---

## 1.0.0 — 2026-09-17

Première release stable du Core, publiée après validation de D-015, D-016 et D-017.

### Validation stable

- aucun blocker Core 1.0 actif démontré par `docs/DEBT.md` ;
- D-017 a validé une dérivation réelle puis un upgrade réel du pilote `saas-core-derived-pilot` ;
- le module métier `catalog` a été conservé sans adaptation fonctionnelle lors du passage de Core `1.0.0-rc.1` à `1.0.0-rc.2` ;
- la Core Gate #36 (run `35245765480`) a validé le `main` post-clôture D-017 au commit `5bf91252415e3e8f97b60c5aa1e165bd9829a3a2` ;
- la préparation stable ne modifie ni contrat DB, ni dépendance, ni variable d’environnement, ni migration applicative.

Publication finale validée :

```text
commit : dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff
Core Gate : #38
run : 35248517242
conclusion : success
tag : v1.0.0
GitHub Release : 390898671
```

Le tag `v1.0.0` est publié et immuable.

---

## 1.0.0-rc.2 — 2026-09-17

Seconde Release Candidate du Core, utilisée pour valider l’upgrade réel du SaaS dérivé pilote.

Référence :

```text
tag : v1.0.0-rc.2
commit : 5c61c7066eeb56460adb164ba39ae0a0462bef53
channel : rc
Core Gate post-merge : #34
run : 35239618709
conclusion : success
```

### Changed

- durcissement générique de la composition des routes frontend : un même chemin strict ne peut plus être déclaré deux fois dans une même surface ;
- le même chemin reste autorisé sur des surfaces différentes.

### Validation D-017

- upgrade Git réel du pilote depuis `v1.0.0-rc.1` vers `v1.0.0-rc.2` ;
- zéro conflit manuel ;
- aucune adaptation fonctionnelle du module `catalog` ;
- provenance `core-origin.json` mise à jour ;
- gates pilote #9, #10 et #11 validées.

---

## 1.0.0-rc.1 — 2026-09-17

Première Release Candidate réelle du Core, utilisée comme base immuable de dérivation pour l’exercice D-017.

Référence :

```text
tag : v1.0.0-rc.1
commit : 432fcfd88cd185234e6317a27df0d3d458f93f28
channel : rc
Core Gate post-merge : #28
run : 35224400758
conclusion : success
```

### Release governance

- politique SemVer et cycle release candidate / stable ;
- identité Core machine-readable via `core-release.json` ;
- inventaire machine-readable des migrations ;
- gate de release reproductible ;
- CI `Core Gate` alignée sur `npm run release:check` ;
- ruleset `Main protection` actif avec Pull Request et status check `Core Gate` requis ;
- tag Git annoté `v1.0.0-rc.1` publié sur le SHA validé ;
- GitHub Release publiée comme pre-release avec notes structurées.

### E2E Core

- package Playwright autonome sous `e2e/` ;
- environnement E2E isolé avec garde MongoDB `_e2e_test` ;
- parcours critiques Auth, Workspace et Account couverts ;
- `npm run test:e2e` intégré à `npm run release:check` et à la CI `Core Gate`.

### Core 1.0

- D-015 et D-016 sont validées ;
- l’audit final architecture / sécurité / qualité n’a démontré aucun nouveau blocker applicatif ;
- la préparation de `1.0.0-rc.1` n’introduit pas de fonctionnalité métier supplémentaire ;
- le module pilote `catalog` reste destiné au dépôt SaaS dérivé, pas au Core ;
- la release stable `v1.0.0` reste interdite tant que D-017 n’a pas validé la dérivation et l’upgrade réels d’un SaaS pilote.

---

## Development baseline — 0.1.0

La ligne `0.1.0` représente la phase de construction du Core avant adoption du processus de release formel. Elle inclut notamment les fondations Auth, Workspace, RBAC, Plans/Subscriptions/Entitlements, Files, Audit, Retention, Platform et Help validées avant l’ouverture de D-015.
