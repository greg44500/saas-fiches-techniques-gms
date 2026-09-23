import {
    resolveApplicationGlobalAuthorization,
} from '../applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    getProductMetadata,
} from './productCatalog.service.js';
import {
    findProductDuplicateCandidates,
} from './productCatalogDedup.service.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from './productCatalogGlobalPermission.registry.js';
import {
    commitProductImport,
    inspectProductImport,
    previewProductImport,
} from './productCatalogImport.service.js';
import {
    PRODUCT_IMPORT_SCOPE,
} from './productCatalog.registry.js';
import {
    createCategory,
    createGlobalProduct,
    createGlobalVariant,
    getGlobalProductDetail,
    listCategories,
    listGlobalProducts,
    updateCategory,
    updateCategoryStatus,
    updateProduct,
    updateProductStatus,
    updateVariant,
    updateVariantStatus,
} from './productCatalogGovernance.service.js';

const access = async (req, res) => {
    const authorization = await resolveApplicationGlobalAuthorization({
        user: req.user,
    });
    const grantedPermissions = new Set(authorization?.permissions ?? []);
    const permissions = [
        PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
        PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ].filter((permission) => grantedPermissions.has(permission));

    res.status(200).json({
        status: 'success',
        data: { access: { permissions } },
    });
};

const metadata = async (_req, res) => {
    const productMetadata = await getProductMetadata({
        includeArchivedCategories: true,
    });

    res.status(200).json({
        status: 'success',
        data: { metadata: productMetadata },
    });
};

const list = async (req, res) => {
    const result = await listGlobalProducts(req.validated.query);
    res.status(200).json({
        status: 'success',
        data: { products: result.products },
        meta: result.pagination,
    });
};

const detail = async (req, res) => {
    const result = await getGlobalProductDetail({
        productId: req.validated.params.productId,
    });
    res.status(200).json({ status: 'success', data: result });
};

const duplicateCheck = async (req, res) => {
    const result = await findProductDuplicateCandidates({
        workspaceId: null,
        ...req.validated.body,
    });

    res.status(200).json({ status: 'success', data: result });
};

const createProductController = async (req, res) => {
    const result = await createGlobalProduct({
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(201).json({ status: 'success', data: result });
};

const createVariantController = async (req, res) => {
    const variant = await createGlobalVariant({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        variant: req.validated.body,
    });
    res.status(201).json({ status: 'success', data: { variant } });
};

const inspectImport = async (req, res) => {
    const result = await inspectProductImport({
        scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
        actorId: req.user._id,
        file: req.file,
    });

    res.status(201).json({ status: 'success', data: result });
};

const previewImport = async (req, res) => {
    const result = await previewProductImport({
        scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
        actorId: req.user._id,
        importId: req.validated.params.importId,
        ...req.validated.body,
    });

    res.status(200).json({ status: 'success', data: result });
};

const commitImport = async (req, res) => {
    const result = await commitProductImport({
        scope: PRODUCT_IMPORT_SCOPE.GLOBAL,
        actorId: req.user._id,
        importId: req.validated.params.importId,
        decisions: req.validated.body.decisions,
    });

    res.status(200).json({ status: 'success', data: result });
};

const categories = async (_req, res) => {
    res.status(200).json({
        status: 'success',
        data: { categories: await listCategories() },
    });
};

const createCategoryController = async (req, res) => {
    const category = await createCategory({
        actorId: req.user._id,
        name: req.validated.body.name,
    });
    res.status(201).json({ status: 'success', data: { category } });
};

const updateCategoryController = async (req, res) => {
    const category = await updateCategory({
        actorId: req.user._id,
        categoryId: req.validated.params.categoryId,
        name: req.validated.body.name,
    });
    res.status(200).json({ status: 'success', data: { category } });
};

const updateCategoryStatusController = async (req, res) => {
    const category = await updateCategoryStatus({
        actorId: req.user._id,
        categoryId: req.validated.params.categoryId,
        status: req.validated.body.status,
    });
    res.status(200).json({ status: 'success', data: { category } });
};

const updateProductController = async (req, res) => {
    const product = await updateProduct({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { product } });
};

const updateProductStatusController = async (req, res) => {
    const product = await updateProductStatus({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        status: req.validated.body.status,
    });
    res.status(200).json({ status: 'success', data: { product } });
};

const updateVariantController = async (req, res) => {
    const variant = await updateVariant({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        variantId: req.validated.params.variantId,
        changes: req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { variant } });
};

const updateVariantStatusController = async (req, res) => {
    const variant = await updateVariantStatus({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        variantId: req.validated.params.variantId,
        status: req.validated.body.status,
    });
    res.status(200).json({ status: 'success', data: { variant } });
};

export {
    access,
    categories,
    commitImport,
    createCategoryController,
    createProductController,
    createVariantController,
    detail,
    duplicateCheck,
    inspectImport,
    list,
    metadata,
    previewImport,
    updateCategoryController,
    updateCategoryStatusController,
    updateProductController,
    updateProductStatusController,
    updateVariantController,
    updateVariantStatusController,
};
