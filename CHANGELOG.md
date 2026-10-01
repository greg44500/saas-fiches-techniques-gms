# Changelog

Ce fichier suit les releases formelles de `saas-core-api` à partir de D-015.

La première release candidate formelle du Core est `v1.0.0-rc.1`, publiée le 2026-09-17. L’historique détaillé antérieur à cette première candidate reste disponible dans Git ; il n’est pas reconstruit artificiellement comme une succession de versions qui n’ont jamais été publiées.

## Unreleased

### Added

- revue qualité Platform ligne par ligne des Variétés et Caractéristiques M-002 avec états `NOT_REQUIRED / PENDING / REVIEWED` ;
- signalement chiffré des Produits ayant des Dimensions Workspace à vérifier et ouverture directe du drawer filtré ;
- suppression fonctionnelle contrôlée d'une Dimension erronée lorsqu'aucune Référence Produit ne l'utilise ;
- compteurs dynamiques des onglets Référentiel, Contributions et Catégories.

### Fixed

- backfill M-002 des références historiques dépourvues de `governanceStatus`, compatible avec `sanitizeFilter=true` ;
- restauration de la visibilité Workspace des Produits historiques ;
- feedback anti-doublon explicite lors de la création d'un Produit ;
- retrait immédiat sécurisé d'une Dimension fraîchement ajoutée.

### Changed

- navigation Platform GMS unifiée sous « Gestion des référentiels », avec onglets Produits/Fournisseurs filtrés par permissions Application Global ;
- aide métier Platform alignée sur cette navigation avec une catégorie unique « Gestion des référentiels », sans modifier le moteur d’aide Core ni les catégories Workspace ;

- drawer Platform Produit densifié : recherche et enrichissement alignés, compteurs, filtres À vérifier/Actives/Archivées/Toutes et actions par icônes ;
- aides secondaires de création/enrichissement déplacées vers des infobulles contextuelles ;

- intégration du Core post-tag `v1.2.1` jusqu’au commit `6581e573c6a6885790b23fe502bd34d8199ea6ba`, sans nouvelle version ni déplacement de tag ;
- ajout de la primitive générique de navigation Platform `type: 'section'`, non repliable, filtrée selon la visibilité de ses enfants et compatible avec les entrées `item` / `group` existantes ;
- identité visible du SaaS dérivé alignée sur `GMS` / `Fiches techniques` sur l’accueil public et la sidebar Workspace, sans modification du design ni des identifiants techniques ;
- shell Workspace modernisé : Tableau de bord en tête, modules métier immédiatement après, statut regroupé avec le nom dans la topbar, rôle dans l’identité utilisateur, puis « Administration de l’espace » ;
- navigation Platform conservée avec séparation des modules applicatifs et accès rapide aux vues autorisées ;
- Help Center générique mis à niveau et composé avec l’aide métier M-001 à M-004 ;
- libellés métier des capabilities et métriques projetés depuis le registre backend dans la vue Abonnement ;
- entrée générique `Fichiers` masquée dans la sidebar du produit sans supprimer les primitives File Core ;
- aucune migration MongoDB nouvelle introduite par cet upgrade.

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