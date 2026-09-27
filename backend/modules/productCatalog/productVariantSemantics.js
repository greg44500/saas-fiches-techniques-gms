import {
    PRODUCT_FOOD_RANGE_REGISTRY,
} from './productCatalog.registry.js';
import {
    normalizeProductText,
} from './productCatalog.normalization.js';

const getProductFoodRangeDefinition = (foodRange) => (
    PRODUCT_FOOD_RANGE_REGISTRY[Number(foodRange)] ?? null
);

const resolveProductProcessingState = ({
    foodRange,
    processingState = null,
}) => {
    const definition = getProductFoodRangeDefinition(foodRange);

    if (!definition) {
        return {
            valid: false,
            reason: 'INVALID_FOOD_RANGE',
            value: null,
            definition: null,
        };
    }

    if (!processingState) {
        return {
            valid: true,
            reason: null,
            value: definition.defaultProcessingState,
            definition,
        };
    }

    const normalized = normalizeProductText(processingState);
    const canonical = definition.processingStates.find(
        (candidate) => normalizeProductText(candidate) === normalized,
    );

    return canonical
        ? {
            valid: true,
            reason: null,
            value: canonical,
            definition,
        }
        : {
            valid: false,
            reason: 'INVALID_PROCESSING_STATE',
            value: null,
            definition,
        };
};

export {
    getProductFoodRangeDefinition,
    resolveProductProcessingState,
};
