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

Dans la liste des Fiches techniques, une colonne `État` projette les faits réels sans créer de nouvel état persistant :

- `Brouillon` : brouillon présent, aucune validation courante ;
- `Validée` : validation courante présente, aucun brouillon ;
- `En révision` : validation courante présente et nouveau brouillon ouvert ;
- une combinaison incohérente ne doit jamais être présentée comme validée.

Cette colonne est strictement informative. Elle ne constitue jamais une autorité d'autorisation. L'export reste contrôlé côté backend par l'identité Workspace/Dossier/Fiche, la permission, la capability, l'existence et la cohérence de `currentValidatedState`, puis le quota.

Les sous-titres `Un état validé est disponible` / `Aucun état validé` sont supprimés.

Actions de la liste :

- `Prévisualiser` (icône œil) : uniquement lorsqu'une validation courante existe ; ouvre une modal et ne change pas de route ;
- `Ouvrir` (icône crayon) : ouvre le poste de travail, y compris pour continuer un brouillon ;
- `Exporter` (icône `FileUp`) : réutilise le même composant et la même API d'export que le panneau de contrôle.

La prévisualisation lit uniquement le snapshot validé courant. Lorsqu'un brouillon existe en parallèle, son contenu n'est jamais injecté dans la prévisualisation officielle. La prévisualisation ne consomme aucun quota d'export.

Après validation, aucun bloc explicatif `État de travail` n'est affiché. L'action `Reprendre en brouillon` reste disponible sous forme compacte dans les actions du poste de travail.

Si la feature ou la permission d'export n'est pas disponible, l'action Export n'est pas affichée. Si la feature est disponible mais qu'aucune version validée n'existe, l'export n'est pas proposé depuis la liste et reste refusé côté backend.

## Dashboard Workspace

Un KPI configurable `Exports ce mois` affiche la consommation du Workspace sur sa limite effective. Il n'est accessible que si la feature et la permission sont effectives et peut être masqué via les préférences d'affichage existantes.

L'icône d'information du KPI est placée immédiatement à droite de son titre. Le nom du Workspace n'est pas répété dans le contenu de la page `Tableau de bord` puisqu'il est déjà visible dans la navigation supérieure.
