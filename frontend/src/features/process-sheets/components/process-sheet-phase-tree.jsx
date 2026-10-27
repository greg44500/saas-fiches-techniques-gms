import { ChevronRight, Plus, Trash2 } from 'lucide-react';

import { ProcessPhasePicker } from '@/features/process-sheets/components/process-phase-picker';

import { Button } from '@/components/ui/button';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';

// The tree owns no business data: it only selects and expands draft items.
function ProcessSheetPhaseTree({
  phases, activePhaseId, activeStepId, expandedPhaseIds, disabled,
  workspaceId, dossierId, canReadPhaseLibrary,
  onTogglePhase, onSelectPhase, onSelectStep, onAddPhase, onAddStep, onRequestDeleteStep,
}) {
  return (
    <nav aria-label="Navigation des phases et étapes" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Phases et étapes</h3>
        {!disabled && (
          <ProcessPhasePicker
            canReadLibrary={canReadPhaseLibrary}
            disabled={phases.length >= 40}
            dossierId={dossierId}
            onSelect={onAddPhase}
            workspaceId={workspaceId}
          />
        )}
      </div>
      {phases.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">
          Aucune phase. Ajoutez une phase pour commencer.
        </p>
      ) : (
        <ul className="space-y-1">
          {phases.map((phase, i) => {
            const hasSteps = phase.steps.length > 0;
            const expanded = hasSteps && expandedPhaseIds.includes(phase.id);
            const selected = activePhaseId === phase.id && activeStepId == null;
            return (
              <li key={phase.id}>
                <Collapsible
                  onOpenChange={(open) => onTogglePhase(phase.id, open)}
                  open={expanded}
                >
                  <div className="group flex min-w-0 items-center gap-1">
                    {hasSteps ? (
                      <CollapsibleTrigger
                        aria-label={(expanded ? 'Replier' : 'Déplier') + ' phase ' + (i + 1)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight
                          aria-hidden="true"
                          className={'size-4 transition-transform duration-200 motion-reduce:transition-none '
                            + (expanded ? 'rotate-90' : '')}
                        />
                      </CollapsibleTrigger>
                    ) : <span aria-hidden="true" className="size-8 shrink-0" />}
                    <button
                      aria-label={'Sélectionner phase ' + (i + 1) + ' : ' + (phase.title || 'Phase sans titre')}
                      aria-pressed={selected}
                      className={'min-w-0 flex-1 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none '
                        + (selected ? 'bg-muted font-semibold text-foreground' : 'hover:bg-muted/60')}
                      onClick={() => onSelectPhase(phase.id)}
                      type="button"
                    >
                      <span className="mr-2 text-xs tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="break-words">{phase.title || 'Phase sans titre'}</span>
                    </button>
                    {!disabled && (
                      <Button
                        aria-label={'Ajouter une étape à la phase ' + (i + 1)}
                        className="size-8"
                        disabled={(phase.steps ?? []).length >= 40}
                        onClick={() => onAddStep(i)}
                        size="icon" type="button" variant="ghost"
                      >
                        <Plus aria-hidden="true" className="size-4" />
                      </Button>
                    )}
                  </div>
                  {hasSteps && <CollapsibleContent className="process-sheet-tree-panel">
                    <ul aria-label={'Étapes de la phase ' + (i + 1)}
                      className="ml-5 space-y-0.5 border-l border-border/60 py-1 pl-3">
                      {(phase.steps ?? []).map((step, j) => {
                        const stepSelected = activePhaseId === phase.id && activeStepId === step.id;
                        return (
                          <li key={step.id} className="group flex items-center gap-1">
                            <button
                              aria-label={'Sélectionner étape ' + (j + 1) + ' : ' + (step.title || 'Étape sans titre')}
                              aria-pressed={stepSelected}
                              className={'min-w-0 flex-1 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none '
                                + (stepSelected ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
                              onClick={() => onSelectStep(phase.id, step.id)}
                              type="button"
                            >
                              <span className="mr-2 text-xs tabular-nums">
                                {i + 1}.{j + 1}
                              </span>
                              <span className="break-words">{step.title || 'Étape sans titre'}</span>
                            </button>
                            {!disabled && (
                              <Button
                                aria-label={'Supprimer étape ' + (j + 1) + ' : ' + (step.title || 'Étape sans titre')}
                                className="size-8 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                                onClick={() => onRequestDeleteStep(phase.id, step.id)}
                                size="icon" type="button" variant="ghost"
                              >
                                <Trash2 aria-hidden="true" className="size-4" />
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>}
                </Collapsible>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

export { ProcessSheetPhaseTree };
