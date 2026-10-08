# Audit de l’aide utilisateur — 2026-10-08

## Périmètre et autorité

Audit du code sur `main` (merge PR #41, `ee940fe5`) avant le complément M-004 Diffusion V1. Travail isolé sur `docs/user-help-audit-20261008`. Les parcours décrits ci-dessous correspondent au code consulté ; aucun endpoint, composant de filtrage ou mécanisme Core n’a été ajouté.

## Architecture existante conservée

- `backend/config/applicationHelp.registry.js` compose explicitement les modules métier avec le corpus Core.
- Les fiches utilisent le contrat `helpEntrySchema` : identité, recherche, audience, exigences, étapes, cas particuliers et conséquences.
- `help.service.js` filtre les catalogues et les fiches **côté serveur** selon permissions Workspace/Platform/Application Global, rôle Owner, capacités commerciales et mode d’accès Workspace. Les articles interdits ne sont pas servis et renvoient 404.
- Les articles relatifs à la Corbeille globale des Fiches techniques restent `ownerOnly`. L’aide à l’import et aux exports/à l’optimisation est conditionnée aux features déjà définies.

## Écarts constatés et corrections

| Domaine | Aide existante | Complément ajouté |
| --- | --- | --- |
| M-001 Dossiers | Ouverture, affectation des accès | Création avec champs obligatoires et modification/réglages |
| M-003 Fournisseurs | Référentiel, Prix applicable | Import privé de catalogue et consultation des Prix indicatifs |
| M-004 Fiches techniques | Création, valorisation, validation | Lecture/prévisualisation/historique, export PDF/XLSX/CSV, copie inter-Dossier |
| M-004 Corbeille | Non documentée dans le corpus métier | Répartition quota, restauration et purge ; réservé Owner |
| M-005 Optimisation | Non documenté | Simulation Manuel/Auto et application explicite au brouillon |

Les entrées sont ajoutées dans les **registres existants** `dossierHelp.registry.js`, `supplierCatalogHelp.registry.js` et `technicalSheetHelp.registry.js`. Les rubriques existantes, les identifiants d’articles déjà publiés et le filtre serveur sont préservés.

## Tests ajoutés

`backend/tests/help/applicationHelp.registry.test.js` vérifie les nouvelles entrées, permissions, features et réservations Owner. Un test de service contrôle l’absence des articles optimisation/export hors feature et l’inaccessibilité de l’article Corbeille pour un membre.

## Hors périmètre

- Aucune création d’un nouveau centre d’aide ou modification du service Core.
- Aucune modification des permissions, offres, quotas ni du workflow des modules.
- Aucune description de l’impression ou de l’envoi par e-mail : ces fonctions relèvent d’un complément M-004 non livré à la date de l’audit.
- Les problèmes documentaires éventuels du corpus Core générique restent du ressort du dépôt Core.

## Validation

Les fichiers ont été modifiés sur GitHub ; **aucune exécution de lint, tests ou E2E n’a été observée** durant cette intervention. Les résultats doivent être confirmés avant la PR et la fusion.

Depuis la racine locale, après récupération de la branche :

```powershell
npm run lint
npm test
npm --prefix frontend run test
npm --prefix frontend run build
```

Le parcours de revue et la fusion restent soumis à validation utilisateur.
