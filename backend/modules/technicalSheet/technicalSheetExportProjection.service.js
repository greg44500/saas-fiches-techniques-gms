import {
    TECHNICAL_SHEET_LINE_KIND,
} from './technicalSheet.registry.js';

const decimalToString = (value) => {
    if (
        value === null
        || value === undefined
    ) {
        return null;
    }

    if (
        typeof value === 'object'
        && typeof value.$numberDecimal === 'string'
    ) {
        return value.$numberDecimal;
    }

    return value.toString();
};

const getCountUnitLabel = ({
    quantity,
    singular,
    plural,
}) => {
    const numeric = Number(
        decimalToString(quantity),
    );

    if (
        Number.isFinite(numeric)
        && numeric === 1
        && singular
    ) {
        return singular;
    }

    return plural
        ?? singular
        ?? 'pièces';
};

const getExportUnitLabel = ({
    unit,
    quantity,
    countUnitLabelSingular,
    countUnitLabelPlural,
}) => {
    if (unit === 'UNIT') {
        return getCountUnitLabel({
            quantity,
            singular:
                countUnitLabelSingular,
            plural:
                countUnitLabelPlural,
        });
    }

    return {
        G: 'g',
        KG: 'kg',
        ML: 'ml',
        CL: 'cl',
        L: 'l',
    }[unit] ?? unit ?? '';
};

const buildLineProjection = (
    line,
) => ({
    kind: line.kind,
    productName:
        line.productVariantName,
    netQuantity:
        decimalToString(
            line.netQuantity,
        ),
    netUnit:
        line.inputUnit,
    netUnitLabel:
        getExportUnitLabel({
            unit: line.inputUnit,
            quantity:
                line.netQuantity,
            countUnitLabelSingular:
                line.countUnitLabelSingular,
            countUnitLabelPlural:
                line.countUnitLabelPlural,
        }),
    yieldPercent:
        decimalToString(
            line.yieldPercentUsed,
        ),
    grossQuantity:
        decimalToString(
            line.grossQuantity,
        ),
    grossUnit:
        line.grossUnit,
    grossUnitLabel:
        getExportUnitLabel({
            unit: line.grossUnit,
            quantity:
                line.grossQuantity,
            countUnitLabelSingular:
                line.countUnitLabelSingular,
            countUnitLabelPlural:
                line.countUnitLabelPlural,
        }),
    normalizedPriceHt:
        decimalToString(
            line.normalizedPriceHt,
        ),
    normalizedUnit:
        line.normalizedUnit,
    normalizedUnitLabel:
        getExportUnitLabel({
            unit: line.normalizedUnit,
            quantity: '1',
            countUnitLabelSingular:
                line.countUnitLabelSingular,
            countUnitLabelPlural:
                line.countUnitLabelPlural,
        }),
    lineCostHt:
        decimalToString(
            line.lineCostHt,
        ),
    order: line.order,
});

const buildTechnicalSheetExportProjection = ({
    validation,
}) => {
    if (!validation) {
        throw new TypeError(
            'validation is required',
        );
    }

    const sheet =
        validation.sheetSnapshot
            ?.toObject?.()
        ?? validation.sheetSnapshot;
    const economics =
        validation.economicSnapshot
            ?.toObject?.()
        ?? validation.economicSnapshot;

    if (
        !sheet
        || !economics
    ) {
        throw new TypeError(
            'validation snapshots are required',
        );
    }

    const lines =
        (validation.linesSnapshot ?? [])
            .map((line) => (
                line.toObject?.() ?? line
            ))
            .sort(
                (left, right) =>
                    left.order - right.order,
            )
            .map(buildLineProjection);

    const productionQuantity =
        decimalToString(
            sheet.productionQuantity,
        );

    return {
        validationId:
            validation._id
                ?.toString?.()
            ?? validation.id,
        technicalSheetId:
            validation.technicalSheet
                ?.toString?.()
            ?? validation.technicalSheetId,
        title:
            sheet.name,
        description:
            sheet.description ?? null,
        validatedAt:
            validation.validatedAt,
        production: {
            quantity:
                productionQuantity,
            unit:
                sheet.productionUnit,
            unitLabel:
                getExportUnitLabel({
                    unit:
                        sheet.productionUnit,
                    quantity:
                        productionQuantity,
                }),
            portionsPerProductionUnit:
                decimalToString(
                    sheet
                        .portionsPerProductionUnit,
                ),
            totalPortions:
                decimalToString(
                    economics.totalPortions,
                ),
            saleBasis:
                sheet.saleBasis,
            vatRateBasisPoints:
                sheet.vatRateBasisPoints,
            targetMarginBasisPoints:
                sheet.targetMarginBasisPoints,
        },
        sections: {
            ingredients:
                lines.filter(
                    (line) =>
                        line.kind
                        === TECHNICAL_SHEET_LINE_KIND
                            .INGREDIENT,
                ),
            economat:
                lines.filter(
                    (line) =>
                        line.kind
                        === TECHNICAL_SHEET_LINE_KIND
                            .ECONOMAT,
                ),
        },
        analysis: {
            materialCostHt:
                decimalToString(
                    economics
                        .materialCostHt,
                ),
            economatCostHt:
                decimalToString(
                    economics
                        .economatCostHt,
                ),
            manufacturingCostHt:
                decimalToString(
                    economics
                        .manufacturingCostHt,
                ),
            materialCostPerProductionUnitHt:
                decimalToString(
                    economics
                        .materialCostPerProductionUnitHt,
                ),
            manufacturingCostPerProductionUnitHt:
                decimalToString(
                    economics
                        .manufacturingCostPerProductionUnitHt,
                ),
            materialCostPerPortionHt:
                decimalToString(
                    economics
                        .materialCostPerPortionHt,
                ),
            economatCostPerPortionHt:
                decimalToString(
                    economics
                        .economatCostPerPortionHt,
                ),
            manufacturingCostPerPortionHt:
                decimalToString(
                    economics
                        .manufacturingCostPerPortionHt,
                ),
            advisedPriceTtcMinor:
                economics
                    .advisedPriceTtcMinor,
            finalPriceTtcMinor:
                economics
                    .finalPriceTtcMinor,
            actualMarginBasisPoints:
                economics
                    .actualMarginBasisPoints,
        },
    };
};

export {
    buildTechnicalSheetExportProjection,
    decimalToString,
    getExportUnitLabel,
};
