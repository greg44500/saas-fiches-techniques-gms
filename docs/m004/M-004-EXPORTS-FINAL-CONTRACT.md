# M-004 — Contrat final des exports de Fiches techniques

**Statut : VALIDÉ**  
**Date : 2026-10-06**

## Objectif

Permettre l'export d'une Fiche technique validée en PDF, XLSX ou CSV depuis son panneau de contrôle.

## Source de vérité

Un export est toujours construit depuis `TechnicalSheetValidation`, snapshot immuable de la version validée courante. Un brouillon ouvert après validation n'est jamais exporté.

Une Fiche sans `currentValidatedState` n'est pas exportable. Une Fiche `DELETED` n'est pas exportable.

## Contenu

Chaque format reprend au minimum :

- titre ;
- date de validation ;
- quantité produite et unité ;
- portions par pièce et total portions ;
- lignes Ingrédients et Économat ;
- quantités nette et brute, rendement utilisé ;
- prix HT normalisé et unité de prix ;
- coût HT de ligne ;
- analyse économique figée : coûts matière, économat et fabrication, coûts par pièce et par portion, TVA, marge cible, prix conseillé TTC, prix retenu TTC et marge réelle.

Sont volontairement exclus : écarts à la cible, diagnostics, alertes, fingerprints, statuts techniques et autres indicateurs d'écart.

## Formats

- PDF ;
- XLSX ;
- CSV UTF-8 avec BOM et séparateur `;`.

Les cellules textuelles CSV/XLSX contrôlables par l'utilisateur sont neutralisées contre l'injection de formule.

## Autorisation

L'export nécessite simultanément :

- accès au Workspace et au Dossier ;
- permission `technical-sheet:export` ;
- feature effective `technical_sheet_export` ;
- version validée courante ;
- quota disponible.

Le plan Free n'active pas la feature par défaut. Une dérogation d'entitlement peut l'activer.

## Quota

La métrique `technical_sheet_exports_monthly` est une consommation par mois calendaire et par Workspace.

Limite par défaut : **10 exports par mois par Workspace**, tous formats cumulés.

Un PDF + un XLSX + un CSV consomment donc trois exports. Une génération qui échoue avant la production de l'artefact ne consomme rien.

## Stockage

Les artefacts sont générés à la demande et renvoyés directement. Ils ne créent aucun document `File`, ne consomment pas `storage_bytes` et ne constituent pas un espace documentaire.

## UX

Dans le panneau de contrôle M-004 :

- bouton icône `FileUp` ;
- infobulle `Exports` ;
- clic : popover Base UI existant ;
- actions `.pdf`, `.xlsx`, `.csv` avec une icône par format.

Si la feature ou la permission n'est pas disponible, l'action n'est pas affichée. Si la feature est disponible mais qu'aucune version validée n'existe, le bouton reste désactivé avec une explication.

## Dashboard Workspace

Un KPI configurable `Exports ce mois` affiche la consommation du Workspace sur sa limite effective. Il n'est accessible que si la feature et la permission sont effectives et peut être masqué via les préférences d'affichage existantes.
