# FichePilot — préparation de la bêta OVHcloud (PRE-BETA-003)

Statut : proposition technique, non validée sur VPS, Docker ou Atlas bêta.
Ce lot ne commande aucun service, ne connecte pas Atlas et n'exécute aucun
seed ou migration. Le produit est dérivé du Core v1.2.1.

## 1. Architecture cible

- VPS Linux OVHcloud hors Local Zones où les sorties SMTP sont restreintes.
- Caddy : ports 80/443, HTTPS automatique, React/Vite compilé, API sous /api.
- Express Node 24 : API interne seulement, aucune publication du port 5000.
- ClamAV clamscan : scanner local appelé par le Core, signatures freshclam sur
  volume persistant partagé. Un échec d'analyse n'est pas déclaré sain.
- MongoDB Atlas Free : cluster déjà créé selon le propriétaire, externe au VPS.
- Brevo : relais SMTP externe avec port 465 et TLS implicite.
- Stockage permanent et fichiers temporaires séparés sous /var/lib/fichepilot.
- Sauvegarde MongoDB/fichiers chiffrée, puis récupérée sur Windows par SSH.
  Avant la récupération effective, le spool reste sur le VPS et n'est pas
  une sauvegarde indépendante.

Les images Node et Caddy utilisent actuellement des tags : vérifier et figer
des digests maintenus avant déploiement, puis éprouver ClamAV et la mémoire.

## 2. Tests réalisables avant l'achat (racine Git PowerShell)

~~~~powershell
git status -sb
node -v
node --test deployment/preflight.test.mjs deployment/migration-plan.test.mjs
node deployment/migration-plan.mjs
npm run release:verify
npm run lint
npm test
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
~~~~

La gate complète exige aussi Playwright en local, avec MongoDB de tests
dédiée se terminant par _e2e_test, jamais la base Atlas bêta :

~~~~powershell
npm run release:check
~~~~

Vérification optionnelle si Docker Desktop et Compose sont disponibles.
Ne créer un fichier .env.production temporaire que s'il n'en existe PAS :
~~~~powershell
Copy-Item deployment/production.env.example .env.production
docker compose --env-file .env.production -f deployment/compose.yaml config --quiet
Remove-Item .env.production
~~~~
Ces commandes ne doivent JAMAIS être exécutées telles quelles si un véritable
.env.production existe déjà : il ne doit jamais être écrasé/supprimé.

La configuration de production réelle est testée structurellement sans réseau :
~~~~powershell
node deployment/preflight.mjs .env.production
~~~~
Le modèle d'exemple doit échouer à cette vérification : c'est intentionnel.
Cette vérification ne prouve ni l'existence des DNS ni l'accès Atlas/Brevo.

## 3. Brevo — préparation immédiate sans domaine ni VPS

1. Créer le compte via https://app.brevo.com/ ; vérifier la disponibilité de
   l'envoi transactionnel. Les emails de marketing sont hors périmètre.
2. Consulter la rubrique SMTP et API du compte. Le LOGIN SMTP est distinct
   de l'adresse d'expéditeur ; la CLE SMTP est distincte de la clé API.
3. Conserver les identifiants dans un gestionnaire sécurisé. Ne les copier ni
   dans Git, ni dans une conversation, ni dans une capture d'écran.
   La génération définitive de clé peut être différée jusqu'au déploiement.
4. Le modèle deployment/production.env.example préconfigure le serveur
   smtp-relay.brevo.com, port 465, SMTP_SECURE=true.
5. Lorsque le domaine fichepilot.fr sera acheté : demander à Brevo de
   l'authentifier. Publier exactement les enregistrements DNS qu'il fournit,
   notamment son code de vérification, DKIM et DMARC. Ne pas les inventer.
6. Adresse émettrice proposée : notifications@fichepilot.fr. Cette adresse
   n'existe pas nécessairement et n'est pas encore validée ; prévoir une
   adresse de réponse/service accessible.

Après provisionnement, le fichier deployment/smtp-verify.mjs teste la
connexion et l'authentification sans envoi. Une invitation réelle vers une
boîte maîtrisée vérifiera ensuite la réception et les en-têtes d'authentification.
Le script de vérification ne doit être lancé qu'avec des secrets réels et
depuis le réseau autorisé.

Documentation :
https://help.brevo.com/hc/fr/articles/7924908994450-Envoyer-des-emails-transactionnels-avec-Brevo-SMTP
https://help.brevo.com/hc/fr/articles/7959631848850-Cr%C3%A9er-et-g%C3%A9rer-vos-cl%C3%A9s-SMTP
https://help.brevo.com/hc/fr/articles/12163873383186-Authentifier-votre-domaine-dans-Brevo-code-Brevo-enregistrement-DKIM-enregistrement-DMARC

## 4. Installation APRÈS accord exprès d'achat

Préparer VPS Linux maintenu, compte SSH non-root, clés SSH, pare-feu (22
restreint, 80/443 publics, 5000 et MongoDB non publiés), Docker Engine
officiel et plugin Docker Compose. Ne pas exposer Docker API sur Internet.
Déployer un commit approuvé et figé sous /opt/fichepilot/app.

~~~~bash
cd /opt/fichepilot/app
cp deployment/production.env.example .env.production
chmod 600 .env.production
~~~~

Remplacer tous les placeholders par les secrets créés hors Git et contrôler
leurs droits. Les secrets JWT et TRIAL doivent être générés indépendamment.
Préparer les données persistantes pour l'utilisateur Node UID 1000.

~~~~bash
sudo install -d -m 0700 -o 1000 -g 1000 /var/lib/fichepilot/files /var/lib/fichepilot/tmp
node deployment/preflight.mjs .env.production
docker compose --env-file .env.production -f deployment/compose.yaml config --quiet
docker compose --env-file .env.production -f deployment/compose.yaml build
~~~~

Attention : docker compose config sans option quiet imprime des variables
sensibles ; ne pas partager sa sortie. Ne pas publier le mot de passe MongoDB.

Atlas Free déjà créé selon le propriétaire : mettre uniquement l'IP publique
du VPS dans Network Access (jamais 0.0.0.0/0), vérifier les droits effectifs,
l'URI du cluster et les transactions supportées. Aucune étape de cette section
ne doit être exécutée avant le GO d'achat, ni avec une base de développement.

## 5. Initialisation manuelle de la base bêta

AutoIndex est désactivé en production. Le manifeste canonique décrit les
migrations et leurs dépendances ; le script ci-dessous ne fait que les classer :
~~~~bash
node deployment/migration-plan.mjs
~~~~
L'ordre dépendances n'est pas l'ordre métier de la création d'une base vide.
Examiner chaque runner, déterminer s'il est applicable, vérifier la base et
les privilèges, puis exécuter explicitement les migrations nécessaires sur
une instance arrêtée ou sans trafic. Ne pas lancer les 36 runners en bloc.

Après validation de ces migrations, les seeds système sont à considérer :
~~~~bash
docker compose --env-file .env.production -f deployment/compose.yaml run --rm --no-deps api npm run seed:plans
docker compose --env-file .env.production -f deployment/compose.yaml run --rm --no-deps api npm run seed:platform-roles
~~~~
Le seed du SUPER_ADMIN nécessite ses quatre variables supplémentaires,
transmises temporairement dans un terminal sécurisé, et ne doit pas recevoir
un mot de passe stocké dans Git ou en argument de commande. L'ordre précis
des migrations/seeds métier doit être validé avant toute exécution.

## 6. Démarrage et recette

~~~~bash
docker compose --env-file .env.production -f deployment/compose.yaml up -d
docker compose --env-file .env.production -f deployment/compose.yaml ps
curl --fail --silent https://app.fichepilot.fr/api/health
~~~~

Le serveur Express se connecte à MongoDB avant son écoute. Cependant,
la route /api/health est une simple liveness : elle ne contrôle pas la
connexion MongoDB en continu. Pour la recette : vérifier login, refresh,
logout, cookies HttpOnly Secure SameSite=Lax Path=/api/auth ; protections
RBAC et tenancy, quotas, imports, ClamAV et fichiers, exports PDF/CSV,
navigation directe SPA, SMTP de bout en bout, accès Platform.

BLOCAGE : le Core actuel ne définit pas trust proxy. Les rate limiters
reposent sur req.ip. Derrière Caddy les IP réelles risquent d'être mal
attribuées et de bloquer les utilisateurs. Cette évolution est générique :
elle ne doit pas être corrigée directement dans le produit sans arbitrage
préalable Core normal vs exception GMS documentée.

## 7. Maintenance planifiée — non activée par défaut

Le script deployment/scripts/run-jobs.sh exécute sous verrou flock six jobs
existants, dont des purges définitives. Vérifier les politiques de rétention
et les sauvegardes AVANT de le planifier avec systemd timer ou cron. La
fréquence et les alertes restent à fixer. L'exécution suppose que le dépôt
est situé sous /opt/fichepilot/app et que Docker Compose est installé.

## 8. Sauvegardes indépendantes

Le script deployment/scripts/create-backup.sh doit s'exécuter sur le VPS.
Il nécessite mongodump, age, flock, tar et sha256sum ainsi que :
- /etc/fichepilot/mongodump.yml : YAML chmod 600 avec URI d'un utilisateur
  de backup distinct et doté des droits adaptés (à vérifier après GO).
- /etc/fichepilot/mongo-database.txt : nom exact de la base bêta.
- /etc/fichepilot/age-recipients.txt : clé PUBLIQUE age produite depuis le
  PC Windows ; conserver la clé PRIVÉE hors VPS, avec copie de secours.
- /var/backups/fichepilot/spool : répertoire groupe en lecture pour un
  compte SSH dédié à la collecte, sans accès Docker/aux secrets.
- /var/lib/fichepilot/files : stockage persistant applicatif.

Le script produit un dump MongoDB et une archive des fichiers, tous deux
chiffrés, avec un manifeste SHA256 dans un répertoire horodaté. Aucun
nettoyage automatique n'est prévu tant que la rétention n'est pas décidée.
Le spool du VPS doit être dimensionné et surveillé.

Pour récupérer les archives depuis un PC Windows disposant d'OpenSSH et
du disque externe monté, lancer depuis la racine du dépôt :

~~~~powershell
.\deployment\scripts\pull-backups.ps1 -Server "IP_VPS" -Login "lecteur_backups" -IdentityFile "C:\chemin\cle_ssh" -Destination "E:\FichePilot\Backups"
~~~~

Le script impose StrictHostKeyChecking et vérifie deux empreintes SHA256
avant de créer un marqueur .verified ; aucune entrée réseau n'est ouverte
sur le PC. La disponibilité du PC et du disque conditionne la fréquence
réelle de copie. Les exports Mongo et fichiers ne sont pas atomiques entre
eux : une restauration complète dans une base isolée est obligatoire
pour vérifier la cohérence fonctionnelle. RPO, RTO et rétention à décider.

Sources : https://www.mongodb.com/docs/database-tools/mongodump/
https://github.com/FiloSottile/age

## 9. NO-GO tant que ces preuves manquent

- Décision sur trust proxy dans le Core et tests anti-usurpation d'en-têtes.
- Conteneurs Docker, ClamAV, signatures et tests locaux exécutés.
- Versions/digests images fixés, limites CPU/RAM/ressources validées.
- Atlas vérifié, migrations/seeds contrôlés et exécutés avec preuves.
- Domaine acquis et DNS/HTTPS réels vérifiés après accord d'achat.
- Brevo actif, emails envoyés et reçus, authentification DNS vérifiée.
- Sauvegarde chiffrée transférée sur Windows et restauration prouvée.
- Rétention, planification, supervision et procédures d'incident validées.
- Core Gate et recette Auth/RBAC/tenancy/imports/exports réellement vertes.
- GO explicite du propriétaire pour l'ouverture de la bêta.

Rollback : conserver le commit précédent et les artefacts construits ; la
restauration du code ne restaure pas les données MongoDB. Les migrations
non réversibles exigent un plan de reprise individuel.
