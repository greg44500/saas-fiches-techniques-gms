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
