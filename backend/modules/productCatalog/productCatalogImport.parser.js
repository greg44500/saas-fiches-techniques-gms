import path from 'node:path';

import * as XLSX from '@e965/xlsx';

import { AppError } from '../../utils/appError.js';

const MAX_IMPORT_ROWS = 5000;
const MAX_IMPORT_COLUMNS = 50;
const MAX_IMPORT_CELL_LENGTH = 500;

const normalizeCell = (value) => {
    if (value === null || value === undefined) return '';

    const normalized = value instanceof Date
        ? value.toISOString()
        : String(value).trim();

    if (normalized.length > MAX_IMPORT_CELL_LENGTH) {
        throw new AppError(
            `Une cellule dépasse ${MAX_IMPORT_CELL_LENGTH} caractères.`,
            400,
        );
    }

    return normalized;
};

const assertMatrixLimits = (matrix) => {
    if (!Array.isArray(matrix) || matrix.length < 2) {
        throw new AppError(
            'Le fichier doit contenir une ligne d’en-tête et au moins une ligne de données.',
            400,
        );
    }

    if (matrix.length - 1 > MAX_IMPORT_ROWS) {
        throw new AppError(
            `Le fichier dépasse la limite de ${MAX_IMPORT_ROWS} lignes.`,
            400,
        );
    }

    const maxColumns = Math.max(
        ...matrix.map((row) => Array.isArray(row) ? row.length : 0),
    );

    if (maxColumns > MAX_IMPORT_COLUMNS) {
        throw new AppError(
            `Le fichier dépasse la limite de ${MAX_IMPORT_COLUMNS} colonnes.`,
            400,
        );
    }
};

const parseCsvRows = (text, delimiter) => {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];

        if (quoted) {
            if (character === '"') {
                if (text[index + 1] === '"') {
                    cell += '"';
                    index += 1;
                } else {
                    quoted = false;
                }
            } else {
                cell += character;
            }
            continue;
        }

        if (character === '"') {
            quoted = true;
        } else if (character === delimiter) {
            row.push(normalizeCell(cell));
            cell = '';
        } else if (character === '\n') {
            row.push(normalizeCell(cell.replace(/\r$/, '')));
            if (row.some((value) => value !== '')) rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += character;
        }
    }

    if (quoted) {
        throw new AppError('Le fichier CSV contient une citation non fermée.', 400);
    }

    row.push(normalizeCell(cell.replace(/\r$/, '')));
    if (row.some((value) => value !== '')) rows.push(row);

    return rows;
};

const detectCsvDelimiter = (text) => {
    const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
    const delimiters = [';', ',', '\t'];

    return delimiters
        .map((delimiter) => ({
            delimiter,
            count: firstLine.split(delimiter).length - 1,
        }))
        .sort((left, right) => right.count - left.count)[0]?.delimiter ?? ';';
};

const decodeCsvBuffer = (buffer) => {
    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
            .replace(/^\uFEFF/, '');
    } catch {
        return new TextDecoder('windows-1252').decode(buffer)
            .replace(/^\uFEFF/, '');
    }
};

const parseCsv = (buffer) => {
    const text = decodeCsvBuffer(buffer);
    const delimiter = detectCsvDelimiter(text);
    return parseCsvRows(text, delimiter);
};

const parseWorkbook = (buffer) => {
    let workbook;

    try {
        workbook = XLSX.read(buffer, {
            type: 'buffer',
            dense: true,
            cellFormula: false,
            cellHTML: false,
            cellNF: false,
            cellStyles: false,
            cellDates: true,
            sheetRows: MAX_IMPORT_ROWS + 2,
        });
    } catch {
        throw new AppError(
            'Le classeur Excel est invalide ou illisible.',
            400,
        );
    }

    const sheetName = workbook.SheetNames?.[0];
    const worksheet = sheetName ? workbook.Sheets[sheetName] : null;

    if (!worksheet) {
        throw new AppError('Le classeur Excel ne contient aucune feuille.', 400);
    }

    return XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false,
        blankrows: false,
    }).map((row) => row.map(normalizeCell));
};

const parseProductImportFile = ({ originalname, buffer }) => {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new AppError('Aucun fichier d’import valide reçu.', 400);
    }

    const extension = path.extname(originalname ?? '').toLowerCase();

    let format;
    let matrix;

    if (extension === '.csv') {
        format = 'CSV';
        matrix = parseCsv(buffer);
    } else if (extension === '.xls') {
        format = 'XLS';
        matrix = parseWorkbook(buffer);
    } else if (extension === '.xlsx') {
        format = 'XLSX';
        matrix = parseWorkbook(buffer);
    } else {
        throw new AppError(
            'Format d’import non supporté. Utilisez CSV, XLS ou XLSX.',
            400,
        );
    }

    assertMatrixLimits(matrix);

    const headers = matrix[0].map((value, index) => (
        normalizeCell(value) || `Colonne ${index + 1}`
    ));

    return {
        format,
        headers,
        rows: matrix.slice(1).map((row) => (
            Array.from(
                { length: headers.length },
                (_, index) => normalizeCell(row[index] ?? ''),
            )
        )),
    };
};

export {
    MAX_IMPORT_COLUMNS,
    MAX_IMPORT_ROWS,
    parseProductImportFile,
};
