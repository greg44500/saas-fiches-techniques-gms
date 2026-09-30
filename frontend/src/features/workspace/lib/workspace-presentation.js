const WORKSPACE_STATUS_LABEL = Object.freeze({
  active: 'Actif',
  suspended: 'Suspendu',
  archived: 'Archivé',
  closed: 'Clôturé',
});

const WORKSPACE_STATUS_TONE = Object.freeze({
  active: 'success',
  suspended: 'warning',
  archived: 'neutral',
  closed: 'destructive',
});

function formatWorkspaceStatus(status) {
  return WORKSPACE_STATUS_LABEL[status] ?? status ?? 'Non renseigné';
}

function formatDashboardCount(value) {
  if (!Number.isFinite(value) || value < 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(value);
}

export {
  WORKSPACE_STATUS_LABEL,
  WORKSPACE_STATUS_TONE,
  formatDashboardCount,
  formatWorkspaceStatus,
};
