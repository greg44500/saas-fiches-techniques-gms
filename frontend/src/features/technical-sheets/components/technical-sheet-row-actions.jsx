import { Eye, Pencil, Trash2, WandSparkles } from 'lucide-react';

import { TableRowActionsMenu } from '@/components/data-display/table-row-actions-menu';

function TechnicalSheetRowActions({
  sheet,
  canModify,
  canOptimize,
  canDelete,
  hasValidatedState,
  isDeleting,
  isOptimizing,
  isStartingDraft,
  onPreview,
  onOptimize,
  onModify,
  onDelete,
}) {
  const actions = [
    ...(canModify ? [{
      key: 'modify',
      Icon: Pencil,
      label: 'Modifier',
      disabled: isStartingDraft,
      onClick: onModify,
    }] : []),
    ...(hasValidatedState ? [{
      key: 'preview',
      Icon: Eye,
      label: 'Prévisualiser',
      onClick: onPreview,
    }] : []),
    ...(canOptimize ? [{
      key: 'optimize',
      Icon: WandSparkles,
      label: 'Optimiser',
      disabled: isOptimizing,
      onClick: onOptimize,
    }] : []),
    ...(canDelete ? [{
      key: 'delete',
      Icon: Trash2,
      label: 'Supprimer',
      destructive: true,
      disabled: isDeleting,
      onClick: onDelete,
    }] : []),
  ];

  return (
    <TableRowActionsMenu
      actions={actions}
      label={sheet.name}
    />
  );
}

export { TechnicalSheetRowActions };
