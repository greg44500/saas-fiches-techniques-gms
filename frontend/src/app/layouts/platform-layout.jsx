import { Outlet } from 'react-router';

import { DashboardDisplayPreviewProvider } from '@/components/shared/dashboard-display-preview-context';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { HelpCenterLink } from '@/features/help/components/help-center-link';
import { PlatformDashboardDisplayPreferences } from '@/features/platform/components/platform-dashboard-display-preferences';
import { PlatformQuickAccess } from '@/features/platform/components/platform-quick-access';
import { PlatformSidebar } from '@/features/platform/components/platform-sidebar';
import { PlatformUserIdentity } from '@/features/platform/components/platform-user-identity';

function PlatformLayout() {
  return (
    <DashboardDisplayPreviewProvider>
      <SidebarProvider>
        <PlatformSidebar />

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger
                  className="md:hidden"
                  scope=" d’administration"
                />
                <p className="truncate font-semibold">Console d’administration globale</p>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <PlatformQuickAccess />
                <PlatformUserIdentity
                  actions={(
                    <>
                      <HelpCenterLink to="/platform/help" />
                      <PlatformDashboardDisplayPreferences triggerVariant="icon" />
                    </>
                  )}
                />
              </div>
            </div>
          </header>

          <main className="relative z-0 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </DashboardDisplayPreviewProvider>
  );
}

export { PlatformLayout };
