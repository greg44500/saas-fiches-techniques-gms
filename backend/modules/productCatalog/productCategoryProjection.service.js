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
            },
        },
        {
            $group: {
                _id: '$category',
                totalProductCount: { $sum: 1 },
                activeProductCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$status', PRODUCT_STATUS.ACTIVE] },
                                    { $eq: ['$identityActive', true] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const usageByCategoryId = new Map(
        usage.map((item) => [item._id.toString(), item]),
    );

    return categories.map((category) => ({
        ...serializeCategory(category),
        activeProductCount: usageByCategoryId.get(
            category._id.toString(),
        )?.activeProductCount ?? 0,
        totalProductCount: usageByCategoryId.get(
            category._id.toString(),
        )?.totalProductCount ?? 0,
    }));
};

export { listProductCategories };
