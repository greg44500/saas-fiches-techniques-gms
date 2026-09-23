import {
    archiveVariantFromWorkspace,
    attachVariantToWorkspace,
    createWorkspaceProduct,
    createWorkspaceVariant,
    getProductMetadata,
    getWorkspaceProductDetail,
    getWorkspaceProductSummary,
    listProductSearch,
} from './productCatalog.service.js';
import {
    findProductDuplicateCandidates,
} from './productCatalogDedup.service.js';
import {
    commitProductImport,
    inspectProductImport,
    previewProductImport,
} from './productCatalogImport.service.js';

const metadata = async (_req, res) => {
    res.status(200).json({
        status: 'success',
        data: { metadata: await getProductMetadata() },
    });
};

const summary = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            summary: await getWorkspaceProductSummary({
                workspaceId: req.workspace._id,
            }),
        },
    });
};

const search = async (req, res) => {
    const result = await listProductSearch({
        workspaceId: req.workspace._id,
        ...req.validated.query,
    });

    res.status(200).json({
        status: 'success',
        data: { results: result.results },
        meta: result.pagination,
    });
};

const detail = async (req, res) => {
    const result = await getWorkspaceProductDetail({
        workspaceId: req.workspace._id,
        productId: req.validated.params.productId,
    });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const duplicateCheck = async (req, res) => {
    const result = await findProductDuplicateCandidates({
        workspaceId: req.workspace._id,
        ...req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const createProduct = async (req, res) => {
    const result = await createWorkspaceProduct({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        ...req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const createVariant = async (req, res) => {
    const result = await createWorkspaceVariant({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        productId: req.validated.params.productId,
        variant: req.validated.body,
    });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const attach = async (req, res) => {
    const workspaceEntry = await attachVariantToWorkspace({
        workspaceId: req.workspace._id,
        variantId: req.validated.params.variantId,
        actorId: req.user._id,
    });

    res.status(200).json({
        status: 'success',
        data: { workspaceEntry },
    });
};

const archive = async (req, res) => {
    const workspaceEntry = await archiveVariantFromWorkspace({
        workspaceId: req.workspace._id,
        variantId: req.validated.params.variantId,
        actorId: req.user._id,
    });

    res.status(200).json({
        status: 'success',
        data: { workspaceEntry },
    });
};

const inspectImport = async (req, res) => {
    const result = await inspectProductImport({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        file: req.file,
    });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const previewImport = async (req, res) => {
    const result = await previewProductImport({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        importId: req.validated.params.importId,
        ...req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

const commitImport = async (req, res) => {
    const result = await commitProductImport({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        importId: req.validated.params.importId,
        decisions: req.validated.body.decisions,
    });

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

export {
    archive,
    attach,
    commitImport,
    createProduct,
    createVariant,
    detail,
    duplicateCheck,
    inspectImport,
    metadata,
    previewImport,
    search,
    summary,
};
