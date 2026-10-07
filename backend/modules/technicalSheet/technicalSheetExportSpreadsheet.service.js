import * as XLSX from '@e965/xlsx';

const FORMULA_PREFIX_PATTERN =
    /^[=+\-@\t\r]/;

const neutralizeSpreadsheetText = (
    value,
) => {
    if (typeof value !== 'string') {
        return value;
    }

    return FORMULA_PREFIX_PATTERN
        .test(value)
        ? "'" + value
        : value;
};

const toFiniteNumber = (value) => {
    if (
        value === null
        || value === undefined
        || value === ''
    ) {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : null;
};

const minorToCurrency = (value) => (
    Number.isInteger(value)
        ? value / 100
        : null
);

const basisPointsToPercent = (
    value,
) => (
    Number.isInteger(value)
        ? value / 100
        : null
);

const compositionRows = (
    projection,
) => (
    projection.lines
    ?? [
        ...projection.sections.ingredients,
        ...projection.sections.economat,
    ]
);

const analysisRows = (
    projection,
) => [
    [
        'Coût matière HT (€)',
        toFiniteNumber(
            projection.analysis
                .materialCostHt,
        ),
    ],
    [
        'Coût Économat HT (€)',
        toFiniteNumber(
            projection.analysis
                .economatCostHt,
        ),
    ],
    [
        'Coût de fabrication HT (€)',
        toFiniteNumber(
            projection.analysis
                .manufacturingCostHt,
        ),
    ],
    [
        'Coût matière / pièce HT (€)',
        toFiniteNumber(
            projection.analysis
                .materialCostPerProductionUnitHt,
        ),
    ],
    [
        'Coût de fabrication / pièce HT (€)',
        toFiniteNumber(
            projection.analysis
                .manufacturingCostPerProductionUnitHt,
        ),
    ],
    [
        'Coût matière / portion HT (€)',
        toFiniteNumber(
            projection.analysis
                .materialCostPerPortionHt,
        ),
    ],
    [
        'Coût Économat / portion HT (€)',
        toFiniteNumber(
            projection.analysis
                .economatCostPerPortionHt,
        ),
    ],
    [
        'Coût de fabrication / portion HT (€)',
        toFiniteNumber(
            projection.analysis
                .manufacturingCostPerPortionHt,
        ),
    ],
    [
        'TVA (%)',
        basisPointsToPercent(
            projection.production
                .vatRateBasisPoints,
        ),
    ],
    [
        'Marge cible (%)',
        basisPointsToPercent(
            projection.production
                .targetMarginBasisPoints,
        ),
    ],
    [
        'Prix conseillé TTC (€)',
        minorToCurrency(
            projection.analysis
                .advisedPriceTtcMinor,
        ),
    ],
    [
        'Prix retenu TTC (€)',
        minorToCurrency(
            projection.analysis
                .finalPriceTtcMinor,
        ),
    ],
    [
        'Marge réelle (%)',
        basisPointsToPercent(
            projection.analysis
                .actualMarginBasisPoints,
        ),
    ],
];

const csvCell = (value) => {
    const safe =
        neutralizeSpreadsheetText(
            value,
        );
    const text =
        String(safe ?? '')
            .replaceAll('"', '""');

    return '"' + text + '"';
};

const buildTechnicalSheetCsv = (
    projection,
) => {
    const rows = [
        [
            'Fiche technique',
            projection.title,
        ],
        [
            'Version du',
            new Date(
                projection.validatedAt,
            ).toLocaleString('fr-FR'),
        ],
        [
            'Quantité produite',
            projection.production.quantity,
            projection.production.unitLabel,
        ],
        [
            'Portions / pièce',
            projection.production
                .portionsPerProductionUnit,
        ],
        [
            'Total portions',
            projection.production
                .totalPortions,
        ],
    ];

    if (projection.description) {
        rows.push([
            'Description',
            projection.description,
        ]);
    }

    const compositionLines =
        compositionRows(projection);
    const hasNotes =
        compositionLines.some(
            (line) =>
                Boolean(
                    line.note?.trim?.(),
                ),
        );

    rows.push(
        [],
        ['Composition'],
        [
            'Produit',
            'Quantité',
            'Unité',
            'Prix HT',
            'Unité du prix',
            'Coût ligne HT',
            ...(hasNotes
                ? ['Note']
                : []),
        ],
    );

    for (
        const line
        of compositionLines
    ) {
        rows.push([
            line.productName,
            line.netQuantity,
            line.netUnitLabel,
            line.normalizedPriceHt,
            line.normalizedUnitLabel,
            line.lineCostHt,
            ...(hasNotes
                ? [line.note ?? '']
                : []),
        ]);
    }

    rows.push(
        [],
        ['Analyse figée'],
        ['Indicateur', 'Valeur'],
        ...analysisRows(projection),
    );

    return Buffer.from(
        '\uFEFF'
        + rows
            .map((row) =>
                row.map(csvCell)
                    .join(';'))
            .join('\r\n'),
        'utf8',
    );
};

const buildTechnicalSheetXlsx = (
    projection,
) => {
    const workbook =
        XLSX.utils.book_new();

    const overviewRows = [
        [
            'Fiche technique',
            neutralizeSpreadsheetText(
                projection.title,
            ),
        ],
        [
            'Version du',
            new Date(
                projection.validatedAt,
            ),
        ],
        [
            'Quantité produite',
            toFiniteNumber(
                projection.production
                    .quantity,
            ),
        ],
        [
            'Unité de production',
            neutralizeSpreadsheetText(
                projection.production
                    .unitLabel,
            ),
        ],
        [
            'Portions / pièce',
            toFiniteNumber(
                projection.production
                    .portionsPerProductionUnit,
            ),
        ],
        [
            'Total portions',
            toFiniteNumber(
                projection.production
                    .totalPortions,
            ),
        ],
        [
            'Description',
            neutralizeSpreadsheetText(
                projection.description
                ?? '',
            ),
        ],
    ];

    const compositionLines =
        compositionRows(projection);
    const hasNotes =
        compositionLines.some(
            (line) =>
                Boolean(
                    line.note?.trim?.(),
                ),
        );
    const composition = [[
        'Produit',
        'Quantité',
        'Unité',
        'Prix HT',
        'Unité du prix',
        'Coût ligne HT',
        ...(hasNotes
            ? ['Note']
            : []),
    ]];

    for (
        const line
        of compositionLines
    ) {
        composition.push([
            neutralizeSpreadsheetText(
                line.productName,
            ),
            toFiniteNumber(
                line.netQuantity,
            ),
            neutralizeSpreadsheetText(
                line.netUnitLabel,
            ),
            toFiniteNumber(
                line.normalizedPriceHt,
            ),
            neutralizeSpreadsheetText(
                line.normalizedUnitLabel,
            ),
            toFiniteNumber(
                line.lineCostHt,
            ),
            ...(hasNotes
                ? [
                    neutralizeSpreadsheetText(
                        line.note ?? '',
                    ),
                ]
                : []),
        ]);
    }

    const overviewSheet =
        XLSX.utils.aoa_to_sheet(
            overviewRows,
        );
    const compositionSheet =
        XLSX.utils.aoa_to_sheet(
            composition,
        );
    const analysisSheet =
        XLSX.utils.aoa_to_sheet([
            [
                'Indicateur',
                'Valeur',
            ],
            ...analysisRows(projection),
        ]);

    overviewSheet['!cols'] = [
        { wch: 24 },
        { wch: 48 },
    ];
    compositionSheet['!cols'] = [
        { wch: 38 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        ...(hasNotes
            ? [{ wch: 42 }]
            : []),
    ];
    analysisSheet['!cols'] = [
        { wch: 40 },
        { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(
        workbook,
        overviewSheet,
        'Fiche',
    );
    XLSX.utils.book_append_sheet(
        workbook,
        compositionSheet,
        'Composition',
    );
    XLSX.utils.book_append_sheet(
        workbook,
        analysisSheet,
        'Analyse',
    );

    return Buffer.from(
        XLSX.write(
            workbook,
            {
                type: 'buffer',
                bookType: 'xlsx',
            },
        ),
    );
};

export {
    analysisRows,
    buildTechnicalSheetCsv,
    buildTechnicalSheetXlsx,
    neutralizeSpreadsheetText,
};
