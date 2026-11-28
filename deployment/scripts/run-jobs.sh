#!/usr/bin/env bash
# À activer seulement après validation des sauvegardes et policies de rétention.
set -euo pipefail
cd /opt/fichepilot/app

if [[ ! -f .env.production ]]; then
    echo "Configuration de production absente." >&2
    exit 1
fi

exec 9>/run/lock/fichepilot-maintenance.lock
if ! flock -n 9; then
    echo "Un passage de maintenance est déjà en cours." >&2
    exit 1
fi

for job in \
    backend/jobs/subscriptions/runExpireTrialsJob.js \
    backend/jobs/subscriptions/runFinalizeScheduledCancellationsJob.js \
    backend/jobs/subscriptions/runApplyScheduledDowngradesJob.js \
    backend/jobs/files/runPurgeDeletedFilesJob.js \
    backend/jobs/technicalSheets/runPurgeDeletedTechnicalSheetsJob.js \
    backend/jobs/retention/runScheduledRetentionPoliciesJob.js; do
    echo "Exécution du job : $job"
    docker compose --env-file .env.production -f deployment/compose.yaml \
        run --rm --no-deps api node "$job"
done

echo "Maintenance terminée."
