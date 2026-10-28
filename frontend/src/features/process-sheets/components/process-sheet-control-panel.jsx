import { CheckCircle2, Eye, GitCompareArrows, Save } from 'lucide-react';

import { ActionIconButton } from '@/components/shared/action-icon-button';

// Keep disabled actions focusable so the shared tooltip can explain why an
// operation is unavailable. aria-disabled is paired with an explicit click
// guard; no disabled action can invoke a business mutation.
function ProcessControlAction({
  Icon, disabled = false, label, onClick, tooltip, variant = 'ghost',
}) {
  return (
    <ActionIconButton
      Icon={Icon}
      aria-disabled={disabled ? 'true' : undefined}
      className={disabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : undefined}
      label={label}
      onClick={disabled ? undefined : onClick}
      tooltipLabel={tooltip}
      variant={variant}
    />
  );
}

function ProcessSheetControlPanel({
  editorialState, saveStatus, saveStatusTone = 'text-success',
  previewActive, compositionDisabled, compositionHelp,
  saveDisabled, saveHelp, validationDisabled, validationHelp,
  onPreview, onReconcile, onSave, onValidate,
}) {
  return (
    <div
      className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card/80 p-1 shadow-sm"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-sm">
        <span aria-label="État de la Fiche process" className="font-medium">
          {editorialState === 'VALIDATED' ? 'Validée' : 'Brouillon'}
        </span>
        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
        <span className={'flex items-center gap-1.5 text-xs font-medium ' + saveStatusTone}
          role="status">
          {saveStatus === 'Enregistré' && <CheckCircle2 aria-hidden="true" className="size-4" />}
          {saveStatus}
        </span>
      </div>

      <div
        aria-label="Actions de la Fiche process"
        className="flex shrink-0 items-center gap-1"
        role="group"
      >
        <ProcessControlAction
          Icon={Eye}
          label={previewActive ? 'Revenir à l’édition' : 'Aperçu du process'}
          onClick={onPreview}
          tooltip={previewActive ? 'Revenir' : 'Aperçu'}
          variant={previewActive ? 'secondary' : 'ghost'}
        />
        <ProcessControlAction
          Icon={GitCompareArrows}
          disabled={compositionDisabled}
          label="Actualiser la composition"
          onClick={onReconcile}
          tooltip={compositionHelp}
        />
        <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
        <ProcessControlAction
          Icon={Save}
          disabled={saveDisabled}
          label="Enregistrer le brouillon"
          onClick={onSave}
          tooltip={saveHelp}
        />
        <ProcessControlAction
          Icon={CheckCircle2}
          disabled={validationDisabled}
          label="Valider la Fiche process"
          onClick={onValidate}
          tooltip={validationHelp}
        />
      </div>
    </div>
  );
}

export { ProcessSheetControlPanel };
