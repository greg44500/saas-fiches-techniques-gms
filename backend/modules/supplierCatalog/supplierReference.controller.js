import {
    resolveApplicationGlobalAuthorization,
} from '../applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    SUPPLIER_CATALOG_GLOBAL_PERMISSION,
} from './supplierCatalogGlobalPermission.registry.js';
import {
    createSupplier,
    createSupplierArticle,
    getSupplierReferenceMetadata,
    listSupplierArticles,
    listSuppliers,
    replaceSupplierArticle,
    updateSupplier,
    updateSupplierArticle,
    updateSupplierArticleStatus,
    updateSupplierStatus,
} from './supplierReference.service.js';

const access = async (req, res) => {
    const authorization =
        await resolveApplicationGlobalAuthorization({
            user: req.user,
        });
    const granted = new Set(
        authorization?.permissions ?? [],
    );
    const permissions = [
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.READ,
        SUPPLIER_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ].filter((permission) =>
        granted.has(permission));

    res.status(200).json({
        status: 'success',
        data: { access: { permissions } },
    });
};

const metadata = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            metadata: await getSupplierReferenceMetadata(),
        },
    });
};

const listWorkspaceSuppliers = async (req, res) => {
    const result = await listSuppliers({
        workspaceId: req.workspace._id,
        ...req.validated.query,
    });

    res.status(200).json({ status: 'success', data: result });
};

const createWorkspaceSupplier = async (req, res) => {
    const supplier = await createSupplier({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: { supplier },
    });
};

const updateWorkspaceSupplier = async (req, res) => {
    const supplier = await updateSupplier({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        supplierId: req.validated.params.supplierId,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: { supplier },
    });
};

const updateWorkspaceSupplierStatus = async (req, res) => {
    const supplier = await updateSupplierStatus({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        supplierId: req.validated.params.supplierId,
        actorId: req.user._id,
        status: req.validated.body.status,
    });

    res.status(200).json({
        status: 'success',
        data: { supplier },
    });
};

const listWorkspaceArticles = async (req, res) => {
    const result = await listSupplierArticles({
        workspaceId: req.workspace._id,
        ...req.validated.query,
    });

    res.status(200).json({ status: 'success', data: result });
};

const createWorkspaceArticle = async (req, res) => {
    const article = await createSupplierArticle({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: { article },
    });
};

const updateWorkspaceArticle = async (req, res) => {
    const article = await updateSupplierArticle({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        articleId: req.validated.params.articleId,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: { article },
    });
};

const updateWorkspaceArticleStatus = async (req, res) => {
    const article = await updateSupplierArticleStatus({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        articleId: req.validated.params.articleId,
        actorId: req.user._id,
        status: req.validated.body.status,
    });

    res.status(200).json({
        status: 'success',
        data: { article },
    });
};

const replaceWorkspaceArticle = async (req, res) => {
    const result = await replaceSupplierArticle({
        scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: req.workspace._id,
        articleId: req.validated.params.articleId,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({ status: 'success', data: result });
};

const listGlobalSuppliers = async (req, res) => {
    const result = await listSuppliers({
        globalOnly: true,
        ...req.validated.query,
    });

    res.status(200).json({ status: 'success', data: result });
};

const createGlobalSupplier = async (req, res) => {
    const supplier = await createSupplier({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: { supplier },
    });
};

const updateGlobalSupplier = async (req, res) => {
    const supplier = await updateSupplier({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        supplierId: req.validated.params.supplierId,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: { supplier },
    });
};

const updateGlobalSupplierStatus = async (req, res) => {
    const supplier = await updateSupplierStatus({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        supplierId: req.validated.params.supplierId,
        actorId: req.user._id,
        status: req.validated.body.status,
    });

    res.status(200).json({
        status: 'success',
        data: { supplier },
    });
};

const listGlobalArticles = async (req, res) => {
    const result = await listSupplierArticles({
        globalOnly: true,
        ...req.validated.query,
    });

    res.status(200).json({ status: 'success', data: result });
};

const createGlobalArticle = async (req, res) => {
    const article = await createSupplierArticle({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: { article },
    });
};

const updateGlobalArticle = async (req, res) => {
    const article = await updateSupplierArticle({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        articleId: req.validated.params.articleId,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: { article },
    });
};

const updateGlobalArticleStatus = async (req, res) => {
    const article = await updateSupplierArticleStatus({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        articleId: req.validated.params.articleId,
        actorId: req.user._id,
        status: req.validated.body.status,
    });

    res.status(200).json({
        status: 'success',
        data: { article },
    });
};

const replaceGlobalArticle = async (req, res) => {
    const result = await replaceSupplierArticle({
        scope: SUPPLIER_SCOPE.GLOBAL_SHARED,
        articleId: req.validated.params.articleId,
        actorId: req.user._id,
        data: req.validated.body,
    });

    res.status(201).json({ status: 'success', data: result });
};

export {
    access,
    createGlobalArticle,
    createGlobalSupplier,
    createWorkspaceArticle,
    createWorkspaceSupplier,
    listGlobalArticles,
    listGlobalSuppliers,
    listWorkspaceArticles,
    listWorkspaceSuppliers,
    metadata,
    replaceGlobalArticle,
    replaceWorkspaceArticle,
    updateGlobalArticle,
    updateGlobalArticleStatus,
    updateGlobalSupplier,
    updateGlobalSupplierStatus,
    updateWorkspaceArticle,
    updateWorkspaceArticleStatus,
    updateWorkspaceSupplier,
    updateWorkspaceSupplierStatus,
};
