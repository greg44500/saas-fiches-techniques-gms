import {
  AuthenticatedUserIdentity,
  getUserDisplayName,
} from '@/features/auth/components/authenticated-user-identity';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function getWorkspaceIdentitySecondaryText({ planName, roleName }) {
  const context = [
    roleName?.trim() || null,
    planName?.trim() ? `Plan ${planName.trim()}` : null,
  ].filter(Boolean);

  return context.length > 0 ? context.join(' · ') : undefined;
}

function getWorkspaceMenuContextItems({ planName, roleName }) {
  return [
    roleName?.trim()
      ? { label: 'Rôle dans cet espace', value: roleName.trim() }
      : null,
    planName?.trim()
      ? { label: 'Plan', value: planName.trim() }
      : null,
  ].filter(Boolean);
}

function WorkspaceUserIdentity({ actions = null, planName }) {
  const { membership } = useWorkspaceContext();
  const roleName = membership?.role?.name ?? null;

  return (
    <AuthenticatedUserIdentity
      actions={actions}
      menuContextItems={getWorkspaceMenuContextItems({ planName, roleName })}
      secondaryText={getWorkspaceIdentitySecondaryText({ planName, roleName })}
    />
  );
}

export {
  WorkspaceUserIdentity,
  getUserDisplayName,
  getWorkspaceIdentitySecondaryText,
  getWorkspaceMenuContextItems,
};
