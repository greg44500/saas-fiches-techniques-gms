# M-004 — Design technique des exports

## Architecture

Le module reste sous `backend/modules/technicalSheet`.

Chaîne principale :

`route -> validation Zod -> RBAC -> entitlement -> accès Dossier -> service d'export -> projection canonique -> renderer PDF/XLSX/CSV -> réservation quota + activité -> réponse HTTP`.

Aucun modèle MongoDB Export n'est créé.

## API

### Génération

`POST /api/workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/exports`

Body :

```json
{ "format": "PDF" }
```

Formats : `PDF | XLSX | CSV`.

Réponse : binaire avec `Content-Type` et `Content-Disposition: attachment`.

### Usage Workspace

`GET /api/workspaces/:workspaceId/technical-sheets/exports/usage`

Retourne `current`, `limit`, `remaining`, `unlimited`.

## Quota et atomicité

L'artefact est construit en mémoire avant réservation du quota. Après génération réussie, une transaction réserve atomiquement `technical_sheet_exports_monthly` et crée l'événement métier `TECHNICAL_SHEET_EXPORTED`.

La génération invalide ne consomme donc pas de quota. Le moteur Core existant reste l'autorité pour les limites et les overrides.

## Sécurité

- filtre Workspace + Dossier + TechnicalSheet sur toute lecture ;
- exclusion de `DELETED` ;
- snapshot validé uniquement ;
- formats contrôlés par enum Zod ;
- noms de fichiers assainis ;
- CSV UTF-8 BOM et séparateur français ;
- neutralisation des chaînes commençant par `=`, `+`, `-`, `@`, tabulation ou retour chariot dans les tableurs ;
- aucun contenu binaire dans les événements d'activité.

## Frontend

RTK Query récupère le Blob et invalide le tag du KPI d'usage. Le helper de téléchargement existant est réutilisé.

Le composant d'export utilise `components/ui/popover.jsx`, déjà basé sur Base UI, et les primitives Button/Tooltip existantes.


## Migration RBAC

La permission `technical-sheet:export` est déclarée par le module M-004. Les nouveaux rôles système Owner l'obtiennent via le registre applicatif. Les rôles Owner déjà persistés sont mis à niveau par `migration:m004-export-permission`, qui réutilise la primitive Core générique `backfillRegisteredSystemRolePermissions`.

Aucune permission n'est ajoutée automatiquement aux rôles personnalisés.


## État éditorial de liste et prévisualisation

`listTechnicalSheets()` ne persiste aucun nouveau champ d'état. Il expose les deux faits nécessaires à la présentation :

- `currentValidatedStateId`, déjà porté par `TechnicalSheet` ;
- `hasDraft`, calculé par une requête groupée et Workspace/Dossier-scoped sur `TechnicalSheetDraft` pour les Fiches de la page.

Le frontend dérive ensuite `Brouillon | Validée | En révision`. Cette projection n'est utilisée dans aucun contrôle de sécurité.

L'ouverture d'un nouveau brouillon invalide également le cache RTK Query de la liste afin que `Validée` devienne immédiatement `En révision`.

La prévisualisation de liste réutilise la lecture sécurisée existante :

`GET /api/workspaces/:workspaceId/dossiers/:dossierId/technical-sheets/:technicalSheetId/history/:validationId`

Le `validationId` envoyé est exclusivement `currentValidatedStateId`. La modal n'interroge pas le brouillon et ne déclenche aucune consommation de `technical_sheet_exports_monthly`.

Le menu d'export `TechnicalSheetExportMenu` est partagé entre le poste de travail et la liste. La liste ne réimplémente donc ni les formats ni la logique de téléchargement.


## Renderer PDF professionnel mono-page

Le renderer PDF reste backend, sans nouvelle dépendance, et produit directement un PDF A4 paysage en mémoire.

### Contrat de présentation

`buildTechnicalSheetPdfLayout(projection)` produit un contrat testable contenant :

- `summaryItems` : synthèse production compacte ;
- `composition.columns` et `composition.rows` ;
- `analysis.groups` : lignes économiques déjà dédupliquées ;
- `grid` : répartition côte à côte Composition / Analyse ;
- `document.singlePage = true`.

La composition occupe 486 points, l'analyse 280 points et leur séparation 16 points, soit exactement la largeur utile de la feuille.

### Ajustement de densité

`resolveCompositionTableMetrics()` mesure chaque cellule et cherche automatiquement une typographie/padding permettant de conserver toutes les lignes sur l'unique feuille. Les notes restent prises en compte dans le calcul de hauteur.

Il n'existe plus de saut de page métier, de répétition d'en-tête ou de pied de page numéroté : la contrainte du produit est désormais `une Fiche = une feuille`.

### Déduplication

`buildAnalysisGroups()` décide uniquement de la présentation :

- Économat à zéro masqué ;
- coût total masqué s'il est identique au coût matière en absence d'Économat ;
- coûts par pièce/portion basés sur le coût total ;
- prix conseillé/retenu fusionnés en `Prix TTC` lorsqu'ils sont identiques.

Cette déduplication n'altère jamais `TechnicalSheetValidation` ni la projection canonique. Elle ne change que le renderer PDF.

### Projection de composition

Le snapshot conserve `kind`, rendement et quantité brute pour l'intégrité métier et les calculs. Ils ne sont pas exposés dans le PDF V1.

La colonne `Note` reste conditionnelle : elle est créée uniquement lorsqu'au moins une ligne contient une note.
