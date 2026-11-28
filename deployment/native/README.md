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
