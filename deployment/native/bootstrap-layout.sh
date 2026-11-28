#!/usr/bin/env bash
# Create only the native layout; no package installation, DNS, secrets or service start.
set -euo pipefail
if [[ "$(id -u)" != 0 || "$(uname -s)" != Linux || $# != 0 ]]; then
    echo 'Exécution réservée à root sur Linux, sans argument.' >&2; exit 1
fi
if ! getent group fichepilot >/dev/null; then groupadd --system fichepilot; fi
if ! id fichepilot >/dev/null 2>&1; then
    useradd --system --gid fichepilot --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin fichepilot
fi
[[ "$(id -u fichepilot)" != 0 && "$(id -gn fichepilot)" == fichepilot && "$(id -G fichepilot)" == "$(id -g fichepilot)" ]]
# Refuse existing symlinks, and never recursively change existing data ownership.
make_dir() {
    local mode="$1" owner="$2" group="$3" dir="$4"
    [[ ! -L "$dir" ]]
    if [[ -e "$dir" ]]; then
        [[ -d "$dir" && "$(realpath "$dir")" == "$dir" && "$(stat -c '%U:%G:%a' "$dir")" == "$owner:$group:$mode" ]]
    else
        install -d -m "$mode" -o "$owner" -g "$group" "$dir"
    fi
}
make_dir 711 root root /opt/fichepilot
make_dir 711 root root /opt/fichepilot/releases
make_dir 755 root root /srv/fichepilot
make_dir 700 root root /etc/fichepilot
make_dir 711 root root /var/lib/fichepilot
make_dir 700 fichepilot fichepilot /var/lib/fichepilot/files
make_dir 700 fichepilot fichepilot /var/lib/fichepilot/tmp
make_dir 755 root root /usr/local/lib/fichepilot
web=/srv/fichepilot/current
if [[ -L "$web" ]]; then
    [[ "$(readlink "$web")" == /opt/fichepilot/current/frontend/dist ]]
elif [[ ! -e "$web" ]]; then
    ln -s /opt/fichepilot/current/frontend/dist "$web"
else
    echo 'Pointeur frontend existant non conforme.' >&2; exit 1
fi
echo 'Structure native préparée ; aucun service démarré.'
