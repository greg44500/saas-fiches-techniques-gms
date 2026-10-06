const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const TOP = 798;
const BOTTOM = 48;

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

const wrapText = (
    value,
    maxLength,
) => {
    const words =
        String(value ?? '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (words.length === 0) {
        return [''];
    }

    const lines = [];
    let current = '';

    for (const word of words) {
        const candidate =
            current
                ? current + ' ' + word
                : word;

        if (
            candidate.length
            <= maxLength
        ) {
            current = candidate;
            continue;
        }

        if (current) {
            lines.push(current);
        }

        current = word;
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
    bold,
    text,
}) => (
    'BT /'
    + (bold ? 'F2' : 'F1')
    + ' '
    + size
    + ' Tf '
    + x
    + ' '
    + y
    + ' Td <'
    + encodeWinAnsiHex(text)
    + '> Tj ET'
);

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

    const ensure = (height) => {
        if (y - height >= BOTTOM) {
            return;
        }

        flushPage();
    };

    const text = ({
        value,
        size = 9,
        bold = false,
        gap = 13,
        maxLength = 88,
        x = MARGIN,
    }) => {
        const lines =
            wrapText(
                value,
                maxLength,
            );

        ensure(
            lines.length * gap,
        );

        for (const line of lines) {
            commands.push(
                textCommand({
                    x,
                    y,
                    size,
                    bold,
                    text: line,
                }),
            );
            y -= gap;
        }
    };

    const separator = () => {
        ensure(12);
        commands.push(
            '0.5 w '
            + MARGIN
            + ' '
            + y
            + ' m '
            + (PAGE_WIDTH - MARGIN)
            + ' '
            + y
            + ' l S',
        );
        y -= 12;
    };

    const section = (title) => {
        ensure(30);
        y -= 5;
        text({
            value: title,
            size: 12,
            bold: true,
            gap: 18,
        });
        separator();
    };

    const keyValue = (
        label,
        value,
    ) => {
        ensure(16);
        commands.push(
            textCommand({
                x: MARGIN,
                y,
                size: 9,
                bold: false,
                text: label,
            }),
        );
        commands.push(
            textCommand({
                x: 320,
                y,
                size: 9,
                bold: true,
                text: value ?? 'NC',
            }),
        );
        y -= 15;
    };

    return {
        ensure,
        keyValue,
        section,
        separator,
        text,
        finalize() {
            if (
                commands.length > 0
                || pages.length === 0
            ) {
                flushPage();
            }

            return pages;
        },
    };
};

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

const addComposition = ({
    composer,
    title,
    lines,
}) => {
    composer.section(title);

    if (lines.length === 0) {
        composer.text({
            value: 'Aucune ligne.',
        });
        return;
    }

    for (const line of lines) {
        composer.ensure(56);
        composer.text({
            value: line.productName,
            size: 10,
            bold: true,
            maxLength: 60,
        });
        composer.text({
            value:
                'Quantité nette : '
                + line.netQuantity
                + ' '
                + line.netUnitLabel
                + ' | Quantité brute : '
                + line.grossQuantity
                + ' '
                + line.grossUnitLabel,
            size: 8,
            gap: 11,
        });
        composer.text({
            value:
                'Prix HT : '
                + decimalCurrency(
                    line.normalizedPriceHt,
                )
                + ' / '
                + line.normalizedUnitLabel
                + ' | Coût ligne HT : '
                + decimalCurrency(
                    line.lineCostHt,
                ),
            size: 8,
            gap: 11,
        });

        if (line.yieldPercent) {
            composer.text({
                value:
                    'Rendement utilisé : '
                    + line.yieldPercent
                    + ' %',
                size: 8,
                gap: 11,
            });
        }

        composer.separator();
    }
};

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
    const composer =
        createDocumentComposer();

    composer.text({
        value: projection.title,
        size: 18,
        bold: true,
        gap: 24,
        maxLength: 48,
    });
    composer.text({
        value:
            'Version validée le '
            + new Date(
                projection.validatedAt,
            ).toLocaleString('fr-FR'),
        size: 9,
        gap: 18,
    });

    if (projection.description) {
        composer.text({
            value:
                projection.description,
            size: 9,
        });
    }

    composer.section('Production');
    composer.keyValue(
        'Quantité produite',
        projection.production.quantity
        + ' '
        + projection.production.unitLabel,
    );
    composer.keyValue(
        'Portions / pièce',
        projection.production
            .portionsPerProductionUnit,
    );
    composer.keyValue(
        'Total portions',
        projection.production
            .totalPortions,
    );

    addComposition({
        composer,
        title: 'Ingrédients',
        lines:
            projection.sections
                .ingredients,
    });
    addComposition({
        composer,
        title: 'Économat',
        lines:
            projection.sections
                .economat,
    });

    composer.section('Analyse figée');
    composer.keyValue(
        'Coût matière HT',
        decimalCurrency(
            projection.analysis
                .materialCostHt,
        ),
    );
    composer.keyValue(
        'Coût Économat HT',
        decimalCurrency(
            projection.analysis
                .economatCostHt,
        ),
    );
    composer.keyValue(
        'Coût de fabrication HT',
        decimalCurrency(
            projection.analysis
                .manufacturingCostHt,
        ),
    );
    composer.keyValue(
        'Coût matière / pièce HT',
        decimalCurrency(
            projection.analysis
                .materialCostPerProductionUnitHt,
        ),
    );
    composer.keyValue(
        'Coût de fabrication / pièce HT',
        decimalCurrency(
            projection.analysis
                .manufacturingCostPerProductionUnitHt,
        ),
    );
    composer.keyValue(
        'Coût matière / portion HT',
        decimalCurrency(
            projection.analysis
                .materialCostPerPortionHt,
        ),
    );
    composer.keyValue(
        'Coût Économat / portion HT',
        decimalCurrency(
            projection.analysis
                .economatCostPerPortionHt,
        ),
    );
    composer.keyValue(
        'Coût de fabrication / portion HT',
        decimalCurrency(
            projection.analysis
                .manufacturingCostPerPortionHt,
        ),
    );
    composer.keyValue(
        'TVA',
        basisPoints(
            projection.production
                .vatRateBasisPoints,
        ),
    );
    composer.keyValue(
        'Marge cible',
        basisPoints(
            projection.production
                .targetMarginBasisPoints,
        ),
    );
    composer.keyValue(
        'Prix conseillé TTC',
        minorCurrency(
            projection.analysis
                .advisedPriceTtcMinor,
        ),
    );
    composer.keyValue(
        'Prix retenu TTC',
        minorCurrency(
            projection.analysis
                .finalPriceTtcMinor,
        ),
    );
    composer.keyValue(
        'Marge réelle',
        basisPoints(
            projection.analysis
                .actualMarginBasisPoints,
        ),
    );

    return buildPdfBuffer(
        composer.finalize(),
    );
};

export {
    basisPoints,
    buildTechnicalSheetPdf,
    decimalCurrency,
    encodeWinAnsiHex,
    minorCurrency,
};
