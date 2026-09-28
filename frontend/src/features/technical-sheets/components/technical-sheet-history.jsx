import { DataTable } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  formatBasisPoints,
  formatDecimalCurrency,
  formatMinorCurrency,
} from '@/features/technical-sheets/lib/technical-sheet-presentation';

const CHANGE_KIND_LABELS = Object.freeze({
  IDENTITY: 'Identité',
  COMPOSITION: 'Composition',
  SOURCING: 'Approvisionnement',
  ECONOMICS: 'Économie',
});

function TechnicalSheetHistory({ validations }) {
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
              {CHANGE_KIND_LABELS[kind] ?? kind}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      id: 'cost',
      header: 'Coût de fabrication HT',
      cell: (validation) => formatDecimalCurrency(
        validation.economicSnapshot?.manufacturingCostHt?.$numberDecimal
        ?? validation.economicSnapshot?.manufacturingCostHt,
      ),
    },
    {
      id: 'price',
      header: 'Prix final TTC',
      cell: (validation) => formatMinorCurrency(
        validation.economicSnapshot?.finalPriceTtcMinor,
      ),
    },
    {
      id: 'margin',
      header: 'Marge réelle',
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
      emptyContent="Aucun état validé."
      getRowKey={(validation) => validation.id}
    />
  );
}

export { TechnicalSheetHistory };
