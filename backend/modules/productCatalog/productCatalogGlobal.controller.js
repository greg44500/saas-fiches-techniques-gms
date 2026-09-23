import {
    resolveApplicationGlobalAuthorization,
} from '../applicationGlobalAuthorization/applicationGlobalAuthorization.service.js';
import {
    getProductMetadata,
} from './productCatalog.service.js';
import {
    PRODUCT_CATALOG_GLOBAL_PERMISSION,
} from './productCatalogGlobalPermission.registry.js';
import {
    approveProduct,
    approveVariant,
    createCategory,
    getGlobalProductDetail,
    listCategories,
    listGlobalProducts,
    rejectProduct,
    rejectVariant,
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
    const grantedPermissions = new Set(
        authorization?.permissions ?? [],
    );
    const permissions = [
        PRODUCT_CATALOG_GLOBAL_PERMISSION.READ,
        PRODUCT_CATALOG_GLOBAL_PERMISSION.MANAGE,
    ].filter((permission) => grantedPermissions.has(permission));

    res.status(200).json({
        status: 'success',
        data: {
            access: {
                permissions,
            },
        },
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

const categories = async (req, res) => {
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

const approveProductController = async (req, res) => {
    const product = await approveProduct({
        actorId: req.user._id,
        productId: req.validated.params.productId,
    });
    res.status(200).json({ status: 'success', data: { product } });
};

const rejectProductController = async (req, res) => {
    const product = await rejectProduct({
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

const approveVariantController = async (req, res) => {
    const variant = await approveVariant({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        variantId: req.validated.params.variantId,
    });
    res.status(200).json({ status: 'success', data: { variant } });
};

const rejectVariantController = async (req, res) => {
    const variant = await rejectVariant({
        actorId: req.user._id,
        productId: req.validated.params.productId,
        variantId: req.validated.params.variantId,
        ...req.validated.body,
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
    approveProductController,
    approveVariantController,
    categories,
    createCategoryController,
    detail,
    list,
    metadata,
    rejectProductController,
    rejectVariantController,
    updateCategoryController,
    updateCategoryStatusController,
    updateProductController,
    updateProductStatusController,
    updateVariantController,
    updateVariantStatusController,
};
