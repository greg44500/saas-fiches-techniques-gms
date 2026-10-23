import { Archive, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { TableRowActionsMenu } from '@/components/data-display/table-row-actions-menu';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';

/**
 * Carte commune aux Variétés et Caractéristiques M-002.
 * La gouvernance provisoire prime sur la revue qualité dans le statut visible.
 */
function ProductReferenceDimensionCard({
  dimension,
  dimensionType,
  kindLabel = null,
  statusLabel,
  canManage,
  productActive,
  pending,
  reviewLoading,
  selected,
  onExamine,
  onReviewQuality,
  onEdit,
  onStatus,
  onDelete,
  children,
}) {
  const isActive = dimension.status === 'ACTIVE';
  const provisional = dimension.governanceStatus === 'PROVISIONAL';
  const qualityPending = dimension.qualityReviewStatus === 'PENDING';
  const noun = dimensionType === 'VARIETY' ? 'variété' : 'caractéristique';
  const subject = 'la ' + noun + ' ' + dimension.name;

  const actions = canManage && !selected ? [
    {
      key: 'edit',
      Icon: Pencil,
      label: 'Corriger',
      disabled: pending,
      onClick: onEdit,
    },
    ...(isActive ? [{
      key: 'archive',
      Icon: Archive,
      label: 'Archiver',
      disabled: pending,
      onClick: () => onStatus('ARCHIVED'),
    }] : productActive ? [{
      key: 'restore',
      Icon: RotateCcw,
      label: 'Réactiver',
      disabled: pending,
      onClick: () => onStatus('ACTIVE'),
    }] : []),
    {
      key: 'delete',
      Icon: Trash2,
      label: 'Supprimer',
      destructive: true,
      disabled: pending,
      onClick: onDelete,
    },
  ] : [];

  return (
    <li className={
      'rounded-lg border px-3 py-3 '
      + (selected ? 'border-warning/50 bg-warning/5' : 'border-border')
    }>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="break-words font-medium">{dimension.name}</p>
            {kindLabel && (
              <p className="text-xs text-muted-foreground">{kindLabel}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
            {isActive && (
              <StatusBadge tone={provisional || qualityPending ? 'warning' : 'success'}>
                {provisional
                  ? 'Identité à valider'
                  : qualityPending
                    ? 'Qualité à vérifier'
                    : 'Validée'}
              </StatusBadge>
            )}
          </div>
        </div>

        {canManage && !selected && (
          <div className="flex shrink-0 items-center gap-2 sm:justify-end">
            {isActive && provisional && (
              <Button
                aria-label={'Examiner l’identité de ' + subject}
                className="h-8 border-warning/60 bg-warning/10 px-3 text-xs font-semibold text-warning hover:border-warning hover:bg-warning/20 hover:text-warning"
                disabled={pending || reviewLoading}
                onClick={onExamine}
                size="sm"
                type="button"
                variant="outline"
              >
                Examiner
              </Button>
            )}
            {isActive && !provisional && qualityPending && (
              <Button
                aria-label={'Confirmer le contrôle qualité de ' + subject}
                disabled={pending}
                onClick={onReviewQuality}
                size="sm"
                type="button"
                variant="outline"
              >
                Confirmer la qualité
              </Button>
            )}
            <TableRowActionsMenu actions={actions} label={subject} />
          </div>
        )}
      </div>

      {selected && children && (
        <div className="mt-3 border-t border-border pt-3">{children}</div>
      )}
    </li>
  );
}

export { ProductReferenceDimensionCard };
