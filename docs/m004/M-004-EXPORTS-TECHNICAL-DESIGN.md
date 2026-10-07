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


## Renderer PDF professionnel

Le renderer PDF reste backend et sans nouvelle dépendance. Il produit directement un PDF A4 paysage en mémoire.

Il est séparé en deux responsabilités :

1. `buildTechnicalSheetPdfLayout(projection)` transforme la projection canonique en contrat de présentation testable : cartes de production, lignes de composition, cartes d'analyse et détails économiques ;
2. le renderer bas niveau dessine ce contrat dans le PDF avec une grille stable, des cellules bordées, des alignements numériques à droite, des hauteurs de lignes calculées et une pagination automatique.

La table de composition utilise des largeurs fixes totalisant la largeur utile du document. Une ligne n'est jamais coupée entre deux pages ; lorsque l'espace est insuffisant, une nouvelle page est créée et l'en-tête de colonnes est redessiné.

Le PDF ne partage pas la technologie de rendu React de la modal : la mutualisation porte sur le contrat de présentation et la source de vérité, pas sur le moteur graphique.


## Projection de composition simplifiée

Le snapshot conserve `kind`, rendement et quantité brute pour l'intégrité métier et les calculs. Le renderer ne les expose pas dans la V1 des livrables.

`buildTechnicalSheetExportProjection` expose désormais aussi :
- `lines` : lignes triées dans l'ordre métier, indépendamment de leur kind ;
- `note` : note figée de chaque ligne.

PDF/CSV/XLSX et prévisualisation utilisent `lines` pour présenter une composition continue. La colonne `Note` est construite dynamiquement uniquement si `lines.some(line => line.note)`.
