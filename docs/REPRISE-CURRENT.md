# Reprise courante — Exports directs des Fiches techniques

**Date : 2026-10-07**  
**Branche : `feature/technical-sheet-exports-v1`**

Le lot A2 a été fusionné dans `main` au commit `baf8722b429a33e1ce69960d6c7d446ca8c9714c`. La Core Gate #201 est verte.

Le lot courant implémente les exports PDF, XLSX et CSV de la version validée courante des Fiches techniques.

Décisions validées :

- aucune exportation de brouillon ;
- 10 exports mensuels par Workspace, tous formats cumulés ;
- feature `technical_sheet_export`, absente du Free par défaut et activable par dérogation ;
- permission `technical-sheet:export` ;
- bouton `FileUp` + popover dans le panneau de contrôle ;
- KPI Workspace personnalisable ;
- artefacts générés à la demande sans stockage durable ;
- source exclusive : snapshot `TechnicalSheetValidation`;
- écarts et diagnostics exclus des exports.

Contrats :
- `docs/m004/M-004-EXPORTS-FINAL-CONTRACT.md`
- `docs/m004/M-004-EXPORTS-TECHNICAL-DESIGN.md`

Les tests sont exécutés localement par l'utilisateur. Aucune PR ni fusion ne doit être faite avant sa validation.


Durcissements ajoutés avant validation locale :
- migration explicite de la nouvelle permission sur les rôles Owner système déjà persistés ;
- tests HTTP Free/capability, RBAC, absence de validation, téléchargement et quota cumulé ;
- tests des garde-fous de dérogation commerciale ;
- neutralisation XLSX étendue aux libellés d'unités métier.


Couverture E2E ajoutée (non exécutée ici) :
- capability export activée par dérogation sur un Workspace de test ;
- export CSV depuis une Fiche validée ;
- téléchargement réel Playwright ;
- KPI `Exports ce mois` passant à `1 / 10` ;
- masquage du KPI via `Personnaliser le tableau de bord`.


Invariant supplémentaire couvert (non exécuté ici) :
- une Fiche déjà validée peut rouvrir un nouveau brouillon ;
- même si son identité de travail change ensuite, l'export reste construit depuis le dernier snapshot validé et n'expose aucune donnée non validée.


## Ajustement UX avant validation locale — 2026-10-07

Le premier bloc de QA visuelle demandé avant PR a été intégré sur la même branche :

- Dashboard Workspace : suppression du nom de Workspace répété dans le contenu ;
- cartes KPI : icône d'information rapprochée du titre ;
- liste Fiches techniques : nouvelle colonne `État` avec `Brouillon`, `Validée`, `En révision` ;
- l'état affiché est une projection des faits `currentValidatedStateId + hasDraft`, jamais une autorité de sécurité ;
- suppression des sous-titres ambigus sous le nom des Fiches ;
- actions de liste compactes : œil = prévisualiser l'officiel, crayon = ouvrir, `FileUp` = exporter ;
- prévisualisation en modal depuis le snapshot validé courant, sans navigation et sans consommation du quota export ;
- suppression du bloc post-validation `État de travail` ; `Reprendre en brouillon` reste disponible comme action compacte ;
- E2E adapté pour couvrir l'état `Validée`, la modal de prévisualisation, l'export direct depuis la liste, puis le KPI mensuel.

Les tests ajoutés/modifiés n'ont pas été exécutés à distance. La validation locale et la QA visuelle restent à faire par l'utilisateur avant toute PR.


## Qualité visuelle PDF — 2026-10-07

Le renderer PDF a été repris pour aligner le livrable avec la prévisualisation métier :

- A4 paysage pour préserver la lisibilité des colonnes ;
- en-tête clair avec titre et date de validation ;
- trois cartes de production ;
- vraie table Composition avec Section, Produit, Qté nette, Rendement, Qté brute, Prix HT, Coût HT ;
- analyse figée structurée en indicateurs principaux puis détails économiques ;
- pagination et répétition de l'en-tête de table ;
- pied de page numéroté ;
- aucune modification de la source autoritaire, des quotas, de la sécurité ou du contenu métier exportable.

Les tests correspondants sont ajoutés mais restent à exécuter localement par l'utilisateur.


## Ajustement QA composition — 2026-10-07

Suite à la revue du PDF réel :
- suppression des mentions redondantes `FICHE TECHNIQUE VALIDÉE` / `Validée le` ; le PDF affiche `FICHE TECHNIQUE` et `Version du` ;
- suppression de `Section`, `Rendement` et `Quantité brute` dans PDF, CSV, XLSX et prévisualisation ;
- table métier simplifiée : `Produit | Quantité | Prix HT | Coût HT` ;
- ajout conditionnel de `Note` seulement si au moins une ligne possède une note ;
- conservation des données techniques supprimées de l'affichage dans le snapshot de validation : aucun changement de modèle ni de calcul.


## PDF mono-page optimisé — 2026-10-07

Décision QA intégrée :

- contrat `une Fiche technique = une feuille A4 paysage` ;
- suppression des grandes cartes de production et d'analyse ;
- synthèse Production condensée sur une ligne ;
- Composition à gauche et Analyse à droite ;
- suppression du pied de page `Page 1 / 1` ;
- Analyse affichée en lignes compactes ;
- Économat zéro masqué ;
- coût total identique au coût matière masqué en absence d'Économat ;
- prix conseillé/retenu identiques fusionnés en `Prix TTC` ;
- densité de la Composition ajustée dynamiquement pour conserver toutes les lignes sur la feuille ;
- aucune modification des snapshots, calculs, autorisations, quotas ou autres formats d'export.

Les tests PDF ont été adaptés pour vérifier explicitement le rendu mono-page, la grille côte à côte et les règles de déduplication. Ils restent à exécuter localement par l'utilisateur.


## Continuité UX Fiche validée — 2026-10-07

Bloc intégré sur la même branche :
- après validation, la route Fiche reste affichée avec la version officielle en lecture seule ;
- la modal de prévisualisation et la page réutilisent le même composant de lecture ;
- `Modifier` crée/reprend le brouillon via l'API M-004 au lieu d'aboutir sur une page vide ;
- dialogue de validation simplifié avec aide contextuelle, commentaire explicitement facultatif et bouton `Valider sans commentaire` lorsque vide ;
- suppression visuelle de `%TR` dans la composition ;
- conservation stricte de `Coût HT` et de sa sémantique actuelle.

Les tests ont été adaptés mais ne sont pas exécutés à distance.


## Ajustement final header Fiche validée — 2026-10-07

QA visuelle :
- titre et badge(s) sont désormais sur la même ligne ;
- le groupe identité `flèche + titre + badges` est centré verticalement ;
- le panneau de contrôle est aligné sur le même axe vertical sur desktop ;
- aucun workflow, contrôle métier ou comportement de `Modifier` n'est changé.
