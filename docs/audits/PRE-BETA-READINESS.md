# PRE-BETA-001 — Audit initial de préparation à la bêta privée

**Établi le :** 2026-11-01  
**Statut :** AUDIT INITIAL DOCUMENTAIRE ET STATIQUE — aucune autorisation de déploiement  
**Périmètre :** `greg44500/saas-fiches-techniques-gms`, futur environnement de bêta privée, Core intégré `v1.2.1`  
**Référence produit :** `main` = `70d3e22d9f158a9582e5e80a4ee11f014e06ab93`  
**Core intégré :** `core-origin.json` = `42beaff67200ca4e956378e2273b4eae440f47bc`  
**Version du produit :** `product-release.json` = `0.1.0`, canal `development`

> Ce dossier est un premier constat vérifié à distance, pas un audit de pénétration ni un certificat de conformité ou un GO de déploiement. Il ne présuppose ni prestataire d'hébergement, ni données de production, ni migrations appliquées à la future base, ni passage de tests locaux sur le poste Windows.

## 1. Méthode, autorité et périmètre

Sources vérifiées : HEAD GitHub, Core Gate sur ce HEAD et ses étapes, code backend/frontend et routes ciblées, `docs/ROADMAP.md`, `docs/DEBT.md`, `docs/REPRISE-CURRENT.md`, `docs/PRODUCT-SCOPE.md`, `docs/domain/DOMAIN-MODEL.md`, `docs/operations/OPERATIONS.md`, `docs/security/SECURITY.md`, `docs/compliance/COMPLIANCE.md`, `docs/compliance/rgpd-data-tracker-inventory.md`, `docs/releases/migration-manifest.json` et `AGENTS.md`, ainsi que contrats Core v1.2.1. Les mentions antérieures à la PR #56 sont historiques ; le code et les gates priment.

**Hors périmètre de ce lot :** modification de code, migrations exécutées, nettoyage de MongoDB locale, déploiement, achat d'infrastructure, ouverture des inscriptions publiques, création de compte réel, correction de dette Core dans le produit.

**Classification :**
- **PRÊT ET PROUVÉ** : preuve Git/code/CI explicitement identifiée, dans les limites de cette preuve.
- **À VÉRIFIER** : mécanisme présent mais preuve d'exécution dans le contexte bêta absente.
- **À CORRIGER AVANT BÊTA** : écart avéré ou prérequis impératif restant à traiter.
- **À CADRER** : choix technique, organisationnel ou juridique non arrêté.
- **DIFFÉRÉ** : non nécessaire pour le périmètre actuel de bêta privée gratuite.

## 2. Baseline Git et qualité

| ID | Constat vérifié | Qualification / suite |
| --- | --- | --- |
| GIT-01 | `main` produit au commit `70d3e22d9f158a9582e5e80a4ee11f014e06ab93` ; PR #56 fusionnée le 2026-10-29. | **PRÊT ET PROUVÉ** pour la présence du code M-006 finalisé. |
| GIT-02 | Core Gate produit [run 40902305191](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/40902305191) : `completed/success`, avec étape « Run canonical Core gate » réussie. | **PRÊT ET PROUVÉ** pour CI du commit, pas pour exploitation distante ou QA humaine. |
| GIT-03 | Le `main` produit renvoie `protected: false` via l'API GitHub ; le `main` Core est protégé. | **À CORRIGER AVANT BÊTA** : protection des modifications directes, contrôle des PR et gate obligatoire, selon la politique du dépôt. Vérifier les règles de protection/rulesets effectives avant action. |
| GIT-04 | `core-origin.json` = Core `v1.2.1` ; `product-release.json` = produit `0.1.0-development`. | **PRÊT ET PROUVÉ** pour provenance ; version/canal de bêta à arbitrer séparément, sans modifier la version Core. |
| DOC-01 | `ROADMAP`, `DEBT` et `REPRISE-CURRENT` indiquaient encore que PDF/suppression M-006 sont sur branche/non fusionnés, en contradiction avec la PR #56. | **À CORRIGER** : addenda datés de réconciliation dans le même lot documentaire, sans effacer l'historique. |

## 3. Matrice des contrôles pré-bêta

| ID | Domaine | Évidence / constat | État | Action et critère de sortie |
| --- | --- | --- | --- | --- |
| SEC-01 | Identité et sessions | Authentification et sessions Core présentes ; aucun test de configuration de l'environnement bêta observé. | À VÉRIFIER | Tester inscription via invitation, connexion/déconnexion, renouvellement/révocation, réinitialisation, erreurs et rate limits dans l'environnement cible. |
| SEC-02 | Tenancy et RBAC | `loadWorkspaceContext.js` exige Workspace actif, appartenance active et rôle du Workspace ; routes M-006 exigent aussi l'accès Dossier. | À VÉRIFIER | Tests négatifs entre deux Workspaces et Dossiers sur lecture, import, PDF et suppression, avec identités de rôles distinctes. |
| SEC-03 | Capabilities et quotas | Capabilities distinctes des permissions. Le plan `Free` initial a `members: 1` et `features: []`. | À CADRER | Créer une offre privée bêta 0 € autorisant `team_management`, `supplier_catalog_import` et, selon cas d'usage, les features Produit. Choisir quotas maîtrisés et tester les refus. |
| SEC-04 | Configuration sensible | `env.js` refuse plusieurs secrets placeholders en production, exige HTTPS pour `CLIENT_URL` et interdit `ALLOW_DEVELOPMENT_DATA_RESET` en production. | À VÉRIFIER | Revue de toutes les variables réelles, secrets uniques, isolation environnements, HTTPS/TLS, cookies, CORS, logs sans secrets. |
| SEC-05 | Protection de Git | `main` produit non protégée dans la réponse API. | À CORRIGER AVANT BÊTA | Activer et vérifier les règles GitHub correspondant au workflow PR + Core Gate ; contrôler les éventuels droits de contournement. |
| DB-01 | Transactions et schémas | Code M-006 de suppression en transaction, résolution tenant, et migrations spécifiques présentes. | À VÉRIFIER | Réexécuter parcours de sécurité/concurrence sur MongoDB `rs0` et base dédiée ; ne jamais conclure sur simple présence du code. |
| DB-02 | Migrations | Manifeste contient jusqu'à `m006-process-finalization-permissions` et sa dépendance `m006-process-validate-permission`. | À VÉRIFIER | Établir plan de migration de la base cible, contrôle des indexes et rôles persistés ; conserver preuve de chaque runner et exécution idempotente. Ne jamais lancer en masse sans ordre. |
| DB-03 | Base bêta, sauvegarde et restauration | Aucune infrastructure cible ni exécution réelle de sauvegarde/restauration vérifiée. | À CADRER | Choisir base isolée, auth réseau, sauvegarde, restauration testée, RPO/RTO adaptés, chiffrement, rétention, rollback compatible. |
| FILE-01 | Stockage | `FILE_STORAGE_PROVIDER` n'accepte que `local` à ce commit ; l'exploitation décrit les limites multi-instance/volumes. | À CADRER | Volume persistant, sauvegarde et restauration des fichiers, accès limité, capacité/coût et cohérence avec DB ; évolution générique éventuelle dans Core seulement. |
| FILE-02 | Antivirus et temporaire | `clamscan` requis ; politique documentée fail-closed. Le démarrage n'atteste pas la disponibilité réelle de ClamAV. | À VÉRIFIER | Vérifier binaire, signatures/mises à jour, scan positif/négatif, timeouts, rejet et nettoyage de la quarantaine sur la cible. |
| MAIL-01 | Emails | Configuration SMTP obligatoire ; aucun SMTP bêta et aucune délivrabilité réels démontrés. | À CADRER | Choisir fournisseur/identité d'envoi ; tester invitation commerciale, invitation Workspace, reset, SPF/DKIM/DMARC selon cas. |
| OPS-01 | Health/readiness | `GET /api/health` confirme une réponse HTTP ; ne contrôle ni MongoDB, ni SMTP, ni ClamAV, ni jobs. | À CORRIGER AVANT BÊTA (dispositif opérationnel) | Prévoir des vérifications et alertes des dépendances réellement critiques ; tout changement de primitive générique passe par Core. |
| OPS-02 | Logs/alertes | `requestId` et `AuditLog` présents ; le guide ne démontre pas de centralisation, alerting 5xx/latence ou suivi des jobs en production. | À CADRER | Dispositif minimal logs erreurs, métriques, alertes, suivi des traitements et accès aux incidents, sans fuite de données personnelles. |
| OPS-03 | Jobs | Runners de souscriptions, rétention et purge fichiers ; job métier `purge-technical-sheets` dans `package.json`. | À VÉRIFIER | Inventorier jobs réellement nécessaires à la bêta ; planifier, superviser, prévoir idempotence/retries et éviter les chevauchements. |
| OPS-04 | Déploiement et rollback | `OPERATIONS.md` précise qu'aucun pipeline de production unique n'est livré. | À CADRER | Hébergement, déploiement reproductible, version immuable, variables, health, sauvegarde préalable, retour arrière testé. |
| COM-01 | RGPD et pages légales | Inventaire RGPD Core = base technique générique, non registre du SaaS GMS déployé ; prestataires non sélectionnés. | À CADRER | Registre des traitements produit, information des personnes, CGU/mentions/politique vie privée adaptées, rétention, accès, sous-traitants, gestion incidents. |
| QA-01 | E2E des modules | 13 fichiers `e2e/tests/*.spec.js` inventoriés, M-001 à M-005 couverts. Aucun fichier de scénario `process-sheet` M-006 ni scénario commercial D-020 explicite identifié. | À CORRIGER AVANT BÊTA pour les parcours exposés | Ajouter E2E M-006 (brouillon, validation, conflit, export, suppression, accès interdit) et D-020/offre bêta + invitation membre/import contrôlé, puis exécuter gate. |
| QA-02 | PDF et ergonomie | Routes et services PDF/suppression M-006 présents sur `main` ; aucune recette humaine A4 multipage, clavier, mobile, thème attestée par cette revue. | À VÉRIFIER | Ouvrir PDF réel, pages longues, accents, ingrédients répétés, brouillon/validée/archive, permissions ; vérifier erreurs et UI. |
| QA-03 | Charge et concurrence | Aucun résultat de test de volumétrie / endurance / charge de l'environnement futur obtenu. | À VÉRIFIER | Choisir scénarios représentatifs (imports, recherche, fiches, multi-tenant, PDFs), seuils raisonnés selon infrastructure et mesurer. |
| DATA-01 | Données de tests et dataset pilote | Workspace de développement et imports locaux signalés par le propriétaire ; contenu effectif de MongoDB non accessible à l'audit. | À CADRER | **Conserver** le Workspace local comme fixture ; préparer des données synthétiques/autorisées pour la base bêta séparée. Aucun reset destructif ni copie brute de la DB locale. |

### Détail des parcours métier d'ouverture bêta (non déclarés validés)

1. Administrateur Platform : offre privée gratuite existante ou créée avec capabilities/quotas nécessaires ; envoi d'invitation D-020 et acceptation par un nouveau bénéficiaire ; Workspace créé, propriétaire correct.
2. Propriétaire : gestion d'équipe disponible, deux places au minimum, rôle personnalisé « Gestionnaire de catalogue », invitation du gestionnaire ; absence de permissions non déléguées.
3. Gestionnaire invité : création de fournisseur privé, import d'articles et de catalogue, aperçu/commit, validation des permissions `supplier:manage`, `supplier:article:manage` et `supplier:catalog:import` ; contrôle de `supplier_catalog_import`. Rejet hors Workspace et refus quand l'offre ne l'autorise pas.
4. Fiches M-004 : création, tarification, valorisation, validation, export, isolation Dossier et quota.
5. Fiches M-006 : création liée à M-004, modifications et conflits `409`, réconciliation, validation/revalidation, PDF, suppression définitive sans effacement M-004 et recréation éligible.
6. Exploitation : email réellement reçu, scan antivirus, jobs, remontée erreurs, restauration de sauvegarde, rollback pratiqué avant ouverture.

## 4. Requalification des dettes : priorités

| Dette | Traitement bêta | Frontière |
| --- | --- | --- |
| D-003 / D-006 : RGPD, rétention, effacement | Pré-bêta : politique produit et preuves minimales ; corriger mécanisme générique dans Core si nécessaire | Produit + Core selon responsabilité |
| D-005 : observabilité | Pré-bêta : diagnostic et alertes opérationnels | Infrastructure / Core pour primitive commune |
| D-007 : stockage | Pré-bêta : persistance + backup/restore + ClamAV | Infrastructure ; Core si autre provider nécessaire |
| D-012 : E2E dérivé | Pré-bêta : couvrir M-006 et parcours onboarding/import de l'offre pilote | Produit |
| D-013 : configuration et déploiement | Pré-bêta : environnement isolé et reproductible, rollback | Infra / exploitation |
| D-020 : invitation commerciale | À valider sur bêta ; code et CI existants, validation terrain absente | Core, sauf scénario produit |
| D-004 : paiement | DIFFÉRÉ si bêta gratuite sans encaissement | Commercial / Core ultérieur |
| D-008/009/010, D-023/024, TVA achat, IA/OCR, e-mail d'export M-004 | DIFFÉRÉ sauf dépendance bloquante démontrée | Selon domaine |
| M-003 : annulation d'import, tarifs prospectifs ; M-002 concurrence catégories | Évaluer selon scénarios de bêta ; ne pas inventer un besoin ni purger des données | Produit |

Les incidents historiques corrigés ne sont pas rouverts sans reproduction sur `main`. Aucune dette commerciale différée n'est déclarée « validée ».

## 5. Critères de sortie vers un GO bêta privée

Un GO ne pourra être proposé qu'avec les preuves suivantes :

- Code visé immuable/versionné ; branche `main` sécurisée ; gate verte sur le commit déployé.
- Base bêta séparée des bases de développement et E2E ; migrations/indexes/rôles appliqués, consignés et vérifiés.
- Sauvegarde/restauration testées de la base et des fichiers ; rollback documenté.
- HTTPS, secrets, CORS/cookies, contrôle des dépendances critiques, logs, alertes, ClamAV, SMTP et jobs réels.
- RGPD, information des personnes et données initiales compatibles avec l'ouverture choisie.
- E2E et QA réelle des parcours commerciaux, rôle invité/import, M-004/M-006 ; tests négatifs d'isolation et de quota.
- Protocole de bêta : invitations individuelles, collecte de feedback, incidents, support, clôture des accès.
- Validation explicite de l'exploitant après lecture du rapport de recette. Une gate GitHub seule n'est pas un GO.

## 6. Plan de travail issu de l'audit initial

**PRE-BETA-001 (ce lot) :** lecture Git, code, CI, contrats, identification des gaps, réconciliation documentaire. Aucune correction fonctionnelle ou opération d'infrastructure.

**Lot suivant à cadrer après revue :** recette locale ciblée des scénarios critiques et vérification des migrations, inventaire des dépendances réelles et décision sur les choix d'hébergement. Ne grouper que des travaux cohérents ; séparer strictement toute correction générique Core de la branche produit.

**Tests non réalisés par cet audit :** aucun `npm test`, `npm run release:check`, Playwright local, migration, restauration, test SMTP, scan ClamAV ou test sur hébergement. Ces statuts doivent rester « à vérifier » jusqu'à preuve.

## 7. Sources Git et documents vérifiables

- [Commit produit main / PR #56](https://github.com/greg44500/saas-fiches-techniques-gms/commit/70d3e22d9f158a9582e5e80a4ee11f014e06ab93)
- [Core Gate post-merge réussie](https://github.com/greg44500/saas-fiches-techniques-gms/actions/runs/40902305191)
- [Roadmap](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/ROADMAP.md)
- [Registre des dettes](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/DEBT.md)
- [Reprise courante](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/REPRISE-CURRENT.md)
- [Contrat D-020](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/contracts/COMMERCIAL-INVITATIONS.md)
- [M-006 routes](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/backend/modules/process/processSheet.routes.js)
- [M-006 service PDF](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/backend/modules/process/processSheetExport.service.js)
- [M-006 suppression](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/backend/modules/process/processSheetDelete.service.js)
- [Configuration runtime](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/backend/config/env.js)
- [Guide d'exploitation](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/operations/OPERATIONS.md)
- [Migrations](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/releases/migration-manifest.json)
- [Inventaire E2E](https://github.com/greg44500/saas-fiches-techniques-gms/tree/main/e2e/tests)
- [RGPD : inventaire technique](https://github.com/greg44500/saas-fiches-techniques-gms/blob/main/docs/compliance/rgpd-data-tracker-inventory.md)
