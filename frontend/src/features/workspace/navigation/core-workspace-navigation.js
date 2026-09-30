import {
  CreditCard,
  Files,
  History,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

/**
 * Navigation générique du Core Workspace.
 *
 * Dans un SaaS dérivé, le moteur de composition place les modules applicatifs
 * avant cette liste puis ajoute le séparateur "Administration de l’espace".
 */
const coreWorkspaceNavigation = Object.freeze([
  Object.freeze({
    id: 'dashboard',
    type: 'item',
    label: 'Tableau de bord',
    Icon: LayoutDashboard,
    path: 'dashboard',
  }),
  Object.freeze({
    id: 'files',
    type: 'item',
    label: 'Fichiers',
    Icon: Files,
    permission: WORKSPACE_PERMISSION.FILE_READ,
    path: 'files',
  }),
  Object.freeze({
    id: 'members',
    type: 'item',
    label: 'Membres',
    Icon: Users,
    permission: WORKSPACE_PERMISSION.MEMBER_READ,
    feature: WORKSPACE_FEATURE.TEAM_MANAGEMENT,
    path: 'members',
  }),
  Object.freeze({
    id: 'roles',
    type: 'item',
    label: 'Rôles et permissions',
    Icon: ShieldCheck,
    permission: WORKSPACE_PERMISSION.ROLE_READ,
    feature: WORKSPACE_FEATURE.TEAM_MANAGEMENT,
    path: 'roles',
  }),
  Object.freeze({
    id: 'settings',
    type: 'item',
    label: 'Paramètres',
    Icon: Settings,
    permission: WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
    path: 'settings',
  }),
  Object.freeze({
    id: 'subscription',
    type: 'item',
    label: 'Abonnement',
    Icon: CreditCard,
    permission: WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
    path: 'subscription',
  }),
  Object.freeze({
    id: 'activity',
    type: 'item',
    label: 'Activité',
    Icon: History,
    permission: WORKSPACE_PERMISSION.AUDIT_READ,
    feature: WORKSPACE_FEATURE.AUDIT_LOGS,
    path: 'activity',
  }),
]);

export { coreWorkspaceNavigation };
