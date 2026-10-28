# M-006 — Réconciliation des compositions et qualité des retours de validation

**État au 2026-10-28 : code et tests ajoutés sur `feature/m006-fiches-process`, exécution locale non démontrée.** Ce lot clôt un blocage d'utilisation observé après revalidation M-004. Ni la PR ni le merge ni le lot 4 ne sont autorisés ici.

## Problème confirmé

Une Fiche process M-006 existante conserve sa `sourceValidation` initiale ; M-004 crée un nouveau `TechnicalSheetValidation` immuable à chaque validation officielle. Le précédent POST de validation exigeait une égalité stricte entre les deux identifiants. Il refusait donc également une simple revalorisation économique. Le frontend exposait soit un encadré technique, soit un texte d'erreur rouge, sans action de résolution. Le statut « À jour » décrivait seulement la sauvegarde locale, mais pouvait être confondu avec la cohérence M-004.

## Contrat de réconciliation implémenté

- **Origine immuable :** `ProcessSheet.sourceValidation` et `ProcessSheetDraft.sourceValidation` sont conservés intacts. Le nouveau champ optionnel `ProcessSheet.compositionValidation` désigne la référence M-004 courante adoptée explicitement ; en l'absence de valeur (anciens documents), le système utilise `sourceValidation`. Aucun historique de contenu M-006, aucun snapshot supplémentaire et aucune migration de masse ne sont introduits.
- **Lecture :** `GET /:processSheetId/composition-review` (permission `process-sheet:read`) répond avec `CURRENT`, `PARENT_REVISION_OPEN`, `PARENT_UNAVAILABLE`, `REFERENCE_UNAVAILABLE` ou `REVIEW_REQUIRED`. Dans le dernier cas : révisions techniques, validation M-004 cible, indicateur de changement de fabrication, associations proposées et occurrences candidates.
- **Comparaison :** les snapshots immuables M-004 sont rapprochés sur les champs utiles à la fabrication : production, occurrences, ordre, références produit, quantités, unités, notes et optimisations. Les prix/sources tarifaires/fournisseurs ne déclenchent pas à eux seuls `compositionChanged`.
- **Correspondance :** une clé d'occurrence de ligne identique avec même variante est conservée. Si la fabrication est strictement identique et qu'un ingrédient est unique dans les deux compositions, une correspondance par référence produit unique peut être proposée ; aucune correspondance automatique pour les produits répétés ou les compositions modifiées dont l'identité de ligne n'est pas conservée. Les suggestions sont modifiables. Chaque référence de brouillon non résolue exige soit un choix explicite de nouvelle occurrence, soit une décision explicite de retirer l'association ; aucune perte silencieuse. Une même cible ne peut pas absorber deux occurrences anciennes distinctes.
- **Écriture :** `POST /:processSheetId/reconcile` exige `process-sheet:edit` **et** `process-sheet:validate`, un Dossier et un parent actifs, une validation M-004 officielle courante sans brouillon ouvert, les révisions de ProcessSheet/ProcessSheetDraft et l'ID exact de validation cible. Le verrou M-004 `processEligibilityRevision` et la transaction MongoDB protègent ces invariants. Mise à jour du contenu courant, de sa référence et audit minimal dans la même transaction. Aucun changement de recette ni d'économie sur M-004.
- **État éditorial :** une composition de fabrication réellement changée remet la Fiche process en `DRAFT`, avec validation explicite obligatoire ensuite ; une mise à jour sans changement de fabrication conserve l'état éditorial existant. Une Fiche process déjà validée ne devient donc pas automatiquement Brouillon du seul fait d'une revalorisation. Les changements d'affectation explicites sont confirmés avant écriture.
- **Validation :** le POST de validation utilise désormais `compositionValidation ?? sourceValidation` et conserve les contrôles de droits, Dossier actif, M-004 active/validée sans révision ouverte, édition documentée, affectations légales et concurrence. Les ingrédients non affectés restent permis sans justification.
- **Retour utilisateur :** l'ancienne bannière de composition et les erreurs brutes en ligne sont remplacées par une action contextualisée dans l'en-tête et des dialogues Base UI de comparaison/confirmation/erreur. Le statut de sauvegarde locale devient « Enregistré », séparé de « Brouillon » / « Validée ». La modale signale les ingrédients non affectés sans bloquer. Les erreurs métier possèdent des codes stables `PROCESS_SHEET_*` sérialisés par le seul router métier, sans changement du Core.

## Limites, dette et vérifications bloquantes

1. Les décisions de rapprochement effectuées par l'utilisateur ne sont pas des preuves de conformité réglementaire ou de suffisance opérationnelle ; le contrat exige seulement le minimum structurel validé de M-006.
2. Les identifiants des anciennes validations sans `sourceLineId` sont propres à leur snapshot : aucune association ne doit être reconstruite automatiquement sur la seule similitude du nom de produit.
3. Il reste à vérifier réellement l'exécution Vitest, Supertest, RTL, ESLint, build, `release:check`, l'étanchéité inter-tenant, les droits délégués, le rollback et la QA clavier/mobile/clair/sombre. Les tests ajoutés n'ont **pas** été exécutés par l'assistant.
4. Les ajustements plus fins (diff visuel complet de quantité/équipement, politiques métier de comparaison de critères non présents dans M-004) seront décidés après la recette de ce premier parcours. Ne pas étendre silencieusement la V1.
5. Le nouveau champ optionnel ne nécessite pas de migration de données pour les documents existants ; un déploiement progressif doit cependant garantir que le frontend et le backend utilisent le même contrat. Prévoir une sauvegarde et un rollback applicatif ; un revert Git ne restaure pas les données MongoDB réconciliées.

## Recette recommandée

- M-004 revalidée à l'identique pour un changement économique : dialogue de comparaison, rapprochement sûr, état Validée conservé s'il l'était, identité process conservée.
- M-004 avec quantité, ingrédient ou unité modifiés : diagnostic « recette modifiée », affectation automatique uniquement si identité stable, remappage manuel et retour en Brouillon ; revalidation M-006 explicite.
- Deux occurrences de la même référence : aucune correspondance devinée, choix de chaque occurrence distinct, refus des cibles invalides/dupliquées.
- Suppression d'un ingrédient : retrait explicite de l'association, conservation des textes de fabrication, puis revalidation.
- Brouillon M-004 ouvert : action vers la Fiche technique, aucune réconciliation.
- Révisions périmées ou absence de permission : HTTP 409 ou 403, aucune mutation partielle.
- Vérification que les cinq catégories de messages sont lisibles sans identifiants techniques ; modales accessibles au clavier et adaptées au mobile ; bannière rouge et texte brut disparus.

## Sources d'autorité

- `docs/m006/M-006-FICHES-PROCESS-CADRAGE-PROPOSITION.md` : décisions rectifiées du 2026-10-27, sections 5, 8, 12.
- `backend/modules/technicalSheet/technicalSheetValidation.service.js` et `technicalSheetValidation.model.js` : snapshots M-004 immuables.
- `backend/modules/process/processSheetReconciliation.service.js` et `processSheetReconciliation.js` : implémentation actuelle.
- `backend/tests/modules/process/processSheet.http.test.js` et `processSheetReconciliation.test.js` : scénarios écrits, non exécutés.
