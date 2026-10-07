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
    if (compareFractions(value, min) < 0) {
        return min;
    }

    if (compareFractions(value, max) > 0) {
        return max;
    }

    return value;
};

const assertOptimizationEnvelope = ({
    referenceQuantity,
    minNetQuantity,
    maxNetQuantity,
}) => {
    const reference =
        decimalFraction(referenceQuantity);
    const minimum =
        decimalFraction(minNetQuantity);
    const maximum =
        decimalFraction(maxNetQuantity);

    if (
        minimum.numerator <= 0n
        || maximum.numerator <= 0n
        || reference.numerator <= 0n
        || compareFractions(minimum, reference) > 0
        || compareFractions(reference, maximum) > 0
    ) {
        throw new AppError(
            'Les bornes d’optimisation doivent être strictement positives et encadrer la quantité de référence.',
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

const applyCurveToQuantity = ({
    referenceQuantity,
    minNetQuantity,
    maxNetQuantity,
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

    const pressure =
        interpolateCurvePressure({
            materialCostSharePercent,
            curve,
        });

    if (pressure.numerator === 0n) {
        return fractionToDecimal(
            reference,
        );
    }

    const magnitude =
        normalizeFraction({
            numerator:
                pressure.numerator < 0n
                    ? -pressure.numerator
                    : pressure.numerator,
            denominator:
                pressure.denominator * 100n,
        });

    const availableDelta =
        pressure.numerator < 0n
            ? subtractFractions(
                reference,
                minimum,
            )
            : subtractFractions(
                maximum,
                reference,
            );

    const movement =
        multiplyFractions(
            availableDelta,
            magnitude,
        );

    const result =
        pressure.numerator < 0n
            ? subtractFractions(
                reference,
                movement,
            )
            : addFractions(
                reference,
                movement,
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
    minNetQuantity,
    maxNetQuantity,
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
        compareFractions(
            candidate,
            minimum,
        ) < 0
        || compareFractions(
            candidate,
            maximum,
        ) > 0
    ) {
        throw new AppError(
            'La quantité simulée dépasse les bornes d’optimisation.',
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
    assertOptimizationEnvelope,
    assertQuantityWithinEnvelope,
    buildQuarterStepTowardMinimum,
    calculateSavings,
    compareFractions,
    interpolateCurvePressure,
    isPositiveSaving,
};
