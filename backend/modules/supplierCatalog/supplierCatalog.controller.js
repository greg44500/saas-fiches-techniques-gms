import {
    productCatalogImportUploadService,
} from '../productCatalog/productCatalogImportUpload.service.js';
import {
    SUPPLIER_CATALOG_MATCH_STATUS,
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_RESOURCE_STATUS_REGISTRY,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    commitSupplierCatalogImport,
    inspectSupplierCatalogImport,
    previewSupplierCatalogImport,
} from './supplierCatalogImport.service.js';
import {
    createCatalogEdition,
    listCatalogEditions,
    listCatalogLines,
    updateCatalogStatus,
    upsertCatalogLine,
} from './supplierCatalog.service.js';

const catalogMetadata = () => ({
    statuses:
        Object.values(
            SUPPLIER_RESOURCE_STATUS_REGISTRY,
        ),
    matchStatuses:
        Object.values(
            SUPPLIER_CATALOG_MATCH_STATUS,
        ),
    priceBases:
        Object.values(
            SUPPLIER_PRICE_BASIS,
        ),
});

const metadata = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            metadata:
                catalogMetadata(),
        },
    });
};

const listWorkspaceCatalogs =
    async (req, res) => {
        const result =
            await listCatalogEditions({
                workspaceId:
                    req.workspace._id,
                ...req.validated.query,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const createWorkspaceCatalog =
    async (req, res) => {
        const result =
            await createCatalogEdition({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId:
                    req.workspace._id,
                actorId:
                    req.user._id,
                supplierId:
                    req.validated.body
                        .supplierId,
                data:
                    req.validated.body,
            });

        res.status(
            result.created ? 201 : 200,
        ).json({
            status: 'success',
            data: result,
        });
    };

const updateWorkspaceCatalogStatus =
    async (req, res) => {
        const catalog =
            await updateCatalogStatus({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId:
                    req.workspace._id,
                catalogId:
                    req.validated.params
                        .catalogId,
                actorId:
                    req.user._id,
                status:
                    req.validated.body
                        .status,
            });

        res.status(200).json({
            status: 'success',
            data: { catalog },
        });
    };

const listWorkspaceCatalogLines =
    async (req, res) => {
        const result =
            await listCatalogLines({
                workspaceId:
                    req.workspace._id,
                catalogId:
                    req.validated.params
                        .catalogId,
                ...req.validated.query,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const upsertWorkspaceCatalogLine =
    async (req, res) => {
        const result =
            await upsertCatalogLine({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId:
                    req.workspace._id,
                catalogId:
                    req.validated.params
                        .catalogId,
                actorId:
                    req.user._id,
                row:
                    req.validated.body,
            });

        res.status(
            result.changed ? 201 : 200,
        ).json({
            status: 'success',
            data: result,
        });
    };

const inspectWorkspaceImport =
    async (req, res) => {
        const result =
            await productCatalogImportUploadService
                .processTemporaryUpload({
                    file: req.file,
                    consume:
                        (inspectedFile) =>
                            inspectSupplierCatalogImport({
                                scope:
                                    SUPPLIER_SCOPE
                                        .WORKSPACE_PRIVATE,
                                workspaceId:
                                    req.workspace._id,
                                actorId:
                                    req.user._id,
                                file:
                                    inspectedFile,
                            }),
                });

        res.status(201).json({
            status: 'success',
            data: result,
        });
    };

const previewWorkspaceImport =
    async (req, res) => {
        const result =
            await previewSupplierCatalogImport({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId:
                    req.workspace._id,
                actorId:
                    req.user._id,
                importId:
                    req.validated.params
                        .importId,
                ...req.validated.body,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const commitWorkspaceImport =
    async (req, res) => {
        const result =
            await commitSupplierCatalogImport({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId:
                    req.workspace._id,
                actorId:
                    req.user._id,
                importId:
                    req.validated.params
                        .importId,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const listGlobalCatalogs =
    async (req, res) => {
        const result =
            await listCatalogEditions({
                globalOnly: true,
                ...req.validated.query,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const createGlobalCatalog =
    async (req, res) => {
        const result =
            await createCatalogEdition({
                scope:
                    SUPPLIER_SCOPE
                        .GLOBAL_SHARED,
                actorId:
                    req.user._id,
                supplierId:
                    req.validated.body
                        .supplierId,
                data:
                    req.validated.body,
            });

        res.status(
            result.created ? 201 : 200,
        ).json({
            status: 'success',
            data: result,
        });
    };

const updateGlobalCatalogStatus =
    async (req, res) => {
        const catalog =
            await updateCatalogStatus({
                scope:
                    SUPPLIER_SCOPE
                        .GLOBAL_SHARED,
                catalogId:
                    req.validated.params
                        .catalogId,
                actorId:
                    req.user._id,
                status:
                    req.validated.body
                        .status,
            });

        res.status(200).json({
            status: 'success',
            data: { catalog },
        });
    };

const listGlobalCatalogLines =
    async (req, res) => {
        const result =
            await listCatalogLines({
                globalOnly: true,
                catalogId:
                    req.validated.params
                        .catalogId,
                ...req.validated.query,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const upsertGlobalCatalogLine =
    async (req, res) => {
        const result =
            await upsertCatalogLine({
                scope:
                    SUPPLIER_SCOPE
                        .GLOBAL_SHARED,
                catalogId:
                    req.validated.params
                        .catalogId,
                actorId:
                    req.user._id,
                row:
                    req.validated.body,
            });

        res.status(
            result.changed ? 201 : 200,
        ).json({
            status: 'success',
            data: result,
        });
    };

const inspectGlobalImport =
    async (req, res) => {
        const result =
            await productCatalogImportUploadService
                .processTemporaryUpload({
                    file: req.file,
                    consume:
                        (inspectedFile) =>
                            inspectSupplierCatalogImport({
                                scope:
                                    SUPPLIER_SCOPE
                                        .GLOBAL_SHARED,
                                actorId:
                                    req.user._id,
                                file:
                                    inspectedFile,
                            }),
                });

        res.status(201).json({
            status: 'success',
            data: result,
        });
    };

const previewGlobalImport =
    async (req, res) => {
        const result =
            await previewSupplierCatalogImport({
                scope:
                    SUPPLIER_SCOPE
                        .GLOBAL_SHARED,
                actorId:
                    req.user._id,
                importId:
                    req.validated.params
                        .importId,
                ...req.validated.body,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

const commitGlobalImport =
    async (req, res) => {
        const result =
            await commitSupplierCatalogImport({
                scope:
                    SUPPLIER_SCOPE
                        .GLOBAL_SHARED,
                actorId:
                    req.user._id,
                importId:
                    req.validated.params
                        .importId,
            });

        res.status(200).json({
            status: 'success',
            data: result,
        });
    };

export {
    commitGlobalImport,
    commitWorkspaceImport,
    createGlobalCatalog,
    createWorkspaceCatalog,
    inspectGlobalImport,
    inspectWorkspaceImport,
    listGlobalCatalogLines,
    listGlobalCatalogs,
    listWorkspaceCatalogLines,
    listWorkspaceCatalogs,
    metadata,
    previewGlobalImport,
    previewWorkspaceImport,
    updateGlobalCatalogStatus,
    updateWorkspaceCatalogStatus,
    upsertGlobalCatalogLine,
    upsertWorkspaceCatalogLine,
};
