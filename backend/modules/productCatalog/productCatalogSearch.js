import {
    PRODUCT_FOOD_RANGE_REGISTRY,
} from './productCatalog.registry.js';
import {
    matchesProductSearchValues,
} from './productCatalog.normalization.js';

const canonicalProductMatchesSearch = (query, product) => {
    if (!query) return true;

    return matchesProductSearchValues(
        query,
        product?.searchKeys ?? [],
    );
};

const productVariantSearchValues = ({
    product,
    variant,
}) => {
    const foodRangeDefinition = variant.foodRange
        ? PRODUCT_FOOD_RANGE_REGISTRY[variant.foodRange]
        : null;

    return [
        variant.name,
        variant.normalizedName,
        ...(product?.searchKeys ?? []),
        ...(variant.variety?.searchKeys ?? []),
        variant.variety?.name,
        ...(variant.characteristics ?? []).flatMap(
            (characteristic) => [
                ...(characteristic.searchKeys ?? []),
                characteristic.name,
            ],
        ),
        foodRangeDefinition?.label,
        foodRangeDefinition?.name,
        foodRangeDefinition?.defaultProcessingState,
        ...(foodRangeDefinition?.processingStates ?? []),
        variant.processingState,
        variant.conservationType,
    ].filter(Boolean);
};

const productVariantMatchesSearch = ({
    query,
    product,
    variant,
}) => {
    if (!query) return true;

    return matchesProductSearchValues(
        query,
        productVariantSearchValues({ product, variant }),
    );
};

const compareProductVariants = (left, right) => (
    String(left.normalizedName ?? left.name ?? '').localeCompare(
        String(right.normalizedName ?? right.name ?? ''),
        'fr',
    )
    || left._id.toString().localeCompare(right._id.toString())
)

export {
    canonicalProductMatchesSearch,
    compareProductVariants,
    productVariantMatchesSearch,
    productVariantSearchValues,
};
