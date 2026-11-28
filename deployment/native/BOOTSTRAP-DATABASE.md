# PRE-BETA-003 — initialisation MongoDB vierge

Date : 2026-11-28. Statut : classification candidate, **pas encore autorisée
pour Atlas**. Base du diagnostic : produit b3bfcb66b1b83f0d2488c627703a72ad60075c0d ; Core intégré v1.2.1.

## 1. Constat de code

Les 36 runners du manifeste ont été inspectés. Les helpers et seeds
déterminants ont été examinés ; la qualification exhaustive des invariants
et la comparaison effective des index restent à prouver sur une base vierge.
Le manifeste décrit les dépendances historiques, pas une recette d'installation.

- db.js désactive autoIndex en production. Il faut donc installer explicitement
  les contraintes de tous les modèles, y compris ceux sans runner historique
  (authentification, tokens, sessions, etc.).
- runAddSubscriptionKindMigration attend une collection existante et protège
  un index unique partiel déjà déclaré dans subscription.model.js.
- hardenOperationalIndexes ajoute 12 spécifications opérationnelles, dont
  plusieurs ne sont pas déclarées dans les modèles. Le helper
  addSubscriptionLifecycleIndexes ajoute ou vérifie trois index de jobs.
  Créer d'abord les collections/index de schéma, puis vérifier ces deux helpers.
- ensureM002CatalogIndexes comporte des suppressions d'index historiques et des
  mises à jour ; ensureM003SupplierCatalogIndexes comporte des suppressions
  d'anciens index. Ne pas utiliser ces runners comme installateurs génériques.
- seedPlans crée une seule baseline Free, active, publique, sans feature,
  avec limites members=1, storage_bytes=100 Mio, file_uploads_monthly=10,
  technical_sheets=10, exports mensuels=10 (clé du registre métier).
  Ce n'est pas une validation commerciale des offres de bêta.
- seedSuperAdmin crée le Fondateur et sa local AuthIdentity transactionnellement,
  après seedPlatformRoles ; les secrets de bootstrap doivent être éphémères.
- seedM003ReferenceGovernance sait créer directement le rôle global combiné
  business_reference_governor et son membership en l'absence du rôle M-002.
  Il n'est donc pas nécessaire de créer d'abord un membership M-002 historique.
- Les seeds M-002 référence V9 et M-003 prix indicatifs V3 nécessitent un acteur
  valide. V3 dépend des variantes du référentiel. Examiner leur corpus et
  provenance avant d'activer les prix de référence en bêta.
- Le runner M-006 default phase titles parcourt les workspaces existants.
  Il reste à prouver l'initialisation des phases lors du premier onboarding.

## 2. Inventaire machine-readable

`bootstrap-classification.json` couvre toutes les entrées historiques et
les sept seeds npm. `bootstrap-plan.mjs` refuse un manifeste ou un catalogue
de seeds désynchronisé. Aucun des deux n'exécute des scripts npm ou MongoDB.

### historical (7)

Reprise de documents historiques ; vérifier les invariants de création sur base vierge.

- subscription-kind
- subscription-term-type
- workspace-member-usage
- workspace-member-usage-reconcile
- file-storage-usage-reconcile
- m004-production-quantity
- m004-usage-reconcile

### additive-index (2)

Index opérationnels explicites : conserver les helpers additifs après création des collections et index de schéma.

- subscription-lifecycle-indexes
- operational-indexes

### schema-index (3)

Index portés par les schémas actuels ; comparer les spécifications et noms avant validation.

- application-global-authorization-indexes
- m001-indexes
- m004-workspace-business-settings

### role-backfill (12)

Permissions sur rôles déjà persistés ; vérifier la création des rôles système via le registre actuel et les parcours d’onboarding.

- subscription-read-permission
- audit-read-permission
- member-invite-permission
- file-read-permission
- file-delete-permission
- file-trash-permissions
- workspace-ownership-transfer-permission
- m004-export-permission
- m006-process-composition-permission
- m006-process-editor-permission
- m006-process-validate-permission
- m006-process-finalization-permissions

### plan-seed (4)

Le seedPlans actuel crée la baseline avec systemRole, features vides et limites M-004 ; ne pas rejouer le backfill sur un plan neuf.

- baseline-plan-system-role
- baseline-remove-file-upload
- m004-plan-limit
- m004-export-plan-limit

### mixed-index (6)

Installer les index actuels sans exécuter les transformations et backfills historiques ; vérifier tous les index attendus des helpers.

- m002-catalog
- m003-supplier-catalog
- m004-technical-sheets
- m004-ranges
- m006-process-library
- m006-process-sheets

### reference-seed (1)

Le runner mélange index, permissions, réconciliation et seed V3 ; le seed canonique seul est candidat après le référentiel V9 et le Fondateur.

- m003-indicative-pricing

### workspace-seed (1)

Le runner parcourt les workspaces existants ; aucun workspace au bootstrap. Vérifier la création des phases pour un nouveau workspace.

- m006-default-phase-titles

## 3. Ordre candidat pour la future répétition locale

1. Sélectionner une nouvelle base logique locale dédiée se terminant par
   _bootstrap_test sur rs0. Ne jamais utiliser la base dev, Vitest, E2E ou Atlas.
2. Inventorier tous les modèles et leurs contraintes, créer explicitement les
   collections et index (autoIndex=false, autoCreate=false) sans syncIndexes
   ni dropIndex. Comparer les index des helpers aux spécifications de schéma,
   compléter les index opérationnels additifs et vérifier les options
   d'unicité, TTL, partialFilterExpression et ordre des clés.
3. Installer seed:plans et seed:platform-roles ; bootstrap du Fondateur par
   seed:super-admin, avec adresse et mot de passe fictifs et SMTP isolé.
4. Installer la gouvernance combinée seed:m003-governance et le référentiel
   seed:m002-reference ; vérifier les counts, clés et version du corpus.
5. Après qualification du corpus V3, installer seed:m003-global-indicative-prices.
6. Tester un onboarding workspace, les rôles système, limites et métriques,
   les phases M-006, l'isolation tenancy, et les parcours produit.
7. Vérifier les index effectifs, les invariants et l'absence de doublons,
   puis établir la stratégie de reprise après échec partiel.

Ce plan n'est **pas** une suite de commandes à exécuter manuellement. Le
contrôleur d'initialisation sécurisé et la répétition locale sont à développer
après l'inventaire des modèles et la qualification des contraintes.
Pas de suppression automatique de base ni de rejouabilité globale présumée.

## 4. Passage Atlas

Nom de base proposé : fichepilot_beta, à confirmer. Après GO, autoriser
uniquement l'IP publique du VPS, exécuter le diagnostic MongoDB en lecture,
vérifier la cible exacte, les privilèges et l'absence de données. Ne pas
initialiser une base non vierge avec le futur bootstrap. Aucun seed, migration,
job ou import sur Atlas avant approbation et recette de la procédure locale.
Prévoir une revue des droits nécessaires à la création des index et des
transactions ; distinguer bootstrap et compte runtime si les droits le permettent.
Les sauvegardes sont exigées avant bêta réelle, pas de restauration implicite.

## 5. Sources canoniques

- docs/releases/migration-manifest.json et MIGRATION-POLICY.md
- backend/config/db.js et backend/modules/**/*.model.js
- backend/migrations/run*.js et helpers cités ci-dessus
- backend/seeds/seedPlans.js, seedPlatformRoles.js, seedSuperAdmin.js,
  seedM002Reference.js, seedM002ProductGovernance.js,
  seedM003ReferenceGovernance.js, seedM003GlobalIndicativePrices.js
- deployment/native/INSTALLATION.md

La preuve actuelle est une analyse de code et un inventaire. Aucun test réel
de bootstrap, de création d'index ou d'écriture MongoDB n'est revendiqué.


## 6. Inventaire hors connexion des modèles

`node deployment/native/model-inventory.mjs` importe les modèles de
`backend/modules/**/*.model.js` dans un processus dédié avec configuration
fictive issue du modèle .env.example, autoCreate et autoIndex désactivés.
Il ne connecte pas MongoDB et ne crée aucun index. Le rapport JSON contient
les collections, noms, clés et options déclarés par les schémas. Le périmètre
est celui de la convention *.model.js ; il faudra contrôler qu'aucun modèle
hors convention ni index exclusivement opérationnel n'est oublié. L'inventaire
ne remplace pas la comparaison effective des index de la base vierge.
Les deux tests unitaires vérifient la découverte et la conservation des
contraintes, sans nécessiter Mongoose ni connexion. L'exécution réelle
du rapport exige les dépendances npm installées, et reste à confirmer.
