const TECHNICAL_SHEET_OPTIMIZATION_MODE = Object.freeze({
    MANUAL: 'MANUAL',
    AUTO: 'AUTO',
});

const TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS = Object.freeze([
    Object.freeze({
        key: 'VERY_LOW',
        label: 'Très faible',
        position: 0,
    }),
    Object.freeze({
        key: 'LOW',
        label: 'Faible',
        position: 25,
    }),
    Object.freeze({
        key: 'MEDIUM',
        label: 'Moyenne',
        position: 50,
    }),
    Object.freeze({
        key: 'HIGH',
        label: 'Forte',
        position: 75,
    }),
    Object.freeze({
        key: 'VERY_HIGH',
        label: 'Très forte',
        position: 100,
    }),
]);

const TECHNICAL_SHEET_OPTIMIZATION_NEUTRAL_CURVE =
    Object.freeze({
        enabled: true,
        pressures: Object.freeze({
            VERY_LOW: 0,
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            VERY_HIGH: 0,
        }),
    });

export {
    TECHNICAL_SHEET_OPTIMIZATION_CURVE_POINTS,
    TECHNICAL_SHEET_OPTIMIZATION_MODE,
    TECHNICAL_SHEET_OPTIMIZATION_NEUTRAL_CURVE,
};
