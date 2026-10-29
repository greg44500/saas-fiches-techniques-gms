import { useState } from 'react';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ProcessIconAction } from '@/features/process-sheets/components/process-icon-action';
import { ProcessPhasePicker } from '@/features/process-sheets/components/process-phase-picker';

// The tree owns only transient inline editing state. The parent owns the draft.
function ProcessSheetPhaseTree({
  phases, activePhaseId, activeStepId, expandedPhaseIds, disabled,
  workspaceId, canReadPhaseLibrary,
  onTogglePhase, onSelectPhase, onSelectStep, onAddPhase, onAddStep,
  onRenamePhase, onRequestDeletePhase, onRequestDeleteStep,
}) {
  const [editingPhaseId, setEditingPhaseId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const beginRename = (phase) => {
    setEditingTitle(phase.title);
    setEditingPhaseId(phase.id);
  };
  const commitRename = (phase) => {
    const title = editingTitle.trim().replace(/\s+/g, ' ');
    if (title && title !== phase.title) onRenamePhase(phase.id, title);
    setEditingPhaseId(null);
  };

  return (
    <nav aria-label="Navigation des phases et étapes" className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Phases et étapes</h3>
        {!disabled && (
          <ProcessPhasePicker
            canReadLibrary={canReadPhaseLibrary}
            disabled={phases.length >= 40}
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
            const editing = editingPhaseId === phase.id;
            return (
              <li key={phase.id}>
                <Collapsible
                  onOpenChange={(open) => onTogglePhase(phase.id, open)}
                  open={expanded}
                >
                  <div className="group/phase flex min-w-0 items-center gap-0.5">
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
                    {editing ? (
                      <Input
                        aria-label={'Renommer phase ' + (i + 1)}
                        autoFocus
                        className="h-9 min-w-0 flex-1 focus-visible:border-ring focus-visible:ring-0 focus-visible:ring-offset-0"
                        maxLength={160}
                        onBlur={() => commitRename(phase)}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setEditingPhaseId(null);
                          }
                        }}
                        value={editingTitle}
                      />
                    ) : (
                      <button
                        aria-label={'Sélectionner phase ' + (i + 1) + ' : ' + (phase.title || 'Phase sans titre')}
                        aria-pressed={selected}
                        title={phase.title || 'Phase sans titre'}
                        className={'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none '
                          + (selected ? 'bg-muted font-semibold text-foreground' : 'hover:bg-muted/60')}
                        onClick={() => onSelectPhase(phase.id)}
                        type="button"
                      >
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{phase.title || 'Phase sans titre'}</span>
                      </button>
                    )}
                    {!disabled && !editing && (
                      <>
                        <ProcessIconAction
                          className="xl:opacity-0 xl:group-hover/phase:opacity-100 xl:group-focus-within/phase:opacity-100"
                          icon={Pencil}
                          label={'Renommer phase ' + (i + 1)}
                          onClick={() => beginRename(phase)}
                        />
                        <ProcessIconAction
                          className="xl:opacity-0 xl:group-hover/phase:opacity-100 xl:group-focus-within/phase:opacity-100"
                          icon={Trash2}
                          label={'Supprimer phase ' + (i + 1)}
                          onClick={() => onRequestDeletePhase(phase.id)}
                        />
                        <ProcessIconAction
                          disabled={phase.steps.length >= 40}
                          icon={Plus}
                          label={'Ajouter une étape à la phase ' + (i + 1)}
                          tooltip="Ajouter une étape"
                          onClick={() => onAddStep(i)}
                        />
                      </>
                    )}
                  </div>
                  {hasSteps && (
                    <CollapsibleContent className="process-sheet-tree-panel">
                      <ul
                        aria-label={'Étapes de la phase ' + (i + 1)}
                        className="ml-5 space-y-0.5 border-l border-border/60 py-1 pl-3"
                      >
                        {phase.steps.map((step, j) => {
                          const stepSelected = activePhaseId === phase.id && activeStepId === step.id;
                          return (
                            <li key={step.id} className="group/step flex items-center gap-1">
                              <button
                                aria-label={'Sélectionner étape ' + (j + 1) + ' : ' + (step.title || 'Étape sans titre')}
                                aria-pressed={stepSelected}
                                title={step.title || 'Étape sans titre'}
                                className={'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors duration-150 motion-reduce:transition-none '
                                  + (stepSelected ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
                                onClick={() => onSelectStep(phase.id, step.id)}
                                type="button"
                              >
                                <span className="shrink-0 text-xs tabular-nums">
                                  {i + 1}.{j + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{step.title || 'Étape sans titre'}</span>
                              </button>
                              {!disabled && (
                                <ProcessIconAction
                                  className="xl:opacity-0 xl:group-hover/step:opacity-100 xl:group-focus-within/step:opacity-100"
                                  icon={Trash2}
                                  label={'Supprimer étape ' + (j + 1) + ' : ' + (step.title || 'Étape sans titre')}
                                  onClick={() => onRequestDeleteStep(phase.id, step.id)}
                                />
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </CollapsibleContent>
                  )}
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
