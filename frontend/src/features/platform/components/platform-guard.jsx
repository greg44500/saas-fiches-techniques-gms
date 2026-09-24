import { Navigate, Outlet, useLocation } from 'react-router';

import {
  APPLICATION_PLATFORM_NAVIGATION,
} from '@/app/application-platform-navigation';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PlatformShellSkeleton } from '@/features/platform/components/platform-loading-skeletons';
import {
  canAccessPlatformPath,
  getFirstPlatformDestination,
  hasActivePlatformAccess,
} from '@/features/platform/lib/platform-navigation';

function PlatformGuard() {
  const location = useLocation();
  const {
    data: platformAccess,
    error,
    isLoading,
    isFetching,
  } = useGetCurrentPlatformContextQuery();

  if (isLoading || (isFetching && platformAccess === undefined)) {
    return <PlatformShellSkeleton />;
  }

  if (error || !hasActivePlatformAccess(platformAccess)) {
    return <Navigate to="/workspaces" replace />;
  }

  if (!canAccessPlatformPath(
    location.pathname,
    platformAccess,
    APPLICATION_PLATFORM_NAVIGATION,
  )) {
    return (
      <Navigate
        replace
        to={
          getFirstPlatformDestination(
            platformAccess,
            APPLICATION_PLATFORM_NAVIGATION,
          ) ?? '/workspaces'
        }
      />
    );
  }

  return <Outlet />;
}

export {
  PlatformGuard,
  canAccessPlatformPath,
  getFirstPlatformDestination,
  hasActivePlatformAccess,
};
