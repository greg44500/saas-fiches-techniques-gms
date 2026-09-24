import {
    PRODUCT_CHARACTERISTIC_KIND,
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
        variant.usageType,
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

const compareProductVariants = (left, right) => {
    const presentationOf = (variant) => (
        variant.characteristics?.find(
            ({ kind }) => kind === PRODUCT_CHARACTERISTIC_KIND.PRESENTATION,
        )?.name ?? ''
    );

    return (
        presentationOf(left).localeCompare(presentationOf(right), 'fr')
        || Number(left.foodRange ?? 0) - Number(right.foodRange ?? 0)
        || String(left.normalizedProcessingState ?? '').localeCompare(
            String(right.normalizedProcessingState ?? ''),
            'fr',
        )
        || left._id.toString().localeCompare(right._id.toString())
    );
};

export {
    canonicalProductMatchesSearch,
    compareProductVariants,
    productVariantMatchesSearch,
    productVariantSearchValues,
};
