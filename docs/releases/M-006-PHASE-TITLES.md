# M-006 — Référentiel d'intitulés de phases Workspace

**Statut : en cours, branche `feature/m006-fiches-process`, gates non exécutées.**
**Date : 2026-10-27.**

## Règles validées

- Les cinq intitulés par défaut, dans la bibliothèque **Workspace** de M-006, sont : Préparation du poste ; Préparations initiales ; Cuisson ; Assemblage ; Présentation / dressage.
- Tous les Dossiers autorisés d'un même Workspace voient ces intitulés via le GET métier dédié.
- « Autre phase… » crée un nouveau modèle de phase vide **au Workspace**, enregistré côté serveur avant d'ajouter son titre au brouillon.
- Les étapes saisies librement appartiennent exclusivement à leur Fiche process et ne créent pas automatiquement de modèles réutilisables.
- La sélection d'un titre de bibliothèque ne copie pas les étapes d'un modèle. Les modèles de phases peuvent désormais avoir `steps: []` (champ toujours obligatoire dans le schéma Zod).
- Les bibliothèques locales par Dossier et les modèles riches existants sont conservés, mais ne sont pas présentés dans le nouveau menu d'intitulés communs.

## Déploiement de la base (obligatoire pour les Workspaces existants)

1. Sauvegarder la base logique produit ; vérifier la connexion au replica set existant `rs0`.
2. Déployer d'abord le code capable de lire des modèles PHASE dont `steps: []`.
3. Vérifier que `migration:m006-process-library` et ses index ont été exécutés.
4. Exécuter **une fois, de manière rejouable** : `npm run migration:m006-default-phase-titles`.
5. Vérifier un Workspace par `GET /api/workspaces/:workspaceId/process-phase-titles` avec authentification `process-sheet:read` ; les cinq titres doivent être retournés sauf ceux archivés volontairement.
6. La migration ajoute uniquement les titres absents, sans modifier les modèles préexistants (dont les phases archivées ou personnalisées), ni leurs révisions.
7. Les Workspaces créés *après* la migration sont provisionnés de façon idempotente lors de leur première consultation du catalogue M-006 ; le Core générique de création de Workspace n'est pas modifié.

Le catalogue passe par la primitive `ProcessLibraryTemplate` existante : l'index unique `workspace + dossier:null + kind:PHASE + normalizedTitle` empêche les doublons. Le service assure le snapshot de révision initial pour chaque modèle ajouté. `GET` peut écrire une première fois lors du provisionnement différé ; requiert le replica set et doit être observé à la recette. Ce n'est pas un mécanisme de déploiement alternatif à la migration.

## Permissions, erreurs et invariants

- `GET /api/workspaces/:workspaceId/process-phase-titles` : `process-sheet:read` + contexte Workspace.
- `POST /api/workspaces/:workspaceId/process-phase-titles` avec `{ "title": "..." }` : `process-sheet:edit` + contexte Workspace et mode d'accès en écriture. `409` en cas de doublon. Les rôles personnalisés ne sont pas élargis automatiquement.
- Les modèles persistés appartiennent au Workspace ; les étapes saisies dans la Fiche process demeurent dans son Workspace/Dossier et ne sont **pas** des modèles partagés.
- Les droits et contraintes commerciaux existants restent distincts. Aucune nouvelle capability ni quota n'est introduit dans ce lot.
- Aucun cross-Workspace, aucun changement des droits Core, des migrations M-004 ou du schéma de Fiche process. M-006 reste indépendant des autres fonctionnalités en attente.

## Contrôles et rollback

Contrôles pré-PR : tests `backend/tests/modules/process/processPhaseTitles.http.test.js`, `processLibrary.validation.test.js`, RTL M-006, test du contrat RTK Query, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, `npm run release:verify`, `npm run release:check` si environnement E2E prêt. QA : menu déroulant, saisie libre, conflit doublon, droits, rafraîchissement après création, plusieurs Dossiers, plusieurs Workspaces, mobile.

En cas de rollback du code, les modèles créés restent en base ; le retour à un code qui exige au moins une étape peut refuser l'édition de modèles vides. **Pas de purge automatique.** Avant rollback, sauvegarder les données et préférer un correctif forward-compatible. Ne pas supprimer les modèles utilisés, révisés ou modifiés par des utilisateurs.

Tests et gate non exécutés dans cette session : aucune garantie de succès ne peut être annoncée.
