# Installation et activation natives — FichePilot PRE-BETA-003

**Statut : préparation uniquement.** Ne pas exécuter sur un VPS avant GO d'achat,
qualification du Core durci et du bootstrap MongoDB, puis validation de ce
guide. Les commandes sont destinées à un VPS Ubuntu dédié ; elles ne sont pas
des commandes PowerShell. Pas de Docker, pas de copie de la base locale,
pas de seed ni migration dans les scripts de livraison.

## 1. Prérequis opérateur et système

- Accès SSH par clé, compte d'administration non root, sudo contrôlé. Vérifier
  une deuxième session avant de restreindre SSH ; ne pas activer un pare-feu
  à l'aveugle. Autoriser uniquement SSH (selon configuration réelle), 80 et 443
  en entrée ; 5000 ne doit pas être exposé. Contrôler depuis l'extérieur.
- Ubuntu 24.04 LTS retenu comme proposition d'OS ; paquets et versions réels à
  vérifier lors du provisionnement. Installer git, curl, ca-certificates,
  clamav, clamav-freshclam, Caddy depuis leurs distributions officielles.
  Node 24.7 ou ultérieur de la série 24, npm et Git doivent être disponibles
  aux chemins /usr/bin/node et /usr/bin/npm retenus par les scripts.
  Ne pas exécuter un script d'installation distant non vérifié ; documenter
  le dépôt et les versions effectivement installés.
- Le VPS est dédié à FichePilot. Arrêter Caddy durant l'activation rend
  temporairement **tout ce frontal** indisponible ; ne pas utiliser cette
  procédure sur un serveur qui héberge d'autres applications.
- Vérifier freshclam, la présence des signatures et les ressources disponibles
  (RAM/disque). Le démarrage vérifie un scan bénin ; la recette EICAR et les
  conditions d'échec sont distinctes.
- Le compte de compilation est le compte d'administration de confiance,
  non root et distinct du compte système fichepilot. Les scripts publiés
  nécessitent un dépôt local de confiance, un SHA exact approuvé et des
  dépendances verrouillées. Aucun secret de production dans ce dépôt.

## 2. Préparer l'arborescence (sans activer l'API)

Depuis une copie de confiance du commit approuvé et après revue des scripts :

    sudo bash deployment/native/bootstrap-layout.sh

Ce script ne corrige pas silencieusement des permissions existantes. Il refuse
les liens inattendus et les modes/propriétaires divergents. Ne jamais faire de
chown récursif des données pour résoudre un refus.

    /opt/fichepilot/
      releases/<SHA>/       # version immuable backend + frontend/dist
      current -> releases/<SHA>
      previous -> releases/<ancien SHA>
    /srv/fichepilot/
      current -> /opt/fichepilot/current/frontend/dist
    /etc/fichepilot/fichepilot.env
    /var/lib/fichepilot/{files,tmp}

Le pointeur public est fixe. Le seul pointeur actif qui change est
/opt/fichepilot/current. Les fichiers, la base et les secrets n'appartiennent
à aucune version. Le compte Caddy peut traverser jusqu'au dist, mais ne peut
pas lire les répertoires privés backend, node_modules, docs, scripts, deployment.

## 3. Préparer et publier un SHA précis

Après la gate et le GO d'installation, récupérer le commit approuvé avec Git
sur le VPS. Vérifier le SHA exact ; ne pas compiler automatiquement main/HEAD
ou le contenu non committé du poste de développement.

Depuis le dépôt, compte administrateur **non root** :

    mkdir -p "$HOME/fichepilot-staging"
    bash deployment/native/stage-release.sh <SHA_COMPLET> "$HOME/fichepilot-staging"

Remplacer <SHA_COMPLET> par les 40 caractères du commit approuvé. Le script
extrait git archive dans un nouveau dossier, vérifie les métadonnées, installe
les dépendances npm verrouillées sur Linux, compile Vite sans environnement
de production et produit un bundle minimal. Pas de node_modules Windows,
pas de .env réel ni données utilisateur. Les fichiers de staging sont conservés
pour contrôle ; aucune suppression automatique.

Examiner le bundle, son fichier release-commit.txt et la provenance Git.
En tant qu'administrateur, ne publier que le bundle de confiance produit
par cette opération, sans concurrence ni modification durant la copie :

    sudo bash deployment/native/publish-release.sh <SHA_COMPLET> /chemin/absolu/du/bundle

Le script copie dans un répertoire temporaire root, retire les droits
d'écriture non root, sépare les modes privés et publics, puis publie sans
écraser un SHA existant. Il ne lance ni npm ni le code du bundle en root.
Les échecs peuvent laisser un dossier .publish.* à examiner manuellement ;
ne pas le supprimer sans identifier son contenu et vérifier l'absence de
publication active. Le script de publication n'est pas un mécanisme de
vérification cryptographique d'un artefact tiers : la confiance du build et
l'approbation du SHA sont obligatoires.

## 4. Configurer les services (première installation seulement)

Créer le fichier de configuration depuis le modèle natif en mode 0600 root,
sans écraser un fichier existant. Par exemple, après contrôle de son absence :

    sudo test ! -e /etc/fichepilot/fichepilot.env && sudo test ! -L /etc/fichepilot/fichepilot.env && sudo install -o root -g root -m 0600 deployment/native/production.env.example /etc/fichepilot/fichepilot.env
    sudoedit /etc/fichepilot/fichepilot.env
    sudo /usr/bin/node deployment/native/preflight.mjs /etc/fichepilot/fichepilot.env

Ne pas utiliser la configuration locale, ne pas afficher le contenu du fichier
ni transmettre les secrets. Si le fichier existe, le conserver et le modifier
seulement après revue. Les secrets Atlas, JWT, trial et Brevo sont distincts
et saisis sur place. Le contrôle hors réseau n'atteste pas la connexion.
Vérifier les ACL réseau et les DNS auprès des fournisseurs, sans ouvrir Atlas
à toutes les IP. Le nom de base retenu pour le profil actuel est
fichepilot_beta, à confirmer avant création.

Une fois les configurations et le bootstrap Atlas approuvés, installer les
modèles revus. Sauvegarder d'abord toute configuration système existante
hors du répertoire de releases (ne pas écraser un service existant sans revue) :

    sudo install -o root -g root -m 0644 deployment/native/fichepilot.service /etc/systemd/system/fichepilot.service
    sudo install -o root -g root -m 0644 deployment/native/Caddyfile /etc/caddy/Caddyfile
    sudo install -o root -g root -m 0644 deployment/native/release-control.mjs /usr/local/lib/fichepilot/release-control.mjs
    sudo systemctl daemon-reload
    sudo systemd-analyze verify /etc/systemd/system/fichepilot.service
    sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

Le contrôleur d'activation root est installé hors du pointeur current, depuis
le commit revu. Ne pas exécuter de scripts modifiables par fichepilot en root.
Le Caddyfile utilise l'adresse prévue app.fichepilot.fr ; ACME et DNS restent
à vérifier. ACME_EMAIL dans le profil API est contrôlé mais n'est pas injecté
au service Caddy : configurer le contact ACME séparément dans Caddy, sans lui
transmettre le fichier de secrets de l'API. Le compte système est sans accès interactif et les scripts Node
de l'API tournent uniquement sous ce compte. Les services ne sont pas activés
au démarrage de l'OS avant la première recette réussie.

## 5. Activation contrôlée et rollback de code

**Interdit avant qualification des migrations, index et seeds et preuve de
compatibilité de la base.** Les scripts de livraison ne réalisent aucun
bootstrap DB. Pour une mise à jour ultérieure, établir le plan de migration,
la compatibilité arrière et la sauvegarde/restauration exigée avant
changement. En cas de migration non rétrocompatible, le rollback de code
seul est interdit.

Après validation explicite du SHA, de la configuration et de la base :

    sudo /usr/bin/node /usr/local/lib/fichepilot/release-control.mjs activate <SHA_COMPLET> --confirm-db-compatible

Le contrôleur valide les répertoires et métadonnées root, prend un verrou
exclusif, arrête Caddy puis l'API, conserve l'ancien SHA dans previous,
bascule current atomiquement, démarre l'API, attend /api/health/ready en
loopback, puis démarre Caddy. Il n'exécute aucune migration. Le changement
est cohérent mais implique une interruption de service ; pas de promesse de
zéro downtime. Si la readiness ou le démarrage échoue, il tente d'arrêter les
deux services, conserve les releases et demande une intervention explicite.
Le script ne restaure jamais automatiquement la base ni le code. Un arrêt
non confirmé est signalé comme incident ; vérifier systemd immédiatement.
Un crash peut laisser .activation-lock : vérifier qu'aucun opérateur ni
contrôleur n'est en cours avant de retirer ce verrou vide manuellement.

Après activation locale, vérifier :

    sudo systemctl is-active fichepilot caddy clamav-freshclam
    curl --fail --silent --show-error http://127.0.0.1:5000/api/health/ready
    curl --fail --silent --show-error https://app.fichepilot.fr/api/health/ready
    sudo ss -lnt
    sudo journalctl -u fichepilot -u caddy -n 100 --no-pager

Recette extérieure HTTPS : certificat valide, pas de port 5000 public, SPA,
authentification, cookies Secure, réinitialisation Brevo, parcours métier et
antivirus avec données fictives. Ne pas copier les journaux bruts en public.
Seulement après recette : décider d'activer les services au boot.
Un succès du script d'activation ne vaut pas réussite de cette recette.

Rollback de code : relever l'ancien SHA par readlink /opt/fichepilot/previous
et la sortie de l'activation précédente. Après revue de la compatibilité DB
(et sauvegarde/restauration si nécessaire), réactiver ce SHA explicite
avec la même commande et répéter la recette. Aucun rollback des données
n'est automatisé. Ne pas supprimer les releases pendant PRE-BETA-003.

## 6. Limites et critères pré-bêta

Les scripts sont préparés et testables hors VPS, mais la compilation Linux
réelle, la publication avec propriétaires root, Caddy, systemd, ClamAV et le
rollback complet exigent une recette sur une cible Linux. Les sauvegardes
indépendantes et les tâches destructives restent différées conformément à la
décision du propriétaire. Aucune ouverture réelle de bêta avant sauvegarde
et restauration éprouvées.

Références : [Node.js](https://nodejs.org/en/download),
[Caddy](https://caddyserver.com/docs/install),
[ClamAV](https://docs.clamav.net/manual/Installing.html),
[systemd](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html).
