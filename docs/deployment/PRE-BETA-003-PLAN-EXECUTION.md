# PRE-BETA-003 — Ordre de préparation et de mise en service de la bêta privée

**Date :** 2026-11-01  
**Statut :** plan opérationnel proposé, à approuver avant mise en œuvre.  
**Dépend de :** [cadrage infrastructure](PRE-BETA-003-DEPLOYMENT-CADRAGE.md), [cadrage SMTP](PRE-BETA-003-SMTP-CADRAGE.md), [audit de readiness](../audits/PRE-BETA-READINESS.md).  
**Base autoritaire :** dépôt Produit `main` au merge `1e47178` de PRE-BETA-002, Core intégré `v1.2.1` ; CI post-merge confirmée verte.  
**Règle :** une PR de documentation pour finaliser PRE-BETA-003, puis **un lot cohérent et distinct** de code/configuration infrastructure. Toute primitive générique Core à modifier exige un chantier Core séparé avant intégration produit.

## 1. Décisions déjà prises

- **Fournisseur d'hébergement VPS : OVHcloud**, sans achat à ce stade.
- **Deux niveaux de sauvegarde :** Standard quotidienne incluse VPS + copie automatisée indépendante de **MongoDB et fichiers persistants**, avec historique de plusieurs jours et restauration éprouvée hors production.
- **Frontend :** React/Vite compilé servi depuis le VPS et **API Express sous la même origine HTTPS** via un proxy inverse ; Vercel non retenu pour cette bêta.
- **Bêta privée** avec utilisateurs pilotes autorisés, non assimilée à une ouverture publique.
- **Coûts maîtrisés :** petit budget d'hébergement possible, services externes gratuits privilégiés lorsque techniquement et juridiquement acceptables.

**Ne sont pas encore décidés :** commande de VPS-2 8 Go (modèle recommandé seulement), région de datacenter, disponibilité et prix au panier, domaine DNS, prestataire SMTP (Brevo Free candidat), MongoDB Atlas M0 après essais, stockage externe de sauvegarde, calendrier/rétention et RPO/RTO, conformité, stratégie de supervision. Ne rien activer implicitement.

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
4. Choisir le **stockage de sauvegarde hors VPS**, l'outil, son chiffrement et son coût, puis définir le nombre de copies et le niveau de perte acceptable ; le besoin « plusieurs jours » est validé mais aucune rétention chiffrée finale ne l'est.
5. Vérifier **l'offre OVHcloud exacte**, la disponibilité, région datacenter **hors Local Zones bloquant le SMTP**, 8 Go recommandés, facturation mensuelle, sauvegarde Standard, prix TTC et renouvellement.
6. Établir les exigences d'exploitation (accès SSH, supervision, incidents, maintenance) et de conformité (DPA, RGPD, informations destinataires).

## 4. Choix techniques par défaut — à éprouver, pas à imposer

- **Serveur** : Linux LTS entretenu, Docker Compose ou exécution équivalente, une instance HTTP Node 24, frontal Caddy HTTPS, assets statiques Vite, port API interne non public.
- **Sécurité** : comptes séparés, TLS, secrets injectés dans l'environnement d'exécution sécurisé, pas dans GitHub ni images, correctifs OS et dépendances, contrôle proxy IP/CORS/cookies.
- **SMTP** : relais externe Brevo Free candidat, port 465/TLS implicite si vérifié ; pas de serveur SMTP autohébergé.
- **MongoDB** : URI sécurisée vers base de bêta exclusivement, migration-manifest et runners, pas de `autoIndex` implicite en production.
- **Fichiers** : racine persistante séparée de la quarantaine temporaire, accès minimum, aucune supposition de stockage cloud disponible sans Core.
- **Sauvegarde** : exécuteur planifié à exécution unique, journaux sans secrets, copie chiffrée hors VPS, versions datées et restauration sur cible isolée.
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
