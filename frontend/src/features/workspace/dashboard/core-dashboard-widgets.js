import {
  MembersDashboardWidget,
  PendingInvitationsDashboardWidget,
  RecentActivityDashboardWidget,
} from '@/features/workspace/components/core-dashboard-widgets';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const coreDashboardWidgets = Object.freeze([
  Object.freeze({
    id: 'core.members',
    label: 'Membres',
    description: 'Nombre de membres visibles dans le workspace.',
    component: MembersDashboardWidget,
    slot: 'summary',
    order: 300,
    configurable: true,
    access: Object.freeze({
      features: Object.freeze([WORKSPACE_FEATURE.TEAM_MANAGEMENT]),
      permissions: Object.freeze([WORKSPACE_PERMISSION.MEMBER_READ]),
    }),
  }),
  Object.freeze({
    id: 'core.pending-invitations',
    label: 'Invitations en attente',
    description: 'Invitations workspace encore en attente de réponse.',
    component: PendingInvitationsDashboardWidget,
    slot: 'summary',
    order: 400,
    configurable: true,
    access: Object.freeze({
      features: Object.freeze([WORKSPACE_FEATURE.TEAM_MANAGEMENT]),
      permissions: Object.freeze([WORKSPACE_PERMISSION.MEMBER_INVITE]),
    }),
  }),
  Object.freeze({
    id: 'core.recent-activity',
    label: 'Activité récente',
    description: 'Dernières actions auditables du workspace.',
    component: RecentActivityDashboardWidget,
    slot: 'content',
    order: 600,
    configurable: true,
    access: Object.freeze({
      features: Object.freeze([WORKSPACE_FEATURE.AUDIT_LOGS]),
      permissions: Object.freeze([WORKSPACE_PERMISSION.AUDIT_READ]),
    }),
  }),
]);

export { coreDashboardWidgets };
