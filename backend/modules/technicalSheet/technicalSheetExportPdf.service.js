const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN_X = 30;
const TOP = 558;
const BOTTOM = 30;
const CONTENT_WIDTH =
    PAGE_WIDTH - (MARGIN_X * 2);
const MAIN_GAP = 16;
const COMPOSITION_WIDTH = 486;
const ANALYSIS_WIDTH =
    CONTENT_WIDTH
    - COMPOSITION_WIDTH
    - MAIN_GAP;

const PDF_GRAY = Object.freeze({
    BORDER: 0.8,
    MUTED: 0.42,
    SOFT: 0.965,
    TABLE_HEADER: 0.91,
    WHITE: 1,
});

const COMPOSITION_COLUMNS = Object.freeze({
    WITHOUT_NOTE: Object.freeze([
        Object.freeze({
            key: 'product',
            label: 'Produit',
            width: 240,
            align: 'left',
        }),
        Object.freeze({
            key: 'quantity',
            label: 'Quantité',
            width: 78,
            align: 'right',
        }),
        Object.freeze({
            key: 'price',
            label: 'Prix HT',
            width: 92,
            align: 'right',
        }),
        Object.freeze({
            key: 'cost',
            label: 'Coût HT',
            width: 76,
            align: 'right',
        }),
    ]),
    WITH_NOTE: Object.freeze([
        Object.freeze({
            key: 'product',
            label: 'Produit',
            width: 165,
            align: 'left',
        }),
        Object.freeze({
            key: 'quantity',
            label: 'Quantité',
            width: 70,
            align: 'right',
        }),
        Object.freeze({
            key: 'price',
            label: 'Prix HT',
            width: 86,
            align: 'right',
        }),
        Object.freeze({
            key: 'cost',
            label: 'Coût HT',
            width: 70,
            align: 'right',
        }),
        Object.freeze({
            key: 'note',
            label: 'Note',
            width: 95,
            align: 'left',
        }),
    ]),
});

const CP1252 = new Map([
    [0x20AC, 0x80],
    [0x2018, 0x91],
    [0x2019, 0x92],
    [0x201C, 0x93],
    [0x201D, 0x94],
    [0x2022, 0x95],
    [0x2013, 0x96],
    [0x2014, 0x97],
    [0x0152, 0x8C],
    [0x0153, 0x9C],
    [0x0178, 0x9F],
]);

const encodeWinAnsiHex = (value) => {
    const bytes = [];

    for (
        const character
        of String(value ?? '')
    ) {
        const code =
            character.codePointAt(0);

        if (CP1252.has(code)) {
            bytes.push(
                CP1252.get(code),
            );
        } else if (code <= 0xFF) {
            bytes.push(code);
        } else {
            bytes.push(0x3F);
        }
    }

    return Buffer.from(bytes)
        .toString('hex')
        .toUpperCase();
};

const estimateTextWidth = (
    value,
    size,
) => (
    String(value ?? '').length
    * size
    * 0.5
);

const truncateTextByWidth = (
    value,
    width,
    size,
) => {
    const text =
        String(value ?? '');

    if (
        estimateTextWidth(
            text,
            size,
        ) <= width
    ) {
        return text;
    }

    const suffix = '…';
    let truncated = text;

    while (
        truncated
        && estimateTextWidth(
            truncated + suffix,
            size,
        ) > width
    ) {
        truncated =
            truncated.slice(0, -1);
    }

    return truncated
        + suffix;
};

const wrapTextByWidth = (
    value,
    width,
    size,
) => {
    const text =
        String(value ?? '').trim();

    if (!text) return [''];

    const words =
        text.split(/\s+/)
            .filter(Boolean);
    const lines = [];
    let current = '';

    const fits = (candidate) =>
        estimateTextWidth(
            candidate,
            size,
        ) <= width;

    for (const word of words) {
        const candidate =
            current
                ? current + ' ' + word
                : word;

        if (fits(candidate)) {
            current = candidate;
            continue;
        }

        if (current) {
            lines.push(current);
            current = '';
        }

        if (fits(word)) {
            current = word;
            continue;
        }

        let fragment = '';

        for (const character of word) {
            const next =
                fragment + character;

            if (
                fragment
                && !fits(next)
            ) {
                lines.push(fragment);
                fragment = character;
            } else {
                fragment = next;
            }
        }

        current = fragment;
    }

    if (current) {
        lines.push(current);
    }

    return lines;
};

const textCommand = ({
    x,
    y,
    size,
    bold = false,
    text,
    gray = 0,
}) => (
    gray
    + ' g BT /'
    + (bold ? 'F2' : 'F1')
    + ' '
    + size
    + ' Tf 1 0 0 1 '
    + x
    + ' '
    + y
    + ' Tm <'
    + encodeWinAnsiHex(text)
    + '> Tj ET 0 g'
);

const rectangleCommand = ({
    x,
    top,
    width,
    height,
    fillGray = null,
    strokeGray =
        PDF_GRAY.BORDER,
    lineWidth = 0.5,
}) => {
    const bottom =
        top - height;
    const commands = ['q'];

    if (fillGray !== null) {
        commands.push(
            fillGray + ' g',
        );
    }

    commands.push(
        strokeGray + ' G',
        lineWidth + ' w',
        x
        + ' '
        + bottom
        + ' '
        + width
        + ' '
        + height
        + ' re',
        fillGray === null
            ? 'S'
            : 'B',
        'Q',
    );

    return commands.join(' ');
};

const lineCommand = ({
    x1,
    y1,
    x2,
    y2,
    gray = PDF_GRAY.BORDER,
    lineWidth = 0.5,
}) => (
    'q '
    + gray
    + ' G '
    + lineWidth
    + ' w '
    + x1
    + ' '
    + y1
    + ' m '
    + x2
    + ' '
    + y2
    + ' l S Q'
);

const decimalCurrency = (value) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return 'NC';
    }

    return parsed.toLocaleString(
        'fr-FR',
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    ) + ' €';
};

const minorCurrency = (value) => {
    if (!Number.isInteger(value)) {
        return 'NC';
    }

    return (value / 100)
        .toLocaleString(
            'fr-FR',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            },
        ) + ' €';
};

const basisPoints = (value) => {
    if (!Number.isInteger(value)) {
        return 'NC';
    }

    return (value / 100)
        .toLocaleString(
            'fr-FR',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
            },
        ) + ' %';
};

const formatQuantity = (
    value,
    label,
) => {
    if (
        value === null
        || value === undefined
    ) {
        return 'NC';
    }

    return (
        String(value).replace('.', ',')
        + (
            label
                ? ' ' + label
                : ''
        )
    );
};

const hasNumericValue = (value) => (
    value !== null
    && value !== undefined
    && Number.isFinite(
        Number(value),
    )
);

const isNonZero = (value) => (
    hasNumericValue(value)
    && Math.abs(
        Number(value),
    ) > 0.0000001
);

const sameNumericValue = (
    left,
    right,
) => (
    hasNumericValue(left)
    && hasNumericValue(right)
    && Number(left) === Number(right)
);

const createCompositionColumns = (
    hasNotes,
) => (
    hasNotes
        ? COMPOSITION_COLUMNS.WITH_NOTE
        : COMPOSITION_COLUMNS.WITHOUT_NOTE
);

const buildAnalysisGroups = (
    projection,
) => {
    const {
        analysis,
        production,
    } = projection;
    const costs = [];
    const commercial = [];
    const hasEconomat =
        isNonZero(
            analysis.economatCostHt,
        );

    if (
        hasNumericValue(
            analysis.materialCostHt,
        )
    ) {
        costs.push({
            label:
                'Coût matière HT',
            value:
                decimalCurrency(
                    analysis.materialCostHt,
                ),
        });
    }

    if (hasEconomat) {
        costs.push(
            {
                label:
                    'Coût Économat HT',
                value:
                    decimalCurrency(
                        analysis.economatCostHt,
                    ),
            },
            {
                label:
                    'Coût total HT',
                value:
                    decimalCurrency(
                        analysis.manufacturingCostHt,
                    ),
            },
        );
    } else if (
        hasNumericValue(
            analysis.manufacturingCostHt,
        )
        && !sameNumericValue(
            analysis.materialCostHt,
            analysis.manufacturingCostHt,
        )
    ) {
        costs.push({
            label:
                'Coût total HT',
            value:
                decimalCurrency(
                    analysis.manufacturingCostHt,
                ),
        });
    }

    if (
        hasNumericValue(
            analysis
                .manufacturingCostPerProductionUnitHt,
        )
    ) {
        costs.push({
            label:
                production.unit === 'UNIT'
                    ? 'Coût / pièce HT'
                    : 'Coût / unité produite HT',
            value:
                decimalCurrency(
                    analysis
                        .manufacturingCostPerProductionUnitHt,
                ),
        });
    }

    if (
        hasNumericValue(
            analysis
                .manufacturingCostPerPortionHt,
        )
    ) {
        costs.push({
            label:
                'Coût / portion HT',
            value:
                decimalCurrency(
                    analysis
                        .manufacturingCostPerPortionHt,
                ),
        });
    }

    const samePrices =
        Number.isInteger(
            analysis.advisedPriceTtcMinor,
        )
        && Number.isInteger(
            analysis.finalPriceTtcMinor,
        )
        && analysis.advisedPriceTtcMinor
            === analysis.finalPriceTtcMinor;

    if (samePrices) {
        commercial.push({
            label: 'Prix TTC',
            value:
                minorCurrency(
                    analysis.finalPriceTtcMinor,
                ),
        });
    } else {
        if (
            Number.isInteger(
                analysis.advisedPriceTtcMinor,
            )
        ) {
            commercial.push({
                label:
                    'Prix conseillé TTC',
                value:
                    minorCurrency(
                        analysis.advisedPriceTtcMinor,
                    ),
            });
        }

        if (
            Number.isInteger(
                analysis.finalPriceTtcMinor,
            )
        ) {
            commercial.push({
                label:
                    'Prix retenu TTC',
                value:
                    minorCurrency(
                        analysis.finalPriceTtcMinor,
                    ),
            });
        }
    }

    if (
        Number.isInteger(
            analysis.actualMarginBasisPoints,
        )
    ) {
        commercial.push({
            label:
                'Marge réelle',
            value:
                basisPoints(
                    analysis
                        .actualMarginBasisPoints,
                ),
        });
    }

    if (
        Number.isInteger(
            production.targetMarginBasisPoints,
        )
    ) {
        commercial.push({
            label:
                'Marge cible',
            value:
                basisPoints(
                    production
                        .targetMarginBasisPoints,
                ),
        });
    }

    if (
        Number.isInteger(
            production.vatRateBasisPoints,
        )
    ) {
        commercial.push({
            label: 'TVA',
            value:
                basisPoints(
                    production
                        .vatRateBasisPoints,
                ),
        });
    }

    return [
        {
            label: 'Coûts',
            rows: costs,
        },
        {
            label:
                'Prix et marge',
            rows: commercial,
        },
    ].filter(
        ({ rows }) =>
            rows.length > 0,
    );
};

const buildTechnicalSheetPdfLayout = (
    projection,
) => {
    const sourceLines =
        projection.lines
        ?? [
            ...projection.sections.ingredients,
            ...projection.sections.economat,
        ];
    const hasNotes =
        sourceLines.some(
            (line) =>
                Boolean(
                    line.note?.trim?.(),
                ),
        );

    return {
        document: {
            orientation: 'landscape',
            pageSize: 'A4',
            singlePage: true,
        },
        grid: {
            compositionWidth:
                COMPOSITION_WIDTH,
            analysisWidth:
                ANALYSIS_WIDTH,
            gap: MAIN_GAP,
        },
        title:
            projection.title,
        description:
            projection.description
            ?? null,
        versionAt:
            projection.validatedAt,
        summaryItems: [
            {
                label:
                    'Quantité produite',
                value:
                    formatQuantity(
                        projection.production
                            .quantity,
                        projection.production
                            .unitLabel,
                    ),
            },
            {
                label:
                    'Portions / pièce',
                value:
                    projection.production
                        .portionsPerProductionUnit
                    ?? 'NC',
            },
            {
                label:
                    'Total',
                value:
                    (
                        projection.production
                            .totalPortions
                        ?? 'NC'
                    )
                    + (
                        projection.production
                            .totalPortions
                            !== null
                        && projection.production
                            .totalPortions
                            !== undefined
                            ? ' portions'
                            : ''
                    ),
            },
        ],
        composition: {
            columns:
                createCompositionColumns(
                    hasNotes,
                ),
            rows:
                sourceLines.map(
                    (line) => ({
                        product:
                            line.productName,
                        quantity:
                            formatQuantity(
                                line.netQuantity,
                                line.netUnitLabel,
                            ),
                        price:
                            decimalCurrency(
                                line.normalizedPriceHt,
                            )
                            + ' / '
                            + line.normalizedUnitLabel,
                        cost:
                            decimalCurrency(
                                line.lineCostHt,
                            ),
                        ...(hasNotes
                            ? {
                                note:
                                    line.note
                                    ?? '',
                            }
                            : {}),
                    }),
                ),
        },
        analysis: {
            groups:
                buildAnalysisGroups(
                    projection,
                ),
        },
    };
};

const createPageCanvas = () => {
    const commands = [];

    const add = (command) => {
        commands.push(command);
    };

    const textAt = ({
        x,
        baseline,
        value,
        size = 8,
        bold = false,
        gray = 0,
        align = 'left',
        width = null,
    }) => {
        let resolvedX = x;

        if (
            align === 'right'
            && width !== null
        ) {
            resolvedX =
                x
                + width
                - estimateTextWidth(
                    value,
                    size,
                );
        }

        add(
            textCommand({
                x: resolvedX,
                y: baseline,
                size,
                bold,
                gray,
                text: value,
            }),
        );
    };

    return {
        add,
        rectangle(options) {
            add(
                rectangleCommand(
                    options,
                ),
            );
        },
        stream() {
            return commands.join(
                '\n',
            );
        },
        textAt,
    };
};

const drawDocumentHeader = ({
    canvas,
    layout,
}) => {
    let y = TOP;

    canvas.textAt({
        x: MARGIN_X,
        baseline: y,
        value:
            layout.title,
        size: 19,
        bold: true,
    });

    canvas.textAt({
        x:
            PAGE_WIDTH
            - MARGIN_X
            - 190,
        baseline: y,
        width: 190,
        align: 'right',
        value:
            'Version du '
            + new Date(
                layout.versionAt,
            ).toLocaleDateString(
                'fr-FR',
            ),
        size: 7.5,
        gray:
            PDF_GRAY.MUTED,
    });

    y -= 22;

    if (layout.description) {
        const descriptionLines =
            wrapTextByWidth(
                layout.description,
                610,
                7.5,
            );

        for (
            const line
            of descriptionLines
        ) {
            canvas.textAt({
                x: MARGIN_X,
                baseline: y,
                value: line,
                size: 7.5,
                gray:
                    PDF_GRAY.MUTED,
            });
            y -= 9;
        }

        y -= 2;
    }

    const summaryTop = y;
    const summaryHeight = 27;
    const summaryWidth =
        CONTENT_WIDTH
        / layout.summaryItems.length;

    layout.summaryItems.forEach(
        (item, index) => {
            const x =
                MARGIN_X
                + (
                    index
                    * summaryWidth
                );

            if (index > 0) {
                canvas.add(
                    lineCommand({
                        x1: x,
                        y1:
                            summaryTop - 4,
                        x2: x,
                        y2:
                            summaryTop
                            - summaryHeight
                            + 4,
                        gray: 0.86,
                    }),
                );
            }

            canvas.textAt({
                x: x + 8,
                baseline:
                    summaryTop - 10,
                value:
                    item.label,
                size: 6.7,
                gray:
                    PDF_GRAY.MUTED,
            });
            canvas.textAt({
                x: x + 8,
                baseline:
                    summaryTop - 22,
                value:
                    item.value,
                size: 9,
                bold: true,
            });
        },
    );

    y -= summaryHeight + 8;

    canvas.add(
        lineCommand({
            x1: MARGIN_X,
            y1: y,
            x2:
                PAGE_WIDTH
                - MARGIN_X,
            y2: y,
            gray: 0.78,
        }),
    );

    return y - 16;
};

const measureCompositionRows = ({
    columns,
    rows,
    fontSize,
    lineHeight,
    paddingX,
    paddingY,
}) => (
    rows.map((row) => {
        const cells = {};

        for (const column of columns) {
            cells[column.key] =
                wrapTextByWidth(
                    row[column.key],
                    column.width
                        - (
                            paddingX
                            * 2
                        ),
                    fontSize,
                );
        }

        const maxLines =
            Math.max(
                1,
                ...Object.values(
                    cells,
                ).map(
                    (lines) =>
                        lines.length,
                ),
            );

        return {
            cells,
            height:
                (
                    maxLines
                    * lineHeight
                )
                + (
                    paddingY
                    * 2
                ),
        };
    })
);

const resolveCompositionTableMetrics = ({
    columns,
    rows,
    availableHeight,
}) => {
    const headerHeight = 20;
    let fontSize = 7.4;

    while (fontSize >= 3.6) {
        const lineHeight =
            fontSize + 1.5;
        const paddingX =
            Math.max(
                2.5,
                fontSize * 0.55,
            );
        const paddingY =
            Math.max(
                1.2,
                fontSize * 0.38,
            );
        const measuredRows =
            measureCompositionRows({
                columns,
                rows,
                fontSize,
                lineHeight,
                paddingX,
                paddingY,
            });
        const rowsHeight =
            measuredRows.reduce(
                (
                    total,
                    row,
                ) =>
                    total
                    + row.height,
                0,
            );

        if (
            headerHeight
            + rowsHeight
            <= availableHeight
        ) {
            return {
                fontSize,
                headerHeight,
                lineHeight,
                measuredRows,
                paddingX,
                paddingY,
            };
        }

        fontSize -= 0.2;
    }

    const fontSizeFallback = 3.4;
    const lineHeight =
        fontSizeFallback + 1.2;
    const paddingX = 2;
    const paddingY = 0.8;
    const measuredRows =
        measureCompositionRows({
            columns,
            rows,
            fontSize:
                fontSizeFallback,
            lineHeight,
            paddingX,
            paddingY,
        });
    const naturalHeight =
        headerHeight
        + measuredRows.reduce(
            (
                total,
                row,
            ) =>
                total + row.height,
            0,
        );
    const scale =
        naturalHeight
        > availableHeight
            ? availableHeight
                / naturalHeight
            : 1;

    return {
        fontSize:
            fontSizeFallback
            * scale,
        headerHeight:
            headerHeight
            * scale,
        lineHeight:
            lineHeight
            * scale,
        measuredRows:
            measuredRows.map(
                (row) => ({
                    cells:
                        row.cells,
                    height:
                        row.height
                        * scale,
                }),
            ),
        paddingX:
            paddingX
            * scale,
        paddingY:
            paddingY
            * scale,
    };
};

const drawComposition = ({
    canvas,
    layout,
    top,
}) => {
    const x = MARGIN_X;
    const titleHeight = 22;
    const tableTop =
        top - titleHeight;
    const availableHeight =
        tableTop - BOTTOM;
    const {
        columns,
        rows,
    } = layout.composition;
    const metrics =
        resolveCompositionTableMetrics({
            columns,
            rows,
            availableHeight,
        });

    canvas.textAt({
        x,
        baseline: top,
        value: 'Composition',
        size: 10.5,
        bold: true,
    });

    let cursorY = tableTop;
    let columnX = x;

    for (const column of columns) {
        canvas.rectangle({
            x: columnX,
            top: cursorY,
            width:
                column.width,
            height:
                metrics.headerHeight,
            fillGray:
                PDF_GRAY.TABLE_HEADER,
        });
        canvas.textAt({
            x:
                columnX
                + metrics.paddingX,
            baseline:
                cursorY
                - (
                    metrics.headerHeight
                    / 2
                )
                - 2,
            width:
                column.width
                - (
                    metrics.paddingX
                    * 2
                ),
            align:
                column.align,
            value:
                column.label,
            size:
                Math.max(
                    4.5,
                    metrics.fontSize,
                ),
            bold: true,
        });
        columnX +=
            column.width;
    }

    cursorY -=
        metrics.headerHeight;

    rows.forEach(
        (row, rowIndex) => {
            const rowMetrics =
                metrics
                    .measuredRows[
                        rowIndex
                    ];
            let cellX = x;

            for (const column of columns) {
                canvas.rectangle({
                    x: cellX,
                    top: cursorY,
                    width:
                        column.width,
                    height:
                        rowMetrics.height,
                    fillGray:
                        rowIndex % 2 === 1
                            ? 0.987
                            : PDF_GRAY.WHITE,
                });

                const lines =
                    rowMetrics.cells[
                        column.key
                    ];

                lines.forEach(
                    (
                        line,
                        lineIndex,
                    ) => {
                        canvas.textAt({
                            x:
                                cellX
                                + metrics.paddingX,
                            baseline:
                                cursorY
                                - metrics.paddingY
                                - metrics.fontSize
                                - (
                                    lineIndex
                                    * metrics.lineHeight
                                ),
                            width:
                                column.width
                                - (
                                    metrics.paddingX
                                    * 2
                                ),
                            align:
                                column.align,
                            value: line,
                            size:
                                metrics.fontSize,
                        });
                    },
                );

                cellX +=
                    column.width;
            }

            cursorY -=
                rowMetrics.height;
        },
    );
};

const drawAnalysis = ({
    canvas,
    layout,
    top,
}) => {
    const x =
        MARGIN_X
        + COMPOSITION_WIDTH
        + MAIN_GAP;
    const labelWidth =
        ANALYSIS_WIDTH * 0.66;
    const valueWidth =
        ANALYSIS_WIDTH
        - labelWidth;
    let y = top;

    canvas.textAt({
        x,
        baseline: y,
        value: 'Analyse',
        size: 10.5,
        bold: true,
    });

    y -= 22;

    for (
        const group
        of layout.analysis.groups
    ) {
        canvas.textAt({
            x,
            baseline: y,
            value:
                group.label,
            size: 7.2,
            bold: true,
            gray:
                PDF_GRAY.MUTED,
        });

        y -= 11;

        group.rows.forEach(
            (row, rowIndex) => {
                const rowHeight = 20;
                const fillGray =
                    rowIndex % 2 === 1
                        ? 0.987
                        : PDF_GRAY.WHITE;

                canvas.rectangle({
                    x,
                    top: y,
                    width:
                        ANALYSIS_WIDTH,
                    height:
                        rowHeight,
                    fillGray,
                });

                canvas.textAt({
                    x: x + 7,
                    baseline:
                        y - 13,
                    width:
                        labelWidth - 12,
                    value:
                        truncateTextByWidth(
                            row.label,
                            labelWidth - 12,
                            7.2,
                        ),
                    size: 7.2,
                });

                canvas.textAt({
                    x:
                        x
                        + labelWidth,
                    baseline:
                        y - 13,
                    width:
                        valueWidth - 7,
                    align: 'right',
                    value:
                        row.value,
                    size: 7.5,
                    bold: true,
                });

                y -= rowHeight;
            },
        );

        y -= 12;
    }
};

const buildPdfBuffer = (
    stream,
) => {
    const objects = [];

    const add = (body) => {
        objects.push(body);
        return objects.length;
    };

    const catalogId = add('');
    const pagesId = add('');
    const fontId = add(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    );
    const boldFontId = add(
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );
    const contentId = add(
        '<< /Length '
        + Buffer.byteLength(
            stream,
            'ascii',
        )
        + ' >>\nstream\n'
        + stream
        + '\nendstream',
    );
    const pageId = add(
        '<< /Type /Page /Parent '
        + pagesId
        + ' 0 R /MediaBox [0 0 '
        + PAGE_WIDTH
        + ' '
        + PAGE_HEIGHT
        + '] /Resources << /Font << /F1 '
        + fontId
        + ' 0 R /F2 '
        + boldFontId
        + ' 0 R >> >> /Contents '
        + contentId
        + ' 0 R >>',
    );

    objects[catalogId - 1] =
        '<< /Type /Catalog /Pages '
        + pagesId
        + ' 0 R >>';
    objects[pagesId - 1] =
        '<< /Type /Pages /Count 1 /Kids ['
        + pageId
        + ' 0 R] >>';

    let pdf =
        '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];

    objects.forEach(
        (body, index) => {
            offsets.push(
                Buffer.byteLength(
                    pdf,
                    'latin1',
                ),
            );
            pdf +=
                (index + 1)
                + ' 0 obj\n'
                + body
                + '\nendobj\n';
        },
    );

    const xrefOffset =
        Buffer.byteLength(
            pdf,
            'latin1',
        );

    pdf +=
        'xref\n0 '
        + (objects.length + 1)
        + '\n'
        + '0000000000 65535 f \n';

    for (
        let index = 1;
        index <= objects.length;
        index += 1
    ) {
        pdf +=
            String(offsets[index])
                .padStart(10, '0')
            + ' 00000 n \n';
    }

    pdf +=
        'trailer\n<< /Size '
        + (objects.length + 1)
        + ' /Root '
        + catalogId
        + ' 0 R >>\n'
        + 'startxref\n'
        + xrefOffset
        + '\n%%EOF';

    return Buffer.from(
        pdf,
        'latin1',
    );
};

const buildTechnicalSheetPdf = (
    projection,
) => {
    const layout =
        buildTechnicalSheetPdfLayout(
            projection,
        );
    const canvas =
        createPageCanvas();
    const bodyTop =
        drawDocumentHeader({
            canvas,
            layout,
        });

    canvas.add(
        lineCommand({
            x1:
                MARGIN_X
                + COMPOSITION_WIDTH
                + (
                    MAIN_GAP
                    / 2
                ),
            y1: bodyTop + 4,
            x2:
                MARGIN_X
                + COMPOSITION_WIDTH
                + (
                    MAIN_GAP
                    / 2
                ),
            y2: BOTTOM,
            gray: 0.88,
            lineWidth: 0.4,
        }),
    );

    drawComposition({
        canvas,
        layout,
        top: bodyTop,
    });
    drawAnalysis({
        canvas,
        layout,
        top: bodyTop,
    });

    return buildPdfBuffer(
        canvas.stream(),
    );
};

export {
    basisPoints,
    buildTechnicalSheetPdf,
    buildTechnicalSheetPdfLayout,
    decimalCurrency,
    encodeWinAnsiHex,
    estimateTextWidth,
    minorCurrency,
    resolveCompositionTableMetrics,
    truncateTextByWidth,
    wrapTextByWidth,
};
