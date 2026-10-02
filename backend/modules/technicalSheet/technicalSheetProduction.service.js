import {
    PRODUCT_REFERENCE_UNIT,
} from '../productCatalog/productCatalog.registry.js';

const editableProductionFromSnapshot = (
    snapshot,
) => {
    const productionQuantity =
        snapshot?.productionQuantity
            ?.toString?.()
        ?? snapshot?.productionQuantity
        ?? null;

    const currentModelComplete = (
        snapshot?.productionUnit
            === PRODUCT_REFERENCE_UNIT.UNIT
        && snapshot?.portionsPerProductionUnit
            !== null
        && snapshot?.portionsPerProductionUnit
            !== undefined
        && Boolean(snapshot?.saleBasis)
    );

    if (!currentModelComplete) {
        return {
            productionQuantity,
            productionUnit: null,
            portionsPerProductionUnit: null,
            saleBasis: null,
            requiresRemediation: true,
        };
    }

    return {
        productionQuantity,
        productionUnit:
            PRODUCT_REFERENCE_UNIT.UNIT,
        portionsPerProductionUnit:
            snapshot.portionsPerProductionUnit
                .toString(),
        saleBasis: snapshot.saleBasis,
        requiresRemediation: false,
    };
};

export {
    editableProductionFromSnapshot,
};
