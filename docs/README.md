# SAAS-CORE-API — Index documentaire

**Statut :** index canonique de la documentation du projet  
**Dernière consolidation :** 2026-09-18  
**Chantier documentaire DOC-0 → DOC-11 :** terminé

## 1. Objet

Ce fichier est la porte d'entrée de la documentation interne de `saas-core-api`.

Le README racine fournit l'orientation générale du dépôt. Le présent index reste la référence pour naviguer dans les contrats, l'architecture, la sécurité, les guidelines, la conformité, les opérations, les releases, les SaaS dérivés et les dettes actives.

Le chantier documentaire DOC-0 à DOC-11 est terminé. La finalisation fonctionnelle du Core a depuis fait émerger des besoins génériques supplémentaires explicitement enregistrés dans `docs/DEBT.md`. D-025 — Centre d’aide sécurisé Workspace / Platform — est validée et intégrée dans `main`. D-020 — invitation commerciale — est explicitement différée à une validation terrain sur application dérivée / bêta et ne bloque pas Core 1.0. D-015 — versionnement / provenance / release process / migrations —, D-016 — E2E Core Playwright — et D-017 — dérivation et upgrade réel d’un SaaS pilote — sont validées. L’audit final architecture / sécurité / qualité et l’exercice D-017 n’ont démontré aucun blocker Core 1.0 restant.

---

## 2. Hiérarchie d'autorité

En cas de contradiction :

1. code actuel et contraintes de base de données ;
2. tests automatisés validés ;
3. contrats canoniques actifs ;
4. architecture, sécurité et conventions canoniques ;
5. registre des dettes actives ;
6. documentation opérationnelle ;
7. documents de travail historiques encore temporairement conservés ;
8. `REPRISE-CURRENT.md`.

Une checklist, un ancien contrat, un rapport d'implémentation ou une synthèse de reprise ne peut jamais redéfinir le comportement réel du Core.

Lorsqu'un contrat canonique décrit explicitement une **cible à implémenter**, le code et les tests courants restent l'autorité sur le comportement actuellement disponible jusqu'à validation de l'implémentation.

---

## 3. Porte d'entrée du dépôt

Pour tout agent IA ou développeur assisté, lire d'abord :

```text
AGENTS.md
→ méthode de travail
→ ordre d'autorité
→ règles architecture / sécurité / tests / Git
→ références vers les contrats détaillés
```

Puis utiliser le README général :

```text
README.md
→ présentation du Core
→ prérequis
→ installation
→ démarrage
→ tests
→ documentation
→ stratégie de SaaS dérivé
→ limites avant production / v1.0
```

Le README racine ne duplique pas les contrats détaillés.

---

## 4. Documents canoniques actifs

### Gouvernance

```text
docs/README.md
→ index documentaire

docs/DEBT.md
→ registre unique des dettes actives

docs/REPRISE-CURRENT.md
→ reprise temporaire unique pendant le développement
```

Les spécifications détaillées de dettes complexes peuvent être placées dans `docs/debt/` lorsque `docs/DEBT.md` les référence explicitement. Elles détaillent le cadrage sans remplacer le statut porté par le registre canonique.

Spécifications conservées :

```text
docs/debt/D-024-platform-workspace-control-center.md
→ évolution Core 1.1 différée

docs/debt/D-025-secure-help-center.md
→ spécification validée du centre d’aide sécurisé Workspace / Platform
```

### Release et migrations

```text
docs/releases/RELEASE-POLICY.md
→ versionnement SemVer, canaux development / rc / stable, tags, provenance,
  release notes, gate canonique et protection de main

docs/releases/MIGRATION-POLICY.md
→ discipline de migration, runners explicites, dépendances, phases de release,
  idempotence et stratégie de reprise

docs/releases/migration-manifest.json
→ inventaire machine-readable des migrations de release exécutables
```

Décisions D-015 structurantes :

- `core-release.json` porte l'identité versionnée du Core ;
- `npm run release:verify` contrôle la cohérence version/packages/locks/migrations ;
- `npm run release:check` est la gate canonique locale et CI ;
- les migrations restent des runners explicites inventoriés par manifest tant qu'un besoin réel ne justifie pas un registre persistant ;
- `core-origin.json` est le contrat cible de provenance d'un SaaS dérivé ;
- `product-release.json` porte l’identité et la version applicative propres au dérivé, indépendamment des métadonnées Core ;
- D-017 a validé la stratégie réelle de dérivation et d’upgrade ; `v1.0.0` a ensuite été publiée conformément à `RELEASE-POLICY.md` sur le commit post-merge validé `dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff`.

D-016 a étendu `npm run release:check` avec les E2E Playwright. La définition courante d’une Core Gate verte inclut donc la vérification de release, le lint et les tests backend, le lint/tests/build frontend puis Playwright.

### Contrats

```text
docs/contracts/CORE-CONTRACT.md
→ contrat HTTP et fonctionnel transversal du Core

docs/contracts/COMMERCIAL.md
→ Plan, baseline, Subscription, trial, entitlement, quotas et overrides

docs/contracts/COMMERCIAL-INVITATIONS.md
→ invitations commerciales et offres privées D-020

docs/contracts/CAPABILITIES.md
→ Capability Registry et extension par les applications dérivées

docs/contracts/PLATFORM-TEAM.md
→ Équipe de la Plateforme, Fondateur, RBAC Platform et invitations internes

docs/contracts/RETENTION.md
→ moteur générique de rétention / purge et administration Platform associée
```

Décisions structurantes :

- la clé technique d'un nouveau Plan est générée par le backend et n'est pas exposée dans le catalogue public ;
- la baseline est identifiée structurellement par `systemRole = baseline` / `isBaseline`, pas par son nom commercial ;
- la vue Workspace expose les features et limites effectives après overrides actifs ;
- `ACTIVE_PLAN_CAPABILITY_REGISTRY` reste l'autorité runtime des capabilities ;
- entitlement commercial, permission RBAC et quota sont trois contrôles distincts ;
- RBAC Platform et RBAC Workspace sont distincts ;
- le Fondateur est une autorité historique protégée, distincte d'un rôle RBAC personnalisable ;
- plusieurs Super administrateurs sont possibles, mais le Fondateur reste protégé des opérations administratives ordinaires.

### Architecture

```text
docs/architecture/ARCHITECTURE.md
→ responsabilités globales du Core, contextes Account / Workspace / Platform et frontière Core / métier

docs/architecture/BACKEND.md
→ architecture Node/Express/Mongoose, modules, responsabilités des couches, jobs, migrations et tests

docs/architecture/FRONTEND.md
→ architecture React par features, composants, routing, state management, RTK Query et extension métier
```

### Sécurité

```text
docs/security/SECURITY.md
→ défense en profondeur, Auth/AuthSession, validation, multi-tenant, RBAC, Platform,
  entitlements, quotas, transactions, Files, AuditLog, HTTP, secrets et frontend
```

Le backend reste l'autorité de sécurité. Les guards, masquages et contrôles frontend améliorent l'UX mais ne remplacent jamais les autorisations serveur.

Cette règle s'applique également au centre d’aide D-025 : un corpus d'aide ou des suggestions non autorisées ne doivent pas être envoyés au frontend uniquement pour y être masqués.

### Guidelines frontend

```text
docs/frontend/FRONTEND-GUIDELINES.md
→ règles pratiques UI/UX, composants réutilisables, state, RTK Query,
  navigation, formulaires, feedback, accessibilité, responsive, performance et tests
```

Règles centrales :

- même intention UI → même famille de composants ;
- `DataTable` est obligatoire pour les tableaux compatibles ;
- drawers, confirmations, formulaires et primitives transverses sont réutilisés lorsque leur contrat convient ;
- server state → RTK Query ; navigation partageable → URL ; form state → React Hook Form ; état local → React ; Redux global uniquement si justifié ;
- les fonctionnalités absentes ne doivent pas polluer inutilement l'interface ;
- masquer une action reste une règle UX, jamais une sécurité suffisante ;
- dans l'interface française, le terme utilisateur est « Plateforme » ; `Platform` reste le terme technique du code ;
- les parcours E2E critiques du Core sont exercés par Playwright dans la gate canonique.

### SaaS dérivés et maintenance du Core

```text
docs/derived-saas/DERIVED-SAAS.md
→ création d'un produit dérivé, frontière Core/métier, versionnement,
  stratégie Git, upgrades, migrations, tests et points d'extension
```

Le produit dérivé conserve l'historique Git du Core, possède son propre `origin` et conserve le Core comme `upstream-core`. D-015 définit le contrat de provenance `core-origin.json`; l’identité/version applicative indépendante est portée par `product-release.json`; D-017 a validé la stratégie Git et la provenance par un exercice réel de dérivation + upgrade sur `saas-core-derived-pilot`.

D-025 fournit un mécanisme d’extension permettant à un dérivé d’ajouter ses fiches d’aide métier sans dupliquer ni réécrire le corpus Core.

### Conformité / RGPD

```text
docs/compliance/COMPLIANCE.md
→ cadre canonique RGPD, cookies/traceurs, information, rétention,
  droits, sous-traitants, transferts, AIPD, violations et gate pré-production

docs/compliance/rgpd-data-tracker-inventory.md
→ inventaire technique vivant des données, stockages, traceurs, prestataires et points de collecte
```

La conformité technique du Core ne rend pas automatiquement un SaaS dérivé juridiquement conforme.

### Opérations

```text
docs/operations/OPERATIONS.md
→ installation, environnement, MongoDB, démarrage, seeds, migrations,
  jobs, stockage, antivirus, health checks, déploiement et rollback

docs/development-trial-reset.md
→ opération spécialisée et strictement réservée au développement
```

---

## 5. Dette consolidée

`docs/DEBT.md` distingue explicitement :

```text
Core 1.0 finalisé
≠
SaaS dérivé prêt pour la production
```

Aucun blocker Core 1.0 actif n’est actuellement démontré par le registre canonique.

D-001, D-002, D-011, D-014, D-015, D-016, D-017, D-018, D-019, D-021, D-022 et D-025 sont validées/clôturées selon le registre canonique.

D-020 est différée à une validation terrain sur application dérivée / bêta et ne bloque pas Core 1.0. D-023 et D-024 sont différées vers Core 1.1 et ne bloquent pas Core 1.0.

La finalisation fonctionnelle peut encore reclasser une dette lorsqu'un constat réel le justifie, mais une fonctionnalité hypothétique ou purement métier ne doit pas retarder la release 1.0.

---

## 6. Structure documentaire canonique

```text
docs/
├── README.md
├── DEBT.md
├── REPRISE-CURRENT.md
│
├── architecture/
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   └── FRONTEND.md
│
├── contracts/
│   ├── CORE-CONTRACT.md
│   ├── COMMERCIAL.md
│   ├── COMMERCIAL-INVITATIONS.md
│   ├── CAPABILITIES.md
│   ├── PLATFORM-TEAM.md
│   └── RETENTION.md
│
├── releases/
│   ├── RELEASE-POLICY.md
│   ├── MIGRATION-POLICY.md
│   └── migration-manifest.json
│
├── debt/
│   ├── D-024-platform-workspace-control-center.md
│   └── D-025-secure-help-center.md
│
├── frontend/
│   └── FRONTEND-GUIDELINES.md
│
├── security/
│   └── SECURITY.md
│
├── derived-saas/
│   └── DERIVED-SAAS.md
│
├── compliance/
│   ├── COMPLIANCE.md
│   └── rgpd-data-tracker-inventory.md
│
└── operations/
    └── OPERATIONS.md
```

`docs/development-trial-reset.md` reste volontairement à la racine de `docs/` comme guide opérationnel spécialisé existant ; aucun déplacement n'est nécessaire pour la seule esthétique documentaire.

---

## 7. Documents de travail temporairement conservés

Les fichiers suivants ne sont **pas canoniques** :

```text
docs/backend-implementation-checklist.md
docs/frontend-implementation-checklist.md
docs/frontend-platform-admin-contract.md
docs/platform-overview-dashboard-contract.md
docs/dashboard-workspace-platform-boundary.md
```

Ils sont conservés uniquement comme mémoire de progression et d'implémentations antérieures.

Important : ces documents sont chronologiques. Ils peuvent donc contenir des intitulés de lots, des formulations ou des références vers d'anciens documents qui décrivent l'état du projet au moment de leur rédaction. Ces références historiques ne sont pas des dépendances documentaires actives.

Pour tout contrat courant, utiliser les documents canoniques de la section 4 et le registre `docs/DEBT.md`.

Ces cinq fichiers devront être réévalués lors d'un futur nettoyage : soit leur information utile sera absorbée dans les contrats/roadmap courants, soit leur suppression pourra être proposée avec validation explicite.

---

## 8. Audit DOC-11

DOC-11 avait vérifié notamment :

- présence d'un README racine ;
- mise à jour de `frontend/README.md`, anciennement figé au jalon F1 ;
- cohérence des versions avec les `package.json` ;
- cohérence de la base API frontend `/api` et du proxy Vite ;
- présence des chemins canoniques référencés par le README ;
- absence de dépendance canonique vers l'ancien silo `frontend/docs/` supprimé en DOC-10 ;
- maintien explicite des documents historiques comme non canoniques ;
- maintien de `0.1.0` comme état de développement.

Les développements et décisions intervenus après DOC-11 sont gouvernés par le code courant, les contrats et `docs/DEBT.md` ; l'historique DOC-11 ne constitue pas une photographie actuelle de la roadmap.

---

## 9. Historique du chantier documentaire

| Lot | Objet | État |
|---|---|---|
| DOC-0 | Gouvernance des dettes et reprise unique | terminé |
| DOC-1 | Inventaire, classification et index documentaire | terminé |
| DOC-2 | Contrats Core / commercial / capabilities | terminé |
| DOC-3 | Architecture globale, backend et frontend | terminé |
| DOC-4 | Sécurité | terminé |
| DOC-5 | Guidelines frontend et composants réutilisables | terminé |
| DOC-6 | SaaS dérivés et maintenance du Core | terminé |
| DOC-7 | Conformité / RGPD | terminé |
| DOC-8 | Opérations | terminé |
| DOC-9 | Consolidation finale de la dette | terminé |
| DOC-10 | Nettoyage documentaire validé | terminé |
| DOC-11 | README racine et audit documentaire final | terminé |

DOC-10 a supprimé, après validation explicite, 50 fichiers historiques/redondants. Git conserve leur historique.

---

## 10. Règle de suppression

Aucun autre fichier ne doit être supprimé automatiquement.

Toute future suppression documentaire suit la même règle : contenu utile vérifié, remplacement identifié si nécessaire, liste exacte présentée, validation explicite, puis suppression des seuls chemins autorisés.

---

## 11. État post-release et prochaines trajectoires

La trajectoire de publication Core 1.0 est terminée :

```text
D-015 release governance / provenance / migrations         VALIDÉE — 2026-09-17
→ D-016 Playwright E2E Core                                VALIDÉE — 2026-09-17
→ D-017 dérivation + upgrade pilote                        VALIDÉE — 2026-09-17
→ PR de release stable #23                                 FUSIONNÉE
→ Core Gate #38 / run 35248517242                          SUCCESS
→ tag annoté v1.0.0                                       PUBLIÉ
→ GitHub Release stable 390898671                          PUBLIÉE
```

Les trajectoires suivantes sont indépendantes :

- synchronisation documentaire post-release ;
- upgrade du pilote de `v1.0.0-rc.2` vers `v1.0.0` si ce contrôle supplémentaire est décidé ;
- démarrage d’un premier SaaS métier dérivé depuis la stable ;
- évolutions génériques Core 1.1, notamment D-023 et D-024 ;
- dettes de production à traiter dans le contexte du produit réel.

D-020 reste différée à la validation terrain avec des bêta-testeurs Platform et Workspace sur une application dérivée déployée. Cette validation n’est pas bloquante pour Core 1.0.

Le chatbot/assistant IA au-dessus de l'aide reste explicitement différé.

`REPRISE-CURRENT.md` reste le document temporaire de transition tant que la prochaine trajectoire de travail n’a pas été formellement engagée.
