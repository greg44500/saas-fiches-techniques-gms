const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN_X = 36;
const TOP = 555;
const BOTTOM = 42;
const CONTENT_WIDTH =
    PAGE_WIDTH - (MARGIN_X * 2);

const PDF_GRAY = Object.freeze({
    BORDER: 0.78,
    MUTED: 0.42,
    SOFT: 0.965,
    TABLE_HEADER: 0.91,
    WHITE: 1,
});

const COMPOSITION_COLUMNS = Object.freeze([
    Object.freeze({
        key: 'section',
        label: 'Section',
        width: 72,
        align: 'left',
    }),
    Object.freeze({
        key: 'product',
        label: 'Produit',
        width: 250,
        align: 'left',
    }),
    Object.freeze({
        key: 'net',
        label: 'Qté nette',
        width: 88,
        align: 'right',
    }),
    Object.freeze({
        key: 'yield',
        label: 'Rdt.',
        width: 70,
        align: 'right',
    }),
    Object.freeze({
        key: 'gross',
        label: 'Qté brute',
        width: 88,
        align: 'right',
    }),
    Object.freeze({
        key: 'price',
        label: 'Prix HT',
        width: 110,
        align: 'right',
    }),
    Object.freeze({
        key: 'cost',
        label: 'Coût HT',
        width: 92,
        align: 'right',
    }),
]);

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
    lineWidth = 0.6,
}) => {
    const bottom =
        top - height;
    const operators = ['q'];

    if (fillGray !== null) {
        operators.push(
            fillGray + ' g',
        );
    }

    operators.push(
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

    return operators.join(' ');
};

const lineCommand = ({
    x1,
    y1,
    x2,
    y2,
    gray = PDF_GRAY.BORDER,
    lineWidth = 0.6,
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

const decimalPercent = (value) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return 'NC';
    }

    return parsed.toLocaleString(
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

const buildTechnicalSheetPdfLayout = (
    projection,
) => {
    const composition = [
        ...projection.sections.ingredients
            .map((line) => ({
                ...line,
                sectionLabel:
                    'Ingrédient',
            })),
        ...projection.sections.economat
            .map((line) => ({
                ...line,
                sectionLabel:
                    'Économat',
            })),
    ];

    return {
        document: {
            orientation: 'landscape',
            pageSize: 'A4',
        },
        title: projection.title,
        description:
            projection.description
            ?? null,
        validatedAt:
            projection.validatedAt,
        productionCards: [
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
                    'Total portions',
                value:
                    projection.production
                        .totalPortions
                    ?? 'NC',
            },
        ],
        compositionRows:
            composition.map((line) => ({
                section:
                    line.sectionLabel,
                product:
                    line.productName,
                net:
                    formatQuantity(
                        line.netQuantity,
                        line.netUnitLabel,
                    ),
                yield:
                    decimalPercent(
                        line.yieldPercent,
                    ),
                gross:
                    formatQuantity(
                        line.grossQuantity,
                        line.grossUnitLabel,
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
            })),
        analysisCards: [
            {
                label:
                    'Coût matière HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .materialCostHt,
                    ),
            },
            {
                label:
                    'Coût Économat HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .economatCostHt,
                    ),
            },
            {
                label:
                    'Coût de fabrication HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .manufacturingCostHt,
                    ),
            },
            {
                label:
                    'Prix conseillé TTC',
                value:
                    minorCurrency(
                        projection.analysis
                            .advisedPriceTtcMinor,
                    ),
            },
            {
                label:
                    'Prix retenu TTC',
                value:
                    minorCurrency(
                        projection.analysis
                            .finalPriceTtcMinor,
                    ),
            },
            {
                label:
                    'Marge réelle',
                value:
                    basisPoints(
                        projection.analysis
                            .actualMarginBasisPoints,
                    ),
            },
        ],
        analysisDetails: [
            {
                label:
                    'Coût matière / pièce HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .materialCostPerProductionUnitHt,
                    ),
            },
            {
                label:
                    'Coût de fabrication / pièce HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .manufacturingCostPerProductionUnitHt,
                    ),
            },
            {
                label:
                    'Coût matière / portion HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .materialCostPerPortionHt,
                    ),
            },
            {
                label:
                    'Coût Économat / portion HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .economatCostPerPortionHt,
                    ),
            },
            {
                label:
                    'Coût de fabrication / portion HT',
                value:
                    decimalCurrency(
                        projection.analysis
                            .manufacturingCostPerPortionHt,
                    ),
            },
            {
                label: 'TVA',
                value:
                    basisPoints(
                        projection.production
                            .vatRateBasisPoints,
                    ),
            },
            {
                label:
                    'Marge cible',
                value:
                    basisPoints(
                        projection.production
                            .targetMarginBasisPoints,
                    ),
            },
        ],
    };
};

const createDocumentComposer = () => {
    const pages = [];
    let commands = [];
    let y = TOP;

    const flushPage = () => {
        pages.push(
            commands.join('\n'),
        );
        commands = [];
        y = TOP;
    };

    const newPage = () => {
        flushPage();
    };

    const ensure = (height) => {
        if (
            y - height
            >= BOTTOM
        ) {
            return false;
        }

        newPage();
        return true;
    };

    const moveDown = (amount) => {
        y -= amount;
    };

    const add = (command) => {
        commands.push(command);
    };

    const textAt = ({
        x,
        baseline,
        value,
        size = 9,
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

    const paragraph = ({
        value,
        size = 9,
        bold = false,
        gray = 0,
        width = CONTENT_WIDTH,
        lineHeight = 12,
        after = 0,
    }) => {
        const lines =
            wrapTextByWidth(
                value,
                width,
                size,
            );

        ensure(
            lines.length
            * lineHeight,
        );

        for (const line of lines) {
            textAt({
                x: MARGIN_X,
                baseline: y,
                value: line,
                size,
                bold,
                gray,
            });
            y -= lineHeight;
        }

        y -= after;
    };

    const sectionTitle = (
        title,
    ) => {
        ensure(30);
        textAt({
            x: MARGIN_X,
            baseline: y,
            value: title,
            size: 12,
            bold: true,
        });
        y -= 10;
        add(
            lineCommand({
                x1: MARGIN_X,
                y1: y,
                x2:
                    PAGE_WIDTH
                    - MARGIN_X,
                y2: y,
            }),
        );
        y -= 14;
    };

    const rectangle = (options) => {
        add(
            rectangleCommand(options),
        );
    };

    return {
        add,
        ensure,
        finalize() {
            if (
                commands.length > 0
                || pages.length === 0
            ) {
                flushPage();
            }

            return pages;
        },
        getY() {
            return y;
        },
        moveDown,
        newPage,
        paragraph,
        rectangle,
        sectionTitle,
        setY(nextY) {
            y = nextY;
        },
        textAt,
    };
};

const drawDocumentHeader = ({
    composer,
    layout,
}) => {
    composer.textAt({
        x: MARGIN_X,
        baseline:
            composer.getY(),
        value:
            'FICHE TECHNIQUE VALIDÉE',
        size: 8,
        bold: true,
        gray: PDF_GRAY.MUTED,
    });

    composer.textAt({
        x: PAGE_WIDTH - MARGIN_X - 220,
        baseline:
            composer.getY(),
        width: 220,
        align: 'right',
        value:
            'Validée le '
            + new Date(
                layout.validatedAt,
            ).toLocaleString('fr-FR'),
        size: 8,
        gray: PDF_GRAY.MUTED,
    });

    composer.moveDown(22);
    composer.paragraph({
        value: layout.title,
        size: 20,
        bold: true,
        width: 560,
        lineHeight: 24,
        after: 3,
    });

    if (layout.description) {
        composer.paragraph({
            value:
                layout.description,
            size: 9,
            gray: PDF_GRAY.MUTED,
            width: 620,
            lineHeight: 12,
            after: 5,
        });
    }

    const y =
        composer.getY();

    composer.add(
        lineCommand({
            x1: MARGIN_X,
            y1: y,
            x2:
                PAGE_WIDTH
                - MARGIN_X,
            y2: y,
        }),
    );
    composer.moveDown(18);
};

const drawProductionCards = ({
    composer,
    cards,
}) => {
    const gap = 12;
    const width =
        (
            CONTENT_WIDTH
            - (gap * 2)
        ) / 3;
    const height = 58;

    composer.ensure(
        height + 8,
    );

    const top =
        composer.getY();

    cards.forEach(
        (card, index) => {
            const x =
                MARGIN_X
                + index
                * (width + gap);

            composer.rectangle({
                x,
                top,
                width,
                height,
                fillGray:
                    PDF_GRAY.SOFT,
            });
            composer.textAt({
                x: x + 12,
                baseline:
                    top - 18,
                value:
                    card.label,
                size: 7.5,
                gray:
                    PDF_GRAY.MUTED,
            });
            composer.textAt({
                x: x + 12,
                baseline:
                    top - 40,
                value:
                    card.value,
                size: 13,
                bold: true,
            });
        },
    );

    composer.setY(
        top - height - 18,
    );
};

const drawTableHeader = ({
    composer,
}) => {
    const top =
        composer.getY();
    const height = 28;
    let x = MARGIN_X;

    for (
        const column
        of COMPOSITION_COLUMNS
    ) {
        composer.rectangle({
            x,
            top,
            width:
                column.width,
            height,
            fillGray:
                PDF_GRAY.TABLE_HEADER,
        });
        composer.textAt({
            x: x + 6,
            baseline:
                top - 18,
            width:
                column.width - 12,
            align:
                column.align,
            value:
                column.label,
            size: 7.5,
            bold: true,
        });
        x += column.width;
    }

    composer.setY(
        top - height,
    );
};

const getCompositionRowMetrics = (
    row,
) => {
    const fontSize = 7.5;
    const lineHeight = 10;
    const paddingX = 6;
    const paddingY = 7;
    const cellLines = {};

    for (
        const column
        of COMPOSITION_COLUMNS
    ) {
        cellLines[column.key] =
            wrapTextByWidth(
                row[column.key],
                column.width
                    - (paddingX * 2),
                fontSize,
            );
    }

    const maxLines =
        Math.max(
            ...Object.values(
                cellLines,
            ).map(
                (lines) =>
                    lines.length,
            ),
        );

    return {
        cellLines,
        fontSize,
        lineHeight,
        paddingX,
        paddingY,
        height:
            Math.max(
                30,
                (maxLines * lineHeight)
                + (paddingY * 2),
            ),
    };
};

const drawCompositionRow = ({
    composer,
    row,
    rowIndex,
}) => {
    const metrics =
        getCompositionRowMetrics(
            row,
        );
    const top =
        composer.getY();
    let x = MARGIN_X;

    for (
        const column
        of COMPOSITION_COLUMNS
    ) {
        const lines =
            metrics.cellLines[
                column.key
            ];

        composer.rectangle({
            x,
            top,
            width:
                column.width,
            height:
                metrics.height,
            fillGray:
                rowIndex % 2 === 1
                    ? 0.985
                    : PDF_GRAY.WHITE,
        });

        lines.forEach(
            (line, lineIndex) => {
                composer.textAt({
                    x:
                        x
                        + metrics.paddingX,
                    baseline:
                        top
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

        x += column.width;
    }

    composer.setY(
        top - metrics.height,
    );
};

const drawCompositionTable = ({
    composer,
    rows,
}) => {
    composer.ensure(62);
    composer.sectionTitle(
        'Composition',
    );

    drawTableHeader({
        composer,
    });

    if (rows.length === 0) {
        composer.paragraph({
            value:
                'Aucune ligne dans cette version validée.',
            gray:
                PDF_GRAY.MUTED,
            after: 8,
        });
        return;
    }

    rows.forEach(
        (row, rowIndex) => {
            const metrics =
                getCompositionRowMetrics(
                    row,
                );

            if (
                composer.getY()
                - metrics.height
                < BOTTOM
            ) {
                composer.newPage();
                composer.textAt({
                    x: MARGIN_X,
                    baseline:
                        composer.getY(),
                    value:
                        'Composition — suite',
                    size: 12,
                    bold: true,
                });
                composer.moveDown(20);
                drawTableHeader({
                    composer,
                });
            }

            drawCompositionRow({
                composer,
                row,
                rowIndex,
            });
        },
    );

    composer.moveDown(18);
};

const drawMetricCards = ({
    composer,
    cards,
}) => {
    const columns = 3;
    const gapX = 12;
    const gapY = 10;
    const width =
        (
            CONTENT_WIDTH
            - (
                gapX
                * (columns - 1)
            )
        ) / columns;
    const height = 54;

    for (
        let index = 0;
        index < cards.length;
        index += columns
    ) {
        composer.ensure(
            height + gapY,
        );
        const top =
            composer.getY();
        const row =
            cards.slice(
                index,
                index + columns,
            );

        row.forEach(
            (card, rowIndex) => {
                const x =
                    MARGIN_X
                    + rowIndex
                    * (width + gapX);

                composer.rectangle({
                    x,
                    top,
                    width,
                    height,
                    fillGray:
                        PDF_GRAY.SOFT,
                });
                composer.textAt({
                    x: x + 12,
                    baseline:
                        top - 17,
                    value:
                        card.label,
                    size: 7.5,
                    gray:
                        PDF_GRAY.MUTED,
                });
                composer.textAt({
                    x: x + 12,
                    baseline:
                        top - 38,
                    value:
                        card.value,
                    size: 12,
                    bold: true,
                });
            },
        );

        composer.setY(
            top - height - gapY,
        );
    }
};

const drawAnalysisDetails = ({
    composer,
    details,
}) => {
    composer.moveDown(5);
    composer.textAt({
        x: MARGIN_X,
        baseline:
            composer.getY(),
        value:
            'Détails économiques',
        size: 9,
        bold: true,
    });
    composer.moveDown(14);

    const rowHeight = 24;
    const labelWidth = 285;
    const valueWidth =
        CONTENT_WIDTH - labelWidth;

    for (
        let index = 0;
        index < details.length;
        index += 1
    ) {
        if (
            composer.getY()
            - rowHeight
            < BOTTOM
        ) {
            composer.newPage();
            composer.textAt({
                x: MARGIN_X,
                baseline:
                    composer.getY(),
                value:
                    'Détails économiques — suite',
                size: 10,
                bold: true,
            });
            composer.moveDown(18);
        }

        const top =
            composer.getY();
        const detail =
            details[index];
        const fillGray =
            index % 2 === 1
                ? 0.985
                : PDF_GRAY.WHITE;

        composer.rectangle({
            x: MARGIN_X,
            top,
            width:
                labelWidth,
            height:
                rowHeight,
            fillGray,
        });
        composer.rectangle({
            x:
                MARGIN_X
                + labelWidth,
            top,
            width:
                valueWidth,
            height:
                rowHeight,
            fillGray,
        });

        composer.textAt({
            x: MARGIN_X + 8,
            baseline:
                top - 16,
            value:
                detail.label,
            size: 8,
        });
        composer.textAt({
            x:
                MARGIN_X
                + labelWidth
                + 8,
            baseline:
                top - 16,
            width:
                valueWidth - 16,
            align: 'right',
            value:
                detail.value,
            size: 8,
            bold: true,
        });

        composer.setY(
            top - rowHeight,
        );
    }
};

const drawAnalysis = ({
    composer,
    layout,
}) => {
    composer.ensure(100);
    composer.sectionTitle(
        'Analyse figée',
    );
    drawMetricCards({
        composer,
        cards:
            layout.analysisCards,
    });
    drawAnalysisDetails({
        composer,
        details:
            layout.analysisDetails,
    });
};

const decoratePages = ({
    pages,
    layout,
}) => (
    pages.map(
        (stream, index) => {
            const pageNumber =
                index + 1;
            const footerY = 22;

            const footerLeft =
                textCommand({
                    x: MARGIN_X,
                    y: footerY,
                    size: 7,
                    gray:
                        PDF_GRAY.MUTED,
                    text:
                        truncateTextByWidth(
                            layout.title,
                            560,
                            7,
                        ),
                });
            const footerRight =
                textCommand({
                    x:
                        PAGE_WIDTH
                        - MARGIN_X
                        - 90,
                    y: footerY,
                    size: 7,
                    gray:
                        PDF_GRAY.MUTED,
                    text:
                        'Page '
                        + pageNumber
                        + ' / '
                        + pages.length,
                });

            return (
                stream
                + '\n'
                + lineCommand({
                    x1: MARGIN_X,
                    y1: 32,
                    x2:
                        PAGE_WIDTH
                        - MARGIN_X,
                    y2: 32,
                    gray: 0.88,
                    lineWidth: 0.4,
                })
                + '\n'
                + footerLeft
                + '\n'
                + footerRight
            );
        },
    )
);

const buildPdfBuffer = (
    streams,
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
    const pageIds = [];

    for (const stream of streams) {
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

        pageIds.push(
            add(
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
            ),
        );
    }

    objects[catalogId - 1] =
        '<< /Type /Catalog /Pages '
        + pagesId
        + ' 0 R >>';
    objects[pagesId - 1] =
        '<< /Type /Pages /Count '
        + pageIds.length
        + ' /Kids ['
        + pageIds
            .map((id) =>
                id + ' 0 R')
            .join(' ')
        + '] >>';

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
    const composer =
        createDocumentComposer();

    drawDocumentHeader({
        composer,
        layout,
    });
    drawProductionCards({
        composer,
        cards:
            layout.productionCards,
    });
    drawCompositionTable({
        composer,
        rows:
            layout.compositionRows,
    });
    drawAnalysis({
        composer,
        layout,
    });

    const pages =
        decoratePages({
            pages:
                composer.finalize(),
            layout,
        });

    return buildPdfBuffer(
        pages,
    );
};

export {
    COMPOSITION_COLUMNS,
    basisPoints,
    buildTechnicalSheetPdf,
    buildTechnicalSheetPdfLayout,
    decimalCurrency,
    encodeWinAnsiHex,
    estimateTextWidth,
    minorCurrency,
    truncateTextByWidth,
    wrapTextByWidth,
};
