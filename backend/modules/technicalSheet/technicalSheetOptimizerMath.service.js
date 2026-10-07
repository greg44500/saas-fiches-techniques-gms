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
    TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS,
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

const interpolateCurvePressure = ({
    materialCostSharePercent,
    curve,
}) => {
    if (!curve.enabled) {
        return {
            numerator: 0n,
            denominator: 1n,
        };
    }

    const share =
        clampFraction({
            value:
                decimalFraction(
                    materialCostSharePercent,
                ),
            min: {
                numerator: 0n,
                denominator: 1n,
            },
            max: {
                numerator: 100n,
                denominator: 1n,
            },
        });

    const pointDefinitions =
        TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS;

    for (
        let index = 0;
        index < pointDefinitions.length - 1;
        index += 1
    ) {
        const left =
            pointDefinitions[index];
        const right =
            pointDefinitions[index + 1];
        const leftPosition = {
            numerator:
                BigInt(left.position),
            denominator: 1n,
        };
        const rightPosition = {
            numerator:
                BigInt(right.position),
            denominator: 1n,
        };

        if (
            compareFractions(
                share,
                rightPosition,
            ) > 0
        ) {
            continue;
        }

        const leftPressure = {
            numerator:
                BigInt(
                    curve.pressures[left.key],
                ),
            denominator: 1n,
        };
        const rightPressure = {
            numerator:
                BigInt(
                    curve.pressures[right.key],
                ),
            denominator: 1n,
        };
        const segmentProgress =
            divideFractions(
                subtractFractions(
                    share,
                    leftPosition,
                ),
                subtractFractions(
                    rightPosition,
                    leftPosition,
                ),
            );

        return addFractions(
            leftPressure,
            multiplyFractions(
                subtractFractions(
                    rightPressure,
                    leftPressure,
                ),
                segmentProgress,
            ),
        );
    }

    const last =
        pointDefinitions[
            pointDefinitions.length - 1
        ];

    return {
        numerator:
            BigInt(
                curve.pressures[last.key],
            ),
        denominator: 1n,
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
    materialCostSharePercent,
    curve,
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
        interpolateCurvePressure({
            materialCostSharePercent,
            curve,
        });

    if (adjustment.numerator === 0n) {
        return fractionToDecimal(
            reference,
        );
    }

    const factor =
        normalizeFraction({
            numerator:
                adjustment.numerator
                + (
                    adjustment.denominator
                    * 100n
                ),
            denominator:
                adjustment.denominator
                * 100n,
        });

    if (factor.numerator <= 0n) {
        throw new AppError(
            'L’ajustement économique doit conserver une quantité strictement positive.',
            400,
        );
    }

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

// Alias conservé à l’intérieur de M-005 pour limiter le bruit de migration
// des appels existants. Sa sémantique est désormais économique.
const applyCurveToQuantity =
    applyEconomicAdjustmentToQuantity;

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
    if (
        minNetQuantity === null
        || minNetQuantity === undefined
    ) {
        return null;
    }

    const reference =
        decimalFraction(
            referenceQuantity,
        );
    const minimum =
        decimalFraction(
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
    applyCurveToQuantity,
    applyEconomicAdjustmentToQuantity,
    assertOptimizationEnvelope,
    assertQuantityWithinEnvelope,
    buildQuarterStepTowardMinimum,
    calculateSavings,
    compareFractions,
    interpolateCurvePressure,
    isPositiveSaving,
};
