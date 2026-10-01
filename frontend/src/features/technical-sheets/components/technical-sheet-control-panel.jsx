import {
  Archive,
  CheckCircle2,
  Copy,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';

function TechnicalSheetControlPanel({
  actionAvailability,
  canCopy,
  canDelete,
  canLifecycle,
  canValidate,
  copyDisabled,
  draft,
  draftDirty,
  draftSynchronizing,
  identityDirty,
  onArchive,
  onCopy,
  onDelete,
  onReactivate,
  onValidate,
  pendingLifecycle,
  validatePending,
}) {
  const validationDisabled = (
    !canValidate
    || !draft
    || validatePending
    || draftSynchronizing
    || draftDirty
    || identityDirty
    || draft?.valuationStatus !== 'COMPLETE'
  );

  const validationTooltip = !canValidate
    ? 'Validation indisponible avec votre rôle ou le statut actuel'
    : !draft
      ? 'Aucun brouillon à valider'
      : identityDirty
        ? 'Enregistrer les informations avant validation'
        : draftDirty
          ? 'Enregistrement du brouillon requis avant validation'
          : draft.valuationStatus === 'COMPLETE'
          ? 'Valider la Fiche technique'
          : 'Calcul économique complet requis avant validation';

  return (
    <div
      aria-label="Panneau de contrôle"
      className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/80 p-1 shadow-sm"
      role="group"
    >
      <span className="hidden px-2 text-xs font-medium text-muted-foreground 2xl:inline">
        Panneau de contrôle
      </span>

      {canCopy && (
        <ActionIconButton
          Icon={Copy}
          disabled={copyDisabled}
          label="Copier vers un autre Dossier"
          onClick={onCopy}
          tooltipLabel={
            copyDisabled
              ? 'Copie indisponible tant qu’un brouillon est ouvert'
              : 'Copier vers un autre Dossier'
          }
          variant="ghost"
        />
      )}

      {canLifecycle && (
        <ActionIconButton
          Icon={Archive}
          disabled={!actionAvailability.archive || pendingLifecycle}
          label="Archiver la Fiche"
          onClick={onArchive}
          tooltipLabel="Archiver"
          variant="ghost"
        />
      )}

      {canLifecycle && (
        <ActionIconButton
          Icon={RotateCcw}
          disabled={!actionAvailability.reactivate || pendingLifecycle}
          label="Réactiver la Fiche"
          onClick={onReactivate}
          tooltipLabel="Réactiver"
          variant="ghost"
        />
      )}

      {canDelete && (
        <ActionIconButton
          Icon={Trash2}
          disabled={!actionAvailability.delete || pendingLifecycle}
          label="Mettre la Fiche dans la Corbeille"
          onClick={onDelete}
          tooltipLabel="Mettre dans la Corbeille"
          variant="ghost"
        />
      )}

      <ActionIconButton
        Icon={CheckCircle2}
        disabled={validationDisabled}
        label="Valider la Fiche technique"
        onClick={onValidate}
        tooltipLabel={validationTooltip}
        variant="ghost"
      />
    </div>
  );
}

export { TechnicalSheetControlPanel };
