import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';

import '../../backend/config/applicationRolePermission.registry.js';

import { AuthIdentity } from '../../backend/modules/authIdentities/authIdentity.model.js';
import {
  EntitlementOverride,
} from '../../backend/modules/entitlementOverride/entitlementOverride.model.js';
import { Role } from '../../backend/modules/role/role.model.js';
import {
  registerUser,
} from '../../backend/modules/auth/services/registerUser.service.js';
import {
  createWorkspace,
} from '../../backend/modules/workspace/workspace.service.js';
import { UsageMetric } from '../../backend/modules/usageMetric/usageMetric.model.js';
import { User } from '../../backend/modules/users/user.model.js';
import { Workspace } from '../../backend/modules/workspace/workspace.model.js';
import {
  WorkspaceMember,
} from '../../backend/modules/workspaceMember/workspaceMember.model.js';
import { canonicalizeEmail } from '../../backend/utils/canonicalizeEmail.js';
import { hashPassword } from '../../backend/utils/password.js';
import { getE2eMongoUri } from './environment.js';
import { E2E_PASSWORD } from './auth.js';

const DOSSIER_MEMBER_PERMISSIONS = Object.freeze([
  'workspace:read',
  'dossier:read',
]);

async function withE2eDatabase(callback) {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(getE2eMongoUri());

  try {
    return await callback();
  } finally {
    await mongoose.disconnect();
  }
}

async function enableTeamManagementForE2eWorkspace({
  ownerId,
  workspaceId,
}) {
  const startsAt = new Date(Date.now() - 1_000);

  await EntitlementOverride.create([
    {
      workspace: workspaceId,
      targetType: 'feature',
      featureKey: 'team_management',
      featureEnabled: true,
      source: 'support',
      startsAt,
      reason: 'E2E M-001 team management fixture',
      grantedBy: ownerId,
      updatedBy: ownerId,
    },
    {
      workspace: workspaceId,
      targetType: 'limit',
      metricKey: 'members',
      limitValue: 10,
      source: 'support',
      startsAt,
      reason: 'E2E M-001 member capacity fixture',
      grantedBy: ownerId,
      updatedBy: ownerId,
    },
  ]);
}

async function synchronizeMemberUsage({
  ownerId,
  workspaceId,
}) {
  const memberCount = await WorkspaceMember.countDocuments({
    workspace: workspaceId,
    status: {
      $in: ['active', 'suspended'],
    },
  });

  await UsageMetric.findOneAndUpdate(
    {
      workspace: workspaceId,
      metricKey: 'members',
      periodType: 'current',
      periodStart: null,
    },
    {
      $set: {
        value: memberCount,
        updatedBy: ownerId,
      },
      $setOnInsert: {
        workspace: workspaceId,
        metricKey: 'members',
        periodType: 'current',
        periodStart: null,
        periodEnd: null,
        createdBy: ownerId,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function provisionDossierOwnerWorkspace({
  workspaceName = `Workspace Dossier E2E ${randomUUID().slice(0, 8)}`,
} = {}) {
  return withE2eDatabase(async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const identity = {
      firstName: 'Dossier',
      lastName: `Owner ${suffix.slice(0, 4)}`,
      email: `dossier.owner.${suffix}@example.test`,
      password: E2E_PASSWORD,
    };

    const user = await registerUser({
      ...identity,
    });

    const workspace = await createWorkspace({
      name: workspaceName,
      actorId: user._id,
    });

    return {
      dashboardUrl: `/workspaces/${workspace._id}/dashboard`,
      identity,
      workspaceId: workspace._id.toString(),
      workspaceName: workspace.name,
    };
  });
}

async function provisionDossierMember({
  workspaceId,
  permissions = DOSSIER_MEMBER_PERMISSIONS,
} = {}) {
  return withE2eDatabase(async () => {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new Error('E2E workspace not found');
    }

    const ownerId = workspace.createdBy;
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const email = `dossier.member.${suffix}@example.test`;
    const emailCanonical = canonicalizeEmail(email);
    const passwordHash = await hashPassword(E2E_PASSWORD);

    const user = await User.create({
      firstName: 'Dossier',
      lastName: `Member ${suffix.slice(0, 4)}`,
      email,
      emailCanonical,
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    await AuthIdentity.create({
      user: user._id,
      provider: 'local',
      passwordHash,
    });

    const role = await Role.create({
      workspace: workspace._id,
      key: `dossier_reader_${suffix}`,
      name: 'Lecteur Dossier E2E',
      description: 'Rôle technique réservé aux parcours E2E M-001.',
      permissions,
      isSystem: false,
      isEditable: true,
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    const membership = await WorkspaceMember.create({
      workspace: workspace._id,
      user: user._id,
      role: role._id,
      status: 'active',
      joinedAt: new Date(),
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    await enableTeamManagementForE2eWorkspace({
      ownerId,
      workspaceId: workspace._id,
    });
    await synchronizeMemberUsage({
      ownerId,
      workspaceId: workspace._id,
    });

    return {
      identity: {
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        password: E2E_PASSWORD,
      },
      membershipId: membership._id.toString(),
      roleId: role._id.toString(),
      userId: user._id.toString(),
    };
  });
}

export {
  DOSSIER_MEMBER_PERMISSIONS,
  enableTeamManagementForE2eWorkspace,
  provisionDossierMember,
  provisionDossierOwnerWorkspace,
  synchronizeMemberUsage,
  withE2eDatabase,
};
