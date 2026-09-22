import '../../setup.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    BUSINESS_ACTIVITY_ACTION,
} from '../../../modules/businessActivity/businessActivity.registry.js';
import {
    BusinessActivityEvent,
} from '../../../modules/businessActivity/businessActivity.model.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS,
    DOSSIER_ACCESS_REVOCATION_REASON,
} from '../../../modules/dossier/dossierAccess.registry.js';
import {
    DossierAccessGrant,
} from '../../../modules/dossier/dossierAccess.model.js';
import {
    grantDossierAccess,
    revokeDossierAccess,
} from '../../../modules/dossier/dossierAccess.service.js';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import {
    DOSSIER_STATUS,
} from '../../../modules/dossier/dossier.registry.js';
import {
    createDossier,
    listDossiers,
    updateDossier,
} from '../../../modules/dossier/dossier.service.js';
import {
    transitionDossierStatus,
} from '../../../modules/dossier/dossierLifecycle.service.js';
import {
    removeWorkspaceMember,
} from '../../../modules/workspaceMember/workspaceMember.service.js';
import {
    WorkspaceMember,
} from '../../../modules/workspaceMember/workspaceMember.model.js';
import {
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';


let ownerContext;

beforeEach(async () => {
    ownerContext =
        await createWorkspaceOwnerFixture();
});

const createOwnerDossier = (name = 'Magasin Nantes') =>
    createDossier({
        workspaceId:
            ownerContext.workspace._id,
        membershipId:
            ownerContext.membership._id,
        isOwner: true,
        actorId: ownerContext.owner._id,
        data: {
            name,
        },
    });


describe('M-001 dossier services', () => {
    it('crée un Dossier Owner sans faux grant et journalise la création', async () => {
        const dossier = await createOwnerDossier();

        expect(dossier.status).toBe(
            DOSSIER_STATUS.ACTIVE,
        );
        expect(
            await DossierAccessGrant.countDocuments(),
        ).toBe(0);

        const activity =
            await BusinessActivityEvent.find({
                dossier: dossier.id,
            }).lean();

        expect(activity).toHaveLength(1);
        expect(activity[0].action).toBe(
            BUSINESS_ACTIVITY_ACTION.DOSSIER_CREATED,
        );
    });

    it('crée atomiquement le grant du créateur non-owner', async () => {
        const member =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
            });

        const dossier = await createDossier({
            workspaceId:
                ownerContext.workspace._id,
            membershipId:
                member.membership._id,
            isOwner: false,
            actorId: member.user._id,
            data: {
                name: 'Magasin Saint-Nazaire',
            },
        });

        const grant =
            await DossierAccessGrant.findOne({
                dossier: dossier.id,
                workspaceMember:
                    member.membership._id,
            });

        expect(grant?.status).toBe(
            DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
        );

        const actions = (
            await BusinessActivityEvent.find({
                dossier: dossier.id,
            })
                .sort({ createdAt: 1 })
                .lean()
        ).map((event) => event.action);

        expect(actions).toEqual([
            BUSINESS_ACTIVITY_ACTION.DOSSIER_CREATED,
            BUSINESS_ACTIVITY_ACTION
                .DOSSIER_ACCESS_GRANTED,
        ]);
    });

    it('limite la liste non-owner à ses grants ACTIVE', async () => {
        const visible = await createOwnerDossier(
            'Visible',
        );
        await createOwnerDossier('Masqué');

        const member =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
            });

        await grantDossierAccess({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: visible.id,
            membershipId:
                member.membership._id,
            actorId: ownerContext.owner._id,
        });

        const result = await listDossiers({
            workspaceId:
                ownerContext.workspace._id,
            membershipId:
                member.membership._id,
            isOwner: false,
            page: 1,
            limit: 20,
        });

        expect(
            result.dossiers.map(
                (dossier) => dossier.name,
            ),
        ).toEqual(['Visible']);
    });

    it('ne crée pas de faux événement sur un PATCH sans changement réel', async () => {
        const dossier = await createOwnerDossier();
        const before =
            await BusinessActivityEvent.countDocuments({
                dossier: dossier.id,
            });

        await updateDossier({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            actorId: ownerContext.owner._id,
            data: {
                name: dossier.name,
            },
        });

        expect(
            await BusinessActivityEvent.countDocuments({
                dossier: dossier.id,
            }),
        ).toBe(before);
    });

    it('préserve l historique REVOKED et crée une nouvelle ligne lors d une réaffectation', async () => {
        const dossier = await createOwnerDossier();
        const member =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
            });

        const first = await grantDossierAccess({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            membershipId:
                member.membership._id,
            actorId: ownerContext.owner._id,
        });

        const duplicate =
            await grantDossierAccess({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                membershipId:
                    member.membership._id,
                actorId:
                    ownerContext.owner._id,
            });

        expect(first.created).toBe(true);
        expect(duplicate.created).toBe(false);
        expect(
            await DossierAccessGrant.countDocuments({
                dossier: dossier.id,
            }),
        ).toBe(1);

        await revokeDossierAccess({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            membershipId:
                member.membership._id,
            actorId: ownerContext.owner._id,
        });

        const reassigned =
            await grantDossierAccess({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                membershipId:
                    member.membership._id,
                actorId:
                    ownerContext.owner._id,
            });

        expect(reassigned.created).toBe(true);
        expect(
            await DossierAccessGrant.countDocuments({
                dossier: dossier.id,
            }),
        ).toBe(2);
        expect(
            await DossierAccessGrant.countDocuments({
                dossier: dossier.id,
                status:
                    DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
            }),
        ).toBe(1);
    });

    it('garantit un seul grant ACTIVE sous concurrence', async () => {
        const dossier = await createOwnerDossier();
        const member =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
            });

        await DossierAccessGrant.init();

        const results = await Promise.all([
            grantDossierAccess({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                membershipId:
                    member.membership._id,
                actorId:
                    ownerContext.owner._id,
            }),
            grantDossierAccess({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                membershipId:
                    member.membership._id,
                actorId:
                    ownerContext.owner._id,
            }),
        ]);

        expect(
            results.filter(
                ({ created }) => created,
            ),
        ).toHaveLength(1);

        expect(
            await DossierAccessGrant.countDocuments({
                dossier: dossier.id,
                workspaceMember:
                    member.membership._id,
                status:
                    DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
            }),
        ).toBe(1);
    });

    it('DELETED révoque les grants et la restauration PAUSED ne les réactive pas', async () => {
        const dossier = await createOwnerDossier();
        const member =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
            });

        await grantDossierAccess({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            membershipId:
                member.membership._id,
            actorId: ownerContext.owner._id,
        });

        await transitionDossierStatus({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            actorId: ownerContext.owner._id,
            status: DOSSIER_STATUS.DELETED,
            reason: 'Magasin fermé',
        });

        const revoked =
            await DossierAccessGrant.findOne({
                dossier: dossier.id,
                workspaceMember:
                    member.membership._id,
            }).lean();

        expect(revoked.status).toBe(
            DOSSIER_ACCESS_GRANT_STATUS.REVOKED,
        );
        expect(revoked.revocationReason).toBe(
            DOSSIER_ACCESS_REVOCATION_REASON
                .DOSSIER_DELETED,
        );

        const restored =
            await transitionDossierStatus({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                actorId:
                    ownerContext.owner._id,
                status: DOSSIER_STATUS.PAUSED,
                reason: 'Réouverture contrôlée',
            });

        expect(restored.status).toBe(
            DOSSIER_STATUS.PAUSED,
        );
        expect(
            await DossierAccessGrant.countDocuments({
                dossier: dossier.id,
                status:
                    DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
            }),
        ).toBe(0);
    });

    it('WorkspaceMember REMOVED révoque ses grants dans le hook produit', async () => {
        const dossier = await createOwnerDossier();
        const member =
            await createWorkspaceMemberFixture({
                workspaceId:
                    ownerContext.workspace._id,
                actorId: ownerContext.owner._id,
            });

        await grantDossierAccess({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            membershipId:
                member.membership._id,
            actorId: ownerContext.owner._id,
        });

        await removeWorkspaceMember({
            workspaceId:
                ownerContext.workspace._id,
            memberId: member.membership._id,
            actorId: ownerContext.owner._id,
        });

        const membership =
            await WorkspaceMember.findById(
                member.membership._id,
            ).lean();
        const grant =
            await DossierAccessGrant.findOne({
                dossier: dossier.id,
                workspaceMember:
                    member.membership._id,
            }).lean();

        expect(membership.status).toBe('removed');
        expect(grant.status).toBe(
            DOSSIER_ACCESS_GRANT_STATUS.REVOKED,
        );
        expect(grant.revocationReason).toBe(
            DOSSIER_ACCESS_REVOCATION_REASON
                .WORKSPACE_MEMBER_REMOVED,
        );
    });

    it('refuse les transitions lifecycle interdites et exige une raison pour DELETED', async () => {
        const dossier = await createOwnerDossier();

        await transitionDossierStatus({
            workspaceId:
                ownerContext.workspace._id,
            dossierId: dossier.id,
            actorId: ownerContext.owner._id,
            status: DOSSIER_STATUS.ARCHIVED,
        });

        await expect(
            transitionDossierStatus({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                actorId:
                    ownerContext.owner._id,
                status: DOSSIER_STATUS.ACTIVE,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        await expect(
            transitionDossierStatus({
                workspaceId:
                    ownerContext.workspace._id,
                dossierId: dossier.id,
                actorId:
                    ownerContext.owner._id,
                status: DOSSIER_STATUS.DELETED,
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });
});
