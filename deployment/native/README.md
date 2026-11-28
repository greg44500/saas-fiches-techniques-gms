# FichePilot — installation Linux native (PRE-BETA-003)

Statut : **modèles préparés, non exécutés sur Linux, non déployables avant intégration et validation du Core durci**. Aucun achat, secret ou connexion externe. Ce dossier est la nouvelle cible ; les fichiers Docker précédents sont historiques.

Le 2026-11-28, les 4 tests structurels natifs ont été déclarés réussis localement par le propriétaire. Le Core en branche ajoute une readiness MongoDB et un arrêt SIGINT/SIGTERM borné à 25 s ; ces changements ne sont pas encore intégrés ni testés dans FichePilot. Le délai systemd de 30 s est conservé. La vérification effective sur Linux reste indispensable.

## Contrat d'architecture

- Un seul VPS Linux (Ubuntu 24.04 LTS proposé), Caddy sur 80/443, API Node 24 sur 127.0.0.1:5000 uniquement.
- Caddy reçoit le trafic public et réécrit X-Forwarded-For/Host/Proto. Le Core doit activer HTTP_TRUST_PROXY=loopback avec HTTP_BIND_HOST=127.0.0.1. Pas de confiance globale ni accès public au port 5000.
- Caddy sert uniquement le build statique depuis /srv/fichepilot/current, jamais le dépôt backend ni ses secrets.
- Code runtime /opt/fichepilot/current, compte système non privilégié fichepilot, fichiers et temporaires persistants dans /var/lib/fichepilot/{files,tmp}. Les signatures ClamAV sont gérées par le service freshclam, distinct de l'API ; la lecture et les tests antivirus restent à qualifier.
- /etc/fichepilot/fichepilot.env est détenu par root, mode 0600, lu par systemd. Aucun secret dans Caddy, Git, build Vite ou logs. Installer le runtime Node 24 à /usr/bin/node ou ajuster explicitement l'unité avant validation.
- La base Atlas et le relais Brevo restent externes. Autoriser seulement l'IP publique du VPS ; ne pas copier la base locale. Domaine et expéditeur doivent être authentifiés avant SMTP distant.

## Vérifications avant service

Les fichiers Caddyfile, fichepilot.service et production.env.example sont des modèles. Ne pas les installer tels quels sur un VPS avant revue. Le profil actuel nécessite le futur Core ; le préflight historique ne valide pas encore la totalité des contraintes natives.

À compléter dans le même lot : procédure Linux idempotente, contrôle des versions, permissions et propriétaires, publication cohérente des releases et rollback couplé frontend/backend, tests Caddy (y compris en-têtes falsifiés), systemd-analyze verify, port interne, ClamAV/freshclam, readiness et arrêt propre, qualification d'une base vierge et des migrations/index/seeds. Les sauvegardes indépendantes et purges restent non activées avant la première recette technique fictive ; sauvegarde et restauration exigées avant la bêta réelle.

Références : https://expressjs.com/en/guide/behind-proxies/ ; https://caddyserver.com/docs/caddyfile/directives/reverse_proxy.


## Contrôles natifs avant démarrage

Le préflight natif réutilise les protections du préflight historique et impose
le port 5000, l'écoute 127.0.0.1, le proxy loopback, la base proposée
fichepilot_beta, les options Atlas autorisées et les bornes de configuration.
Le nom exact est une décision de préparation à confirmer avant création de la
base ; tout changement devra modifier explicitement le contrat et les tests.
Le contrôle hors réseau ne prouve ni l'authentification Atlas/Brevo ni le DNS.

Sur Linux, l'unité exécute d'abord le préflight sur les variables réellement
injectées par systemd, puis le contrôle hôte sous le compte fichepilot.
Les deux répertoires persistants doivent être de vrais répertoires (pas de
symlink), détenus par fichepilot:fichepilot et en mode 0700. Le répertoire
parent est à créer par root et doit rester non modifiable par l'API.
Chaque sonde crée un répertoire de contrôle unique, écrit/lit un fichier
fictif puis supprime uniquement ses propres éléments. Aucun fichier utilisateur
n'est ouvert, déplacé ou effacé. Le contrôle de ClamAV exige /usr/bin/clamscan
et un scan réel du fichier bénin, avec la durée limite du profil et une
base de signatures de moins de deux jours selon l'option ClamAV. Ce seuil
est proposé pour la mise en service, à confirmer en exploitation. Un refus
bloque le démarrage ; les signatures sont entretenues par clamav-freshclam.
La fraîcheur pendant que le service tourne devra être surveillée séparément.
Un scan bénin réussi ne prouve pas la détection : recette EICAR contrôlée à
effectuer avant trafic, ainsi que le cas antivirus indisponible.

Ubuntu : prévoir clamav et clamav-freshclam, attendre une mise à jour réussie
et contrôler systemctl status clamav-freshclam (sans lancer deux freshclam
concurrents). Ne jamais désactiver l'antivirus pour passer une recette.
La préparation des comptes/répertoires et les vérifications de permissions
root, Caddy et systemd seront intégrées à la procédure d'installation.
Le fichier EnvironmentFile est un premier choix compatible avec le Core
actuel ; accès root uniquement, processus dédié, pas de journalisation des
variables. Une migration vers LoadCredential requerrait un contrat Core
distinct ; l'environnement du processus reste accessible aux acteurs
privilégiés. Ne jamais afficher systemctl show ... Environment.

Tests hors réseau Windows : node --test deployment/native/packaging.test.mjs
deployment/native/preflight.test.mjs deployment/native/host-check.test.mjs
(la sonde de fichiers POSIX est ignorée sous Windows). Sur Linux elle doit
également passer. Le contrôle hôte réel n'est pas lancé par ces tests.
Sources : https://manpages.ubuntu.com/manpages/noble/man1/clamscan.1.html ;
https://docs.clamav.net/manual/Usage/Scanning.html ;
https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html.

Core : réduction des journaux de maintenance des temporaires aux compteurs et codes système autorisés, sans chemins, noms de fichiers ni erreurs brutes. Tests associés non exécutés ; HEAD de la branche Core `33f142166537183746ec60b2e92e497d496ff2ad`, version intégrée inchangée.

