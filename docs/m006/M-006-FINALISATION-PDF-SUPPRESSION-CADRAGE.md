# M-006 — Finalisation : export PDF professionnel et suppression autonome

**Statut : CINQ ARBITRAGES VALIDÉS LE 2026-10-29 ; IMPLÉMENTATION EN BRANCHE, NON TESTÉE**  
**Date : 2026-10-29**  
**Branche :** `feature/m006-finalisation-ui-ux-global`  
**Base :** `main` au commit `6dad4e9d8656db4d9fa6d76f1191f6d8ce0d7fa0` ; Core `v1.2.1` / `42beaff67200ca4e956378e2273b4eae440f47bc`.

> Ce document ne valide pas à lui seul de nouvelles permissions, politiques commerciales ou présentations PDF. Les décisions indiquées « à arbitrer » sont proposées au propriétaire. Ne pas implémenter leurs conséquences avant validation. Les contrats M-006 antérieurs prévalent sur les propositions non validées ici.

## 1. Analyse du code existant (constat)

- `ProcessSheet` garde l'identité 1:1 de la Fiche technique, l'ownership Workspace/Dossier, l'état éditorial `DRAFT/VALIDATED`, une révision technique et les dates/auteurs de validation.
- `ProcessSheetDraft` conserve le **contenu courant**, sans versions de fabrication immuables ; `phases[]` contient les étapes ordonnées, les consignes, les clés d'occurrences d'ingrédients et les contrôles.
- `processSheetDraft.validation.js` décrit les champs opérationnels : titre et consignes des phases/étapes ; durées actives, repos et traitement ; température ; équipements ; vigilance ; contrôles qualité et sanitaires avec critères et actions correctives.
- `getProcessSheet` vérifie le scope et projette les ingrédients issus d'une validation M-004 ; `ProcessSheetPreview` propose un aperçu chronologique en lecture seule.
- Le panneau de contrôle affiche une icône PDF volontairement désactivée ; la liste affiche une action Supprimer volontairement désactivée.
- La suppression par **purge du parent M-004** existe déjà dans `processSheetLifecycle.service.js` (ProcessSheetDraft puis ProcessSheet, sous transaction parent), mais pas la suppression autonome.
- Le PDF M-004 est spécialisé pour une page paysage et une présentation économique. Il ne constitue pas un moteur de document multipage réutilisable tel quel pour M-006.
- M-004 dispose déjà d'un pipeline d'export sécurisé (réponse binaire, `no-store`, nom de fichier, autorisation et audit) dont les patterns peuvent inspirer M-006 ; son compteur d'export est propre au contrat M-004.
- Le registre M-006 n'expose actuellement que `read/create/edit/validate`. Aucun `process-sheet:delete` ni `process-sheet:export` n'est enregistré.

## 2. Décisions métier déjà validées à préserver

- Une Fiche process au maximum par Fiche technique ; aucune Fiche process autonome.
- Cycle éditorial : création Brouillon ; validation explicite ; modification métier réellement enregistrée après validation = retour Brouillon ; revalidation possible ; **pas de versions immuables M-006**.
- L'utilisateur peut imprimer la Fiche process Validée **ou** un Brouillon clairement identifié comme tel (décision 35 du cadrage M-006).
- Aucune image, illustration, galerie ou IA en V1 M-006 ; les exports M-004 existants ne doivent pas être recréés.
- Suppression autonome **physique, immédiate, définitive**, après confirmation, réservée aux personnes effectivement autorisées et **uniquement si le parent M-004 est ACTIVE**. Elle conserve M-004 et ses validations, ainsi que les bibliothèques partagées, et libère l'unicité 1:1.
- Pas d'archivage autonome M-006. Les cycles de corbeille/archivage/restauration/purge restent pilotés par M-004.
- M-006 est inclus dans tous les plans V1 sans quota de nombre de Fiches process ; pas de nouvelle capability ou limite implicite.
- Toute opération respecte Workspace, Dossier, rôle, état opérationnel, audit et transactions lorsque nécessaires.

## 3. Export PDF — présentation professionnelle proposée (à valider)

### 3.1 Structure et identité

**Format proposé : A4 portrait, multipage, en français, sobre et adapté au travail en atelier.**

1. En-tête : « FICHE PROCESS » ; titre exact de la fiche ; titre de la Fiche technique liée ; identification du Dossier si disponible et autorisée ; statut éditorial et dates métier disponibles.
2. Résumé compact : nombre de phases et d'étapes, avec indication explicite lorsque le contenu est incomplet.
3. Corps chronologique : **Phase 01, Phase 02…**, avec titre et instructions ; **Étape 01.01, 01.02…**, avec titre, consignes détaillées et ingrédients affectés à chaque occurrence.
4. Blocs de fabrication par étape, **uniquement lorsque renseignés** : durées (actif, repos, traitement), température, équipements, points de vigilance, contrôles qualité et contrôles sanitaires, y compris critères attendus et actions correctives.
5. Bloc final éventuel d'ingrédients non affectés : avertissement informatif, sans inventer de quantité ou de validation automatique.
6. Pied de page systématique : document « Fiche process », page n / N, statut éditorial et date de génération ; aucune valeur économique M-004 injectée par défaut.

**Brouillon :** mention « BROUILLON — DOCUMENT NON VALIDÉ » visible sur chaque page, distincte du simple état de sauvegarde. **Validée :** identification de l'état et de la date de validation disponible, sans créer de numéro de version métier fictif.

### 3.2 Lisibilité et pagination

- Bandeau de titre distinct, numérotation hiérarchique continue, typographie lisible, contrastes suffisants et marges d'impression.
- Étapes regroupées en blocs cohérents ; éviter autant que possible de séparer un titre du premier paragraphe ; découper les longues descriptions et contrôles sans rognage.
- Gestion des sauts de page, répétition des en-têtes/pieds, textes français accentués, titres longs, paragraphes multilignes, listes, champs absents, plusieurs dizaines de phases et plusieurs centaines d'étapes potentielles (bornes exactes du schéma : 40 × 40).
- Aucun logo client, photo, filigrane de marque ou champ sans source de données validée.
- Génération backend en mémoire et téléchargement direct ; **aucun PDF stocké durablement** dans la bibliothèque de fichiers ou facturé à l'espace de stockage.
- Source de vérité proposée : **dernier contenu persisté** (`ProcessSheetDraft`), jamais un état local non sauvegardé ; en cas d'édition locale non enregistrée, prévenir l'utilisateur avant téléchargement pour éviter une confusion.
- Les références d'ingrédients sont résolues côté serveur dans le même Workspace/Dossier, à partir de la validation M-004 effectivement référencée par la fiche ; préserver les occurrences dupliquées, ne pas inventer une unité/quantité.

### 3.3 API, sécurité et règle commerciale à arbitrer

- **Proposition** : `GET /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId/export/pdf`, avec réponse `application/pdf`, `Content-Disposition: attachment`, `Cache-Control: no-store`, `nosniff`, nom de fichier neutralisé.
- Vérifier les droits Workspace, l'accès au Dossier, l'existence d'une Fiche process non supprimée, les scopes de l'agrégat et la validité de la composition référencée. N'exporter aucune donnée d'un autre tenant.
- **Arbitrage A (autorisation)** : recommander une permission métier dédiée `process-sheet:export`, attribuée à l'Owner par registre/migration, délégable explicitement ; la simple lecture ne donnerait pas automatiquement le droit d'exporter. Alternative : réutiliser `process-sheet:read` sans nouveau droit.
- **Arbitrage B (quota/plan)** : recommander **aucun nouveau quota/capability en V1** et **aucune consommation du compteur `technical_sheet_exports_monthly` M-004**, faute de contrat commun validé. La décision commerciale peut être revue ultérieurement, mais aucun contournement d'une limite existante ne doit être inventé.
- **Arbitrage C (archivage)** : proposer la consultation/export des Fiches process archivées si la politique de lecture du Dossier l'autorise, avec marque explicite « ARCHIVÉE » ; refuser `DELETED`. Alternative : export uniquement pour process/parents ACTIVE.
- Événement d'audit `PROCESS_SHEET_EXPORTED` avec identifiants, format et état éditorial, sans stockage du PDF ni du contenu opérationnel.
- Rendu PDF propre à M-006 et testé. **Ne pas dupliquer les 1 572 lignes du générateur M-004** : évaluer et arrêter le moteur de flux multipage (bibliothèque Node adaptée et compatible/licenciée, ou extraction contrôlée de primitives existantes) avant son implémentation. Toute abstraction générique dépassant le produit reste un sujet Core séparé.

## 4. Suppression autonome — contrat technique proposé (à valider)

### 4.1 Règles de suppression

1. Supprimer uniquement la Fiche process demandée **et son contenu courant** ; conserver la Fiche technique M-004, ses brouillons/validations, ses historiques et les bibliothèques de fabrication communes.
2. Parent M-004 **ACTIVE** obligatoire ; process de même scope Workspace/Dossier, encore présent et actif ; Dossier opérationnel ; permission métier `process-sheet:delete` effective.
3. **Confirmation explicite** dans un `Dialog` shadcn, intitulant la Fiche ciblée, rappelant le caractère irréversible, l'effacement de ses phases/étapes et la conservation de la Fiche technique. Bouton destructif distinct « Supprimer définitivement » ; désactiver pendant l'opération. Ne pas conserver un bouton `disabled` permanent.
4. Vérifier `expectedRevision` côté serveur : si la Fiche process a été modifiée depuis la consultation, répondre `409` sans supprimer. La tentative de suppression n'altère pas l'état métier M-004.
5. Exécuter dans **une seule transaction MongoDB**, avec verrou de concurrence sur le parent M-004 (`processEligibilityRevision`) et contrôles des statuts/révisions, la suppression des `ProcessSheetDraft` et `ProcessSheet`, puis l'audit minimal `PROCESS_SHEET_DELETED`.
6. Libérer l'index unique `technicalSheet`. Une nouvelle Fiche process ne pourra être créée qu'après réexécution des préconditions de création M-006 : M-004 ACTIVE, officiellement validée, sans brouillon M-004 ouvert et sans process associé.
7. Ne jamais modifier directement `main`, les modèles Core ni les états des bibliothèques partagées ; ne pas introduire de corbeille M-006 ou d'historique métier de suppression.

### 4.2 API et états

- **Proposition** : `DELETE /api/workspaces/:workspaceId/dossiers/:dossierId/process-sheets/:processSheetId` ; corps Zod strict `{ "expectedRevision": number }` ; succès `200` avec seul `deletedId` (aucune copie des données supprimées).
- `401` non authentifié, `403` sans droit, `404` hors scope/introuvable (sans divulgation cross-tenant), `409` conflit de révision/parent inactif, `400` payload invalide.
- **Arbitrage D (permissions)** : ajout de `process-sheet:delete` dans le registre M-006, permission donnée au système Owner et attribuable au responsable habilité ; migration idempotente pour les Owners déjà enregistrés. Ne pas confondre avec la permission de suppression M-004.
- Après succès UI : fermer le dialogue, invalider les tags `ProcessSheetList`, `ProcessSheet` et `EligibleProcessTechnicalSheets`, notifier le résultat ; en cas d'erreur, garder la fiche et afficher le motif sans simuler la réussite.
- Journal d'audit : conserver uniquement les références et métadonnées minimales nécessaires à la traçabilité, **jamais** les instructions, phases, associations ou champs de fabrication effacés.

### 4.3 Concurrence et cohérence

- Évaluer le cas d'une suppression face à une édition/revalidation simultanée, une transition d'état du parent, une purge M-004 et une nouvelle création ; les fences sont obligatoires et doivent être testés.
- Réutiliser la logique de purge M-006 déjà employée par M-004 sans réemployer une cascade supprimant le parent.
- La suppression n'implique pas une suppression des activités historiques M-004 ni des modèles de bibliothèque ; le maintien d'un audit minimal reste conforme au contrat de traçabilité préexistant.

## 5. Découpage de réalisation — un lot de finalisation cohérent

### Sous-ensemble A : PDF

- Backend : projection d'impression indépendante des calculs économiques M-004 ; résolveur scoped des ingrédients ; service de génération PDF paginé ; controller et route ; audit et garde RBAC ; réponse binaire non persistée.
- Frontend : activation contrôlée de `FileDown` dans l'éditeur, traitement binaire sécurisé via l'infrastructure API existante, état de chargement, gestion des erreurs et de la saisie non enregistrée ; action disponible en lecture selon contrat validé.
- Tests : projection (doublons, absences), PDF `%PDF`, extraction de texte/numérotation et pagination, textes longs, retours à la ligne, brouillon/validée, accès cross-tenant, audit, headers et non-stockage. Recette visuelle de **PDFs réellement générés** sur plusieurs pages (pas uniquement un test de Buffer).

### Sous-ensemble B : suppression

- Backend : nouvelle permission et migration Owner ; validation Zod ; route/controller/service métier transactionnel ; codes d'erreur ; événement d'audit ; non-régression de la cascade M-004.
- Frontend : action de liste habilitée, dialogue de confirmation accessible, états chargement/erreur, invalidation RTK Query et navigation cohérente.
- Tests : HTTP/transactions (permission, tenancy, parent actif/inactif, M-004 conservée, suppression du draft, libération unicité et recréation, 409, rollback, concurrence), RTL du dialogue et des mutations, Playwright des flux critiques.

### Qualité et intégration

- Réutiliser les composants partagés et éviter les fichiers monolithiques ; n'ajouter aucune primitive Core en douce.
- Vérification locale par le propriétaire : tests ciblés → lint backend/frontend → tests globaux → build → E2E → `npm run release:check` (MongoDB `rs0`, Node 24, ClamAV et environnement de test dédiés).
- Revue manuelle : document PDF multipage depuis une vraie Fiche process, caractères accentués, longues instructions, imprimabilité, thème UI, clavier, mobile, confirmation destruction, erreurs réseau et droits.
- Une branche `feature/m006-finalisation-ui-ux-global`, une PR cohérente et merge exclusivement après accord explicite du propriétaire ; documentation canonique et aide M-006 mises à jour seulement lorsque les fonctionnalités sont réellement livrées.

## 6. Arbitrages validés pour le code

| Décision | Choix proposé | Alternative |
| --- | --- | --- |
| A — Permission d'export | `process-sheet:export` dédiée | `process-sheet:read` suffit |
| B — Offre/quotas PDF | Aucun nouveau quota M-006 ; pas de consommation M-004 | Contrat commercial nouveau, à cadrer |
| C — Export d'archives | Autorisé en lecture avec mention « ARCHIVÉE » | Uniquement `ACTIVE` |
| D — Permission de suppression | `process-sheet:delete` dédiée | Autre clé à valider, sans réutiliser celle de M-004 |
| E — Format PDF | A4 portrait, multipage, fiche atelier détaillée, source persistée et statut sur chaque page | Autre format/présentation à spécifier |

**Les choix A à E ont été validés explicitement le 2026-10-29.** Les nouveaux tests, la QA PDF et la gate de cette branche restent à exécuter avant PR. Les points déjà approuvés dans le cadrage initial (brouillon imprimable, suppression physique, parent ACTIVE, pas de stockage PDF) restent inchangés.
