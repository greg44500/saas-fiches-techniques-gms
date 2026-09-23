import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';

const WORKSPACE_ROUTE_FEATURE_REQUIREMENTS = Object.freeze({
  activity: WORKSPACE_FEATURE.AUDIT_LOGS,
  members: WORKSPACE_FEATURE.TEAM_MANAGEMENT,
  roles: WORKSPACE_FEATURE.TEAM_MANAGEMENT,
});

/**
 * Retourne la feature commerciale requise par une route tenant.
 *
 * Ce mapping sert uniquement à garder l'interface cohérente lorsqu'un
 * entitlement change pendant la navigation. Le backend reste l'autorité et
 * protège indépendamment chaque endpoint.
 */
function getWorkspaceRouteRequiredFeature({ pathname, workspaceId }) {
  if (!pathname || !workspaceId) return null;

  const prefix = `/workspaces/${workspaceId}/`;
  if (!pathname.startsWith(prefix)) return null;

  const section = pathname.slice(prefix.length).split('/')[0];
  return WORKSPACE_ROUTE_FEATURE_REQUIREMENTS[section] ?? null;
}

export {
  getWorkspaceRouteRequiredFeature,
  WORKSPACE_ROUTE_FEATURE_REQUIREMENTS,
};
