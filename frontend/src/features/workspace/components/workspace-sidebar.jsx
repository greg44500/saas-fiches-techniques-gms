import { useLocation } from 'react-router';

import { APPLICATION_IDENTITY } from '@/app/application-identity';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import {
  filterWorkspaceNavigation,
  getActiveNavigationGroupId,
  isNavigationItemActive,
} from '@/features/workspace/lib/workspace-navigation';

function WorkspaceSidebar({ navigation = [], workspace }) {
  const location = useLocation();
  const { can, hasFeature } = useWorkspaceContext();
  const visibleNavigation = filterWorkspaceNavigation(navigation, { can, hasFeature });
  const getHref = (item) => `/workspaces/${workspace.id}/${item.path}`;
  const isItemActive = (item) => isNavigationItemActive({
    item,
    pathname: location.pathname,
    workspaceId: workspace.id,
  });

  return (
    <AppSidebar
      eyebrow={APPLICATION_IDENTITY.shortName}
      getHref={getHref}
      getIcon={(entry) => entry.Icon}
      isItemActive={isItemActive}
      navigation={visibleNavigation}
      navigationLabel="Navigation du workspace"
      pathname={location.pathname}
      title={APPLICATION_IDENTITY.name}
    />
  );
}

export {
  WorkspaceSidebar,
  filterWorkspaceNavigation,
  getActiveNavigationGroupId,
  isNavigationItemActive,
};
