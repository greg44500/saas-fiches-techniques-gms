import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    PRODUCT_CATEGORY_STATUS,
    PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { serializeCategory } from './productCatalog.serializer.js';
import { ProductCategory } from './productCategory.model.js';

/**
 * Projette les Catégories Produit avec, sur demande, le nombre de Produits
 * actifs qui empêchent leur archivage. Le comptage est groupé afin d'éviter
 * une requête par catégorie.
 */
const listProductCategories = async ({
    includeArchived = true,
    includeActiveProductCount = false,
} = {}) => {
    const categories = await ProductCategory.find(
        includeArchived
            ? {}
            : { status: PRODUCT_CATEGORY_STATUS.ACTIVE },
    )
        .sort({ name: 1, _id: 1 })
        .lean();

    if (!includeActiveProductCount || categories.length === 0) {
        return categories.map(serializeCategory);
    }

    const usage = await CanonicalProduct.aggregate([
        {
            $match: {
                category: { $in: categories.map(({ _id }) => _id) },
                status: PRODUCT_STATUS.ACTIVE,
                identityActive: true,
            },
        },
        {
            $group: {
                _id: '$category',
                activeProductCount: { $sum: 1 },
            },
        },
    ]);

    const activeCountByCategoryId = new Map(
        usage.map(({ _id, activeProductCount }) => [
            _id.toString(),
            activeProductCount,
        ]),
    );

    return categories.map((category) => ({
        ...serializeCategory(category),
        activeProductCount: activeCountByCategoryId.get(
            category._id.toString(),
        ) ?? 0,
    }));
};

export { listProductCategories };
