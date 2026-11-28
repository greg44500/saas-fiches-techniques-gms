#!/usr/bin/env bash
# Root publication only; the input must come from the trusted administrator's build.
# Never execute npm, Node application code or scripts from the bundle as root.
set -euo pipefail
umask 077
if [[ "$(id -u)" != 0 || "$(uname -s)" != Linux || $# != 2 || ! "$1" =~ ^[a-f0-9]{40}$ || "$2" != /* ]]; then
    echo 'Usage root Linux : publish-release.sh SHA /chemin/bundle' >&2; exit 1
fi
sha="$1"
source_dir="$2"
root=/opt/fichepilot/releases
[[ -d "$source_dir" && ! -L "$source_dir" && -d "$root" && ! -L "$root" ]]
[[ "$(realpath "$root")" == "$root" && "$(stat -c %u "$root")" == 0 ]]
[[ "$(cat "$source_dir/release-commit.txt")" == "$sha" ]]
target="$root/$sha"
[[ ! -e "$target" && ! -L "$target" ]] || { echo 'Version déjà publiée.' >&2; exit 1; }
# Copy only the curated artifact to a fresh root-owned directory on the same filesystem.
temporary="$(mktemp -d "$root/.publish.XXXXXXXX")"
echo "Publication temporaire : $temporary"
for entry in backend deployment docs scripts node_modules package.json package-lock.json core-origin.json core-release.json product-release.json CHANGELOG.md frontend release-commit.txt; do
    [[ -e "$source_dir/$entry" && ! -L "$source_dir/$entry" ]]
    cp -a -- "$source_dir/$entry" "$temporary/"
done
# No symlinks in publicly served files or application source.
if find "$temporary/backend" "$temporary/deployment" "$temporary/frontend" -type l -print -quit | grep -q .; then
    echo 'Lien symbolique inattendu dans les fichiers publiés.' >&2; exit 1
fi
if find "$temporary" -name '.env' -o -name '.env.production' -o -name '.env.local' | grep -q .; then
    echo 'Fichier environnement interdit dans la publication.' >&2; exit 1
fi
test -s "$temporary/backend/server.js"
test -s "$temporary/frontend/dist/index.html"
chown -hR root:fichepilot "$temporary"
chmod -R go-w "$temporary"
# Runtime account can read code; Caddy can traverse to the public dist only.
chmod 0711 "$temporary" "$temporary/frontend"
chmod 0750 "$temporary/backend" "$temporary/deployment" "$temporary/docs" "$temporary/scripts" "$temporary/node_modules"
chmod 0640 "$temporary/"*.json "$temporary/CHANGELOG.md" "$temporary/release-commit.txt" "$temporary/frontend/"*.json
find "$temporary/frontend/dist" -type d -exec chmod 0755 {} +
find "$temporary/frontend/dist" -type f -exec chmod 0644 {} +
# The build operator is trusted; publication must not overlap another root publisher.
mv -T --no-clobber -- "$temporary" "$target"
[[ ! -e "$temporary" ]] || { echo 'Publication concurrente refusée.' >&2; exit 1; }
echo "Version publiée, non active : $sha"
