import { InfoTooltip } from '@/components/shared/info-tooltip';
import { cn } from '@/lib/utils';

function getEconomicMetricDefinition(definitions, metricKey) {
  return (definitions ?? []).find(
    (definition) => definition.value === metricKey,
  ) ?? null;
}

function TechnicalSheetEconomicMetricLabel({
  className,
  definitions,
  displayLabel,
  fallbackLabel,
  metricKey,
}) {
  const definition = getEconomicMetricDefinition(
    definitions,
    metricKey,
  );
  const label = displayLabel
    ?? definition?.label
    ?? fallbackLabel
    ?? metricKey;

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{label}</span>
      <InfoTooltip
        className="size-5"
        content={definition?.description}
        label={'Définition : ' + label}
      />
    </span>
  );
}

export {
  getEconomicMetricDefinition,
  TechnicalSheetEconomicMetricLabel,
};
