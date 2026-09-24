# SAAS-CORE-API — Guide canonique d’exploitation

**Statut :** document canonique d’opérations  
**Dernière mise à jour :** 2026-09-24  
**Périmètre :** installation, configuration, démarrage, seeds, migrations, jobs, stockage, antivirus, health checks, déploiement et rollback

---

## 1. Objet

Ce document décrit comment exploiter `saas-core-api` sans confondre :

```text
installation
configuration
seed
migration
job planifié
opération de développement
démarrage HTTP
déploiement production
```

Le code courant reste l’autorité sur les commandes, variables d’environnement et comportements réels.

Le présent document ne déclare pas le Core « production-ready » : plusieurs choix d’infrastructure restent volontairement ouverts et sont enregistrés dans `docs/DEBT.md`, notamment D-005, D-007 et D-013.

---

## 2. Prérequis actuels

### Backend

Le `package.json` racine exige :

```text
Node.js >= 24.7 < 25
npm
MongoDB compatible avec les transactions utilisées par le Core
ClamAV / clamscan accessible pour les uploads
serveur SMTP configuré
```

Le projet est JavaScript ESM uniquement.

### Frontend

Le frontend possède son propre `package.json` sous :

```text
frontend/
```

Il utilise notamment React, Vite, Tailwind CSS, Redux Toolkit / RTK Query, React Router, React Hook Form, Zod et Vitest.

### E2E Core

Le package Playwright du Core possède son propre `package.json` sous :

```text
e2e/
```

La gate actuelle utilise Chromium.

Le backend Playwright est démarré avec un environnement E2E dédié. Celui-ci active explicitement `E2E_BYPASS_RATE_LIMITS=true` afin que les scénarios fonctionnels ne saturent pas les quotas anti-abus du runtime réel depuis l'IP locale.

Cette capacité est verrouillée par `backend/config/env.js` : elle est refusée si `NODE_ENV` n'est pas `test` ou si la base MongoDB ne se termine pas par `_e2e_test`. Elle ne doit pas être ajoutée à un environnement de développement ordinaire ou de production.

Le backend, le frontend et le package E2E doivent être installés séparément.

---

## 3. Installation locale

Depuis la racine du dépôt :

```bash
npm install
```

Puis :

```bash
cd frontend
npm install
```

Puis pour la couche E2E :

```bash
cd ../e2e
npm install
npm run install:browsers
```

Revenir à la racine pour les commandes globales et backend.

Ne jamais committer :

```text
node_modules/
.env
uploads/
logs locaux
```

Le `.gitignore` du dépôt protège déjà ces emplacements.

---

## 4. Configuration `.env`

Créer localement :

```text
.env
```

à partir de :

```text
.env.example
```

Le fichier `.env.example` est une référence de structure, pas une configuration utilisable telle quelle en production.

### Variables principales actuelles

```text
NODE_ENV
PORT
MONGODB_URI
CLIENT_URL

JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN
JWT_ACCESS_ISSUER
JWT_ACCESS_AUDIENCE

REFRESH_TOKEN_EXPIRES_IN_DAYS
PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES
WORKSPACE_OWNERSHIP_TRANSFER_AUTHORIZATION_TTL_HOURS

SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_FROM_NAME

UPLOAD_MAX_FILE_SIZE_BYTES
FILE_RETENTION_DAYS

FILE_STORAGE_PROVIDER
LOCAL_STORAGE_ROOT_DIR
UPLOAD_TEMP_DIR

CLAMAV_BINARY_PATH
CLAMAV_SCAN_TIMEOUT_MS
UPLOAD_TEMP_FILE_MAX_AGE_MINUTES

TRIAL_IDENTITY_SECRET
ALLOW_DEVELOPMENT_DATA_RESET
```

Les variables `SUPER_ADMIN_*` sont spécifiques au seed SUPER_ADMIN et ne sont pas requises pour le fonctionnement HTTP normal.

---

## 5. Validation fail-fast de l’environnement

`backend/config/env.js` valide l’environnement avec Zod avant l’exploitation normale de l’application.

Une configuration invalide provoque :

```text
message d’erreur de configuration
→ process.exit(1)
```

En production, des garde-fous supplémentaires sont appliqués :

```text
CLIENT_URL doit être HTTPS
JWT_ACCESS_SECRET ne peut pas garder une valeur d’exemple connue
TRIAL_IDENTITY_SECRET ne peut pas garder une valeur d’exemple connue
SMTP_USER / SMTP_PASSWORD ne peuvent pas garder les placeholders connus
ALLOW_DEVELOPMENT_DATA_RESET doit rester false
```

Les secrets réels ne doivent jamais être ajoutés au dépôt.

---

## 6. MongoDB

### 6.1 Connexion

Le serveur appelle `connectDB()` avant d’écouter le port HTTP.

MongoDB est une dépendance indispensable :

```text
connexion MongoDB impossible
→ API non démarrée
→ process.exit(1)
```

### 6.2 Transactions

Le Core utilise des transactions MongoDB pour plusieurs invariants sensibles.

L’environnement MongoDB doit donc supporter les transactions utilisées par Mongoose.

Le `.env.example` local propose :

```text
mongodb://127.0.0.1:27017/saas-core-api?replicaSet=rs0
```

Une instance locale destinée à reproduire fidèlement les workflows transactionnels doit être configurée en conséquence.

### 6.3 Indexes

Le comportement actuel est :

```text
development / test
→ autoIndex = true

production
→ autoIndex = false
```

En production, la création et l’évolution des indexes appartiennent donc aux migrations explicites.

Conséquence : une release qui dépend de nouveaux indexes ne doit pas être ouverte au trafic avant leur préparation selon l’ordre défini par la release.

---

## 7. Démarrage backend

### Développement

```bash
npm run dev
```

Cette commande utilise :

```text
node --watch backend/server.js
```

### Exécution normale

```bash
npm start
```

Flux courant de démarrage :

```text
validation environnement
↓
connexion MongoDB
↓
maintenance des fichiers temporaires
↓
écoute HTTP
```

La purge de temporaires est une mesure de résilience et non une dépendance critique : une erreur de cette maintenance est journalisée mais ne doit pas empêcher l’API de démarrer.

---

## 8. Frontend

Depuis `frontend/` :

### Développement

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Tests

```bash
npm test
```

### Build production

```bash
npm run build
```

Un déploiement frontend ne doit pas être considéré valide uniquement parce que le serveur de développement Vite fonctionne : le lint, les tests et le build production doivent être exécutés dans la gate de release.

---

## 9. Tests et contrôles qualité

### Gate canonique de release

Depuis la racine :

```bash
npm run release:verify
npm run release:check
```

`release:verify` contrôle la cohérence machine-readable des métadonnées de version et de l’inventaire des migrations. Dans un SaaS dérivé, la présence de `core-origin.json` impose également un `product-release.json` valide afin de séparer explicitement l’identité/version du produit de celles du Core.

`release:check` est la gate canonique exécutée localement et en CI. Elle enchaîne la vérification de release, le lint backend/tooling/E2E, les tests backend, puis le lint, les tests et le build frontend, et enfin les parcours Playwright E2E du Core.

`npm run format:check` reste un contrôle qualité séparé tant qu’une baseline globale n’a pas été explicitement validée comme blocker de release.

### Backend

Depuis la racine :

```bash
npm test
npm run lint
npm run format:check
```

### Frontend

Depuis `frontend/` :

```bash
npm run lint
npm test
npm run build
```

### E2E Core

Depuis la racine :

```bash
npm run test:e2e
```

Le runner prépare un environnement déterministe avant Playwright. La base MongoDB utilisée pour ce nettoyage doit obligatoirement se terminer par `_e2e_test` ; cette garde interdit que la préparation destructive vise la base Vitest ou une base applicative ordinaire.

La configuration Playwright actuelle exécute Chromium de manière séquentielle (`workers: 1`) et conserve traces, captures et vidéos sur échec selon sa configuration.

Une release Core ne doit pas se contenter de tests unitaires ciblés : la commande canonique `npm run release:check` doit rester la définition commune de la gate locale et CI.

---

## 10. Seeds

Un seed sert à initialiser ou synchroniser des données système attendues. Il ne remplace pas une migration de données métier.

### 10.1 Baseline Plan

Commande :

```bash
npm run seed:plans
```

Le seed actuel crée la définition baseline initiale si elle n’existe pas déjà.

Il est idempotent : une baseline déjà présente est conservée.

Le seed ne doit pas être utilisé comme mécanisme général de synchronisation forcée du catalogue commercial d’un produit dérivé.

### 10.2 SUPER_ADMIN

Commande :

```bash
npm run seed:super-admin
```

Variables nécessaires :

```text
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
SUPER_ADMIN_FIRST_NAME
SUPER_ADMIN_LAST_NAME
```

Le seed est volontairement prudent :

```text
email absent
→ création transactionnelle User + AuthIdentity

email déjà présent avec super_admin + identité locale
→ conservation

email déjà présent avec autre rôle
→ erreur
```

Un seed ne doit jamais servir à promouvoir silencieusement un compte existant vers `super_admin`.

### 10.3 Rôles système Platform

Commande :

```bash
npm run seed:platform-roles
```

Ce seed synchronise les presets système du Core et ne modifie pas les rôles Platform personnalisés.

Après l’introduction de D-020, il doit être rejoué afin que les rôles système concernés reçoivent les permissions `platform:commercial_invitations:*`. Le Super administrateur reçoit toutes les permissions actives ; les rôles `platform_admin` et `commercial_support` reçoivent les permissions commerciales explicitement prévues par leurs presets.

Cette synchronisation doit être exécutée après déploiement du code qui connaît les nouvelles permissions, mais avant d’attendre de ces rôles qu’ils utilisent les routes D-020.

---

## 11. Migrations

### 11.1 Modèle actuel

Les migrations sont des scripts Node explicites sous :

```text
backend/migrations/
```

Elles possèdent généralement un runner `run*.js` qui :

```text
ouvre MongoDB
↓
exécute la migration
↓
journalise le résultat
↓
retourne un code d’échec si nécessaire
↓
ferme MongoDB
```

Le `package.json` expose actuellement plusieurs commandes `migration:*`.

L’inventaire machine-readable canonique est :

```text
docs/releases/migration-manifest.json
```

Sa cohérence structurelle avec les scripts npm et les runners est vérifiée par `npm run release:verify`.

### 11.2 Commandes actuellement exposées

```text
migration:subscription-kind
migration:subscription-term-type
migration:subscription-lifecycle-indexes
migration:operational-indexes
migration:subscription-read-permission
migration:audit-read-permission
migration:workspace-member-usage
migration:workspace-member-usage-reconcile
migration:member-invite-permission
migration:file-read-permission
migration:file-delete-permission
migration:file-trash-permissions
migration:file-storage-usage-reconcile
migration:workspace-ownership-transfer-permission
migration:baseline-plan-system-role
migration:baseline-remove-file-upload
```

### 11.3 Migration D-020 — `subscription-term-type`

D-020 introduit `Subscription.termType` afin de distinguer explicitement :

```text
fixed
open_ended
```

Pour un environnement historique qui n’a pas encore reçu cette migration, exécuter :

```bash
npm run migration:subscription-term-type
```

Ordre requis :

```text
1. migration:subscription-kind déjà appliquée
2. migration:subscription-term-type
3. déploiement / activation du code D-020
4. seed:platform-roles pour synchroniser les permissions système
```

Backfill :

```text
kind = baseline   → termType = open_ended
kind = commercial → termType = fixed
```

La migration est idempotente et refuse de deviner lorsqu’une Subscription sans `termType` ne possède pas un `kind` exploitable. Dans ce cas, il faut corriger l’état ou exécuter d’abord la migration `subscription-kind`; il ne faut pas forcer une valeur arbitraire.

Le resolver conserve une compatibilité fail-closed avec les anciennes commerciales bornées sans `termType`, mais cette compatibilité ne remplace pas la migration de données attendue.

### 11.4 Règle de release

L’ordre de ces commandes ne doit jamais être deviné par l’exploitant.

Chaque future release Core qui ajoute une migration doit préciser :

```text
nom de la migration
raison
phase pre-deploy ou post-deploy si nécessaire
ordre par rapport aux autres migrations
compatibilité avec l’ancienne version applicative
caractère idempotent ou non
contrôle attendu après exécution
stratégie de reprise en cas d’échec
```

La discipline complète est définie dans `docs/releases/MIGRATION-POLICY.md`.

### 11.5 Gouvernance retenue par D-015

D-015 ne crée pas de moteur central de migrations avec historique automatique des migrations appliquées dans MongoDB uniquement par convention.

Le modèle retenu pour le Core 1.0 est :

```text
runners explicites
+
manifest machine-readable vérifié
+
release notes obligatoires
+
gate de release
```

D-017 n’a pas démontré la nécessité d’un registre persistant ou d’un orchestrateur automatique. Un tel mécanisme ne sera ajouté que si l’exploitation réelle démontre qu’il apporte une garantie nécessaire que le modèle actuel ne couvre pas.

Cette décision ne signifie pas qu’une migration peut être exécutée sans traçabilité opérationnelle : la release qui l’introduit doit toujours documenter son ordre, sa phase de déploiement, son comportement au rejeu et sa stratégie de reprise.

---

## 12. Jobs planifiés

Les jobs de maintenance sont séparés du processus Express.

Commandes actuellement exposées :

```bash
npm run job:expire-trials
npm run job:finalize-subscription-cancellations
npm run job:apply-scheduled-downgrades
npm run job:purge-files
npm run job:retention
```

Chaque runner possède sa propre connexion MongoDB puis termine le processus.

`job:retention` exécute le moteur générique de rétention/purge défini par le contrat [`docs/contracts/RETENTION.md`](../contracts/RETENTION.md). Sa présence dans le dépôt n’implique pas qu’un scheduler de production soit déjà configuré.

Cette architecture permet de les exécuter depuis :

```text
cron Linux
CronJob Kubernetes
scheduler cloud
pipeline d’exploitation équivalent
```

### Règle importante

```text
job présent dans le dépôt
≠ job planifié en production
```

La fréquence, le fuseau horaire, le timeout, les retries, la prévention de chevauchement et les alertes restent à définir dans le déploiement réel.

Un environnement de production qui dépend de ces transitions métier doit vérifier que les jobs correspondants sont effectivement programmés et supervisés.

---

## 13. Purge des fichiers supprimés

`job:purge-files` déclenche la maintenance des fichiers ayant atteint leur échéance de purge.

Le job délègue au service File :

```text
sélection
suppression physique
transition MongoDB
audit
```

Toute erreur remonte au runner afin que l’ordonnanceur puisse détecter l’échec.

`FILE_RETENTION_DAYS` est une durée technique du cycle File actuel.

Elle ne doit pas être présentée automatiquement comme une durée réglementaire RGPD ; voir `docs/compliance/COMPLIANCE.md` et D-006.

---

## 14. Stockage des fichiers

### 14.1 Provider courant

Le seul provider accepté par la configuration actuelle est :

```text
local
```

Variables :

```text
FILE_STORAGE_PROVIDER=local
LOCAL_STORAGE_ROOT_DIR=uploads/files
UPLOAD_TEMP_DIR=uploads/tmp
```

Les chemins relatifs sont résolus depuis le répertoire de lancement.

### 14.2 Séparation quarantaine / stockage définitif

La configuration refuse :

```text
temp == final

temp contenu dans final

final contenu dans temp
```

Cette séparation est un invariant de sécurité.

### 14.3 Contrat de provider

`storage.service.js` impose aux providers :

```text
initialize
storeFromTemporaryPath
deleteFile
createFileReadStream
```

Le service est donc préparé pour l’ajout d’un provider distant futur.

Un fichier conserve le provider réel ayant servi à son stockage : il ne doit pas être recherché chez un autre provider par fallback silencieux.

### 14.4 Limite production

Le stockage local est fonctionnel, mais il ne constitue pas automatiquement une architecture de stockage production adaptée à plusieurs instances, à la haute disponibilité, aux sauvegardes ou au disaster recovery.

D-007 reste donc active.

---

## 15. Fichiers temporaires

Les uploads passent par une quarantaine sous `UPLOAD_TEMP_DIR`.

`UPLOAD_TEMP_FILE_MAX_AGE_MINUTES` définit l’âge minimal avant qu’un temporaire puisse être considéré comme orphelin par la maintenance.

Le schéma d’environnement impose actuellement :

```text
minimum = 5 minutes
maximum = 10080 minutes
```

La maintenance de démarrage :

```text
inspecte les temporaires
supprime les fichiers suffisamment anciens
conserve les fichiers récents
journalise les anomalies
n’expose pas volontairement les chemins absolus dans son bilan
```

Une erreur individuelle ne doit pas empêcher le nettoyage des autres fichiers.

---

## 16. Antivirus ClamAV

Variables :

```text
CLAMAV_BINARY_PATH
CLAMAV_SCAN_TIMEOUT_MS
```

Le provider actuel utilise `execFile()` pour lancer `clamscan` sur un fichier unique.

Verdicts :

```text
code 0
→ CLEAN

code 1
→ INFECTED

autre erreur / timeout / binaire absent
→ ERROR
```

La politique est fail-closed :

```text
erreur antivirus
≠ fichier sain
```

Le timeout est validé par l’environnement entre :

```text
1000 ms
et
120000 ms
```

### Limite opérationnelle actuelle

Le simple démarrage de l’API ne vérifie pas que le binaire ClamAV est effectivement disponible et opérationnel.

Une configuration peut donc passer la validation Zod puis échouer lors d’un upload avec `CLAMAV_UNAVAILABLE` ou autre erreur de scan.

Avant production, la readiness / observabilité doit contrôler la disponibilité et la mise à jour réelle du mécanisme antivirus.

---

## 17. SMTP

La configuration actuelle exige un serveur SMTP valide au niveau environnement :

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM_EMAIL
SMTP_FROM_NAME
```

Le fournisseur de développement ne doit pas être automatiquement considéré comme fournisseur de production.

Avant go-live, vérifier :

```text
provider réel
identité d’expéditeur
délivrabilité
SPF / DKIM / DMARC selon l’infrastructure retenue
quotas
logs et rétention
sous-traitance / conformité
alertes d’échec
```

Les besoins de notification plus larges restent séparés de l’envoi transactionnel Core.

---

## 18. Health check

Endpoint courant :

```text
GET /api/health
```

Réponse actuelle :

```json
{
  "status": "success",
  "message": "API opérationnelle"
}
```

### Qualification correcte

Cet endpoint prouve essentiellement :

```text
process Express accessible
+
route HTTP répond
```

Il ne vérifie actuellement pas :

```text
MongoDB
SMTP
ClamAV
stockage
jobs
```

Il doit donc être considéré comme un **liveness check**, pas comme une readiness complète de production.

Une future stratégie de readiness doit éviter de mélanger dans un seul endpoint toutes les dépendances sans définir précisément quels échecs doivent retirer une instance du trafic.

---

## 19. Logs et observabilité

État actuel :

```text
morgan('dev') uniquement en development
logs console ciblés pour runners / maintenance / démarrage
requestId présent dans le Core
AuditLog fonctionnel et sécurité
```

`AuditLog` ne remplace pas :

```text
centralisation des logs
métriques
alertes
APM
monitoring des jobs
monitoring MongoDB
monitoring ClamAV
monitoring SMTP
monitoring frontend
```

D-005 reste active.

Un déploiement de production doit définir une observabilité minimale avant go-live.

---

## 20. Opération destructive de développement

Commande :

```bash
npm run dev:reset-trial -- --email=<email> --workspace-id=<id> --confirm-development-reset
```

Cette commande n’est pas un job et n’est jamais une API publique.

Elle exige simultanément :

```text
NODE_ENV=development
ALLOW_DEVELOPMENT_DATA_RESET=true
arguments email + workspace-id
flag --confirm-development-reset
```

La configuration production refuse `ALLOW_DEVELOPMENT_DATA_RESET=true`.

Aucune opération destructive de développement ne doit être réutilisée comme outil d’administration production.

---

## 21. Ordre de déploiement — principe générique

Il n’existe pas encore un pipeline de production unique dans le dépôt.

Une release doit donc documenter explicitement son ordre.

Séquence générique de référence :

```text
1. valider release notes et version Core
2. vérifier backup / snapshot adaptés
3. vérifier nouvelles variables d’environnement et secrets
4. installer les dépendances
5. exécuter la gate de release applicable
6. exécuter les migrations pre-deploy requises
7. exécuter les seeds uniquement s’ils sont nécessaires et documentés
8. déployer backend/frontend
9. exécuter migrations post-deploy éventuelles
10. vérifier / configurer les jobs planifiés
11. smoke tests
12. vérifier liveness et dépendances critiques
13. surveiller erreurs / métriques après ouverture du trafic
```

Cette séquence reste subordonnée aux release notes : une migration particulière peut imposer un ordre différent.

---

## 22. Stratégie de rollback

Règle fondamentale :

```text
rollback du code
≠ rollback automatique des données
```

Une release qui modifie MongoDB doit définir avant déploiement :

```text
migration compatible avec ancienne version ?
rollback code possible sans rollback DB ?
données destructivement transformées ?
backup / snapshot nécessaire ?
script compensatoire nécessaire ?
indexes supprimés ou renommés ?
```

Le dépôt ne possède pas aujourd’hui de mécanisme universel `down migration`.

Il est donc interdit de supposer qu’une migration peut être annulée simplement parce que Git peut revenir au commit précédent.

Pour une migration destructive ou non rétrocompatible :

```text
plan de rollback explicite
+
backup testé
+
validation avant déploiement
```

sont nécessaires.

---

## 23. Sauvegardes

Le Core ne configure pas aujourd’hui une solution de sauvegarde MongoDB ou stockage pour la production.

Chaque application dérivée doit définir :

```text
MongoDB backup
rétention des sauvegardes
restauration testée
stockage fichiers backup / réplication
RPO
RTO
chiffrement
contrôle d’accès
suppression des anciennes sauvegardes
cohérence RGPD / rétention
```

Une sauvegarde qui n’a jamais été restaurée en test ne doit pas être considérée comme une stratégie de restauration validée.

---

## 24. Secrets

Règles :

```text
.env jamais committé
secrets différents entre environnements
secrets de production injectés par le système de déploiement
rotation possible
aucun secret dans les logs
aucun secret dans le frontend Vite public
```

Le frontend ne doit jamais recevoir les secrets JWT, SMTP, MongoDB, antivirus ou infrastructure.

Une variable exposée à Vite doit être considérée comme potentiellement publique côté navigateur.

---

## 25. Proxy, HTTPS et cookies

Le Core impose déjà `CLIENT_URL=https://...` en production.

La configuration finale doit encore vérifier selon l’hébergement réel :

```text
TLS / HTTPS
reverse proxy
trust proxy Express si nécessaire
adresse IP réellement fiable
CORS
Secure cookie
SameSite
Domain éventuel
frontend/API same-site ou cross-site
```

Ces choix ne doivent pas être copiés aveuglément d’un environnement local.

D-013 reste active jusqu’à validation réelle du déploiement.

---

## 26. Gate pré-production d’un SaaS dérivé

Un produit dérivé ne doit pas être déclaré prêt uniquement parce que :

```text
npm start fonctionne
+
frontend build fonctionne
```

La gate minimale doit couvrir selon le produit :

```text
configuration environnement validée
secrets réels
MongoDB production + sauvegardes
migrations appliquées
indexes vérifiés
seeds requis exécutés
jobs réellement planifiés
SMTP réel validé
stockage production validé
antivirus opérationnel
health/liveness configuré
readiness adaptée
logs / monitoring / alertes
HTTPS / proxy / CORS / cookies
rollback documenté
conformité applicable
E2E critiques
```

Les dettes bloquantes restent gérées par `docs/DEBT.md`.

---

## 27. Relation avec les SaaS dérivés

`docs/derived-saas/DERIVED-SAAS.md` définit comment un produit reçoit une nouvelle version du Core.

Le présent document complète cette politique : chaque upgrade Core doit vérifier :

```text
migrations nouvelles
variables .env nouvelles/modifiées
jobs nouveaux/modifiés
provider ou dépendance système nouvelle
stockage
SMTP
antivirus
health/readiness
impact rollback
```

La mise à niveau d’un SaaS dérivé n’est donc pas uniquement une fusion Git ; c’est aussi une opération d’exploitation.

---

## 28. Limites opérationnelles actuelles à ne pas masquer

Au 2026-09-17, les points suivants ne sont pas finalisés comme contrat de production générique :

```text
provider de stockage distant / production
backup et restauration
readiness des dépendances
observabilité centralisée
ordonnancement réel des jobs
pipeline CI/CD de déploiement production
registre automatique des migrations appliquées
rollback automatisé des migrations
configuration reverse proxy / trust proxy
provider SMTP production
infrastructure ClamAV production / supervision / mise à jour des signatures
```

La CI de validation du Core existe via la gate canonique `npm run release:check`, y compris les E2E Playwright du Core ; elle ne doit pas être confondue avec un pipeline complet de déploiement production.

Ces limites sont compatibles avec le statut de développement actuel du Core mais doivent être traitées ou explicitement résolues par le produit avant go-live.

---

## 29. Règle de maintenance

Toute évolution de :

```text
.env.example
backend/config/env.js
package.json scripts
backend/server.js
backend/config/db.js
backend/seeds/
backend/migrations/
backend/jobs/
backend/operations/
backend/services/storage/
backend/services/malwareScan/
health checks
configuration SMTP
e2e/
```

doit vérifier si `OPERATIONS.md` doit être mis à jour dans le même lot.
