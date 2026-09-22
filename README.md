# SAAS-CORE-API

Socle SaaS fullstack générique et réutilisable, destiné à être dérivé en applications métier tout en conservant des fondations communes maintenables : authentification, multi-tenant, RBAC, plans et abonnements, entitlements, quotas, fichiers, audit et administration Platform.

## Statut du projet

Le Core suit désormais la ligne stable `1.1.0`. D-015 — versionnement / provenance / release process / migrations —, D-016 — E2E Core Playwright — et D-017 — dérivation et upgrade réel d’un SaaS pilote — sont validées.

`v1.1.0` a été publiée le 2026-09-21 conformément à `docs/releases/RELEASE-POLICY.md`. Son tag `v1.1.0` cible exactement le commit validé `8326fb48856dcef151b5ab01495c934951050d6d` après Core Gate #52 verte. Cette release ajoute le lifecycle transactionnel extensible `WorkspaceMember.onMemberRemoved` destiné aux relations métier des SaaS dérivés, sans introduire leurs modèles dans le Core. La stabilité du Core ne signifie pas qu’une application dérivée est automatiquement prête pour la production.

## Ce que fournit le Core

Le Core fournit des mécanismes génériques réutilisables :

- authentification et sessions avec rotation des refresh tokens ;
- comptes utilisateurs ;
- Workspaces multi-tenant ;
- memberships, invitations, rôles et permissions ;
- lifecycle transactionnel extensible lors du retrait définitif d’un `WorkspaceMember` ;
- transfert d'ownership ;
- Plans, Subscription, trial et baseline ;
- Capability Registry extensible ;
- entitlements effectifs, quotas et `UsageMetric` ;
- `EntitlementOverride` administré depuis Platform ;
- invitations commerciales et offres privées génériques ;
- pipeline File sécurisé, soft delete et purge différée ;
- AuditLog Workspace / Platform ;
- moteur générique de rétention / purge ;
- centre d’aide sécurisé et distinct Workspace / Platform, extensible par les SaaS dérivés ;
- console Platform ;
- frontend Core React avec composants et patterns réutilisables.

Le Core ne doit pas contenir les domaines propres à un produit métier : cours, produits, stocks métier, recettes, CRM, certificats, règles sectorielles, IA métier, etc. Ces responsabilités appartiennent aux applications dérivées.

## Stack actuelle

### Backend

- Node.js / JavaScript ESM ;
- Express ;
- MongoDB / Mongoose ;
- Zod ;
- JWT + sessions de refresh persistées ;
- Multer / `file-type` / ClamAV pour le pipeline File ;
- Nodemailer ;
- Vitest + Supertest.

### Frontend

- React + Vite ;
- JavaScript uniquement ;
- Tailwind CSS et composants de design system inspirés de shadcn/ui ;
- React Router ;
- Redux Toolkit ;
- RTK Query ;
- React Hook Form + Zod ;
- Vitest + React Testing Library.

### E2E Core

- Playwright ;
- Chromium dans la gate Core actuelle ;
- environnement backend/frontend/MongoDB dédié aux parcours E2E.

Les versions réellement installées restent celles des `package.json` racine, `frontend/package.json` et `e2e/package.json`.

## Architecture

```text
saas-core-api/
├── backend/
│   ├── config/
│   ├── constants/
│   ├── jobs/
│   ├── middlewares/
│   ├── migrations/
│   ├── modules/
│   ├── operations/
│   ├── seeds/
│   ├── services/
│   └── tests/
│
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── lib/
│       ├── services/api/
│       ├── store/
│       └── utils/
│
├── e2e/
│   ├── support/
│   └── tests/
│
└── docs/
```

Principes structurants :

```text
route backend
→ middlewares / validation
→ controller
→ service métier
→ models / services techniques

server state frontend
→ RTK Query

état global client réel
→ Redux Toolkit

état local
→ React

navigation partageable
→ URL / Router
```

Les pages frontend assemblent des composants ; elles ne doivent pas devenir propriétaires d'une logique métier lourde. Les tableaux compatibles utilisent le `DataTable` partagé et les drawers, confirmations, formulaires et primitives transverses existantes doivent être réutilisés lorsqu'ils couvrent le besoin.

## Prérequis de développement

Le dépôt exige actuellement :

```text
Node.js >= 24.7 < 25
npm
MongoDB compatible avec les transactions
```

Pour exercer l'ensemble des fonctionnalités :

- MongoDB doit être configuré pour supporter les transactions utilisées par le Core ;
- ClamAV / `clamscan` doit être accessible pour le pipeline d'upload sécurisé ;
- un serveur SMTP doit être configuré pour les emails d'authentification.

Le `.env.example` local utilise une URI MongoDB avec replica set :

```text
mongodb://127.0.0.1:27017/saas-core-api?replicaSet=rs0
```

## Installation locale

### 1. Backend

Depuis la racine :

```bash
npm install
```

Créer ensuite `.env` à partir de [`.env.example`](.env.example) et remplacer toutes les valeurs d'exemple nécessaires.

### 2. Frontend

```bash
cd frontend
npm install
```

Le frontend utilise `/api` comme base HTTP. En développement, Vite proxy cette base vers :

```text
http://localhost:5000
```

La cible peut être remplacée via :

```text
VITE_API_PROXY_TARGET
```

### 3. E2E Core

```bash
cd e2e
npm install
npm run install:browsers
```

La gate CI installe Chromium avant l’exécution Playwright.

## Démarrage en développement

### Backend

Depuis la racine :

```bash
npm run dev
```

Par défaut, l'API écoute sur le port configuré par `PORT` (`5000` dans `.env.example`).

### Frontend

Depuis `frontend/` :

```bash
npm run dev
```

Le serveur Vite utilise normalement `http://localhost:5173` en développement.

## Seeds utiles

Depuis la racine :

```bash
npm run seed:plans
npm run seed:super-admin
```

Le seed SUPER_ADMIN utilise les variables `SUPER_ADMIN_*` de l'environnement. Les seeds ne remplacent jamais les migrations et ne doivent pas servir de mécanisme de synchronisation forcée d'un catalogue commercial dérivé.

## Tests et qualité

La commande canonique de validation du Core est :

```bash
npm run release:check
```

Elle exécute la vérification machine-readable de la release et des migrations, le lint et les tests backend, le lint et les tests frontend, le build frontend puis les parcours Playwright E2E. La CI `Core Gate` exécute cette même commande afin que le mot « vert » ait la même définition localement et sur GitHub.

La vérification structurelle seule est disponible via :

```bash
npm run release:verify
```

### Backend

```bash
npm test
npm run lint
npm run format:check
```

### Frontend

```bash
cd frontend
npm run lint
npm test
npm run build
```

### E2E

Depuis la racine :

```bash
npm run test:e2e
```

L’environnement Playwright utilise une base MongoDB dédiée dont le nom doit se terminer par `_e2e_test` avant tout nettoyage destructif.

`npm run format:check` reste un contrôle qualité séparé tant qu'une baseline globale n'a pas été explicitement intégrée à la gate canonique.

## Migrations et jobs

Le dépôt expose des runners explicites via les scripts `migration:*` et `job:*` du `package.json` racine.

Les migrations de release sont inventoriées dans [`docs/releases/migration-manifest.json`](docs/releases/migration-manifest.json). `npm run release:verify` contrôle la cohérence entre cet inventaire, les scripts `migration:*` et les runners exécutables.

Une migration ne doit jamais être exécutée en production uniquement parce qu'elle existe dans le dépôt : chaque release doit préciser son ordre, sa phase de déploiement, sa compatibilité et sa stratégie de reprise. D-015 conserve volontairement les runners explicites et n'ajoute pas de registre MongoDB des migrations appliquées sans besoin démontré.

Les jobs sont des processus autonomes. Leur présence dans le dépôt ne signifie pas qu'ils sont automatiquement planifiés ou supervisés en production.

Voir [`docs/releases/MIGRATION-POLICY.md`](docs/releases/MIGRATION-POLICY.md) et [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md).

## Documentation

La porte d'entrée documentaire interne est [`docs/README.md`](docs/README.md).

| Sujet | Référence |
|---|---|
| Politique de versionnement / release / provenance | [`docs/releases/RELEASE-POLICY.md`](docs/releases/RELEASE-POLICY.md) |
| Discipline et inventaire des migrations | [`docs/releases/MIGRATION-POLICY.md`](docs/releases/MIGRATION-POLICY.md) |
| Contrat Core transversal | [`docs/contracts/CORE-CONTRACT.md`](docs/contracts/CORE-CONTRACT.md) |
| Commercial / Subscription / entitlement | [`docs/contracts/COMMERCIAL.md`](docs/contracts/COMMERCIAL.md) |
| Invitations commerciales / offres privées | [`docs/contracts/COMMERCIAL-INVITATIONS.md`](docs/contracts/COMMERCIAL-INVITATIONS.md) |
| Capability Registry | [`docs/contracts/CAPABILITIES.md`](docs/contracts/CAPABILITIES.md) |
| Équipe Platform / RBAC Platform | [`docs/contracts/PLATFORM-TEAM.md`](docs/contracts/PLATFORM-TEAM.md) |
| Rétention / purge | [`docs/contracts/RETENTION.md`](docs/contracts/RETENTION.md) |
| Architecture globale | [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) |
| Architecture backend | [`docs/architecture/BACKEND.md`](docs/architecture/BACKEND.md) |
| Architecture frontend | [`docs/architecture/FRONTEND.md`](docs/architecture/FRONTEND.md) |
| Sécurité | [`docs/security/SECURITY.md`](docs/security/SECURITY.md) |
| Guidelines frontend | [`docs/frontend/FRONTEND-GUIDELINES.md`](docs/frontend/FRONTEND-GUIDELINES.md) |
| SaaS dérivés / upgrades Core | [`docs/derived-saas/DERIVED-SAAS.md`](docs/derived-saas/DERIVED-SAAS.md) |
| Conformité / RGPD | [`docs/compliance/COMPLIANCE.md`](docs/compliance/COMPLIANCE.md) |
| Opérations | [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md) |
| Dettes actives | [`docs/DEBT.md`](docs/DEBT.md) |
| Reprise temporaire | [`docs/REPRISE-CURRENT.md`](docs/REPRISE-CURRENT.md) |

En cas de contradiction, le code et les contraintes de base de données restent prioritaires, puis les tests validés, puis les contrats et documents canoniques.

## Sécurité

Le Core applique une défense en profondeur. Authentification, validation, isolation Workspace, permissions RBAC, entitlement, quotas et contraintes de persistance restent des contrôles distincts.

Le frontend n'est jamais l'autorité de sécurité : masquer une route, un menu ou une action améliore l'UX mais ne remplace jamais les vérifications backend.

Le pipeline File adopte une politique fail-closed pour les contrôles de contenu/antivirus et les opérations sensibles utilisent transactions ou réservations atomiques lorsque leur invariant l'exige.

Voir [`docs/security/SECURITY.md`](docs/security/SECURITY.md).

## Créer un SaaS dérivé

La stratégie cible n'est pas une simple copie indépendante du dépôt.

Un produit destiné à recevoir les futures corrections du Core doit conserver l'historique Git du Core, utiliser son propre dépôt comme `origin` et conserver `saas-core-api` comme `upstream-core`.

Le métier est ajouté par composition : modules backend, features frontend, permissions, capabilities, métriques et navigation propres au produit. Une mise à niveau du Core doit passer par une branche dédiée, revue des changements, migrations/configuration, tests puis intégration contrôlée.

D-015 définit le contrat `core-origin.json` qui trace dans chaque produit dérivé la version, le tag et le commit Core intégrés. D-017 a validé ce mécanisme et la stratégie Git par un exercice réel de dérivation puis d’upgrade du pilote `saas-core-derived-pilot`, sans adaptation fonctionnelle du module métier `catalog`.

Voir [`docs/derived-saas/DERIVED-SAAS.md`](docs/derived-saas/DERIVED-SAAS.md) et [`docs/releases/RELEASE-POLICY.md`](docs/releases/RELEASE-POLICY.md).

## Production

`saas-core-api` n'est pas automatiquement production-ready parce que le Core est fonctionnel en développement.

Selon le produit dérivé, la mise en production peut nécessiter notamment :

- Billing/Payment réel ;
- qualification RGPD et juridique ;
- observabilité ;
- politique de rétention/anonymisation ;
- stockage File adapté ;
- sauvegardes/restauration ;
- ordonnancement et supervision des jobs ;
- SMTP/antivirus de production ;
- reverse proxy, HTTPS, secrets et stratégie de déploiement ;
- E2E propres au produit.

Les obligations actives sont suivies dans [`docs/DEBT.md`](docs/DEBT.md) et les procédures génériques dans [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md).

## Licence

Le package racine est actuellement déclaré `UNLICENSED`. Le dépôt n'est donc pas présenté comme un package open source distribuable sans décision explicite de licence.
