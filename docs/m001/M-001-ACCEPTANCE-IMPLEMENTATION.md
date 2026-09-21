# M-001 — Critères d'acceptation et ordre d'implémentation

**Statut :** VALIDÉ — implémentation terminée, gate locale finale verte, PR à ouvrir  
**Date de validation :** 2026-09-21  
**Module :** Dossiers / magasins + affectations + activité métier

---

## 1. Gate fonctionnelle M-001

M-001 est considéré fonctionnellement terminé uniquement lorsque tous les critères applicables ci-dessous sont démontrés par le code et les tests réellement exécutés.

### Checkpoint d'implémentation — 2026-09-21

Branche :

```text
feature/m001-dossiers-access
```

Checkpoint backend testé localement :

```text
c8e8f676dfaeebd69180cae6030d1304627ee088
```

Résultats communiqués :

```text
npm run release:verify → vert
npm run lint           → vert
npm test               → vert
```

Ce checkpoint backend a ensuite été complété par le frontend, les tests RTL et les E2E.

### Validation finale locale — 2026-09-21

Checkpoint applicatif avant clôture documentaire :

```text
1d4c9a2930ebd76d5667bc137b6e110b20c8c71c
```

Résultats confirmés par l'utilisateur :

```text
npm test              → vert
npm run test:e2e      → 11/11 verts
npm run release:check → vert
```

La gate locale M-001 est donc franchie. La séquence restante est : documentation finale → PR unique → Core Gate PR → merge → Core Gate post-merge.

---

## 2. RBAC et frontière Core / Produit

- [ ] aucune constante Core n'est modifiée pour ajouter le métier GMS ;
- [ ] les six permissions M-001 sont déclarées par le produit ;
- [ ] le descriptor produit compose ces permissions dans le registre RBAC actif ;
- [ ] le rôle système `owner` reçoit les six permissions M-001 dans le dérivé ;
- [ ] aucun autre rôle système Core ne reçoit automatiquement de permission Dossier en M-001 ;
- [ ] les profils métier restent des rôles personnalisés produit, hors périmètre de provisioning final M-001 ;
- [ ] aucun second moteur RBAC n'existe.

---

## 3. Persistance

### Dossier

- [ ] ownership Workspace explicite ;
- [ ] nom obligatoire ;
- [ ] enseigne/localisation/email/téléphone/contact facultatifs ;
- [ ] statut initial ACTIVE backend-owned ;
- [ ] lifecycle conforme au contrat ;
- [ ] createdBy/updatedBy pour audit, jamais pour ownership ;
- [ ] aucun delete physique exposé.

### DossierAccessGrant

- [ ] même Workspace entre Dossier et WorkspaceMember ;
- [ ] ACTIVE / REVOKED backend-driven ;
- [ ] un seul grant ACTIVE courant par couple ;
- [ ] historique REVOKED conservé ;
- [ ] nouvelle affectation après révocation = nouvelle ligne ACTIVE ;
- [ ] revocationReason backend-driven.

### BusinessActivityEvent

- [ ] distinct de l'AuditLog Core ;
- [ ] immutable ;
- [ ] Workspace obligatoire ;
- [ ] scope Dossier lorsque pertinent ;
- [ ] actions backend-driven ;
- [ ] metadata minimales ;
- [ ] transactionnel avec les mutations auxquelles il appartient.

---

## 4. API

Les 10 endpoints du contrat REST sont implémentés et conformes.

- [ ] liste ;
- [ ] metadata ;
- [ ] création ;
- [ ] détail ;
- [ ] activité ;
- [ ] mise à jour générale ;
- [ ] lifecycle ;
- [ ] liste grants ;
- [ ] ajout grant ;
- [ ] révocation grant.

Les codes 400/401/403/404/409 respectent le contrat.

Les erreurs cross-workspace / hors scope Dossier ne permettent pas l'énumération.

---

## 5. Liste Dossiers

- [ ] Owner voit tous les Dossiers autorisés de son Workspace ;
- [ ] non-owner voit uniquement ses Dossiers avec grant ACTIVE ;
- [ ] défaut = ACTIVE + PAUSED ;
- [ ] ARCHIVED disponible par filtre explicite ;
- [ ] DELETED absent du flux normal ;
- [ ] recherche nom/enseigne/ville/code postal ;
- [ ] pagination serveur ;
- [ ] aucune filtration de sécurité uniquement côté frontend.

---

## 6. Création / modification

- [ ] un nom seul permet la création ;
- [ ] le client ne choisit pas le statut initial ;
- [ ] un Owner ne reçoit jamais de grant individuel ;
- [ ] un non-owner explicitement autorisé à créer reçoit atomiquement son grant ACTIVE ;
- [ ] PATCH général n'accepte pas status ;
- [ ] absent = inchangé ;
- [ ] null = effacement d'un champ facultatif ;
- [ ] aucune activité créée sur un no-op réel.

---

## 7. Lifecycle

Matrice exacte :

```text
ACTIVE   → PAUSED | ARCHIVED | DELETED
PAUSED   → ACTIVE | ARCHIVED | DELETED
ARCHIVED → PAUSED | DELETED
DELETED  → PAUSED
```

Critères :

- [ ] transition identique idempotente ;
- [ ] transition impossible → 409 ;
- [ ] reason obligatoire pour suppression ;
- [ ] reason obligatoire pour restauration ;
- [ ] PAUSED conserve les grants ;
- [ ] ARCHIVED conserve les grants ;
- [ ] DELETED révoque tous les grants ACTIVE dans la même transaction ;
- [ ] restauration → PAUSED ;
- [ ] restauration ne restaure aucun ancien grant.

---

## 8. WorkspaceMember lifecycle

- [ ] `SUSPENDED` conserve les grants mais les rend inopérants via le membership ;
- [ ] `REMOVED` révoque tous les grants ACTIVE du membership ;
- [ ] raison `WORKSPACE_MEMBER_REMOVED` ;
- [ ] exécution dans la session MongoDB Core ;
- [ ] échec handler produit → rollback du retrait ;
- [ ] réinvitation → aucun ancien grant restauré.

---

## 9. Activité métier

Actions M-001 :

```text
DOSSIER_CREATED
DOSSIER_UPDATED
DOSSIER_STATUS_CHANGED
DOSSIER_ACCESS_GRANTED
DOSSIER_ACCESS_REVOKED
```

- [ ] événement uniquement sur changement réel ;
- [ ] même transaction que la mutation sensible ;
- [ ] `dossier:read` pour activités générales ;
- [ ] `dossier:access:read` pour événements d'affectation ;
- [ ] aucune fuite d'activité d'un autre Dossier/Workspace ;
- [ ] endpoint activité ne lit pas l'AuditLog Core.

---

## 10. Metadata backend-driven

`GET /dossiers/metadata` fournit au minimum :

```text
dossierStatuses
statusTransitions
accessGrantStatuses
accessRevocationReasons
businessActivityActions
```

- [ ] frontend ne possède pas de liste métier concurrente ;
- [ ] labels affichés issus du backend ;
- [ ] metadata utilisées pour l'UX, jamais comme autorisation.

---

## 11. UX

### Liste

- [ ] DataTable/DataPagination Core réutilisés ;
- [ ] recherche/filtres ;
- [ ] Voir → drawer ;
- [ ] Ouvrir → page réelle uniquement si ACTIVE.

### Drawer

- [ ] Informations ;
- [ ] Accès ;
- [ ] Activité ;
- [ ] lifecycle léger ;
- [ ] ouverture du drawer ne change pas le contexte de travail ;
- [ ] Owner représenté comme accès implicite, jamais comme faux grant.

### Dialog

- [ ] création ;
- [ ] édition ;
- [ ] primitives Dialog Base UI/shadcn existantes réutilisées ;
- [ ] formulaire commun réutilisé ;
- [ ] `ConfirmationDialog` réservé aux confirmations.

### Page Dossier

- [ ] route `/workspaces/:workspaceId/dossiers/:dossierId` ;
- [ ] vraie page de travail ;
- [ ] uniquement ACTIVE comme contexte opérationnel ;
- [ ] retour Dashboard Workspace ;
- [ ] URL porte le contexte sélectionné ;
- [ ] aucun endpoint backend `currentDossier` ;
- [ ] aucun localStorage/Redux `activeDossierId` comme autorité.

---

## 12. Autocomplétion

- [ ] provider Géoplateforme/IGN isolé derrière un adapter ;
- [ ] 3 caractères minimum ;
- [ ] debounce ~300 ms ;
- [ ] maximum 8 suggestions StreetAddress ;
- [ ] requête précédente annulée lors d'une nouvelle saisie ;
- [ ] saisie manuelle toujours disponible ;
- [ ] panne externe non bloquante ;
- [ ] aucun payload fournisseur persistant ;
- [ ] uniquement address/postalCode/city en M-001 ;
- [ ] aucun test automatisé dépendant du réseau IGN.

Le CORS réel est vérifié pendant l'implémentation. Un proxy backend n'est créé que si la réalité technique le nécessite.

---

## 13. Données initiales / migrations

- [ ] aucune migration historique M-001 ;
- [ ] aucun seed Dossier ;
- [ ] aucun import BAN local ;
- [ ] aucun preset métier incomplet créé artificiellement ;
- [ ] le premier bêta M-001 peut être exercé par un Owner.

Les bootstraps Produits/catalogues appartiennent à M-002/M-003.

---

## 14. Infrastructure de test produit

Avant les nouveaux tests métier :

- [ ] base Vitest/Supertest renommée `saas_fiches_techniques_gms_test` ;
- [ ] base E2E renommée `saas_fiches_techniques_gms_e2e_test` ;
- [ ] garde `_e2e_test` conservée ;
- [ ] aucune base développement/production nettoyée par les tests.

---

## 15. Tests

- [ ] tests registries/RBAC ;
- [ ] tests Zod ;
- [ ] tests modèles ;
- [ ] tests services ;
- [ ] tests transactions/rollback ;
- [ ] tests tenancy ;
- [ ] tests permissions ;
- [ ] tests lifecycle ;
- [ ] tests lifecycle WorkspaceMember REMOVED ;
- [ ] tests activité métier ;
- [ ] tests HTTP Supertest ;
- [ ] tests frontend RTL ;
- [ ] 4 E2E Playwright M-001 critiques.

Contrat détaillé :

```text
docs/m001/M-001-TEST-STRATEGY.md
```

---

## 16. Gates finales

Avant de considérer la PR M-001 prête :

```bash
npm run release:check
```

Puis, obligatoirement :

- [ ] branche à jour dans le VS Code local ;
- [ ] application lancée localement ;
- [ ] validation fonctionnelle et visuelle réalisée par l'utilisateur ;
- [ ] anomalies éventuelles corrigées ;
- [ ] `npm run release:check` relancé après les dernières corrections ;
- [ ] Core Gate verte sur le head de la PR ;
- [ ] revue ;
- [ ] merge ;
- [ ] Core Gate verte post-merge sur main ;
- [ ] documentation de reprise mise à jour avec preuves réelles.

### Note tooling — Prettier

Au checkpoint backend, `npm run format:check` échoue également sur des fichiers Core inchangés, dont `backend/app.js`. Les essais explicites avec `--end-of-line lf` et `--end-of-line crlf` échouent eux aussi.

`format:check` ne fait actuellement pas partie de `release:check` ni de la Core Gate canonique. Ce problème est traité comme un besoin générique Core/tooling séparé ; M-001 ne doit pas modifier silencieusement le Core pour le contourner.

---

# 17. Ordre d'implémentation validé

Une seule branche fonctionnelle :

```text
feature/m001-dossiers-access
```

Une seule PR fonctionnelle cohérente M-001.

## Étape 0 — Préconditions Git

```text
PR documentaire #9 fusionnée
→ main à jour
→ Core Gate post-merge verte
→ créer feature/m001-dossiers-access
```

Ne jamais développer M-001 directement sur `main`.

## Étape 1 — Isoler l'infrastructure de tests produit

Corriger uniquement les identités de bases tests héritées :

```text
saas_fiches_techniques_gms_test
saas_fiches_techniques_gms_e2e_test
```

Conserver les protections existantes.

## Étape 2 — Descriptors et registries métier

Créer/composer :

- permissions M-001 ;
- extension owner ;
- statuts Dossier ;
- transitions ;
- statuts grants ;
- raisons de révocation ;
- actions BusinessActivity ;
- descriptor routes backend ;
- routes frontend/navigation nécessaires.

Ajouter les tests de composition immédiatement.

## Étape 3 — Persistance

Créer :

```text
Dossier
DossierAccessGrant
BusinessActivityEvent
```

avec indexes/invariants nécessaires.

Tests modèles immédiatement.

## Étape 4 — Validation Zod et serializers/DTO

Implémenter le contrat strict validé.

Tests validation immédiatement.

## Étape 5 — Service BusinessActivity

Construire la primitive transversale produit avant les mutations qui en dépendent.

Tester immutabilité, registry, metadata et lecture filtrée.

## Étape 6 — Autorisation Dossier

Implémenter :

```text
loadAuthorizedDossierContext
enforceDossierStatePolicy
```

sans second RBAC.

Tests tenancy/anti-énumération immédiatement.

## Étape 7 — Services Dossier

Implémenter :

- metadata ;
- list ;
- create ;
- detail ;
- update ;
- lifecycle.

Toutes les mutations sensibles transactionnelles.

## Étape 8 — Services grants

Implémenter :

- list ;
- grant ;
- revoke ;
- idempotence ;
- concurrence ;
- historique.

## Étape 9 — Hook WorkspaceMember REMOVED

Composer le handler produit dans :

```text
applicationWorkspaceMemberLifecycle.registry.js
```

Tester rollback Core + produit.

## Étape 10 — HTTP M-001

Routes → controllers → services.

Monter le module par `applicationRoutes.registry.js`.

Respecter l'ordre des routes, notamment `/metadata` avant `/:dossierId`.

Fermer les tests backend/Supertest avant le frontend.

## Étape 11 — RTK Query et routes frontend — PROCHAINE ÉTAPE

Créer la feature Dossiers en réutilisant le `baseApi` Core.

Ajouter les routes via `application-routes.js` et la navigation via le point d'extension existant.

## Étape 12 — Liste Dossiers

Réutiliser DataTable/DataPagination.

Recherche, statut, pagination serveur.

## Étape 13 — DossierForm + Dialog

Formulaire commun création/édition.

Pas de duplication de formulaire.

## Étape 14 — Drawer

Sections :

```text
Informations
Accès
Activité
```

Réutiliser EntityDetailsDrawer/ConfirmationDialog.

## Étape 15 — Page de travail Dossier

Créer la vraie page `/workspaces/:workspaceId/dossiers/:dossierId`.

M-001 y fournit une vue d'ensemble minimale, sans inventer les modules futurs.

## Étape 16 — Autocomplétion

Créer le provider/adapter Géoplateforme et son hook local.

Vérifier le CORS réel.

Fallback manuel permanent.

## Étape 17 — Tests frontend

Fermer les tests RTL et la régression frontend.

## Étape 18 — E2E métier

Ajouter les quatre parcours Playwright validés.

## Étape 19 — Gates

Exécuter :

```bash
npm run format:check
npm run release:check
```

Corriger toute régression Core ou métier avant PR prête à merger.

## Étape 20 — Documentation et PR

Mettre à jour :

- contrats réellement affectés ;
- ROADMAP ;
- DEBT si état D-012 évolue ;
- REPRISE-CURRENT ;
- product-release/changelog uniquement si le processus de version produit le demande à ce stade.

PR M-001 unique et cohérente.

---

## 18. Hors périmètre d'implémentation M-001

Ne pas ajouter pendant ce lot :

- Produits ;
- Fournisseurs ;
- Articles ;
- Prix ;
- Fiches techniques ;
- presets métier finaux dépendant de M-002/M-003/M-004 ;
- capability commerciale Dossier non validée ;
- purge physique du graphe Dossier ;
- import BAN ;
- OCR/IA ;
- Fiches process ;
- optimiseur.

Une découverte générique Core suit la procédure Core séparée au lieu d'être corrigée silencieusement dans le produit.

---

## 19. Décision de sortie de cadrage

Le cadrage M-001 est considéré **complet et validé** lorsque ce document et la stratégie de tests sont intégrés à la PR documentaire #9.

L'implémentation devient autorisée après :

```text
PR #9 fusionnée
+
Core Gate post-merge verte
```

Aucun modèle métier Mongoose ne doit être créé avant ce point.
