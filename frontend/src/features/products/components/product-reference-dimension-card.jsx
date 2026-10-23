import { Archive, CheckCheck, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { TableRowActionsMenu } from '@/components/data-display/table-row-actions-menu';
import { StatusBadge } from '@/components/shared/status-badge';
import './product-reference-dimension-card.css';

/**
 * Carte compacte commune aux Variétés et Caractéristiques M-002.
 * La gouvernance provisoire prime sur la qualité ; aucune action de
 * validation n'est confondue avec l'état ACTIVE / ARCHIVED.
 */
function ProductReferenceDimensionCard({
  dimension,
  dimensionType,
  kindLabel = null,
  canManage,
  productActive,
  pending,
  reviewLoading,
  selected,
  onExamine,
  onApproveDirectly,
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
  const disabled = pending || reviewLoading;

  const actions = canManage && !selected ? [
    ...(isActive && provisional ? [
      {
        key: 'approve',
        Icon: CheckCheck,
        label: 'Valider directement',
        disabled,
        onClick: onApproveDirectly,
      },
      {
        key: 'examine',
        Icon: Eye,
        label: 'Examiner',
        disabled,
        onClick: onExamine,
      },
    ] : isActive && qualityPending ? [{
      key: 'quality',
      Icon: CheckCheck,
      label: 'Confirmer le contrôle qualité',
      disabled,
      onClick: onReviewQuality,
    }] : []),
    {
      key: 'edit',
      Icon: Pencil,
      label: 'Corriger',
      disabled,
      onClick: onEdit,
    },
    ...(isActive ? [{
      key: 'archive',
      Icon: Archive,
      label: 'Archiver',
      disabled,
      onClick: () => onStatus('ARCHIVED'),
    }] : productActive ? [{
      key: 'restore',
      Icon: RotateCcw,
      label: 'Réactiver',
      disabled,
      onClick: () => onStatus('ACTIVE'),
    }] : []),
    {
      key: 'delete',
      Icon: Trash2,
      label: 'Supprimer',
      destructive: true,
      disabled,
      onClick: onDelete,
    },
  ] : [];

  return (
    <li
      className={
        'rounded-lg border px-3 py-2 '
        + (selected ? 'border-warning/50 bg-warning/5' : 'border-border')
      }
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words text-sm font-semibold">
            {dimension.name}
          </span>
          {kindLabel && (
            <span className="text-xs text-muted-foreground">{kindLabel}</span>
          )}
          {!isActive ? (
            <StatusBadge className="py-0.5" tone="neutral">Archivée</StatusBadge>
          ) : (
            <StatusBadge
              className="py-0.5"
              tone={provisional || qualityPending ? 'warning' : 'success'}
            >
              {provisional
                ? 'Identité à valider'
                : qualityPending
                  ? 'Qualité à vérifier'
                  : 'Validée'}
            </StatusBadge>
          )}
        </div>
        {actions.length > 0 && (
          <TableRowActionsMenu actions={actions} label={subject} />
        )}
      </div>

      {selected && children && (
        <div className="mt-3 border-t border-border pt-3">{children}</div>
      )}
    </li>
  );
}

export { ProductReferenceDimensionCard };
