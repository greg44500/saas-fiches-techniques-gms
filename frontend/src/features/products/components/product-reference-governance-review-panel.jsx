import { Pencil } from 'lucide-react';

import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';

function ProductReferenceGovernanceReviewPanel({
  context,
  onApprove,
  onEdit,
  onMerge,
  onReject,
  pending = false,
}) {
  if (!context) return null;

  const candidates = context.candidates ?? [];
  const hasCandidates = candidates.length > 0;

  return (
    <section className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warning">
          {hasCandidates
            ? 'Rapprochement à vérifier'
            : 'À contrôler'}
        </StatusBadge>
        <p className="text-sm text-muted-foreground">
          Vérifiez cette donnée avant sa publication globale.
        </p>
      </div>

      {hasCandidates && (
        <div>
          <p className="text-sm font-medium">
            Rapprochement(s) possible(s)
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {candidates.slice(0, 3).map((candidate) => (
              <li key={candidate.id}>{candidate.name}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onEdit && (
          <Button
            disabled={pending}
            onClick={onEdit}
            type="button"
            variant="outline"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Modifier
          </Button>
        )}

        <Button
          disabled={pending}
          onClick={onApprove}
          type="button"
        >
          Valider
        </Button>

        {onMerge && candidates.slice(0, 3).map((candidate) => (
          <Button
            disabled={pending}
            key={candidate.id}
            onClick={() => onMerge(candidate)}
            type="button"
            variant="outline"
          >
            Fusionner avec {candidate.name}
          </Button>
        ))}

        {onReject && (
          <Button
            disabled={pending}
            onClick={onReject}
            type="button"
            variant="outline"
          >
            Refuser
          </Button>
        )}
      </div>
    </section>
  );
}

export { ProductReferenceGovernanceReviewPanel };
