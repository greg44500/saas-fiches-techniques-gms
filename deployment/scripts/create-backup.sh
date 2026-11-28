#!/usr/bin/env bash
# Archive MongoDB + fichiers chiffrés pour collecte Windows hors VPS.
set -euo pipefail
umask 027

backup_root=/var/backups/fichepilot/spool
mongo_config=/etc/fichepilot/mongodump.yml
database_file=/etc/fichepilot/mongo-database.txt
age_recipients=/etc/fichepilot/age-recipients.txt
files_root=/var/lib/fichepilot/files

for program in mongodump age tar sha256sum flock; do
    command -v "$program" >/dev/null || {
        echo "Prérequis de sauvegarde manquant : $program" >&2
        exit 1
    }
done

for file in "$mongo_config" "$database_file" "$age_recipients"; do
    if [[ ! -s "$file" ]]; then
        echo "Configuration de sauvegarde manquante." >&2
        exit 1
    fi
done

database=$(cat "$database_file")
if [[ ! "$database" =~ ^[a-zA-Z0-9_-]+$ ]] \
    || [[ "$database" =~ (^|[_-])(dev|test|e2e)($|[_-]) ]]; then
    echo "Nom de base de sauvegarde refusé." >&2
    exit 1
fi
if [[ ! -d "$files_root" || ! -d "$backup_root" ]]; then
    echo "Répertoires de stockage non préparés." >&2
    exit 1
fi

exec 9>/run/lock/fichepilot-backup.lock
if ! flock -n 9; then
    echo "Une sauvegarde est déjà en cours." >&2
    exit 1
fi

stamp=$(date -u +%Y%m%dT%H%M%SZ)
stage=$(mktemp -d "$backup_root/.partial-$stamp-XXXXXX")
trap 'rm -rf -- "$stage"' EXIT

# --config empêche d'exposer le mot de passe MongoDB dans les arguments ps.
mongodump --config="$mongo_config" --db="$database" --archive --gzip \
    | age -R "$age_recipients" -o "$stage/mongo.archive.gz.age"

tar -C "$files_root" -czf - . \
    | age -R "$age_recipients" -o "$stage/files.tar.gz.age"

(
    cd "$stage"
    sha256sum mongo.archive.gz.age files.tar.gz.age > SHA256SUMS
)
chmod 0640 "$stage"/*
chmod 0750 "$stage"
mv -- "$stage" "$backup_root/$stamp"
echo "Sauvegarde chiffrée prête dans le spool : $stamp"
