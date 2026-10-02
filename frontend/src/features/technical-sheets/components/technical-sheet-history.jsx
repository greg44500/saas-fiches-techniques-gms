import { DataTable } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

function changeKindLabel(definitions, value) {
  return (definitions ?? [])
    .find((definition) => definition.value === value)
    ?.label ?? value;
}

function decimalValue(value) {
  return value?.$numberDecimal ?? value ?? null;
}

function TechnicalSheetHistory({
  changeKindDefinitions = [],
  validations,
}) {
  const columns = [
    {
      id: 'date',
      header: 'Validation',
      cell: (validation) => (
        <div>
          <p className="font-medium">
            {new Date(validation.validatedAt).toLocaleString('fr-FR')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {validation.comment || 'Sans commentaire'}
          </p>
        </div>
      ),
    },
    {
      id: 'changes',
      header: 'Évolutions',
      cell: (validation) => (
        <div className="flex flex-wrap gap-1">
          {(validation.changeKinds ?? []).map((kind) => (
            <StatusBadge key={kind} tone="neutral">
              {changeKindLabel(changeKindDefinitions, kind)}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      id: 'cost',
      header: 'CF HT',
      cell: (validation) => formatDecimalCurrency(
        decimalValue(
          validation.economicSnapshot?.manufacturingCostHt,
        ),
      ),
    },
    {
      id: 'price',
      header: 'Prix retenu TTC',
      cell: (validation) => formatMinorCurrency(
        validation.economicSnapshot?.finalPriceTtcMinor,
      ),
    },
    {
      id: 'margin',
      header: '%MR',
      cell: (validation) => formatBasisPoints(
        validation.economicSnapshot?.actualMarginBasisPoints,
      ),
    },
  ];

  return (
    <DataTable
      aria-label="Historique validé de la Fiche technique"
      columns={columns}
      data={validations}
      density="compact"
      emptyContent="Aucun état validé."
      getRowKey={(validation) => validation.id}
    />
  );
}

export { TechnicalSheetHistory };
