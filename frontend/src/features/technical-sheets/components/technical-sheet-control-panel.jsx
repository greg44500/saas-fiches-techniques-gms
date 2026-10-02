import {
  Archive,
  BarChart3,
  Building2,
  CheckCircle2,
  Copy,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';
import { Button } from '@/components/ui/button';

function TechnicalSheetControlPanel({
  actionAvailability,
  canCopy,
  canDelete,
  canEditIdentity,
  canLifecycle,
  canValidate,
  copyDisabled,
  draft,
  draftDirty,
  validationEligible = false,
  draftSynchronizing,
  identityDirty,
  onArchive,
  onCopy,
  onDelete,
  onEditIdentity,
  onOpenAnalysis,
  onOpenDossier,
  onReactivate,
  onValidate,
  pendingLifecycle,
  rightPanel,
  validatePending,
}) {
  const validationDisabled = (
    !canValidate
    || !draft
    || validatePending
    || draftSynchronizing
    || draftDirty
    || identityDirty
    || !validationEligible
  );

  const validationTooltip = !canValidate
    ? 'Validation indisponible avec votre rôle ou le statut actuel'
    : !draft
      ? 'Aucun brouillon à valider'
      : identityDirty
        ? 'Enregistrer les informations avant validation'
        : draftDirty
          ? 'Enregistrement du brouillon requis avant validation'
          : validationEligible
            ? 'Valider la Fiche technique'
            : 'Calcul économique complet requis avant validation';

  return (
    <div
      aria-label="Panneau de contrôle"
      className={
        'flex shrink-0 items-center gap-1 rounded-lg border '
        + 'border-border bg-card/80 p-1 shadow-sm'
      }
      role="group"
    >
      <Button
        disabled={!canEditIdentity}
        onClick={onEditIdentity}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Pencil aria-hidden="true" className="size-4" />
        Modifier
      </Button>

      <Button
        onClick={onOpenAnalysis}
        size="sm"
        type="button"
        variant={rightPanel === 'analysis' ? 'secondary' : 'ghost'}
      >
        <BarChart3 aria-hidden="true" className="size-4" />
        Analyse
      </Button>

      <Button
        onClick={onOpenDossier}
        size="sm"
        type="button"
        variant={rightPanel === 'dossier' ? 'secondary' : 'ghost'}
      >
        <Building2 aria-hidden="true" className="size-4" />
        Infos dossier
      </Button>

      <span
        aria-hidden="true"
        className="mx-1 h-6 w-px shrink-0 bg-border"
      />

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
