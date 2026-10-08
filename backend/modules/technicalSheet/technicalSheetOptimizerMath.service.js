import {
    addFractions,
    decimalFraction,
    divideFractions,
    fractionToDecimal,
    multiplyFractions,
    normalizeFraction,
    subtractFractions,
} from './technicalSheetMath.service.js';
import {
    TECHNICAL_SHEET_OPTIMIZATION_MAX_COST_ADJUSTMENT_PERCENT,
    TECHNICAL_SHEET_OPTIMIZATION_MIN_COST_ADJUSTMENT_PERCENT,
} from './technicalSheetOptimizer.registry.js';
import { AppError } from '../../utils/appError.js';

const compareFractions = (left, right) => {
    const delta =
        left.numerator * right.denominator
        - right.numerator * left.denominator;

    return delta < 0n
        ? -1
        : delta > 0n
            ? 1
            : 0;
};

const clampFraction = ({
    value,
    min,
    max,
}) => {
    if (
        min
        && compareFractions(
            value,
            min,
        ) < 0
    ) {
        return min;
    }

    if (
        max
        && compareFractions(
            value,
            max,
        ) > 0
    ) {
        return max;
    }

    return value;
};

const assertOptimizationEnvelope = ({
    referenceQuantity,
    minNetQuantity = null,
    maxNetQuantity = null,
}) => {
    const reference =
        decimalFraction(referenceQuantity);
    const minimum =
        minNetQuantity === null
        || minNetQuantity === undefined
            ? null
            : decimalFraction(
                minNetQuantity,
            );
    const maximum =
        maxNetQuantity === null
        || maxNetQuantity === undefined
            ? null
            : decimalFraction(
                maxNetQuantity,
            );

    const invalidReference =
        reference.numerator <= 0n;
    const invalidMinimum =
        minimum
        && (
            minimum.numerator <= 0n
            || compareFractions(
                minimum,
                reference,
            ) > 0
        );
    const invalidMaximum =
        maximum
        && (
            maximum.numerator <= 0n
            || compareFractions(
                reference,
                maximum,
            ) > 0
        );

    if (
        invalidReference
        || invalidMinimum
        || invalidMaximum
    ) {
        throw new AppError(
            'Les garde-fous d’optimisation doivent être strictement positifs et, lorsqu’ils existent, encadrer la quantité de référence.',
            400,
        );
    }

    return {
        reference,
        minimum,
        maximum,
    };
};

/**
 * Traduit une variation de coût de ligne en quantité lorsque l’économie
 * unitaire de la ligne reste inchangée. Les garde-fous min/max ne pilotent
 * plus le mouvement : ils ne font que borner le résultat lorsqu’ils existent.
 */
const applyEconomicAdjustmentToQuantity = ({
    referenceQuantity,
    minNetQuantity = null,
    maxNetQuantity = null,
    economicAdjustmentPercent = 0,
}) => {
    const {
        reference,
        minimum,
        maximum,
    } = assertOptimizationEnvelope({
        referenceQuantity,
        minNetQuantity,
        maxNetQuantity,
    });

    const adjustment =
        Number(
            economicAdjustmentPercent,
        );

    if (
        !Number.isInteger(adjustment)
        || adjustment
            < TECHNICAL_SHEET_OPTIMIZATION_MIN_COST_ADJUSTMENT_PERCENT
        || adjustment
            > TECHNICAL_SHEET_OPTIMIZATION_MAX_COST_ADJUSTMENT_PERCENT
    ) {
        throw new AppError(
            'L’ajustement économique doit respecter la plage M-005 autorisée.',
            400,
        );
    }

    if (adjustment === 0) {
        return fractionToDecimal(
            reference,
        );
    }

    const factor =
        normalizeFraction({
            numerator:
                BigInt(adjustment)
                + 100n,
            denominator: 100n,
        });

    const result =
        multiplyFractions(
            reference,
            factor,
        );

    return fractionToDecimal(
        clampFraction({
            value: result,
            min: minimum,
            max: maximum,
        }),
    );
};

const assertQuantityWithinEnvelope = ({
    quantity,
    referenceQuantity,
    minNetQuantity = null,
    maxNetQuantity = null,
}) => {
    const {
        minimum,
        maximum,
    } = assertOptimizationEnvelope({
        referenceQuantity,
        minNetQuantity,
        maxNetQuantity,
    });
    const candidate =
        decimalFraction(quantity);

    if (
        candidate.numerator <= 0n
        || (
            minimum
            && compareFractions(
                candidate,
                minimum,
            ) < 0
        )
        || (
            maximum
            && compareFractions(
                candidate,
                maximum,
            ) > 0
        )
    ) {
        throw new AppError(
            'La quantité simulée dépasse les garde-fous d’optimisation.',
            400,
        );
    }

    return fractionToDecimal(
        candidate,
    );
};

const calculateSavings = ({
    beforeManufacturingCostHt,
    afterManufacturingCostHt,
}) => {
    const before =
        decimalFraction(
            beforeManufacturingCostHt,
        );
    const after =
        decimalFraction(
            afterManufacturingCostHt,
        );
    const amount =
        subtractFractions(
            before,
            after,
        );

    if (before.numerator === 0n) {
        return {
            amountHt:
                fractionToDecimal(
                    amount,
                ),
            percent: '0',
        };
    }

    const percent =
        multiplyFractions(
            divideFractions(
                amount,
                before,
            ),
            {
                numerator: 100n,
                denominator: 1n,
            },
        );

    return {
        amountHt:
            fractionToDecimal(
                amount,
            ),
        percent:
            fractionToDecimal(
                percent,
            ),
    };
};

const isPositiveSaving = ({
    beforeManufacturingCostHt,
    afterManufacturingCostHt,
}) => (
    compareFractions(
        decimalFraction(
            beforeManufacturingCostHt,
        ),
        decimalFraction(
            afterManufacturingCostHt,
        ),
    ) > 0
);

const buildQuarterStepTowardMinimum = ({
    referenceQuantity,
    minNetQuantity,
}) => {
    const reference =
        decimalFraction(
            referenceQuantity,
        );
    const minimum =
        minNetQuantity === null
        || minNetQuantity === undefined
            ? multiplyFractions(
                reference,
                {
                    numerator: 1n,
                    denominator: 100n,
                },
            )
            : decimalFraction(
                minNetQuantity,
            );

    if (
        compareFractions(
            minimum,
            reference,
        ) >= 0
    ) {
        return null;
    }

    const movement =
        multiplyFractions(
            subtractFractions(
                reference,
                minimum,
            ),
            {
                numerator: 1n,
                denominator: 4n,
            },
        );

    return fractionToDecimal(
        subtractFractions(
            reference,
            movement,
        ),
    );
};

export {
    applyEconomicAdjustmentToQuantity,
    assertOptimizationEnvelope,
    assertQuantityWithinEnvelope,
    buildQuarterStepTowardMinimum,
    calculateSavings,
    compareFractions,
    isPositiveSaving,
};
