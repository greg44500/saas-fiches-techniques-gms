# SAAS-CORE-API — Registre canonique des dettes actives

**Statut :** source de vérité documentaire pour les dettes non résolues  
**Dernière mise à jour :** 2026-09-18  
**Périmètre :** Core clonable et, lorsque précisé, applications dérivées

---

## 1. Objet et hiérarchie

Ce document est le registre unique des dettes fonctionnelles, techniques, de conformité, de distribution et de préparation à la production encore actives.

En cas de contradiction :

```text
code + contraintes DB
→ tests réellement exécutés et validés
→ contrats / architecture / sécurité canoniques
→ DEBT.md
→ documentation opérationnelle
→ REPRISE-CURRENT.md
```

Les dettes clôturées sont conservées sous forme de synthèse ; leur historique détaillé reste dans Git.

Statuts autorisés :

```text
À CADRER
PLANIFIÉ
EN COURS
DIFFÉRÉ
CONDITIONNEL
BLOQUÉ
VALIDÉ
NON APPLICABLE
```

---

## 2. Gates

### 2.1 Core 1.0 finalisé

Le Core peut être considéré comme un socle générique stable lorsque ses responsabilités communes sont cohérentes, testées, documentées et suffisamment extensibles pour être dérivées puis mises à niveau.

### 2.2 SaaS dérivé prêt pour la production

Un produit dérivé doit en plus résoudre les dettes dépendant de son modèle commercial, de ses traitements, providers et infrastructure.

```text
Core 1.0 finalisé
≠
produit dérivé automatiquement production-ready
```

---

## 3. Synthèse des dettes

### 3.1 Trajectoire Core 1.0

D-017 — validation réelle de la création et de l’upgrade d’un SaaS dérivé pilote — est **VALIDÉE le 2026-09-17**.

La stratégie de distribution a été démontrée sur deux Release Candidates réelles et un dépôt pilote distinct :

```text
Core 1.0.0-rc.1
→ saas-core-derived-pilot
→ module métier catalog
→ évolution Core générique
→ Core 1.0.0-rc.2
→ merge Git réel dans le pilote
→ 0 conflit manuel
→ provenance RC2
→ Core Gate #11 post-merge : success
```

La dernière validation du pilote est :

```text
main pilote : fd7a31d6532898e951b02e75940c09de1eec63ea
Core Gate #11
run : 35243957546
conclusion : success
Run canonical Core gate : success
```

D-015 — versionnement, provenance, releases et discipline de migration du Core — est **VALIDÉE le 2026-09-17**.

D-016 — E2E Core avec Playwright — est **VALIDÉE le 2026-09-17** après intégration des E2E à la gate canonique, validation réelle de la `Core Gate` #19 sur le commit applicatif `e0fac2aa8126bf49f7ffa8747d1d93e7e551040e`, fusion de la PR #15 et validation post-merge de la `Core Gate` #22 sur `main` au commit `43f318d81c261c4c788f726b4ed4f83647a3c4d9`.

L’audit final architecture / sécurité / qualité n’a démontré aucun nouveau blocker applicatif Core 1.0. La synchronisation documentaire post-audit a été fusionnée via la PR #16 et le nouveau `main` `fe0c3821a7d2f9377066c98193df1e522131a0be` a été validé par la `Core Gate` #24 (`run 35217570669`).

Les blockers applicatifs génériques décidés avant le gel sont levés : D-002, D-011, D-015, D-016, D-017, D-021, D-022 et D-025 sont validées.

**D-020 n’est pas bloquante pour Core 1.0.** Sa validation fonctionnelle terrain est explicitement différée au déploiement de l’application métier avec des bêta-testeurs réels.

La publication stable `v1.0.0` a été exécutée selon D-015 le 2026-09-17. Le tag annoté `v1.0.0` cible `dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff`, la GitHub Release `390898671` est stable, et la Core Gate #38 (run `35248517242`) est verte sur ce même commit.

### 3.2 Non-blockers Core 1.0 mais blockers possibles d'un produit réel

```text
D-003 conformité / RGPD
D-004 Billing / Payment
D-005 observabilité
D-006 rétention / anonymisation réglementaire
D-007 stockage fichiers production
D-012 E2E du produit dérivé
D-013 configuration / déploiement production
```

### 3.3 Dettes différées ou conditionnelles

```text
D-008 notifications étendues
D-009 API Keys / Webhooks
D-010 authentification avancée — dont Google SSO
D-020 validation terrain invitation commerciale / onboarding bêta
D-023 demande gouvernée de capacité exceptionnelle de transfert de propriété — cible Core 1.1
D-024 console d’administration Platform contextualisée du Workspace — cible Core 1.1
```

---

## 4. Dettes actives

### D-003 — RGPD, cookies, confidentialité et obligations légales

**Statut :** À CADRER  
**Périmètre :** application dérivée + mécanismes Core nécessaires  
**Blocage Core 1.0 :** non par défaut  
**Blocage production dérivée :** oui lorsque applicable

Références : `docs/compliance/COMPLIANCE.md` et `docs/compliance/rgpd-data-tracker-inventory.md`.

**Critère de clôture :** conformité technique/documentaire alignée sur les traitements réels.

### D-004 — Billing / Payment réel

**Statut :** À CADRER  
**Périmètre :** application dérivée payante  
**Blocage Core 1.0 :** non

`Subscription / entitlement ≠ encaissement / facture / autorité financière`. À cadrer selon le produit : provider, identité facturée, idempotence, échecs, remboursements, prorata/remises, fiscalité, factures et audit. Les données de carte ne sont jamais stockées par le Core.

### D-005 — Observabilité technique de production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

`AuditLog` ne remplace pas le monitoring technique. Prévoir selon l'infrastructure : erreurs 5xx, latence, MongoDB, SMTP, jobs, Files/antivirus, frontend, `requestId`, métriques et alertes.

### D-006 — Rétention, anonymisation et suppression réglementaire

**Statut :** À CADRER  
**Blocage Core 1.0 :** non comme politique juridique universelle

```text
D-006 = politique produit/juridique
D-019 = moteur d'exécution générique validé
```

### D-007 — Stockage et exploitation des fichiers en production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

À valider selon le déploiement : provider/volume persistant, sauvegarde/restauration, chiffrement, disponibilité, suppression physique, rétention, antivirus, quotas/coûts et localisation des données.

### D-008 — Notifications et communications transactionnelles étendues

**Statut :** CONDITIONNEL  
**Blocage Core 1.0 :** non

À traiter seulement si un produit dépasse les emails transactionnels déjà fournis.

### D-009 — API Keys et Webhooks

**Statut :** CONDITIONNEL  
**Blocage Core 1.0 :** non

Si applicable : secrets jamais en clair, scopes, expiration/révocation, audit, rate limiting, signatures, retry, SSRF, validation stricte des URLs et idempotence.

### D-010 — Authentification avancée

**Statut :** CONDITIONNEL  
**Périmètre :** application dérivée / évolution Core motivée  
**Blocage Core 1.0 :** non

Google SSO reste volontairement ici et ne bloque pas Core 1.0. Son ajout futur devra traiter OpenID Connect/OAuth, liaison d'identité avec un compte local existant, collisions d'email, révocation, coexistence de plusieurs méthodes de connexion et séparation stricte entre identité externe et autorisations internes.

MFA, passkeys, SSO entreprise ou autres providers ne sont pas ajoutés uniquement par anticipation.

### D-012 — Tests E2E de chaque application dérivée

**Statut :** À CADRER  
**Blocage Core 1.0 :** non — D-016 couvre uniquement le Core générique

Chaque dérivé doit couvrir ses parcours métier/transversaux critiques propres.

D-017 démontre que la gate canonique clonée continue d’exécuter les E2E Core après dérivation et upgrade. Cela ne remplace pas les E2E métier propres à chaque futur produit réel.

### D-013 — Configuration et déploiement de production

**Statut :** À CADRER  
**Blocage Core 1.0 :** non

Variables/secrets, HTTPS, reverse proxy, CORS, cookies, MongoDB/backups, migrations/indexes, SMTP, stockage, antivirus, jobs, health/readiness, monitoring et rollback. Référence : `docs/operations/OPERATIONS.md`.

### D-020 — Invitation commerciale client et offres privées de découverte

**Statut :** DIFFÉRÉ — validation terrain sur application dérivée / bêta  
**Périmètre :** Core — onboarding commercial générique  
**Blocage Core 1.0 :** non

Contrat : `docs/contracts/COMMERCIAL-INVITATIONS.md`.

`PlatformInvitation` reste réservé aux collaborateurs internes ; `CommercialInvitation` aux prospects/futurs clients/bêta-testeurs. Offre privée via Plan non public, snapshot serveur, dérive significative refusée, token aléatoire/hash SHA-256, rotation au resend, révocation, permissions Platform dédiées, acceptation authentifiée et atomique, audit. Les règles trial/open-ended restent celles du contrat canonique.

Le code, les contrats et les tests automatisés déjà validés sont considérés suffisants pour ne plus bloquer le versionnement du Core. La validation fonctionnelle finale est volontairement reportée à des conditions réelles, lors du déploiement de l’application métier avec bêta-testeurs : un parcours d’intégration Platform et un parcours d’intégration Workspace/onboarding client seront alors vérifiés sur l’environnement réel applicable.

Cette reclassification ne transforme pas une validation non exécutée en validation réussie. Toute anomalie découverte pendant la bêta devra être corrigée et, si nécessaire, rouvrir D-020 ou créer une dette dédiée.

### D-023 — Demande gouvernée de capacité exceptionnelle de transfert de propriété

**Statut :** DIFFÉRÉ — cible Core 1.1  
**Blocage Core 1.0 :** non

Le mécanisme bas niveau v1 reste fermé par défaut, réservé à l’autorisation Platform prévue, borné dans le temps, révocable et single-use. Aucun bouton owner `Demander capacité de transfert` n’est ajouté avant D-023.

Cible Core 1.1 : demande owner persistée et auditée, file Platform bornée par permission, revalidation d’éligibilité à chaque étape, refus structurés, création de l’autorisation temporaire existante sans ressaisie d’identité/workspace, audit complet et tests concurrence/E2E.

### D-024 — Console d’administration Platform contextualisée du Workspace

**Statut :** DIFFÉRÉ — cible Core 1.1  
**Blocage Core 1.0 :** non

Spécification : `docs/debt/D-024-platform-workspace-control-center.md`.

Le drawer Workspace doit évoluer après Core 1.0 vers une console contextualisée : vue d’ensemble, abonnement, dérogations, administration et alertes/activité. Les pages Platform globales restent disponibles ; RTK Query, permissions et validations backend restent les autorités ; aucune logique métier ne doit être dupliquée.

---

## 5. Dettes clôturées récemment — D-015 / D-016 / D-017 / D-025

### D-015 — Versionnement, provenance, releases et discipline de migration du Core

**Statut :** VALIDÉ — 2026-09-17  
**Périmètre :** Core / distribution  
**Blocage Core 1.0 :** levé pour D-015

État validé, résumé : identité machine-readable du Core, SemVer et canaux de release, provenance des dérivés, manifest et politique de migrations, vérifications `release:verify` / `release:check`, workflow GitHub Actions `Core Gate`, ruleset `Main protection`, PR obligatoire et status check obligatoire.

D-015 définit le processus utilisé pour publier les RC de D-017 puis la release stable `v1.0.0`; ce processus a été appliqué jusqu’à la validation post-merge et à la publication du tag/release stable.

### D-016 — E2E du Core avec Playwright

**Statut :** VALIDÉ — 2026-09-17  
**Périmètre :** parcours navigateur critiques du Core  
**Blocage Core 1.0 :** levé pour D-016

État validé :

- package `e2e/` autonome avec Playwright `1.63.0` et Chromium ;
- base MongoDB E2E dédiée et garde stricte imposant le suffixe `_e2e_test` avant tout nettoyage ;
- préparation déterministe de la base avant les scénarios ;
- backend E2E et frontend E2E isolés ;
- exécution séquentielle (`workers: 1`) pour préserver le déterminisme des parcours ;
- `npm run test:e2e` intégré à `npm run release:check` ;
- installation Playwright et exécution de la gate intégrées au workflow `Core Gate` ;
- parcours navigateur validés : inscription, connexion, restauration de session, logout et protection post-logout, création du premier workspace, modification persistée du workspace, modification persistée du profil, archivage réel d’un workspace jetable, fermeture réelle d’un compte jetable avec révocation de session ;
- `Core Gate` #19 (`run 35210282566`) terminée avec succès sur `e0fac2aa8126bf49f7ffa8747d1d93e7e551040e` avant la clôture documentaire ;
- PR #15 fusionnée dans `main` ;
- `Core Gate` #22 (`run 35212998693`) terminée avec succès sur le merge commit `43f318d81c261c4c788f726b4ed4f83647a3c4d9`.

Audit lifecycle final :

```text
Workspace
GET  /api/workspaces/:workspaceId/closure-impact
POST /api/workspaces/:workspaceId/archive

Account
GET  /api/users/me/closure-impact
POST /api/users/me/closure
```

Ces opérations sont de vrais contrats Core consommés par le frontend. Les anciennes routes `DELETE` proposées dans la notice initiale ne décrivent pas le contrat courant lorsqu’elles sont contredites par le code.

Le nettoyage de fixtures E2E est distinct des fonctionnalités utilisateur : le setup technique vide uniquement la base MongoDB explicitement dédiée E2E. Aucun helper de nettoyage n’est utilisé comme preuve d’un contrat d’archivage ou de fermeture.

La couverture Playwright reste volontairement une couche de parcours navigateur, pas une duplication de tous les invariants déjà vérifiés par les tests backend/frontend spécialisés. Isolation multi-tenant, RBAC, entitlement/quota, administration Platform, Files, sécurité et centre d’aide conservent leurs tests dédiés ; un scénario navigateur n’est ajouté que lorsqu’il apporte une vérification d’intégration utilisateur réellement distincte.

### D-017 — Validation réelle de la dérivation et de l’upgrade du Core

**Statut :** VALIDÉ — 2026-09-17  
**Périmètre :** Core 1.0 / distribution / SaaS dérivé pilote  
**Blocage Core 1.0 :** levé pour D-017  
**Bilan détaillé :** `docs/debt/D-017-derived-saas-upgrade-validation.md`

État validé, résumé :

- RC1 réelle `v1.0.0-rc.1` sur `432fcfd88cd185234e6317a27df0d3d458f93f28` ;
- dépôt `greg44500/saas-core-derived-pilot` créé avec historique Git commun ;
- provenance initiale explicite ;
- module métier `catalog` séparé avec backend, Zod, RBAC, capability, RTK Query, route/navigation/widget frontend et aide métier ;
- migration métier de backfill des permissions des rôles système conservée dans le dérivé ;
- évolution Core générique réelle fusionnée par la PR Core #20 ;
- RC2 réelle `v1.0.0-rc.2` sur `5c61c7066eeb56460adb164ba39ae0a0462bef53` ;
- upgrade réalisé par `git fetch upstream-core --tags` puis `git merge v1.0.0-rc.2` ;
- merge Core → pilote `c654c3e4e3b3f4821b9bd210cb3b21e2afbe37ea` ;
- `MERGE_CONFLICT_COUNT=0` ;
- aucun changement fonctionnel du module `catalog` requis ;
- revue explicite migrations/configuration/dépendances : aucune migration Core, variable d’environnement, dépendance ou évolution DB nouvelle dans RC2 ;
- `core-origin.json` mis à jour seulement après validation de l’upgrade ;
- Core Gate #9 `success` avant provenance finale ;
- Core Gate #10 `success` après provenance RC2 ;
- PR pilote #3 fusionnée ;
- `main` pilote `fd7a31d6532898e951b02e75940c09de1eec63ea` validé par Core Gate #11, run `35243957546`, `success` ;
- extension du centre d’aide métier validée sans réécriture du corpus Core ;
- aucune anomalie découverte ne reste blocker Core 1.0.

D-017 valide la stratégie de dérivation/upgrade. Elle ne rend pas un produit dérivé automatiquement production-ready.

### D-025 — Centre d’aide sécurisé Workspace / Platform

**Statut :** VALIDÉ — 2026-09-16  
**Blocage Core 1.0 :** levé pour D-025  
**Spécification :** `docs/debt/D-025-secure-help-center.md`

État validé, résumé : centres d’aide Workspace et Platform distincts, projection serveur, filtrage par autorisations effectives, point d’extension métier, recherche locale sur catalogue autorisé, navigation accessible et contenus versionnés avec le Core.

---

## 6. Dettes clôturées — références

```text
D-001 fermeture Account / Workspace                         VALIDÉ
D-002 corbeille / restauration / suppression Files          VALIDÉ — 2026-09-15
D-011 Design System + préférences                           VALIDÉ — 2026-09-10
D-014 points d'extension métier                             VALIDÉ
D-015 versionnement / provenance / release / migrations     VALIDÉ — 2026-09-17
D-016 Playwright E2E Core                                   VALIDÉ — 2026-09-17
D-017 dérivation + upgrade réel SaaS pilote                 VALIDÉ — 2026-09-17
D-018 Équipe Platform / RBAC / invitations                  VALIDÉ
D-019 moteur sécurisé de rétention / purge Core             VALIDÉ
D-021 gate sécurité Auth / invitations / tokens             VALIDÉ — 2026-09-12
D-022 intégrité Entitlement Override Groups                 VALIDÉ — 2026-09-12
D-025 centre d’aide Workspace / Platform sécurisé           VALIDÉ — 2026-09-16
DOC-CODE-1 documentation source                             VALIDÉ
```

Le détail historique de ces lots reste consultable dans Git et dans leurs documents canoniques dédiés lorsqu’ils existent.

---

## 7. Ordre de traitement recommandé

La trajectoire Core 1.0 est désormais clôturée :

```text
D-025 centre d’aide Workspace / Platform sécurisé           VALIDÉ — 2026-09-16
D-020 invitation commerciale / validation terrain           DIFFÉRÉ — non bloquant Core 1.0
→ gate globale pré-D-015                                    VALIDÉE — 2026-09-16
→ D-015 release governance / provenance / migrations        VALIDÉE — 2026-09-17
→ D-016 Playwright E2E Core                                 VALIDÉE — 2026-09-17
→ audit final architecture / sécurité / qualité             TERMINÉ
→ synchronisation documentaire post-audit                   VALIDÉE / fusionnée — PR #16
→ D-017 dérivation + upgrade pilote                         VALIDÉE — 2026-09-17
→ clôture documentaire D-017                                VALIDÉE
→ préparation release stable Core 1.0.0                     VALIDÉE
→ Core Gate stable post-merge #38                           VALIDÉE — run 35248517242
→ tag annoté / GitHub Release v1.0.0                        PUBLIÉS — 2026-09-17
```

Après `v1.0.0`, les trajectoires ne doivent pas être mélangées :

```text
Core 1.1
→ D-023 demande gouvernée de transfert de propriété
→ D-024 console Platform contextualisée du Workspace

SaaS dérivés réels
→ reclassification des dettes produit / production applicables
→ D-012 E2E métier propres au produit
→ D-020 validation terrain invitation/onboarding lorsqu’elle devient applicable

Infrastructure / production
→ D-005 observabilité
→ D-007 stockage fichiers production
→ D-013 configuration / déploiement
→ autres obligations D-003 / D-004 / D-006 selon le produit réel
```

---

## 8. Gates de référence

### Gate globale pré-D-015

HEAD applicatif :

```text
3f645b231ea6c80e77275dfd8b838d2ecba479fa
```

Résultats communiqués : backend lint/tests, frontend lint/tests/build et parcours critiques manuels verts.

### Gate D-015

```text
HEAD validé : 759cb9589d31ad083d78fbf5a892d432718ad526
workflow : Core Gate
run : 35192502978
conclusion : success
```

### Gate D-016 avant clôture documentaire

```text
HEAD validé : e0fac2aa8126bf49f7ffa8747d1d93e7e551040e
workflow : Core Gate
run : 35210282566
run number : 19
conclusion : success
```

### Gate D-016 post-merge sur `main`

```text
HEAD validé : 43f318d81c261c4c788f726b4ed4f83647a3c4d9
workflow : Core Gate
run : 35212998693
run number : 22
conclusion : success
```

### Gate post-synchronisation documentaire / démarrage D-017

```text
HEAD validé : fe0c3821a7d2f9377066c98193df1e522131a0be
workflow : Core Gate
run : 35217570669
run number : 24
conclusion : success
```

### Core RC2 post-merge

```text
HEAD validé : 5c61c7066eeb56460adb164ba39ae0a0462bef53
workflow : Core Gate
run : 35239618709
run number : 34
conclusion : success
```

### Core stable 1.0.0 post-merge

```text
HEAD validé : dfdd39a57c7fb1ec7e53ab7778a806fdc86f1dff
workflow : Core Gate
run : 35248517242
run number : 38
conclusion : success
Run canonical Core gate : success
tag : v1.0.0
GitHub Release : 390898671
```

### Pilote après merge RC2, avant provenance finale

```text
HEAD validé : c654c3e4e3b3f4821b9bd210cb3b21e2afbe37ea
workflow : Core Gate
run : 35242233294
run number : 9
conclusion : success
```

### Pilote après provenance RC2

```text
HEAD validé : bbf8c79bd803b9f31dd504388f8c7e98068b8a2e
workflow : Core Gate
run : 35242912831
run number : 10
conclusion : success
```

### Pilote post-merge sur `main`

```text
HEAD validé : fd7a31d6532898e951b02e75940c09de1eec63ea
workflow : Core Gate
run : 35243957546
run number : 11
conclusion : success
Run canonical Core gate : success
```
