import { encodeWinAnsiHex } from '../technicalSheet/technicalSheetExportPdf.service.js';

// A4 portrait, points. The output intentionally has no external font, image,
// storage provider or browser-printing dependency. All text is hex encoded.
const W = 595.28;
const H = 841.89;
const LEFT = 44;
const RIGHT = W - 44;
// 12 mm: steps belong visually to their parent phase, including controls.
const STEP_INDENT = 34;
const BOTTOM = 62;
const BODY_TOP = 706;
const INK = '0.13 0.20 0.26';
const MUTED = '0.37 0.43 0.48';
const ACCENT = '0.06 0.43 0.48';
const BORDER = '0.82 0.87 0.88';

const safeText = (value) => [...String(value ?? '')].map((character) => {
    const code = character.codePointAt(0);
    return code < 32 && ![9, 10, 13].includes(code) ? ' ' : character;
}).join('');
const point = (value) => Number(value.toFixed(2));

const textCommand = ({ x, y, value, size = 10, bold = false, color = INK }) =>
    color + ' rg BT /' + (bold ? 'F2' : 'F1') + ' ' + size
    + ' Tf 1 0 0 1 ' + point(x) + ' ' + point(y)
    + ' Tm <' + encodeWinAnsiHex(safeText(value)) + '> Tj ET';

const rectCommand = ({ x, y, width, height, color }) =>
    color + ' rg ' + point(x) + ' ' + point(y) + ' '
    + point(width) + ' ' + point(height) + ' re f';

const lineCommand = (x1, y1, x2, y2, color = BORDER) =>
    color + ' RG 0.6 w ' + point(x1) + ' ' + point(y1) + ' m '
    + point(x2) + ' ' + point(y2) + ' l S';

const wrapText = (value, maxWidth, fontSize = 10) => {
    // Conservative width estimation for standard Helvetica/Helvetica-Bold.
    const max = Math.max(8, Math.floor(maxWidth / (fontSize * 0.54)));
    const lines = [];
    for (const raw of safeText(value).split(/\r?\n/)) {
        const words = raw.split(/\s+/).filter(Boolean);
        if (!words.length) { lines.push(''); continue; }
        let line = '';
        for (const word of words) {
            const segments = word.match(new RegExp('.{1,' + max + '}', 'gu')) ?? [word];
            for (const segment of segments) {
                if (!line) line = segment;
                else if (line.length + segment.length + 1 <= max) line += ' ' + segment;
                else { lines.push(line); line = segment; }
            }
        }
        if (line) lines.push(line);
    }
    return lines;
};

const newCanvas = ({ process, generatedAt }) => {
    const pages = [];
    let page;
    const date = generatedAt.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
    const isDraft = process.editorialState !== 'VALIDATED';
    const isArchived = process.status === 'ARCHIVED';
    // No validated-status banner; draft/archived markings stay on every page
    // because those documents must not be mistaken for an active validation.
    const qualifiers = [
        ...(isDraft ? ['BROUILLON — DOCUMENT NON VALIDÉ'] : []),
        ...(isArchived ? ['ARCHIVÉE'] : []),
    ];

    const startPage = () => {
        page = { commands: [], y: BODY_TOP };
        pages.push(page);
        page.commands.push(rectCommand({ x: 0, y: H - 9, width: W, height: 9, color: ACCENT }));
        page.commands.push(textCommand({ x: LEFT, y: H - 43, size: 9, bold: true, color: ACCENT, value: 'FICHE PROCESS / FABRICATION' }));
        const titleLines = wrapText(process.title, RIGHT - LEFT, 17).slice(0, 4);
        titleLines.forEach((line, i) => page.commands.push(textCommand({
            x: LEFT, y: H - 71 - i * 20, size: 17, bold: true, value: line,
        })));
        // Header shows only the business document identity. No dossier,
        // linked M-004 title, validation date, status bar or phase counts.
        page.y = Math.min(BODY_TOP, H - 114 - (titleLines.length - 1) * 20);
        page.commands.push(lineCommand(LEFT, page.y + 20, RIGHT, page.y + 20));
    };

    const ensure = (required = 18) => {
        if (!page || page.y - required < BOTTOM) startPage();
    };
    const addLine = (text, { x = LEFT, size = 10, bold = false, color = INK, leading = 14 } = {}) => {
        ensure(leading);
        page.commands.push(textCommand({ x, y: page.y, size, bold, color, value: text }));
        page.y -= leading;
    };
    const paragraph = (value, { indent = 0, size = 10, color = INK, gap = 7 } = {}) => {
        if (!value) return;
        const maxWidth = RIGHT - LEFT - indent;
        for (const line of wrapText(value, maxWidth, size)) {
            addLine(line, { x: LEFT + indent, size, color, leading: size * 1.53 });
        }
        page.y -= gap;
    };
    const heading = (label, { phase = false, indent = 0 } = {}) => {
        const size = phase ? 12 : 10;
        const lines = wrapText(label, RIGHT - LEFT - indent - 22, size);
        const extraHeight = Math.max(0, lines.length - 1) * 16;
        const height = (phase ? 28 : 23) + extraHeight;
        const spacing = phase ? 13 : 6;
        // Reserve title AND first line of content: no orphan headers.
        ensure(height + spacing + 30);
        page.y -= spacing;
        const x = LEFT + indent;
        page.commands.push(rectCommand({
            x, y: page.y - 8 - extraHeight,
            width: RIGHT - LEFT - indent, height,
            color: phase ? '0.89 0.95 0.95' : '0.95 0.97 0.97',
        }));
        page.commands.push(rectCommand({
            x, y: page.y - 8 - extraHeight,
            width: phase ? 4 : 2, height, color: ACCENT,
        }));
        lines.forEach((line, i) => page.commands.push(textCommand({
            x: x + 12, y: page.y + (phase ? 2 : 0) - i * 16,
            size, color: INK, bold: true, value: line,
        })));
        page.y -= 22 + extraHeight + 7;
    };
    const labelValues = (label, values, { indent = STEP_INDENT + 13 } = {}) => {
        if (!values?.length) return;
        paragraph(label + ' : ' + values.join(' ; '), { indent, size: 9, color: MUTED, gap: 2 });
    };
    const footer = () => {
        for (let i = 0; i < pages.length; i += 1) {
            const p = pages[i];
            p.commands.push(lineCommand(LEFT, 48, RIGHT, 48));
            p.commands.push(textCommand({
                x: LEFT, y: 34, size: 8, color: MUTED,
                value: ['Fiche process', ...qualifiers, 'Générée le ' + date].join('  |  '),
            }));
            p.commands.push(textCommand({
                x: RIGHT - 77, y: 34, size: 8, color: MUTED,
                value: 'Page ' + (i + 1) + ' / ' + pages.length,
            }));
        }
    };
    startPage();
    return { pages, addLine, paragraph, heading, labelValues, footer, ensure };
};

const formatDuration = (duration) => [
    ['activeMinutes', 'Actif'],
    ['restMinutes', 'Repos / attente'],
    ['treatmentMinutes', 'Traitement / cuisson'],
].filter(([key]) => duration?.[key] != null)
    .map(([key, label]) => label + ' : ' + duration[key] + ' min');

const writeControls = (doc, label, entries = []) => {
    if (!entries.length) return;
    doc.addLine(label, { x: LEFT + STEP_INDENT + 13, size: 9, bold: true, color: ACCENT });
    for (const entry of entries) {
        if (typeof entry === 'string') doc.paragraph('- ' + entry, { indent: STEP_INDENT + 18, size: 9, gap: 2 });
        else doc.paragraph('- ' + [
            entry.instruction,
            entry.expectedCriterion && 'Critère : ' + entry.expectedCriterion,
            entry.correctiveAction && 'Action corrective : ' + entry.correctiveAction,
        ].filter(Boolean).join('  |  '), { indent: STEP_INDENT + 18, size: 9, gap: 2 });
    }
    doc.ensure(9);
};

// Ingredient occurrences are deliberately not deduplicated. If an assignment
// has no instructions, display the ingredients rather than silently lose them.
const instructionsWithIngredients = (instructions, names) => {
    const narrative = String(instructions ?? '').trim();
    if (!names.length) return narrative;
    const cleaned = narrative.replace(/[.;:\s]+$/u, '');
    return cleaned ? cleaned + ' : ' + names.join(', ')
        : 'Ingrédients : ' + names.join(', ');
};

const buildProcessSheetPdf = ({
    process, draft, sourceIngredients, generatedAt = new Date(),
}) => {
    if (!process || !draft || !sourceIngredients) {
        throw new TypeError('Process, current content and ingredient projection are required.');
    }
    const doc = newCanvas({ process, generatedAt });
    const ingredients = new Map((sourceIngredients.lines ?? [])
        .map(line => [line.lineKey, line.productVariantName ?? 'Référence indisponible']));
    const ingredientNames = (keys) => (keys ?? []).map(key =>
        ingredients.get(key) ?? 'Ingrédient non retrouvé (' + key + ')');

    const phases = draft.phases ?? [];
    if (!phases.length) doc.paragraph('Aucune phase enregistrée dans cette Fiche process.');
    for (const [index, phase] of phases.entries()) {
        doc.heading('PHASE ' + String(index + 1).padStart(2, '0') + '  |  ' + phase.title, { phase: true });
        doc.paragraph(
            instructionsWithIngredients(phase.instructions, ingredientNames(phase.ingredientLineKeys)),
            { indent: 10 },
        );
        for (const [stepIndex, step] of (phase.steps ?? []).entries()) {
            const number = String(index + 1).padStart(2, '0') + '.'
                + String(stepIndex + 1).padStart(2, '0');
            doc.heading('ÉTAPE ' + number + '  |  ' + step.title, { indent: STEP_INDENT });
            doc.paragraph(
                instructionsWithIngredients(step.instructions, ingredientNames(step.ingredientLineKeys)),
                { indent: STEP_INDENT + 13 },
            );
            const duration = formatDuration(step.duration);
            if (step.temperatureCelsius != null) duration.push('Température : ' + step.temperatureCelsius + ' °C');
            doc.labelValues('Paramètres', duration);
            doc.labelValues('Équipements', step.equipment);
            doc.labelValues('Vigilance', step.manufacturingVigilance);
            writeControls(doc, 'CONTRÔLES QUALITÉ', step.qualityControls);
            writeControls(doc, 'MAÎTRISE SANITAIRE', step.sanitaryControls);
            doc.ensure(14);
        }
    }
    doc.footer();
    return serializePdf(doc.pages);
};

const serializePdf = (pages) => {
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Count ' + pages.length + ' /Kids ['
            + pages.map((_, i) => (5 + 2 * i) + ' 0 R').join(' ') + '] >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];
    for (const [index, page] of pages.entries()) {
        const pageId = 5 + index * 2;
        const streamId = pageId + 1;
        const stream = page.commands.join('\n') + '\n';
        objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '
            + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >>'
            + ' /Contents ' + streamId + ' 0 R >>');
        objects.push('<< /Length ' + Buffer.byteLength(stream, 'latin1')
            + ' >>\nstream\n' + stream + 'endstream');
    }
    let output = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    for (let i = 0; i < objects.length; i += 1) {
        offsets.push(Buffer.byteLength(output, 'latin1'));
        output += (i + 1) + ' 0 obj\n' + objects[i] + '\nendobj\n';
    }
    const startXref = Buffer.byteLength(output, 'latin1');
    output += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    for (const offset of offsets.slice(1)) output += String(offset).padStart(10, '0') + ' 00000 n \n';
    output += 'trailer\n<< /Size ' + (objects.length + 1)
        + ' /Root 1 0 R >>\nstartxref\n' + startXref + '\n%%EOF';
    return Buffer.from(output, 'latin1');
};

export { buildProcessSheetPdf, wrapText };
