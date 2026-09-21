function createLabelMap(items) {
  return new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.value && item?.label)
      .map((item) => [item.value, item.label]),
  );
}

function createDossierMetadataLabelMaps(metadata) {
  return {
    statuses: createLabelMap(metadata?.dossierStatuses),
    activities: createLabelMap(metadata?.businessActivityActions),
  };
}

function getDossierStatusLabel(status, metadata) {
  return createDossierMetadataLabelMaps(metadata).statuses.get(status) ?? status ?? 'Inconnu';
}

function getDossierStatusTone(status) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PAUSED') return 'warning';
  if (status === 'DELETED') return 'destructive';
  return 'neutral';
}

function formatDossierLocation(dossier) {
  const postalCity = [
    dossier?.location?.postalCode,
    dossier?.location?.city,
  ].filter(Boolean).join(' ');

  return [
    dossier?.location?.address,
    postalCity,
  ].filter(Boolean).join(', ') || 'Non renseignée';
}

function getBusinessActivityActorLabel(actor) {
  if (!actor) return 'Système';

  const name = [actor.firstName, actor.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || 'Utilisateur';
}

function formatBusinessActivityDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date inconnue';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function transitionNeedsReason(fromStatus, toStatus) {
  return (
    toStatus === 'DELETED'
    || (fromStatus === 'DELETED' && toStatus === 'PAUSED')
  );
}

export {
  createDossierMetadataLabelMaps,
  createLabelMap,
  formatBusinessActivityDate,
  formatDossierLocation,
  getBusinessActivityActorLabel,
  getDossierStatusLabel,
  getDossierStatusTone,
  transitionNeedsReason,
};
