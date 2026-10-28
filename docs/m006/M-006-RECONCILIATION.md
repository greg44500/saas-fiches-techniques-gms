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
- **État éditorial :** une composition de fabrication réellement changée remet la Fiche process en `DRAFT`, avec validation explicite obligatoire ensuite ; une mise à jour sans changement de fabrication conserve l'état éditorial existant. Une Fiche process déjà validée ne devient donc pas automatiquement Brouillon du seul fait d'une revalorisation. Les changements d'affectation explicites sont confirmés avant écriture et, s'ils modifient une correspondance ou retirent une association, ils imposent également le retour à Brouillon même lorsque la composition M-004 est identique.
- **Validation :** le POST de validation utilise désormais `compositionValidation ?? sourceValidation` et conserve les contrôles de droits, Dossier actif, M-004 active/validée sans révision ouverte, édition documentée, affectations légales et concurrence. Les ingrédients non affectés restent permis sans justification.
- **Retour utilisateur :** l'ancienne bannière de composition et les erreurs brutes en ligne sont remplacées par une action contextualisée dans l'en-tête et des dialogues Base UI de comparaison/confirmation/erreur. Le statut de sauvegarde locale devient « Enregistré », séparé de « Brouillon » / « Validée ». La modale signale les ingrédients non affectés sans bloquer. Les erreurs métier possèdent des codes stables `PROCESS_SHEET_*` sérialisés par le seul router métier, sans changement du Core.

## Ajustement de lisibilité — commandes persistantes et aides contextuelles (2026-10-28)

- **Action de composition stable** : le bouton « Actualiser la composition » est toujours présent dans l'en-tête d'une Fiche process chargée ; il est activé si une composition plus récente doit être examinée ou si la Fiche technique possède une révision ouverte et si le Dossier et le process sont actifs. Dans les autres cas il reste visible mais désactivé. Un `InfoTooltip` indépendant du bouton fournit le motif exact, accessible au clavier et à la souris même lorsque le bouton est désactivé. Pas de mutation en consultation.
- **Actions de l'éditeur stables** : « Valider la Fiche process » et « Enregistrer le brouillon » restent également visibles en lecture seule ou lorsque leurs préconditions ne sont pas satisfaites. Le contrôle `disabled` et la garde de service existante restent la source de protection ; des icônes d'information adjacentes expliquent l'indisponibilité selon les permissions, l'état, les changements locaux, les conflits et la composition.
- **Modales allégées** : les sous-titres d'explication de « Actualiser la Fiche process » et « Confirmer la validation », ainsi que les précisions secondaires par ingrédient et le motif de désactivation de confirmation, sont déplacés vers les `InfoTooltip` partagés. L'état de comparaison et les choix qui exigent une décision restent lisibles sans survol. La description accessible de chaque dialogue est conservée pour les technologies d'assistance (`sr-only`). Le bouton « Confirmer l’actualisation » reste toujours présent dans le pied de dialogue, désactivé si le plan est absent, déjà courant, en révision, en erreur, hors droits, en attente de correspondance ou en cours de traitement.
- **Frontière** : aucun changement de règle métier, de RBAC, de Core, de schéma ou d'endpoint. Les tests RTL documentent visibilité, `disabled` et présence des aides ; **ils ne sont pas exécutés ici**. QA finale clavier/souris/mobile et lecture des infobulles encore nécessaire.

## Lot 3 — Panneau de contrôle compact de fabrication (2026-10-28)

La vue process utilise `ProcessSheetControlPanel` dans l'éditeur, juste sous le titre produit. Elle reproduit le langage visuel du panneau M-004 : statuts métier et enregistrement à gauche, barre compacte de quatre actions à droite, séparateur entre consultation/vérification et écritures. L'action « Actualiser la composition » n'apparaît plus de manière isolée dans l'en-tête ; les boutons texte Aperçu, Valider et Enregistrer ne sont plus dupliqués dans l'éditeur.

`ActionIconButton` est réutilisé tel quel, avec les icônes Lucide Eye, GitCompareArrows, Save, CheckCircle2. Les actions restent **montées dans le DOM** et au même emplacement pour toutes les conditions. Le wrapper métier transmet `aria-disabled=true` et supprime le callback pour toute action interdite : cela garde la cible focusable afin que l'utilisateur puisse lire la raison d'indisponibilité dans son tooltip, sans déclencher de mutation. Les gardes backend et frontend restent en vigueur. Libellés accessibles et texte de l'info-bulle changent avec le contexte ; l'aperçu actif annonce « Revenir à l’édition ». Le panneau est flex/wrap et sticky, avec tests UX RTL écrits mais pas exécutés.

**Recette spécifique :** vérifier quatre icônes, un seul emplacement, clavier + tooltip sur action indisponible, impossibilité de déclencher sauvegarde/validation/réconciliation désactivées, disponibilité exacte selon le Dossier/rôle/parent/composition/dirty/conflit, et lisibilité du panneau sous zoom 200 % et sur petits écrans. Toute interaction tactile doit disposer d'une alternative aux info-bulles uniquement au survol.

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
