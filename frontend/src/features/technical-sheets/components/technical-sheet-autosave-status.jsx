import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  TECHNICAL_SHEET_AUTOSAVE_STATUS,
} from '@/features/technical-sheets/hooks/use-technical-sheet-draft-autosave';

function TechnicalSheetAutosaveStatus({
  blockedReason,
  onRetry,
  status,
}) {
  const saving = (
    status === TECHNICAL_SHEET_AUTOSAVE_STATUS.PENDING
    || status === TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVING
  );

  if (status === TECHNICAL_SHEET_AUTOSAVE_STATUS.ERROR) {
    return (
      <div
        aria-label="État d’enregistrement du brouillon"
        className="flex items-center gap-2 text-xs text-destructive"
        role="status"
      >
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        <span>Non enregistré — erreur</span>
        <Button
          className="h-7 px-2 text-xs"
          onClick={onRetry}
          size="sm"
          type="button"
          variant="outline"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  if (status === TECHNICAL_SHEET_AUTOSAVE_STATUS.BLOCKED) {
    return (
      <div
        aria-label="État d’enregistrement du brouillon"
        className="flex items-center gap-2 text-xs text-destructive"
        role="status"
        title={blockedReason ?? undefined}
      >
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        <span>Non enregistré — à compléter</span>
      </div>
    );
  }

  return (
    <div
      aria-label="État d’enregistrement du brouillon"
      className={
        'flex items-center gap-2 text-xs '
        + (saving ? 'text-warning' : 'text-success')
      }
      role="status"
    >
      {saving ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 shrink-0 animate-spin"
        />
      ) : (
        <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
      )}
      <span>{saving ? 'Enregistrement…' : 'Enregistré'}</span>
    </div>
  );
}

export { TechnicalSheetAutosaveStatus };
