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
) => [
    ...projection.sections.ingredients
        .map((line) => [
            'Ingrédient',
            line,
        ]),
    ...projection.sections.economat
        .map((line) => [
            'Économat',
            line,
        ]),
];

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
            'Version validée',
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

    rows.push(
        [],
        ['Composition'],
        [
            'Section',
            'Produit',
            'Quantité nette',
            'Unité nette',
            'Rendement (%)',
            'Quantité brute',
            'Unité brute',
            'Prix HT',
            'Unité du prix',
            'Coût ligne HT',
        ],
    );

    for (
        const [section, line]
        of compositionRows(projection)
    ) {
        rows.push([
            section,
            line.productName,
            line.netQuantity,
            line.netUnitLabel,
            line.yieldPercent,
            line.grossQuantity,
            line.grossUnitLabel,
            line.normalizedPriceHt,
            line.normalizedUnitLabel,
            line.lineCostHt,
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
            'Version validée',
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
            projection.production
                .unitLabel,
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

    const composition = [[
        'Section',
        'Produit',
        'Quantité nette',
        'Unité nette',
        'Rendement (%)',
        'Quantité brute',
        'Unité brute',
        'Prix HT',
        'Unité du prix',
        'Coût ligne HT',
    ]];

    for (
        const [section, line]
        of compositionRows(projection)
    ) {
        composition.push([
            section,
            neutralizeSpreadsheetText(
                line.productName,
            ),
            toFiniteNumber(
                line.netQuantity,
            ),
            line.netUnitLabel,
            toFiniteNumber(
                line.yieldPercent,
            ),
            toFiniteNumber(
                line.grossQuantity,
            ),
            line.grossUnitLabel,
            toFiniteNumber(
                line.normalizedPriceHt,
            ),
            line.normalizedUnitLabel,
            toFiniteNumber(
                line.lineCostHt,
            ),
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
        { wch: 14 },
        { wch: 34 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
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
