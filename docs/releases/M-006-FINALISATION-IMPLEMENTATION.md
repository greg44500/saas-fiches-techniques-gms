# M-006 — Finalisation PDF et suppression : état de réalisation

**2026-10-29 — Branche :** `feature/m006-finalisation-ui-ux-global`

## Arbitrages validés

Le propriétaire a approuvé les cinq décisions détaillées dans `docs/m006/M-006-FINALISATION-PDF-SUPPRESSION-CADRAGE.md` : permission métier d'export, absence de quota commercial M-006 V1, export des fiches archivées consultables, permission métier de suppression, et PDF A4 portrait multipage fidèle au contenu enregistré.

## Implémentation présente sur la branche

- Export PDF backend `GET .../process-sheets/:processSheetId/export/pdf` : source M-006 persistée, présentation par phases et étapes, informations opérationnelles et contrôle de lecture scoped Workspace/Dossier. Réponse binaire sans stockage du document, avec audit.
- Suppression définitive `DELETE .../process-sheets/:processSheetId` avec `expectedRevision` : permission dédiée, parent M-004 ACTIVE, verrou transactionnel sur M-004, suppression du brouillon et de l'agrégat M-006, journal minimal, conservation M-004 et bibliothèques.
- Réconciliation des nouvelles permissions système Owner par `npm run migration:m006-process-finalization-permissions`, après les migrations M-006 précédentes. Ne pas élargir automatiquement les rôles personnalisés.
- Interface React : icône PDF disponible pour les utilisateurs autorisés lorsque le contenu est enregistré ; dialogue de suppression et traitement des erreurs ; hooks RTK Query et tests adaptés.
- Aide utilisateur mise à jour selon les droits effectifs.

## Qualité : non encore attestée

**Ne pas fusionner sur la seule présence de ce code.** Aucune nouvelle exécution locale ou CI, QA de pagination PDF ni test de migration sur la base cible n'a encore été rapportée pour ce HEAD. Contrôles à obtenir : Vitest backend/RTL, ESLint, build, `npm run release:check`, E2E de suppression/création sous MongoDB rs0, puis examen visuel des vrais PDF multipages avec accents, longs titres, sauts de page et variantes Brouillon/Validée/Archivée.

Après validation des tests par le propriétaire : PR unique, gate GitHub, merge sous contrôle du propriétaire. L'audit de préparation au déploiement restera ultérieur.
