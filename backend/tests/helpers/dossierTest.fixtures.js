import '../../config/applicationRolePermission.registry.js';

import {
    DOSSIER_PERMISSIONS,
} from '../../modules/dossier/dossierPermission.registry.js';
import { Role } from '../../modules/role/role.model.js';
import {
    createWorkspace,
} from '../../modules/workspace/workspace.service.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';
import { User } from '../../modules/users/user.model.js';
import { seedPlans } from '../../seeds/seedPlans.js';
import { signAccessToken } from '../../utils/jwt.js';


let fixtureSequence = 0;

const nextFixtureSuffix = () => {
    fixtureSequence += 1;
    return fixtureSequence.toString();
};

const createTestUser = async ({
    email,
    firstName = 'Test',
    lastName = 'User',
}) => User.create({
    firstName,
    lastName,
    email,
    emailCanonical: email.toLowerCase(),
});

const createWorkspaceOwnerFixture = async () => {
    await seedPlans();

    const suffix = nextFixtureSuffix();
    const owner = await createTestUser({
        email: `owner-${suffix}@example.test`,
        firstName: 'Owner',
        lastName: suffix,
    });

    const workspace = await createWorkspace({
        name: `Workspace ${suffix}`,
        actorId: owner._id,
    });

    const membership = await WorkspaceMember.findOne({
        workspace: workspace._id,
        user: owner._id,
    }).populate({
        path: 'role',
    });

    return {
        owner,
        workspace,
        membership,
        token: signAccessToken(
            owner._id.toString(),
            owner.passwordChangedAt,
        ),
    };
};

const createWorkspaceMemberFixture = async ({
    workspaceId,
    actorId,
    permissions = DOSSIER_PERMISSIONS,
    roleKey,
}) => {
    const suffix = nextFixtureSuffix();
    const user = await createTestUser({
        email: `member-${suffix}@example.test`,
        firstName: 'Member',
        lastName: suffix,
    });

    const role = await Role.create({
        workspace: workspaceId,
        key: roleKey ?? `m001_member_${suffix}`,
        name: `Membre M-001 ${suffix}`,
        permissions,
        isSystem: false,
        isEditable: true,
        createdBy: actorId,
        updatedBy: actorId,
    });

    const membership = await WorkspaceMember.create({
        workspace: workspaceId,
        user: user._id,
        role: role._id,
        createdBy: actorId,
        updatedBy: actorId,
    });

    return {
        user,
        role,
        membership,
        token: signAccessToken(
            user._id.toString(),
            user.passwordChangedAt,
        ),
    };
};

const bearer = (token) => ({
    Authorization: `Bearer ${token}`,
});


export {
    bearer,
    createTestUser,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
};
