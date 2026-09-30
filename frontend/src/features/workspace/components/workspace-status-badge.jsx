import { StatusBadge } from '@/components/shared/status-badge';
import {
  WORKSPACE_STATUS_TONE,
  formatWorkspaceStatus,
} from '@/features/workspace/lib/workspace-presentation';

function WorkspaceStatusBadge({ className, status }) {
  return (
    <StatusBadge
      className={className}
      tone={WORKSPACE_STATUS_TONE[status] ?? 'neutral'}
    >
      {formatWorkspaceStatus(status)}
    </StatusBadge>
  );
}

export { WorkspaceStatusBadge };
