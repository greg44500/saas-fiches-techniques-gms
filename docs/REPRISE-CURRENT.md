# Reprise courante — Exports directs des Fiches techniques

**Date : 2026-10-06**  
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
