import { HelpCenterLink } from '@/features/help/components/help-center-link';
import { useGetWorkspaceSubscriptionQuery } from '@/features/subscription/api/subscription-api';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WorkspaceDashboardDisplayPreferences } from '@/features/workspace/components/workspace-dashboard-display-preferences';
import { WorkspaceStatusBadge } from '@/features/workspace/components/workspace-status-badge';
import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher';
import { WorkspaceUserIdentity } from '@/features/workspace/components/workspace-user-identity';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

function WorkspaceTopbar({ sidebarTrigger = null, workspace }) {
  const { can } = useWorkspaceContext();
  const canReadSubscription = can(WORKSPACE_PERMISSION.SUBSCRIPTION_READ);
  const { data: subscription } = useGetWorkspaceSubscriptionQuery(workspace.id, {
    skip: !canReadSubscription,
  });
  const planName = subscription?.effectiveEntitlement?.plan?.name ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-[var(--workspace-topbar-height)] items-center gap-4 px-4 sm:px-6">
        {sidebarTrigger}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher currentWorkspace={workspace} />
          </div>
          <WorkspaceStatusBadge
            className="shrink-0"
            status={workspace.status}
          />
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <WorkspaceUserIdentity
            actions={(
              <>
                <HelpCenterLink to={`/workspaces/${workspace.id}/help`} />
                <WorkspaceDashboardDisplayPreferences triggerVariant="icon" />
              </>
            )}
            planName={planName}
          />
        </div>
      </div>
    </header>
  );
}

export { WorkspaceTopbar };
