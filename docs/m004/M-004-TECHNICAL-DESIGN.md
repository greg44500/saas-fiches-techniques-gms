# M-004 — Conception technique Fiches techniques et valorisation

**Statut : PRÊT À IMPLÉMENTATION — conception fermée pour le bloc M-004 hors exports**  
**Date : 2026-09-28**  
**Contrat fonctionnel :** `docs/m004/M-004-FINAL-CONTRACT.md`  
**Base produit vérifiée :** `main@b479b217815fad885f233e98b8f3145656641352`  
**Core intégré :** `v1.2.1@d90d8f1e6034cbbf4f63de2be7312eae69b1d698`

---

## 1. Objectif de la conception

Cette conception traduit le contrat fonctionnel M-004 en architecture backend/frontend sans modifier les invariants M-001/M-002/M-003.

Principes :

- M-001 reste l'autorité du contexte Dossier et de son access scope ;
- M-002 reste l'autorité de la Référence Produit et des unités/rendements ;
- M-003 reste l'autorité de l'Article fournisseur et du Prix applicable ;
- le Core reste l'autorité RBAC générique, Plan/limits, UsageMetric, overrides et audit ;
- M-004 ne reconstruit aucune primitive existante.

La conception ne nécessite aucune modification du Core. La corbeille des Fiches techniques et sa purge automatique sont des responsabilités métier du produit.

---

## 2. Agrégat fonctionnel

Le domaine est structuré autour de trois collections métier principales :

~~~text
TechnicalSheet
→ identité durable + lifecycle + identité courante

TechnicalSheetDraft
→ 0 ou 1 état de travail mutable par Fiche

TechnicalSheetValidation
→ états validés append-only et immuables
~~~

Cette séparation évite :

- d'écraser l'historique lors d'une modification ;
- de dupliquer une identité Fiche à chaque validation ;
- de transformer les sauvegardes intermédiaires en versions commerciales ;
- de mélanger lifecycle de la Fiche et état de travail.

---

## 3. Modèle TechnicalSheet

Rôle : identité durable et lifecycle.

Champs proposés :

~~~text
workspace                  ObjectId Workspace, immutable, required
dossier                    ObjectId Dossier, immutable, required

name                       String, required
description                String|null

status                     ACTIVE | ARCHIVED | DELETED
statusChangedAt            Date
statusChangedBy            User

currentValidatedState      ObjectId TechnicalSheetValidation|null

copyOrigin                 {
    sourceTechnicalSheet   ObjectId|null
    sourceDossier          ObjectId|null
    copiedAt               Date|null
}

preDeleteStatus            ACTIVE | ARCHIVED | null
deletedAt                  Date|null
deletedBy                  User|null
purgeScheduledAt           Date|null

revision                   integer >= 0
createdBy                  User
updatedBy                  User
createdAt / updatedAt
~~~

### Règles

- `workspace` et `dossier` sont immuables ;
- une copie crée un nouveau document TechnicalSheet ;
- `name` et `description` représentent l'identité courante ;
- les états validés conservent leur propre snapshot de nom/description ;
- `revision` porte le contrôle optimiste des mutations d'identité/lifecycle ;
- `currentValidatedState` est modifié uniquement dans la transaction de validation ;
- `purgeScheduledAt` est calculé et figé au moment de la suppression.

---

## 4. Modèle TechnicalSheetDraft

Rôle : unique état de travail mutable d'une Fiche.

Champs proposés :

~~~text
workspace              ObjectId
dossier                ObjectId
technicalSheet         ObjectId unique

revision               integer >= 0

productionQuantity     Decimal128|null
productionUnit         unité M-002|null
portions               Decimal128|null

vatRateBasisPoints     integer|null
targetMarginBasisPoints integer|null

finalPriceTtcMinor     integer|null
finalPriceMode         ADVISED | MANUAL

lines[]                sous-documents structurés

valuationStatus        NOT_VALUED | PARTIAL | COMPLETE | STALE
valuedAt               Date|null
valuationFingerprint   String|null

createdBy
updatedBy
createdAt / updatedAt
~~~

### Raisons techniques

- un index unique sur `technicalSheet` garantit au maximum un brouillon ;
- `revision` permet de refuser les écrasements concurrents ;
- Decimal128 est conservé pour les quantités et calculs non monétaires exacts ;
- les taux en basis points évitent les flottants pour TVA et marge ;
- le Prix final TTC est stockable en unité monétaire mineure ;
- `finalPriceMode` permet de préserver explicitement un choix utilisateur lors d'une revalorisation.

Aucune valeur de TVA ou de marge cible n'est inventée par la conception.

---

## 5. Ligne de brouillon

Chaque ligne embarquée contient au minimum :

~~~text
lineId                  ObjectId de sous-document
kind                    INGREDIENT | ECONOMAT
productVariant          ObjectId ProductVariant
netQuantity             Decimal128
inputUnit               unité M-002
order                   integer
note                    String|null

selectedSupplierArticle ObjectId SupplierArticle|null

calculation             {
    yieldPercentUsed    Decimal128|null
    grossQuantity       Decimal128|null
    grossUnit           unité|null
    recipePercent       Decimal128|null
}

valuation               {
    status              UNRESOLVED | NO_PRICE | VALUED | STALE
    supplierArticleId   ObjectId|null
    applicableSource    String|null
    normalizedAmount    Decimal128|null
    normalizedUnit      unité|null
    lineCostHt          Decimal128|null
    pricedAt            Date|null
    sourceFingerprint   String|null
    alerts[]            String[]
}
~~~

Les libellés Produit/Fournisseur/Article ne constituent pas la source de vérité du brouillon : ils sont résolus pour l'affichage. Les états validés, eux, en conservent un snapshot historique.

---

## 6. Modèle TechnicalSheetValidation

Rôle : snapshot immuable d'une validation.

Champs proposés :

~~~text
workspace
dossier
technicalSheet

validatedAt
validatedBy
comment|null

changeKinds[]           IDENTITY | COMPOSITION | SOURCING | ECONOMICS

sheetSnapshot           {
    name
    description
    productionQuantity
    productionUnit
    portions
    vatRateBasisPoints
    targetMarginBasisPoints
}

linesSnapshot[]         {
    kind
    productVariantId
    productVariantName
    netQuantity
    inputUnit
    yieldPercentUsed
    grossQuantity
    grossUnit
    recipePercent
    supplierArticleId
    supplierId
    supplierName
    supplierReference
    supplierDesignation
    brand
    normalizedPriceHt
    normalizedUnit
    applicableSource
    lineCostHt
    order
    note
}

economicSnapshot        {
    materialCostHt
    economatCostHt
    manufacturingCostHt
    theoreticalPriceHt
    theoreticalPriceTtc
    advisedPriceTtc
    finalPriceHt
    finalPriceTtc
    actualMarginAmountHt
    actualMarginBasisPoints
}

valuationFingerprint
createdAt
~~~

### Immutabilité

- aucune route UPDATE/DELETE sur un état validé ;
- modèle append-only ;
- hooks de modèle interdisant les mutations d'un document existant ;
- suppression uniquement dans le cadre de la purge de la Fiche entière.

Le numéro de version n'est pas un concept UX. L'historique est ordonné par `validatedAt` puis `_id`.

---

## 7. Indexes

### TechnicalSheet

~~~text
{ workspace: 1, dossier: 1, status: 1, updatedAt: -1 }
{ workspace: 1, status: 1, updatedAt: -1 }
{ workspace: 1, dossier: 1, name: 1 }
{ workspace: 1, purgeScheduledAt: 1, status: 1 }
~~~

Aucune unicité sur le nom : deux Fiches peuvent porter le même nom si le métier le permet.

### TechnicalSheetDraft

~~~text
{ technicalSheet: 1 } UNIQUE
{ workspace: 1, dossier: 1, updatedAt: -1 }
~~~

### TechnicalSheetValidation

~~~text
{ technicalSheet: 1, validatedAt: -1, _id: -1 }
{ workspace: 1, dossier: 1, validatedAt: -1 }
~~~

---

## 8. Extension du Dossier

Ajouter au modèle Dossier une section métier nullable :

~~~text
technicalSheetSettings: {
    defaultTargetMarginBasisPoints: integer|null
}
~~~

Règles :

- aucune valeur arbitraire n'est injectée lors de la migration ;
- `null` signifie « aucune marge par défaut configurée » ;
- une nouvelle Fiche initialise sa marge cible depuis cette valeur si elle existe ;
- sinon le brouillon garde une marge cible non renseignée et l'utilisateur doit la fournir avant calcul économique complet/validation ;
- une modification du Dossier ne modifie aucune Fiche existante.

Cette section appartient au produit, pas au Core.

### 8.1 Réglage Workspace de corbeille

Le produit ajoute un réglage Workspace métier distinct du modèle Workspace Core :

~~~text
WorkspaceBusinessSettings
{
    workspace             ObjectId Workspace UNIQUE, immutable
    trashRetentionDays    integer 1..90, default 30
    createdBy
    updatedBy
    createdAt / updatedAt
}
~~~

Ce modèle appartient au produit `saas-fiches-techniques-gms`.

Règles :

- aucun champ n'est ajouté au modèle Workspace Core ;
- la valeur par défaut est 30 jours ;
- le Workspace Owner peut modifier la valeur entre 1 et 90 jours ;
- l'absence exceptionnelle de document est interprétée fail-safe avec la valeur produit par défaut de 30 jours, puis le document peut être matérialisé par le service ;
- la valeur est lue au moment de la suppression d'une Fiche ;
- la modification du réglage n'est jamais rétroactive sur les Fiches déjà en corbeille.

Service proposé :

~~~text
workspaceBusinessSettings.service.js
~~~

La surface HTTP reste produit-scoped :

~~~text
GET /api/workspaces/:workspaceId/business-settings
PUT /api/workspaces/:workspaceId/business-settings/trash-retention
~~~

La permission de modification est une permission applicative métier Owner-only par défaut.


---

## 9. Calculs et précision

Les calculs M-004 doivent éviter les flottants JavaScript pour les montants et quantités déterminantes.

Réutilisation proposée :

- `PRODUCT_REFERENCE_UNIT_REGISTRY` M-002 pour dimensions/facteurs ;
- helpers rationnels déjà utilisés par M-003 pour parser/conserver des décimaux exacts ;
- Decimal128 pour stockage des quantités, prix normalisés et coûts calculés.

Service dédié :

~~~text
technicalSheetMath.service.js
~~~

Responsabilités :

- conversion d'unités compatibles ;
- quantité brute ;
- pourcentage recette ;
- multiplication quantité × Prix normalisé ;
- agrégation CM / Économat / fabrication ;
- marge cible et coefficient ;
- HT/TTC ;
- arrondi au multiple de 0,50 € ;
- marge réelle ;
- plancher économique.

Aucune logique de calcul économique dans controller ou frontend.

---

## 10. Fraîcheur et fingerprints

Une valorisation doit pouvoir démontrer qu'elle utilise encore les mêmes références économiques lors de la validation.

Chaque ligne valorisée conserve un fingerprint déterministe construit depuis les données réellement utilisées, par exemple :

~~~text
ProductVariant id
+ rendement utilisé
+ SupplierArticle id
+ source du Prix applicable
+ id de la donnée tarifaire source
+ montant normalisé
+ unité normalisée
+ temporalité utile
~~~

Le draft conserve ensuite un `valuationFingerprint` global dérivé de :

- composition ;
- quantités ;
- unités ;
- TVA ;
- marge cible ;
- Articles retenus ;
- fingerprints de lignes.

À la validation :

1. recharger ProductVariants et Articles ;
2. relancer la résolution M-003 des Prix applicables ;
3. recalculer le fingerprint ;
4. refuser avec `409` si le fingerprint économique a changé ;
5. exiger une revalorisation explicite.

Le frontend ne décide jamais de la fraîcheur.

---

## 11. Concurrence

Deux révisions sont distinguées :

~~~text
TechnicalSheet.revision
→ identité et lifecycle

TechnicalSheetDraft.revision
→ état de travail
~~~

Chaque mutation reçoit la révision attendue.

Pattern d'écriture :

~~~text
_id
+ workspace
+ dossier
+ revision attendue
+ état compatible
→ $set modifications
→ $inc revision: 1
~~~

Si aucun document n'est modifié :

~~~text
409 Conflict
→ état devenu obsolète
~~~

Pas de merge automatique.

La validation utilise une transaction MongoDB et revérifie les deux révisions nécessaires.

---

## 12. Transactions principales

### Création

Transaction :

1. vérifier Dossier opérationnel ;
2. résoudre entitlement effectif ;
3. réserver atomiquement 1 unité de métrique `technical_sheets` ;
4. créer TechnicalSheet ;
5. créer son TechnicalSheetDraft initial ;
6. écrire activité/audit métier.

En cas d'échec, réservation et créations rollback ensemble.

### Validation

Transaction :

1. charger Fiche + brouillon avec révisions attendues ;
2. revérifier références et prix ;
3. recalculer entièrement ;
4. refuser si valorisation obsolète ;
5. créer TechnicalSheetValidation ;
6. mettre à jour `currentValidatedState` ;
7. supprimer le brouillon ;
8. incrémenter la révision de Fiche ;
9. tracer l'événement.

Aucune variation de quota.

### Création d'un nouveau brouillon après validation

Transaction courte :

1. vérifier absence de draft ;
2. charger snapshot validé courant ;
3. matérialiser un draft ;
4. conserver les références métier nécessaires ;
5. marquer la valorisation STALE/NOT_VALUED selon les données recopiées.

Aucune variation de quota.

### Copie

Transaction :

1. vérifier lecture source et création cible ;
2. vérifier source ACTIVE/ARCHIVED ;
3. refuser la copie si un brouillon de travail est ouvert ;
4. charger exclusivement l’état validé courant comme source de composition ;
5. vérifier Dossier cible ACTIVE ;
6. réserver +1 quota ;
7. créer nouvelle TechnicalSheet ;
8. créer draft depuis les données non financières autorisées ;
9. initialiser marge cible depuis Dossier cible ;
10. ne copier aucune valorisation ;
11. conserver copyOrigin.

### Suppression vers corbeille

Transaction :

1. vérifier permission DELETE ;
2. calculer la durée de rétention effective du Workspace ;
3. figer `purgeScheduledAt` ;
4. stocker `preDeleteStatus` ;
5. passer la Fiche en DELETED ;
6. conserver draft/historique/snapshots ;
7. tracer.

Aucune libération de quota.

### Restauration

Transaction :

1. vérifier DELETED et échéance non purgée ;
2. remettre `preDeleteStatus` valide ;
3. effacer les champs de suppression ;
4. conserver quota et contenu ;
5. tracer.

### Purge définitive

Transaction :

1. revérifier éligibilité ou permission Owner pour purge manuelle ;
2. supprimer validations ;
3. supprimer draft éventuel ;
4. supprimer TechnicalSheet ;
5. libérer exactement 1 unité `technical_sheets` via `releaseCurrentUsageMetric`.

---

## 13. RBAC technique

Permissions applicatives proposées :

~~~text
technical-sheet:read
technical-sheet:create
technical-sheet:update
technical-sheet:sourcing:manage
technical-sheet:valuation:manage
technical-sheet:validate
technical-sheet:lifecycle:manage
technical-sheet:delete
technical-sheet:restore
technical-sheet:purge
technical-sheet:copy
technical-sheet:settings:manage
~~~

Descriptor :

~~~text
technicalSheetPermission.registry.js
~~~

Le rôle système Owner reçoit toutes ces permissions.

Les profils Responsable FT / Contributeur / Acheteur / Économe / Lecteur restent des profils fonctionnels de Roles Workspace personnalisés ; M-004 ne crée pas de nouveau type de rôle Core.

Les routes Dossier utilisent en plus :

- `loadWorkspaceContext` ;
- `loadAuthorizedDossierContext` ;
- `enforceDossierStatePolicy` ;
- `enforceWorkspaceAccessMode()` pour les mutations.

---

## 14. Métrique et quota

M-004 ajoute une métrique applicative :

~~~text
technical_sheets
~~~

Définition :

~~~text
periodType = CURRENT
behavior = CAPACITY
remediationRequired = true
unit = count
label = Fiches techniques
~~~

Descriptor :

~~~text
technicalSheetCapability.registry.js
~~~

Aucune feature commerciale séparée n'est requise pour les actions normales de Fiche technique.

Le descriptor est composé dans :

~~~text
backend/config/applicationCapability.registry.js
~~~

### Runtime

Création/copie :

~~~text
enforcePlanLimit({
    workspaceId,
    metricKey: 'technical_sheets',
    amount: 1,
    session
})
~~~

Purge :

~~~text
releaseCurrentUsageMetric(...)
~~~

Dashboard/capacité :

~~~text
getUsageMetricValue
+
getWorkspaceEffectiveEntitlement
+
resolveEffectiveMetricLimit
~~~

Le quota est donc override-aware et concurrency-safe.

---

## 15. Plans et migration de métrique

L'ajout d'une nouvelle métrique au registre impose que les Plans existants la configurent explicitement, car `validatePlanCapabilities` et `resolveEffectiveMetricLimit` sont fail-closed.

Prévoir :

~~~text
migration:add-m004-technical-sheet-metric
~~~

Règles de migration proposées :

- baseline Free : limite temporaire de développement configurable, baseline initiale proposée = 10 ;
- cette valeur reste une donnée de Plan, jamais une constante métier ;
- les autres Plans doivent recevoir une valeur explicite avant production ;
- aucun seuil commercial Premium/IA n'est figé par M-004 sans décision produit ;
- la migration/seed doit rester idempotente ;
- un outil de réconciliation UsageMetric doit être prévu pour recalculer le nombre réel de Fiches si nécessaire.

`seedPlans.js` doit inclure la métrique dans la définition baseline afin qu'une installation neuve respecte le registre actif.

---

## 16. Routes backend

### Router Dossier

Montage :

~~~text
/api/workspaces/:workspaceId/dossiers/:dossierId/technical-sheets
~~~

Endpoints proposés :

~~~text
GET    /metadata
GET    /
POST   /

GET    /settings
PUT    /settings

GET    /:technicalSheetId
PATCH  /:technicalSheetId

GET    /:technicalSheetId/draft
PUT    /:technicalSheetId/draft

POST   /:technicalSheetId/valuate
POST   /:technicalSheetId/validate

GET    /:technicalSheetId/history
GET    /:technicalSheetId/history/:validationId

POST   /:technicalSheetId/archive
POST   /:technicalSheetId/reactivate
POST   /:technicalSheetId/delete
POST   /:technicalSheetId/restore
POST   /:technicalSheetId/purge

POST   /:technicalSheetId/copy
~~~

La conception des URLs n'expose pas de terme `version` comme concept utilisateur.

### Router Workspace

Montage :

~~~text
/api/workspaces/:workspaceId/technical-sheets
~~~

Endpoints proposés :

~~~text
GET /capacity
~~~

Une corbeille globale Workspace pourra être ajoutée uniquement si l'UX retenue le nécessite ; elle réutilisera les mêmes services et n'introduira pas une seconde logique de ressource.

---

## 17. Validation Zod

Fichiers :

~~~text
technicalSheet.validation.js
~~~

Principes :

- `z.strictObject` ;
- ObjectId validés ;
- quantités positives représentées en chaînes décimales normalisées avant Decimal128 ;
- unités limitées aux registries M-002 ;
- taux représentés en basis points côté API ou transformés de façon déterministe ;
- aucun champ calculé accepté depuis le client ;
- aucun coût, marge réelle, quantité brute ou pourcentage recette fiable depuis le frontend ;
- `expectedRevision` obligatoire sur les mutations concurrentes ;
- commentaire de validation facultatif et borné ;
- aucune référence libre de Produit/Fournisseur.

Le backend recalcule toutes les valeurs dérivées.

---

## 18. Corbeille Workspace et purge automatique métier

La corbeille M-004 est implémentée dans le produit, sans utiliser ni modifier le moteur de rétention Core.

### Configuration Workspace

Source :

~~~text
WorkspaceBusinessSettings.trashRetentionDays
~~~

Bornes :

~~~text
default = 30
min = 1
max = 90
~~~

### Suppression

Dans la transaction de suppression :

~~~text
retentionDays = réglage Workspace courant
purgeScheduledAt = deletedAt + retentionDays
~~~

`purgeScheduledAt` est persisté sur la Fiche et devient l'autorité de son échéance.

Changer `trashRetentionDays` après la suppression ne modifie jamais cette échéance.

### Job métier

Entrypoint proposé :

~~~text
backend/jobs/technicalSheets/runPurgeDeletedTechnicalSheetsJob.js
npm run job:purge-technical-sheets
~~~

Le job est :

- global à l'application ;
- idempotent ;
- indépendant des Workspaces ;
- exécutable régulièrement par l'infrastructure ;
- sans scheduler distinct par Workspace.

Éligibilité :

~~~text
status = DELETED
AND purgeScheduledAt <= now
~~~

Traitement :

1. sélectionner un batch borné d'identifiants éligibles ;
2. pour chaque Fiche, appeler le service transactionnel de purge M-004 ;
3. supprimer Draft + Validations + TechnicalSheet de façon cohérente ;
4. libérer exactement 1 unité de métrique `technical_sheets` ;
5. tracer l'activité/audit ;
6. continuer sur les autres éléments même si un élément devient non éligible entre sélection et exécution.

Un index `{ status: 1, purgeScheduledAt: 1 }` supporte le job.

La cadence opérationnelle du job n'est pas le réglage utilisateur. Une cadence fréquente (par exemple horaire en production) permet de traiter les échéances proches sans créer un cron par Workspace.

### Purge manuelle

Le Workspace Owner conserve la permission `technical-sheet:purge`.

Une purge manuelle :

- exige une confirmation explicite ;
- revérifie que la Fiche est `DELETED` ;
- purge immédiatement l'agrégat demandé même si son échéance automatique n'est pas encore atteinte ;
- libère le quota dans la même transaction.

Une action UX « Vider la corbeille » peut appeler la même primitive de purge sur les Fiches `DELETED` du Workspace, avec confirmation forte et traitement borné.

### Core

~~~text
saas-core-api
→ inchangé

Core retention
→ inchangé

corbeille TechnicalSheet
→ module métier produit
~~~

Aucune branche `core-update/*` n'est nécessaire pour M-004.

---

## 19. Routes de corbeille et réglages Workspace

Routes produit proposées :

~~~text
GET    /api/workspaces/:workspaceId/business-settings
PUT    /api/workspaces/:workspaceId/business-settings/trash-retention

GET    /api/workspaces/:workspaceId/technical-sheets/trash
POST   /api/workspaces/:workspaceId/technical-sheets/trash/purge
~~~

Les endpoints Dossier existants restent utilisés pour supprimer/restaurer/purger une Fiche précise.

La liste de corbeille Workspace agrège uniquement les Fiches techniques `DELETED` appartenant à ce Workspace et respecte le RBAC M-004.

---

## 20. Audit / activité

Créer un registre d'événements métier M-004, sur le modèle des événements M-001/M-003.

Actions minimales :

~~~text
TECHNICAL_SHEET_CREATED
TECHNICAL_SHEET_UPDATED
DRAFT_SAVED
SOURCING_CHANGED
VALUATED
REVALUATED
VALIDATED
ARCHIVED
REACTIVATED
DELETED
RESTORED
PURGED
COPIED
DEFAULT_MARGIN_UPDATED
~~~

L'historique validé n'est pas remplacé par AuditLog.

---

## 21. Services backend

Découpage proposé :

~~~text
technicalSheet.service.js
→ CRUD identité / liste / lecture

technicalSheetDraft.service.js
→ création/reprise/sauvegarde brouillon

technicalSheetComposition.service.js
→ validation lignes, rendements, conversions, pourcentages

technicalSheetValuation.service.js
→ orchestration M-003 + valorisation

technicalSheetMath.service.js
→ calculs purs

technicalSheetValidation.service.js
→ validation transactionnelle + snapshot

technicalSheetLifecycle.service.js
→ archive/reactivate/delete/restore/purge

technicalSheetCopy.service.js
→ copie inter-Dossier

technicalSheetCapacity.service.js
→ usage/limit/dashboard

technicalSheetSettings.service.js
→ marge par défaut Dossier

workspaceBusinessSettings.service.js
→ durée de corbeille Workspace

technicalSheetEvent.service.js
→ événements métier
~~~

Les controllers restent minces et ne portent aucun calcul métier.

---

## 22. Frontend

Feature :

~~~text
frontend/src/features/technical-sheets/
~~~

Sous-structure :

~~~text
api/
components/
constants/
hooks/
lib/
pages/
validation/
technical-sheets-routes.js
~~~

Routes proposées :

~~~text
/workspaces/:workspaceId/dossiers/:dossierId/technical-sheets
/workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId
~~~

Intégration dans `APPLICATION_FRONTEND_ROUTE_MODULES`.

### Liste

Réutiliser :

- DataTable ;
- DataPagination ;
- ActionIconButton ;
- ConfirmationDialog.

### Page Fiche

Sections logiques :

- identité ;
- base de production ;
- Ingrédients ;
- Économat ;
- valorisation ;
- prix/marge ;
- historique.

Le choix final tabs/sections/drawer reste soumis à QA visuelle.

### État serveur

RTK Query exclusivement pour :

- liste ;
- détail ;
- draft ;
- valorisation ;
- historique ;
- capacité ;
- mutations.

Redux Toolkit n'est utilisé que si un véritable état global client apparaît.

Le formulaire local peut utiliser `useState`/composants contrôlés selon les patterns actuels.

---

## 23. RTK Query et invalidations

API dédiée :

~~~text
technical-sheets-api.js
~~~

Tags conceptuels :

~~~text
TechnicalSheet
TechnicalSheetList
TechnicalSheetDraft
TechnicalSheetHistory
TechnicalSheetCapacity
TechnicalSheetSettings
~~~

Création/copie/purge invalident aussi Capacity.

Validation invalide :

- detail ;
- draft ;
- history ;
- list.

Une mutation en `409` ne doit pas écraser le cache avec une réponse locale optimiste.

---

## 24. UX des conflits

Pour un `409` de concurrence :

- informer que la Fiche a changé ;
- ne pas fusionner automatiquement ;
- proposer de recharger l'état courant ;
- conserver localement les données non envoyées seulement si le composant peut le faire sans ambiguïté.

Pour un `409` de prix obsolète :

- message distinct ;
- action principale « Revaloriser ».

Pour `SUPPLIER_ARTICLE_SELECTION_REQUIRED` :

- afficher les candidats M-003 ;
- choix humain ;
- reprendre la valorisation.

Les détails de texte et présentation restent modifiables après validation visuelle.

---

## 25. Tests backend

Au minimum :

- modèles et indexes ;
- unicité du brouillon ;
- immutabilité validation ;
- tenant isolation ;
- Dossier access ;
- toutes permissions M-004 ;
- Owner ;
- quota atomique création/copie ;
- quota non modifié par validation/historique ;
- libération à la purge uniquement ;
- Dossier default margin ;
- conversions M-002 ;
- rendement ;
- calculs économiques ;
- arrondi 0,50 ;
- prix final sous plancher refusé ;
- sourcing 0/1/N ;
- M-003 no-price ;
- prix changé avant validation ;
- fingerprint ;
- concurrence draft/identity ;
- validation transactionnelle ;
- copie A→B ;
- lifecycle ;
- réglage Workspace de corbeille ;
- calcul non rétroactif de purgeScheduledAt ;
- job métier de purge ;
- purge manuelle Owner ;
- reconcile UsageMetric.

---

## 26. Tests frontend

Au minimum :

- permission gates ;
- read-only ;
- création ;
- sauvegarde brouillon ;
- composition ;
- choix Article ambigu ;
- Prix absent ;
- valorisation ;
- revalorisation ;
- prix final manuel ;
- validation ;
- historique ;
- lifecycle ;
- copie ;
- corbeille/restauration ;
- capacity card ;
- quota atteint ;
- conflit 409 ;
- vocabulaire FR ;
- accessibilité et tooltips.

---

## 27. E2E critiques

Conserver le périmètre contractuel :

~~~text
créer → composer → valoriser → valider

ambiguïté Article → choix humain

prix modifié
→ validation refusée
→ revalorisation
→ validation

Dossier A ≠ Dossier B

copie A → B
→ aucune donnée financière A
→ résolution prix B

quota atteint
→ modification autorisée
→ nouvelle création/copie refusée

suppression → corbeille → restauration

purge
→ capacité libérée
~~~

Les E2E couvrent la purge automatique en injectant un instant contrôlé dans le service/job métier ; aucun changement Core n'est requis.

---

## 28. Migrations et bootstrap

Prévoir dans le lot M-004 :

~~~text
migration:m004-technical-sheets
→ indexes TechnicalSheet / Draft / Validation
→ champ settings Dossier si nécessaire
→ registre métrique

migration:m004-plan-limit
→ ajoute la limite technical_sheets aux Plans existants

migration:m004-usage-reconcile
→ recalcule UsageMetric depuis les Fiches non purgées

migration:m004-workspace-business-settings
→ index unique Workspace
→ aucune écriture massive obligatoire : default 30 côté modèle/service

seed/plans
→ installation neuve cohérente avec le registre actif
~~~

Toutes les migrations sont idempotentes et fail-closed.

Aucune migration ne crée de Fiche technique métier fictive.

---

## 29. Ordre d'implémentation

~~~text
1. registries permissions / métrique
2. WorkspaceBusinessSettings + corbeille
3. modèles TechnicalSheet / Draft / Validation
4. migrations / seeds / réconciliation quota
5. math / composition
6. valorisation M-003
7. lifecycle + quota + purge métier
8. API + tests backend
9. frontend + tests
10. E2E critiques
11. QA visuelle utilisateur
12. corrections UX compatibles
13. npm run release:check
14. une seule PR M-004
15. Core Gate PR
16. merge
17. Core Gate post-merge
18. bloc V1 Exports et diffusion séparé
~~~

Aucune branche Core n'est nécessaire.

---

## 30. Décision de conception

La conception M-004 est techniquement viable avec les primitives existantes pour :

- RBAC ;
- tenancy ;
- Dossier access ;
- M-002 ;
- M-003 ;
- transactions ;
- concurrence ;
- quota ;
- overrides ;
- dashboard ;
- audit.

La corbeille Workspace et sa purge automatique sont volontairement implémentées dans le produit métier avec `purgeScheduledAt` par ressource et un job global idempotent.

Aucun blocker Core n'est identifié pour le bloc M-004 hors exports.
