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

## Correctif de synchronisation de validation (2026-10-29)

Un retour utilisateur montrait une modale `PROCESS_SHEET_CHANGED` lors de la validation, suivie du même refus après « Actualiser la Fiche process ».

Le frontend distingue désormais `ProcessSheet.revision` du jeton de contenu `ProcessSheetDraft.revision` lors d'un **GET autoritatif immédiatement avant POST /validate**. Si l'un des deux a avancé, la dernière version est chargée et la validation n'est **pas envoyée automatiquement** sans relecture par l'utilisateur. Lorsqu'un POST reste en conflit, un nouveau GET distingue une réelle modification concurrente d'un refus répétable sans changement visible, afin d'éviter les consignes d'actualisation en boucle. Des tests RTL de ces deux scénarios ont été ajoutés.

**Preuves restantes :** exécution locale des tests RTL et du parcours réel. Ce changement ne supprime ni le contrôle serveur `expectedRevision`, ni la protection de concurrence transactionnelle M-006. Si le conflit persiste avec des révisions identiques, relever le GET de la Fiche process et le corps/réponse du POST de validation avant toute nouvelle correction backend.

## Stabilisation des parcours de validation et suppression — 2026-10-29

**Validation :** une anomalie récurrente a été observée sur une Fiche process existante : `POST /validate` retourne `PROCESS_SHEET_CHANGED` malgré un `GET` actualisé avec la même révision. Une cause probable et désormais couverte en code est l'absence physique de `editorialState` dans certains anciens documents : Mongoose affiche sa valeur par défaut `DRAFT`, mais l'ancien filtre de mise à jour MongoDB refusait un champ absent. Le filtre conditionnel accepte maintenant les valeurs `DRAFT` ou absente/nulle **uniquement si `validatedAt` est nul** ; contrôle de révision, permissions et transaction restent inchangés. Un test Supertest reproduit le cas `$unset` puis vérifie la validation et la persistance de `VALIDATED`. La cause dans la base de développement utilisateur reste à confirmer par exécution locale.

**Suppression :** le menu indique désormais la condition qui rend l'action indisponible. Le rôle système Owner existant doit recevoir `process-sheet:delete` par `npm run migration:m006-process-finalization-permissions` sur la seule base de développement concernée ; vérifier préalablement `MONGODB_URI`, puis recharger les permissions frontend. Ne jamais contourner le RBAC.

**Preuves requises :** relancer les tests HTTP/RTL ciblés et le parcours utilisateur sur la base locale, puis le lint, le build et la gate globale. Ne pas considérer la régression corrigée sans preuve de validation réellement réussie.


## Ajustement PDF de la fiche atelier — 2026-10-29

Le propriétaire a validé un PDF centré sur l'utilisation en atelier : retrait des sous-titres M-004/Dossier, du bandeau de validation, de la date de validation, des compteurs et de la liste des ingrédients non affectés. Les ingrédients apparaissent maintenant directement après la consigne de chaque phase ou étape. Les blocs « Étape » et toutes leurs données associées sont décalés d'environ 12 mm sous leur phase ; les sauts de page réservent une place pour le titre et le début de la consigne. Un brouillon reste clairement identifié comme non validé, sans restaurer le bandeau « Validée ».

**Vérification à obtenir :** tests du générateur PDF, contrôle du texte/positions, cas instructions vides et ingrédients dupliqués, pagination sur PDF multipage réellement ouvert et rendu visuel par l'utilisateur. La présente modification ne vaut pas gate verte.
