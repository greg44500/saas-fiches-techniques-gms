import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import {
    createDraftFromValidatedState,
    getTechnicalSheetDraft,
    saveTechnicalSheetDraft,
    selectTechnicalSheetSupplierArticle,
} from './technicalSheetDraft.service.js';
import {
    getTechnicalSheetCapacity,
} from './technicalSheetCapacity.service.js';
import {
    copyTechnicalSheet,
} from './technicalSheetCopy.service.js';
import {
    archiveTechnicalSheet,
    deleteTechnicalSheet,
    listTechnicalSheetTrash,
    purgeExpiredTechnicalSheets,
    purgeTechnicalSheet,
    reactivateTechnicalSheet,
    restoreTechnicalSheet,
} from './technicalSheetLifecycle.service.js';
import {
    TECHNICAL_SHEET_FINAL_PRICE_MODE,
    TECHNICAL_SHEET_LINE_KIND,
    TECHNICAL_SHEET_LINE_VALUATION_STATUS,
    TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY,
    TECHNICAL_SHEET_SALE_BASIS_REGISTRY,
    TECHNICAL_SHEET_STATUS,
    TECHNICAL_SHEET_TRASH_RETENTION,
    TECHNICAL_SHEET_VALUATION_STATUS,
} from './technicalSheet.registry.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from './technicalSheetPermission.registry.js';
import {
    createTechnicalSheet,
    getTechnicalSheet,
    listTechnicalSheets,
    updateTechnicalSheet,
} from './technicalSheet.service.js';
import {
    getDossierTechnicalSheetSettings,
    updateDossierTechnicalSheetSettings,
} from './technicalSheetSettings.service.js';
import {
    getTechnicalSheetValidation,
    listTechnicalSheetHistory,
    validateTechnicalSheet,
} from './technicalSheetValidation.service.js';
import {
    valuateTechnicalSheet,
} from './technicalSheetValuation.service.js';
import {
    getWorkspaceBusinessSettings,
    updateTrashRetentionDays,
} from './workspaceBusinessSettings.service.js';

const metadata = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            metadata: {
                statuses:
                    Object.values(
                        TECHNICAL_SHEET_STATUS,
                    ),
                lineKinds:
                    Object.values(
                        TECHNICAL_SHEET_LINE_KIND,
                    ),
                valuationStatuses:
                    Object.values(
                        TECHNICAL_SHEET_VALUATION_STATUS,
                    ),
                lineValuationStatuses:
                    Object.values(
                        TECHNICAL_SHEET_LINE_VALUATION_STATUS,
                    ),
                finalPriceModes:
                    Object.values(
                        TECHNICAL_SHEET_FINAL_PRICE_MODE,
                    ),
                units:
                    Object.values(
                        TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY,
                    ),
                productionUnits:
                    Object.values(
                        TECHNICAL_SHEET_PRODUCTION_UNIT_REGISTRY,
                    ),
                saleBases:
                    Object.values(
                        TECHNICAL_SHEET_SALE_BASIS_REGISTRY,
                    ),
                trashRetention: {
                    defaultDays:
                        TECHNICAL_SHEET_TRASH_RETENTION
                            .DEFAULT_DAYS,
                    minDays:
                        TECHNICAL_SHEET_TRASH_RETENTION
                            .MIN_DAYS,
                    maxDays:
                        TECHNICAL_SHEET_TRASH_RETENTION
                            .MAX_DAYS,
                },
            },
        },
    });
};

const list = async (req, res) => {
    const result =
        await listTechnicalSheets({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const create = async (req, res) => {
    const result =
        await createTechnicalSheet({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            actorId: req.user._id,
            data: req.validated.body,
        });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const getById = async (req, res) => {
    const result =
        await getTechnicalSheet({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const update = async (req, res) => {
    const {
        expectedRevision,
        ...data
    } = req.validated.body;

    const sheet =
        await updateTechnicalSheet({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            expectedRevision,
            data,
        });

    res.status(200).json({
        status: 'success',
        data: { sheet },
    });
};

const getDraft = async (req, res) => {
    const draft =
        await getTechnicalSheetDraft({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
        });

    res.status(200).json({
        status: 'success',
        data: { draft },
    });
};

const startDraft = async (req, res) => {
    const draft =
        await createDraftFromValidatedState({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            expectedSheetRevision:
                req.validated.body
                    .expectedSheetRevision,
        });

    res.status(201).json({
        status: 'success',
        data: { draft },
    });
};

const saveDraft = async (req, res) => {
    const {
        expectedRevision,
        ...data
    } = req.validated.body;

    const draft =
        await saveTechnicalSheetDraft({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            expectedRevision,
            data,
            canManageSourcing:
                req.permissions.includes(
                    TECHNICAL_SHEET_PERMISSION
                        .SOURCING_MANAGE,
                ),
            canManageValuation:
                req.permissions.includes(
                    TECHNICAL_SHEET_PERMISSION
                        .VALUATION_MANAGE,
                ),
        });

    res.status(200).json({
        status: 'success',
        data: { draft },
    });
};

const selectSupplierArticle = async (req, res) => {
    const draft =
        await selectTechnicalSheetSupplierArticle({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            ...req.validated.body,
        });

    res.status(200).json({
        status: 'success',
        data: { draft },
    });
};

const valuate = async (req, res) => {
    const result =
        await valuateTechnicalSheet({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            expectedRevision:
                req.validated.body
                    .expectedRevision,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const validate = async (req, res) => {
    const result =
        await validateTechnicalSheet({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            ...req.validated.body,
        });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const history = async (req, res) => {
    const result =
        await listTechnicalSheetHistory({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const historyById = async (req, res) => {
    const validation =
        await getTechnicalSheetValidation({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            validationId:
                req.validated.params
                    .validationId,
        });

    res.status(200).json({
        status: 'success',
        data: { validation },
    });
};

const lifecycleResponse = (
    action,
) => async (req, res) => {
    const sheet = await action({
        workspaceId:
            req.workspace._id,
        dossierId:
            req.dossier._id,
        technicalSheetId:
            req.validated.params
                .technicalSheetId,
        actorId:
            req.user._id,
        expectedRevision:
            req.validated.body
                .expectedRevision,
    });

    res.status(200).json({
        status: 'success',
        data: { sheet },
    });
};

const archive =
    lifecycleResponse(
        archiveTechnicalSheet,
    );
const reactivate =
    lifecycleResponse(
        reactivateTechnicalSheet,
    );
const remove =
    lifecycleResponse(
        deleteTechnicalSheet,
    );
const restore =
    lifecycleResponse(
        restoreTechnicalSheet,
    );

const purge = async (req, res) => {
    const result =
        await purgeTechnicalSheet({
            workspaceId:
                req.workspace._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            actorId: req.user._id,
            expectedRevision:
                req.validated.body
                    .expectedRevision,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const copy = async (req, res) => {
    const result =
        await copyTechnicalSheet({
            workspaceId:
                req.workspace._id,
            sourceDossierId:
                req.dossier._id,
            technicalSheetId:
                req.validated.params
                    .technicalSheetId,
            targetDossierId:
                req.validated.body
                    .targetDossierId,
            actorId:
                req.user._id,
            membershipId:
                req.membership._id,
            isOwner:
                req.role.isSystem
                && req.role.key
                    === SYSTEM_ROLE_KEY.OWNER,
        });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const getDossierSettings = async (
    req,
    res,
) => {
    const settings =
        await getDossierTechnicalSheetSettings({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
        });

    res.status(200).json({
        status: 'success',
        data: { settings },
    });
};

const updateDossierSettings = async (
    req,
    res,
) => {
    const settings =
        await updateDossierTechnicalSheetSettings({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            actorId:
                req.user._id,
            ...req.validated.body,
        });

    res.status(200).json({
        status: 'success',
        data: { settings },
    });
};

const capacity = async (req, res) => {
    const capacityResult =
        await getTechnicalSheetCapacity({
            workspaceId:
                req.workspace._id,
        });

    res.status(200).json({
        status: 'success',
        data: {
            capacity:
                capacityResult,
        },
    });
};

const trash = async (req, res) => {
    const result =
        await listTechnicalSheetTrash({
            workspaceId:
                req.workspace._id,
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const purgeWorkspaceTrash = async (
    req,
    res,
) => {
    const result =
        await purgeExpiredTechnicalSheets({
            workspaceId:
                req.workspace._id,
            actorId:
                req.user._id,
        });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const businessSettings = async (
    req,
    res,
) => {
    const settings =
        await getWorkspaceBusinessSettings({
            workspaceId:
                req.workspace._id,
        });

    res.status(200).json({
        status: 'success',
        data: { settings },
    });
};

const updateBusinessSettings = async (
    req,
    res,
) => {
    const settings =
        await updateTrashRetentionDays({
            workspaceId:
                req.workspace._id,
            actorId:
                req.user._id,
            trashRetentionDays:
                req.validated.body
                    .trashRetentionDays,
        });

    res.status(200).json({
        status: 'success',
        data: { settings },
    });
};

export {
    archive,
    businessSettings,
    capacity,
    copy,
    create,
    getById,
    getDossierSettings,
    getDraft,
    history,
    historyById,
    list,
    metadata,
    purge,
    purgeWorkspaceTrash,
    reactivate,
    remove,
    restore,
    saveDraft,
    selectSupplierArticle,
    startDraft,
    trash,
    update,
    updateBusinessSettings,
    updateDossierSettings,
    validate,
    valuate,
};
