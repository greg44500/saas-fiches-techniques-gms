#!/usr/bin/env bash
# Build from an explicitly approved immutable commit, never as root.
set -euo pipefail
umask 077
if [[ "$(id -u)" == 0 || "$(uname -s)" != Linux ]]; then
    echo 'Compilation réservée à un compte Linux non privilégié.' >&2; exit 1
fi
if [[ $# != 2 || ! "$1" =~ ^[a-f0-9]{40}$ || "$2" != /* || ! -d "$2" ]]; then
    echo 'Usage : stage-release.sh SHA /chemin/absolu/staging-existant' >&2; exit 1
fi
sha="$1"
git_root="$(git rev-parse --show-toplevel)"
[[ "$(git -C "$git_root" rev-parse --verify "$sha^{commit}")" == "$sha" ]]
/usr/bin/node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major!==24||minor<7)process.exit(1)'
# No production secrets are inherited by dependency installation or Vite.
clean_npm() { env -i PATH=/usr/bin:/bin HOME="$HOME" /usr/bin/npm "$@"; }
stage="$(mktemp -d "$2/fichepilot-stage.XXXXXXXX")"
echo "Répertoire de travail : $stage"
mkdir "$stage/source" "$stage/bundle"
git -C "$git_root" archive "$sha" | tar -xf - -C "$stage/source"
cd "$stage/source"
# Reject tracked environment files other than non-executable example templates.
if find . \( -name '.env' -o -name '.env.*' \) ! -name '.env.example' -print -quit | grep -q .; then
    echo 'Fichier environnement interdit dans le commit.' >&2; exit 1
fi
clean_npm run release:verify
clean_npm ci --omit=dev
clean_npm --prefix frontend ci --include=dev
clean_npm --prefix frontend run build
test -s frontend/dist/index.html
# Preserve canonical operational docs and scripts, not frontend sources or dev dependencies.
cp -a backend deployment docs scripts node_modules package.json package-lock.json \
    core-origin.json core-release.json product-release.json CHANGELOG.md "$stage/bundle/"
mkdir "$stage/bundle/frontend"
cp -a frontend/dist frontend/package.json frontend/package-lock.json "$stage/bundle/frontend/"
printf '%s\n' "$sha" > "$stage/bundle/release-commit.txt"
echo "Bundle prêt à examiner (non publié) : $stage/bundle"
