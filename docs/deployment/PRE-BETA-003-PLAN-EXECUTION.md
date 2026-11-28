## Priorité exécution — décision du 2026-11-28

**Réorganisation décidée par le propriétaire :** la première étape de mise en service visée est une **connexion technique fonctionnelle avec données fictives**, sans activer les scripts de sauvegarde. Préparer le dépôt complet et sa sécurité avant achat ; après accord, installer le VPS et le domaine, configurer SMTP/Atlas/TLS, puis effectuer la recette technique. Les sauvegardes indépendantes et leur optimisation seront mises en œuvre ensuite, **avant** l'ouverture de bêta réelle ou la conservation de données importantes. Les purges destructives ne sont pas programmées au premier démarrage.

**Brevo en premier :** compte gratuit à ouvrir/vérifier, disponibilité de l'accès SMTP, activation transactionnelle éventuelle à demander au support ; identifiant SMTP à relever mais aucune clé à partager. Domaine `fichepilot.fr` et expéditeur à authentifier une fois le domaine acquis. Le code Nodemailer du Core et les templates transactionnels existants sont conservés. Pour le détail d'exécution, suivre `deployment/README.md`.

**Les NO-GO du vrai pilote restent inchangés :** test de restauration, gestion des incidents, RGPD, autorisations, sécurité proxy et SMTP réel. Le report des backups autorise uniquement une recette technique initiale isolée.

---

## P2 — premiers fichiers livrés sur branche d'infrastructure (2026-11-28)

**Branche distincte** : `deploy/pre-beta-003-ovh-ready` (base : dernier commit du cadrage PRE-BETA-003), sans achat ni modification du Core/main. Répertoire exécutable `deployment/` : `Dockerfile.api`, `Dockerfile.web`, `compose.yaml`, `Caddyfile`, `production.env.example`, `preflight.mjs` et test, `smtp-verify.mjs`, `migration-plan.mjs` et test, scripts `run-jobs.sh`, `create-backup.sh`, `pull-backups.ps1` et guide `deployment/README.md`. Le frontend buildé est servi par Caddy ; API Express interne ; stockage permanent/temporaires séparé ; Brevo via Nodemailer existant. **Aucune réussite d'exécution n'est annoncée** : le développeur doit exécuter les vérifications locales avant la PR, puis les essais d'infrastructure après un GO de commande. La correction générique Core du proxy/ratelimit n'est pas effectuée : arbitrage et tests nécessaires avant bêta. Les scripts de purge et de backup ne sont ni activés ni planifiés.

---

# PRE-BETA-003 — Ordre de préparation et de mise en service de la bêta privée

**Date :** 2026-11-01  
**Statut :** plan opérationnel proposé, à approuver avant mise en œuvre.  
**Dépend de :** [cadrage infrastructure](PRE-BETA-003-DEPLOYMENT-CADRAGE.md), [cadrage SMTP](PRE-BETA-003-SMTP-CADRAGE.md), [audit de readiness](../audits/PRE-BETA-READINESS.md).  
**Base autoritaire :** dépôt Produit `main` au merge `1e47178` de PRE-BETA-002, Core intégré `v1.2.1` ; CI post-merge confirmée verte.  
**Règle :** une PR de documentation pour finaliser PRE-BETA-003, puis **un lot cohérent et distinct** de code/configuration infrastructure. Toute primitive générique Core à modifier exige un chantier Core séparé avant intégration produit.

## Actualisation P0–P2 du 2026-11-22 — Hors VPS et sans frais

**Ordre prioritaire : P0 + P1 → PR documentaire unique → P2 packaging/tests locaux sur branche et PR distinctes → GO préachat explicite → P3 à P7.** Les références anciennes demandant d'inspecter le panier immédiatement ne valent pas autorisation d'achat.

| Lot | Action possible gratuitement | Critère de preuve |
| --- | --- | --- |
| A — P0 | Domaine possédé ou non ; DNS ; fournisseur/identité SMTP ; budget TTC ; Caddy vs Nginx ; Compose vs natif ; disponibilité du PC et du disque ; fréquence/rétention, RPO/RTO et responsabilité d'exploitation | Décisions écrites et validées, zéro dépense |
| B — P1 | Audit Core/Produit de `req.ip`, rate limiting/proxy, health/readiness, SMTP TLS, écoute Express, antivirus, volumes, jobs, migrations et variables | Risques classés, tests/reproduction et contournements évalués ; **aucun patch générique sans arbitrage** |
| C — P2 | Préparer build Vite, image/runners Node 24, frontal HTTPS, volumes, secrets modèles, ClamAV/signatures, jobs non chevauchants, `mongodump` ciblé, collecte Windows chiffrée/SSH, rollback au commit | Tests locaux/CI sur cibles fictives et base `_e2e_test` uniquement, release:check, PR infrastructure distincte |
| D — Préachat | Devis OVH réel incluant options/renouvellement, zone SMTP, standard, prérequis satisfaits et liste des essais encore impossibles sans VPS | Décision de GO et accord de paiement explicites |

**Atlas n'est plus à créer :** le propriétaire a déjà créé `gms-beta` Free AWS Paris. `Network Access` était vide à la dernière capture. Vérifier le compte `gms_beta_app`, sa connexion et les migrations sur environnement ciblé **seulement après provisionnement autorisé**. Bêta = 2–3 utilisateurs, Super administrateur compris. Le stockage indépendant est le disque externe personnel ; 3 versions glissantes restent à valider. Brevo, Caddy, VPS-2 et Compose ne sont que des candidats.

**Frontière Core :** si le besoin générique est confirmé, comparer (A) modification `saas-core-api` avec version/upgrade et (B) exception temporaire GMS tracée/réconciliable ; accord explicite du propriétaire requis avant code.

## 1. Décisions déjà prises

- **Fournisseur d'hébergement VPS : OVHcloud**, sans achat à ce stade.
- **Deux niveaux de sauvegarde :** Standard quotidienne incluse VPS + copie automatisée indépendante de **MongoDB et fichiers persistants**, avec historique de plusieurs jours et restauration éprouvée hors production.
- **Frontend :** React/Vite compilé servi depuis le VPS et **API Express sous la même origine HTTPS** via un proxy inverse ; Vercel non retenu pour cette bêta.
- **Bêta privée** avec utilisateurs pilotes autorisés, non assimilée à une ouverture publique.
- **Coûts maîtrisés :** petit budget d'hébergement possible, services externes gratuits privilégiés lorsque techniquement et juridiquement acceptables.

**Ne sont pas encore décidés :** commande de VPS-2 8 Go (modèle recommandé seulement), région, disponibilité, prix, domaine DNS, SMTP (Brevo Free candidat), capacité Atlas Free après essais, calendrier/rétention et RPO/RTO, conformité et supervision. **Décision supplémentaire : réutiliser le disque externe du propriétaire, depuis son PC Windows, comme destination de copie indépendante sans abonnement ; Backblaze n'est plus prioritaire.** Réutiliser le compte Atlas existant, sans modifier les données de développement, et privilégier un **nouveau projet + cluster Free bêta**. Prouver disponibilité du PC, sécurité du transfert, chiffrement, alertes et restauration. Aucun achat/provisionnement implicite.

## 2. Phases et critères de validation

| Phase | Action concrète | Preuve / livrable | Qui agit |
| --- | --- | --- | --- |
| **P0 — Cadrage final** | Préciser domaine, budget réel, offre VPS, région compatible SMTP, SMTP gratuit, MongoDB cible, stockage de sauvegarde, RPO/RTO, données pilotes | Décisions DEP et SMTP explicitement validées et traçables ; aucun achat | Propriétaire + cadrage |
| **P1 — Revue technique Core/Produit** | Classer risques : `req.ip` derrière proxy, `trust proxy`, limites de requêtes, readiness `/api/health`, TLS SMTP selon port, flux de fichiers et déploiement statique | Diagnostic et éventuelles demandes Core **dans le dépôt Core**, jamais correction sauvage dans le produit | Développement/QA |
| **P2 — Préparer le code infrastructure** | Dockerfile(s) reproductibles, images à versions fixées, Caddy/reverse proxy, build Vite, configuration HTTPS, chemins de volumes, variables de production non secrètes, sauvegarde chiffrée, jobs et supervision, procédure rollback | Diff sur branche infra dédiée + tests locaux et `release:check` applicables, PR **unique pour ce lot cohérent** | Développement/QA |
| **P3 — Provisionnement après approbation** | Commander VPS OVHcloud uniquement après accord sur devis ; clefs SSH, compte non-root, mises à jour système, pare-feu 22 limité et 80/443, interdiction d'exposer 5000/MongoDB au public ; domaine/DNS/TLS | Accès administrateur maîtrisé, configuration reproductible, test HTTPS ; aucun secret en Git | Propriétaire (achat) + exploitation |
| **P4 — Données et services externes** | Créer base bêta isolée, vérifier transactions MongoDB et limites Atlas, appliquer **dans l'ordre contractuel** seeds/migrations/indexes nécessaires ; installer ClamAV/signatures et SMTP/domaine vérifié | Migrations documentées, requêtes/transactions validées ; EICAR & échec scan ; messages SMTP reçus et authentifiés | Exploitation + QA |
| **P5 — Sauvegarde et reprise** | Conserver backup OVH Standard ; générer backup chiffré MongoDB et fichiers hors VPS, avec historique, détection d'échec, clé hors VPS ; restaurer sur cible indépendante | Preuve d'au moins une **restauration base + fichiers**, tests d'intégrité, procédure de retour arrière et RPO/RTO | Exploitation |
| **P6 — Recette sécurisée** | Tester HTTPS/cookies, authentification/rotation/logout, invitations D-020/Workspace et SMTP, RBAC et tenancy, fichiers, import, quotas, PDF M-004/M-006 A4, UX clavier/mobile, jobs, supervision et charge adaptée | Rapport GO/NO-GO ; défauts classés Core/Produit/Infra ; tests E2E exclusivement sur **base dédiée `_e2e_test`** et jamais destructifs sur la bêta | QA + propriétaire |
| **P7 — Ouverture limitée** | Version produit traçable, gate verte, documentation RGPD, habilitations nominatives, support et incidents, monitoring, stratégie de fermeture | Validation explicite du propriétaire ; invitations contrôlées ; alertes et sauvegardes effectives | Propriétaire |

## 3. Travail à préparer avant la commande OVHcloud

1. Vérifier l'existence d'un **nom de domaine déjà contrôlé**, sinon chiffrer un achat optionnel. Le domaine doit pouvoir héberger le site et fournir des enregistrements DNS destinés au SMTP.
2. **Valider Brevo Free ou un concurrent** : créer/configurer le compte uniquement sur décision, vérifier l'expéditeur et l'envoi test. Sans domaine authentifié, l'activation des invitations réelles n'est pas considérée opérationnelle.
3. Choisir la cible **MongoDB Atlas Free vs alternative** par essais d'une base isolée, dont la prise en charge des transactions, les contraintes d'indexes et l'espace libre sont réellement vérifiés.
4. Éprouver **la sauvegarde sur disque externe personnel via PC Windows**, chiffrée, sans port domestique entrant, contrôlée par date/alerte ; définir la disponibilité du PC, le nombre de copies et la restauration isolée ; préciser le niveau de perte acceptable ; le besoin « plusieurs jours » est validé mais aucune rétention chiffrée finale ne l'est.
5. Vérifier **l'offre OVHcloud exacte**, la disponibilité, région datacenter **hors Local Zones bloquant le SMTP**, 8 Go recommandés, facturation mensuelle, sauvegarde Standard, prix TTC et renouvellement.
6. Établir les exigences d'exploitation (accès SSH, supervision, incidents, maintenance) et de conformité (DPA, RGPD, informations destinataires).

## 4. Choix techniques par défaut — à éprouver, pas à imposer

- **Serveur** : Linux LTS entretenu, Docker Compose ou exécution équivalente, une instance HTTP Node 24, frontal Caddy HTTPS, assets statiques Vite, port API interne non public.
- **Sécurité** : comptes séparés, TLS, secrets injectés dans l'environnement d'exécution sécurisé, pas dans GitHub ni images, correctifs OS et dépendances, contrôle proxy IP/CORS/cookies.
- **SMTP** : relais externe Brevo Free candidat, port 465/TLS implicite si vérifié ; pas de serveur SMTP autohébergé.
- **MongoDB** : URI sécurisée vers base de bêta exclusivement, migration-manifest et runners, pas de `autoIndex` implicite en production.
- **Fichiers** : racine persistante séparée de la quarantaine temporaire, accès minimum, aucune supposition de stockage cloud disponible sans Core.
- **Sauvegarde** : exécuteur planifié à exécution unique, journaux sans secrets, copie chiffrée hors VPS, versions datées et restauration sur cible isolée. **Stockage distant : coût additionnel interdit, quota gratuit vérifié et alerte avant épuisement.**
- **Déploiement** : au départ, **validation humaine** après Core Gate, images/artefacts immuables, migrations explicites puis tests de fumée ; pas de `git pull` arbitraire en production.

## 5. Risques Core et limites non résolues

- La gestion d'IP client et du rate limiting derrière le proxy inverse dépend du réglage `trust proxy` réel, pas simplement d'un header fourni par le navigateur ; une correction générique éventuelle est **candidate Core**.
- `GET /api/health` actuel renvoie un succès HTTP sans vérifier MongoDB, ClamAV ou SMTP : ne constitue pas une readiness.
- Les tâches de maintenance `job:*` existantes ne sont pas automatiquement planifiées ; le scheduler et ses alertes doivent être configurés.
- La réconciliation des fichiers avec MongoDB lors d'une restauration multi-ressources n'est pas atomique par défaut.
- La capacité ClamAV et la charge import/PDF doivent être mesurées sur le VPS réel.
- Les tests E2E qui purgent `*_e2e_test` ne doivent jamais être dirigés vers `*_dev`, la base bêta ou une base de production.

## 6. Critère de sortie de PRE-BETA-003 (cadrage uniquement)

- Les décisions de fournisseur VPS (de principe déjà validée), offre finale, domaine, SMTP, MongoDB, stockage de sauvegarde, RPO/RTO, sécurité et responsable d'exploitation sont écrites et validées.
- La PR **documentaire unique** fusionne ce cadrage sans prétendre à un GO bêta.
- Une **autre branche/PR** pourra ensuite préparer l'infrastructure reproductible, ses tests et sa documentation, après traitement éventuel des besoins Core ; aucun paiement/deploiement automatique.
- Un GO bêta exige toujours une recette de l'environnement concret, une restauration éprouvée et l'accord explicite du propriétaire.
