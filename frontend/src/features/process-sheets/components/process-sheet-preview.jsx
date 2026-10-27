import { ingredientName } from '@/features/process-sheets/components/process-sheet-editor-fields';

// A read-only chronological view of the local draft. It is deliberately
// independent of browser printing: PDF layout/exports are a separate lot.
function IngredientSummary({ ingredients, keys, label }) {
  const selected = ingredients.filter((line) => (keys ?? []).includes(line.lineKey));
  if (selected.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {selected.map((line) => (
          <span className="rounded border border-border bg-muted/30 px-2 py-1 text-xs" key={line.lineKey}>
            {ingredientName(line)}
          </span>
        ))}
      </div>
    </div>
  );
}
function DetailsSummary({ step }) {
  const duration = [
    ['activeMinutes', 'Actif'],
    ['restMinutes', 'Attente / repos'],
    ['treatmentMinutes', 'Cuisson / traitement'],
  ].filter(([key]) => step.duration?.[key] != null);
  const controls = [
    ['Points de vigilance', step.manufacturingVigilance ?? []],
    ['Qualité', step.qualityControls ?? []],
    ['Maîtrise sanitaire', step.sanitaryControls ?? []],
  ];
  return (
    <div className="space-y-2 text-xs">
      {(duration.length > 0 || step.temperatureCelsius != null) && (
        <p className="text-muted-foreground">
          {[
            ...duration.map(([key, label]) => label + ' : ' + step.duration[key] + ' min'),
            ...(step.temperatureCelsius == null ? [] : ['Température : ' + step.temperatureCelsius + ' °C']),
          ].join(' · ')}
        </p>
      )}
      {step.equipment?.length > 0 && (
        <p><span className="font-medium">Équipements : </span>{step.equipment.join(', ')}</p>
      )}
      {controls.map(([label, items]) => items.length > 0 && (
        <div className="space-y-1" key={label}>
          <p className="font-medium">{label}</p>
          <ul className="list-inside list-disc space-y-1">
            {items.map((item, index) => (
              <li key={index}>
                {typeof item === 'string' ? item : [
                  item.instruction, item.expectedCriterion && 'Critère : ' + item.expectedCriterion,
                  item.correctiveAction && 'Correction : ' + item.correctiveAction,
                ].filter(Boolean).join(' · ')}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
function ProcessSheetPreview({ phases, ingredients, description = 'Aperçu de lecture du brouillon local. Ce mode n’enregistre ni ne valide le document.' }) {
  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune phase à afficher.</p>;
  }
  return (
    <section className="space-y-4" aria-label="Aperçu du process">
      <p className="text-xs text-muted-foreground">
        {description}
      </p>
      <ol className="space-y-4">
        {phases.map((phase, i) => {
          const phaseKeys = [...new Set([
            ...(phase.ingredientLineKeys ?? []),
            ...(phase.steps ?? []).flatMap((step) => step.ingredientLineKeys ?? []),
          ])];
          return (
            <li className="rounded-lg border border-border p-4" key={phase.id}>
              <h3 className="text-base font-semibold">{i + 1}. {phase.title || 'Phase sans titre'}</h3>
              {phase.instructions && <p className="mt-2 whitespace-pre-wrap text-sm">{phase.instructions}</p>}
              <div className="mt-3">
                <IngredientSummary ingredients={ingredients} keys={phaseKeys}
                  label="Ingrédients de la phase (directs et étapes)" />
              </div>
              {phase.steps?.length > 0 && (
                <ol className="mt-3 space-y-3 border-t border-border pt-3">
                  {phase.steps.map((step, j) => (
                    <li className="space-y-2" key={step.id}>
                      <h4 className="text-sm font-semibold">{i + 1}.{j + 1} {step.title || 'Étape sans titre'}</h4>
                      {step.instructions && <p className="whitespace-pre-wrap text-sm">{step.instructions}</p>}
                      <IngredientSummary ingredients={ingredients} keys={step.ingredientLineKeys}
                        label="Ingrédients de l’étape" />
                      <DetailsSummary step={step} />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export { ProcessSheetPreview };
