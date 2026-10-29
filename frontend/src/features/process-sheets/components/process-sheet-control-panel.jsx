import { CheckCircle2, Eye, FileDown, GitCompareArrows, Save } from 'lucide-react';

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
  previewActive, compositionDisabled, compositionHelp,
  saveDisabled, saveHelp, validationDisabled, validationHelp,
  exportDisabled = true, exportHelp = 'Export PDF indisponible',
  onPreview, onReconcile, onSave, onValidate, onExport,
}) {
  return (
    <div
      aria-label="Actions de la Fiche process"
      className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/80 p-1 shadow-sm"
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
        Icon={FileDown}
        disabled={exportDisabled}
        onClick={onExport}
        label="Exporter"
        tooltip={exportHelp}
      />
      <ProcessControlAction
        Icon={CheckCircle2}
        disabled={validationDisabled}
        label="Valider la Fiche process"
        onClick={onValidate}
        tooltip={validationHelp}
      />
    </div>
  );
}

export { ProcessSheetControlPanel };
