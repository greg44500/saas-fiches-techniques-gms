# PRE-BETA-002 — Consolidation de la couverture qualité métier

**Date de cadrage :** 2026-11-01
**Statut :** consolidation sur une seule branche produit ; vérification des nouveaux changements requise avant PR
**Branche :** `test/pre-beta-002-m006-e2e`
**Base contrôlée :** `main` = `8141427abc63e0ae2a41546d2eba6538d023c78d` ; Core intégré `v1.2.1`.
**Périmètre :** preuves de non-régression des parcours métier de la bêta privée, pas de nouvelle fonctionnalité.

## 1. Décision de lot

Le périmètre validé de PRE-BETA-002 n'est **pas** limité aux deux tests M-006 initialement préparés. Il regroupe dans **une seule PR** les contrôles critiques manquants concernant M-001 à M-006, l'onboarding commercial D-020, les autorisations et la séparation des clients. Un scénario déjà couvert par des tests opérationnels ne doit pas être recodé pour gonfler artificiellement les E2E.

Les tests backend, frontend et E2E existants forment une preuve complémentaire, non interchangeable : les tests HTTP couvrent les règles et refus côté serveur ; Playwright démontre la cohérence de quelques parcours complets ; la recette humaine vérifie le rendu et l'usage réel.

Le propriétaire a annoncé le 2026-11-01 `npm run release:check` entièrement vert **sur son poste local et l'état de sa branche à cet instant**. Cette information ne prouve pas les modifications ultérieures du présent lot. Une nouvelle gate est nécessaire sur le HEAD final.

## 2. Inventaire de couverture identifié dans le dépôt

Inventaire effectué sur `a693247bcccfed32870c6f34c92db1b9f49d5ad4` : 39 scénarios Playwright dans 14 fichiers, dont deux M-006 ajoutés sur la branche. Le nombre de scénarios décrit la couverture présente, pas une exécution indépendante des tests par l'assistant.

| Domaine | Tests navigateur existants | Preuves complémentaires identifiées | Décision |
| --- | --- | --- | --- |
| Auth, onboarding Free, profil, fermeture, Workspace | Inscription/session, logout, onboarding, profil, fermeture/archivage | Core et tests frontend | Conserver ; pas de doublon |
| M-001 | 4 tests de création, affectation, refus sans grant et lifecycle | Tests HTTP, modèles et services Dossier | Conserver |
| M-002 | 6 tests de contribution, gouvernance et fusion | Tests HTTP et intégration du catalogue | Conserver |
| M-003 | 9 tests : import privé, réimport, prix par Dossier, catalogue global, Articles | Tests HTTP confidentialité et tarification | Conserver |
| M-004 | 10 tests : composition, tarifs, export, quotas, corbeille et Gammes | Tests HTTP : capability export et refus du 11e export ; tests de calcul | Conserver |
| M-005 | 1 test : simulation sans écriture puis application explicite | Tests d'optimisation backend | Conserver |
| M-006 | 2 tests ajoutés sur cette branche : création/édition/PDF/validation/suppression/recréation et accès restreints | Tests HTTP : unicité, conflits, réconciliation, RBAC, suppression ; six tests de pagination/contenu PDF | Compléter le refus d'accès **Dossier** avant attribution, sans troisième E2E redondant |
| D-020 | Aucun E2E dédié dans les 14 fichiers | Tests backend d'invitations et d'acceptation, tests RTL du parcours | Ajouter un E2E ciblé avec mauvais bénéficiaire, acceptation réelle, Subscription privée et non-rejeu |

## 3. Écarts démontrés et preuve minimale recherchée

| ID | Lacune / risque | Complément minimal | Critère de réussite |
| --- | --- | --- | --- |
| PB2-01 | D-020 n'a pas de preuve navigateur intégrée à la validation d'une identité Auth et à la création d'un premier tenant | Un destinataire avec compte Auth existant mais sans Workspace reçoit une invitation privée créée par le service réel ; un compte étranger ne peut pas l'accepter ; le bon compte l'accepte via UI | Refus HTTP 403 et UI sans bouton d'acceptation au mauvais compte ; création d'un Workspace, d'une Subscription `commercial/open_ended/active` et une seule appartenance Owner ; réutilisation refusée |
| PB2-02 | M-006 E2E prouve la lecture après grant, sans preuve du refus préalable **dans le même Workspace** | Dans le test existant, vérifier 403 sur la lecture M-006 avant `grantDossierAccess`, puis 200 après | Le grant Dossier constitue réellement la frontière d'accès ; aucune fuite |
| PB2-03 | La documentation de branche est encore présentée comme « M-006 seulement » | Présent document, addenda ROADMAP/REPRISE et maintien du cadrage M-006 comme annexe | Lot et preuves cohérents, sans transformer la préparation en faux GO bêta |

Les scénarios additionnels sont sélectionnés après comparaison avec les tests déjà présents. Aucun nouveau CRUD, rôle, plan commercial de production, modèle MongoDB ou privilège global n'est introduit.

## 4. Frontière, risques et données

- **Produit seulement :** E2E, fixtures de test et documentation. Aucune modification Core.
- **Base ciblée :** exclusivement `*_e2e_test`, garde imposée par `e2e/support/environment.js`. Le `test:prepare` vide cette base ; ne jamais l'utiliser avec `*_dev`.
- **Invitation de test :** Plan privé et identité synthétiques générés dans cette base, sans SMTP réel ni transfert de token en logs/audit. Le test n'imite pas le mécanisme Auth ou l'acceptation : il appelle leurs services existants.
- **Permissions :** les refus HTTP restent la preuve d'autorité ; masquer une action dans l'UI ne suffit pas.
- **Retour arrière :** réversion du commit de tests/docs ; aucune donnée métier de développement, index ni migration concernés.

## 5. Gates et limites de validation

Après écriture sur cette même branche et synchronisation locale du propriétaire :

```powershell
git switch test/pre-beta-002-m006-e2e
git pull --ff-only
git status --short
cd e2e
npm run test:prepare
npx playwright test tests/commercial-invitations-d020.spec.js tests/process-sheets-m006.spec.js
cd ..
npm run release:check
```

Le script de préparation est destructif **pour la base E2E uniquement** : vérifier la configuration MongoDB effective avant toute exécution. La commande finale devra être rejouée après la dernière correction et son résultat rapporté ; ne pas réutiliser le verdict antérieur pour un nouveau HEAD.

**Recette manuelle distincte toujours requise :** ouvrir les vrais PDF M-006 A4 courts et multipages (longues instructions, accents, ingrédients répétés), vérifier brouillon sur toutes les pages, validée sans métadonnées superflues, impression, accessibilité clavier et responsive selon le parcours. Les tests PDF backend valident la structure et le contenu mais ne remplacent pas l'inspection visuelle des fichiers réels.

## 6. Critères de clôture PRE-BETA-002

1. E2E D-020 et M-006 ciblés verts, puis `release:check` vert sur le **HEAD final**.
2. Revue du diff ; aucune modification hors tests/fixtures/docs à moins d'un bug reproduit et classé Produit.
3. Recette humaine et ses limites consignées, sans qualifier la bêta « prête au déploiement ».
4. **Une seule PR produit**, puis Core Gate GitHub et fusion uniquement après résultats et accord du propriétaire.
5. Hébergement, sauvegarde/restauration, observabilité, RGPD, charge et déploiement restent des lots distincts identifiés par PRE-BETA-001.

## 7. Sources canoniques du dépôt

- [Audit PRE-BETA-001](PRE-BETA-READINESS.md)
- [Annexe de cadrage M-006](PRE-BETA-002-M006-E2E.md)
- [D-020 — Invitations commerciales](../contracts/COMMERCIAL-INVITATIONS.md)
- [M-006 — PDF et suppression](../m006/M-006-FINALISATION-PDF-SUPPRESSION-CADRAGE.md)
- [ROADMAP](../ROADMAP.md), [DEBT](../DEBT.md), [REPRISE](../REPRISE-CURRENT.md)
- `backend/tests/modules/process/processSheet.http.test.js`
- `backend/tests/modules/technicalSheet/technicalSheet.http.test.js`
- `backend/tests/commercialInvitation/`
- `e2e/tests/`
