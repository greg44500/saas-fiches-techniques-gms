// A read-only chronological view of the local draft. It is deliberately
// independent of browser printing: PDF layout/exports are a separate lot.
function IngredientSummary({ ingredients, keys }) {
  const selected = ingredients.filter((line) => (keys ?? []).includes(line.lineKey));
  if (!selected.length) return null;

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
      {selected.map((line) => (
        <li key={line.lineKey}>
          {line.productVariantName ?? 'Référence indisponible'}
        </li>
      ))}
    </ul>
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
function ProcessSheetPreview({ phases, ingredients }) {
  if (phases.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune phase à afficher.</p>;
  }
  return (
    <section aria-label="Aperçu du process">
      <ol className="divide-y divide-border/50">
        {phases.map((phase, i) => (
          <li className="space-y-2 py-4 first:pt-0 last:pb-0" key={phase.id}>
            <h3 className="text-base font-semibold">{i + 1}. {phase.title || 'Phase sans titre'}</h3>
            {phase.instructions && <p className="whitespace-pre-wrap text-sm">{phase.instructions}</p>}
            <IngredientSummary ingredients={ingredients} keys={phase.ingredientLineKeys} />
            {phase.steps?.length > 0 && (
              <ol className="ml-4 space-y-4 pt-2">
                {phase.steps.map((step, j) => (
                  <li className="space-y-2" key={step.id}>
                    <h4 className="text-sm font-semibold">{i + 1}.{j + 1} {step.title || 'Étape sans titre'}</h4>
                    {step.instructions && <p className="whitespace-pre-wrap text-sm">{step.instructions}</p>}
                    <IngredientSummary ingredients={ingredients} keys={step.ingredientLineKeys} />
                    <DetailsSummary step={step} />
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export { ProcessSheetPreview };
