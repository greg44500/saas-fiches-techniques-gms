import {
    listBusinessActivityForDossier,
} from '../businessActivity/businessActivity.service.js';
import {
    grantDossierAccess,
    listDossierAccessGrants,
    revokeDossierAccess,
} from './dossierAccess.service.js';
import {
    isWorkspaceOwner,
} from './dossierAccess.middleware.js';
import {
    transitionDossierStatus,
} from './dossierLifecycle.service.js';
import {
    getDossierMetadata,
} from './dossierMetadata.service.js';
import {
    DOSSIER_PERMISSION,
} from './dossierPermission.registry.js';
import {
    createDossier,
    listDossiers,
    updateDossier,
} from './dossier.service.js';
import {
    serializeDossier,
} from './dossier.serializer.js';


const metadata = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            metadata: getDossierMetadata(),
        },
    });
};

const list = async (req, res) => {
    const {
        dossiers,
        pagination,
    } = await listDossiers({
        workspaceId: req.workspace._id,
        membershipId: req.membership._id,
        isOwner: isWorkspaceOwner(req.role),
        page: req.validated.query.page,
        limit: req.validated.query.limit,
        search: req.validated.query.search,
        status: req.validated.query.status,
        canReadDeleted: req.permissions.includes(
            DOSSIER_PERMISSION.LIFECYCLE_UPDATE,
        ),
    });

    res.status(200).json({
        status: 'success',
        data: {
            dossiers,
        },
        meta: pagination,
    });
};

const create = async (req, res) => {
    const dossier = await createDossier({
        workspaceId: req.workspace._id,
        membershipId: req.membership._id,
        isOwner: isWorkspaceOwner(req.role),
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: {
            dossier,
        },
    });
};

const getById = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            dossier: serializeDossier(
                req.dossier,
            ),
        },
    });
};

const activity = async (req, res) => {
    const {
        events,
        pagination,
    } = await listBusinessActivityForDossier({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        page: req.validated.query.page,
        limit: req.validated.query.limit,
        canReadAccessEvents:
            req.permissions.includes(
                DOSSIER_PERMISSION.ACCESS_READ,
            ),
    });

    res.status(200).json({
        status: 'success',
        data: {
            activity: events,
        },
        meta: pagination,
    });
};

const update = async (req, res) => {
    const dossier = await updateDossier({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: {
            dossier,
        },
    });
};

const updateStatus = async (req, res) => {
    const dossier =
        await transitionDossierStatus({
            workspaceId: req.workspace._id,
            dossierId: req.dossier._id,
            actorId: req.user._id,
            status: req.validated.body.status,
            reason: req.validated.body.reason,
        });

    res.status(200).json({
        status: 'success',
        data: {
            dossier,
        },
    });
};

const listAccessGrants = async (req, res) => {
    const {
        accessGrants,
        pagination,
    } = await listDossierAccessGrants({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        status: req.validated.query.status,
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            accessGrants,
        },
        meta: pagination,
    });
};

const grantAccess = async (req, res) => {
    const {
        accessGrant,
        created,
    } = await grantDossierAccess({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        membershipId:
            req.validated.params.membershipId,
        actorId: req.user._id,
    });

    res.status(created ? 201 : 200).json({
        status: 'success',
        data: {
            accessGrant,
        },
    });
};

const revokeAccess = async (req, res) => {
    await revokeDossierAccess({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        membershipId:
            req.validated.params.membershipId,
        actorId: req.user._id,
    });

    res.status(204).send();
};


export {
    activity,
    create,
    getById,
    grantAccess,
    list,
    listAccessGrants,
    metadata,
    revokeAccess,
    update,
    updateStatus,
};
