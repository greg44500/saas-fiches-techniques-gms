# M-004 — Contrat final des exports de Fiches techniques

**Statut : VALIDÉ**  
**Date : 2026-10-06**

## Objectif

Permettre l'export d'une Fiche technique validée en PDF, XLSX ou CSV depuis son panneau de contrôle ou directement depuis la liste des Fiches techniques.

## Source de vérité

Un export est toujours construit depuis `TechnicalSheetValidation`, snapshot immuable de la version validée courante. Un brouillon ouvert après validation n'est jamais exporté.

Une Fiche sans `currentValidatedState` n'est pas exportable. Une Fiche `DELETED` n'est pas exportable.

## Contenu

Chaque format reprend au minimum :

- titre ;
- date de validation ;
- quantité produite et unité ;
- portions par pièce et total portions ;
- lignes de composition dans leur ordre métier, sans colonne de type Ingrédient/Économat ;
- quantité métier saisie ;
- prix HT normalisé et unité de prix ;
- coût HT de ligne ;
- note de ligne uniquement lorsqu'elle est renseignée ;
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


## Présentation PDF

Le PDF constitue un livrable métier destiné à la consultation, au partage et à l'impression. Il est optimisé comme une fiche professionnelle indépendante de l'interface web.

Le rendu V1 respecte les règles suivantes :

- **une Fiche technique = une seule feuille A4 paysage** ;
- titre et date de version dans un en-tête compact ;
- quantité produite, portions par pièce et total portions sur une seule ligne de synthèse ;
- corps principal en deux zones simultanées : **Composition à gauche / Analyse à droite** ;
- table Composition : `Produit | Quantité | Prix HT | Coût HT`, avec `Note` uniquement lorsqu'au moins une note existe ;
- aucune colonne `Section`, `Rendement` ou `Quantité brute` ;
- Analyse présentée en lignes compactes label/valeur, sans cartes volumineuses ;
- aucune pagination ni pied de page `Page 1 / 1` ;
- densité de la table Composition ajustée automatiquement au nombre de lignes pour conserver le document sur une feuille.

### Déduplication des informations économiques

Le PDF n'affiche pas deux fois une valeur lorsqu'une ligne n'apporte aucune information métier supplémentaire :

- `Coût Économat HT` est omis lorsqu'il vaut zéro ;
- `Coût total HT` est omis lorsque, sans Économat, il est strictement égal au coût matière ;
- les coûts unitaires utilisent le coût total de fabrication : `Coût / pièce HT` et `Coût / portion HT`, sans répéter les trois composantes matière/Économat/fabrication ;
- lorsque le prix conseillé TTC et le prix retenu TTC sont identiques, une seule ligne `Prix TTC` est affichée ;
- TVA, marge cible et marge réelle restent distinctes car elles expriment des informations différentes.

Les données techniques non affichées restent dans le snapshot de validation et continuent d'alimenter les calculs. Aucun changement de modèle, de sécurité, de quota ou de source autoritaire n'est introduit.
