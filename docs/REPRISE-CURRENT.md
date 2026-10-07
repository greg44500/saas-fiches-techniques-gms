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
