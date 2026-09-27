import { readFile } from 'node:fs/promises';

import * as XLSX from '@e965/xlsx';

import {
    createSecureTemporaryUploadService,
} from '../../services/fileInspection/secureTemporaryUpload.service.js';

const PRODUCT_CATALOG_IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const COMPOUND_FILE_BINARY_SIGNATURE = Buffer.from([
    0xd0,
    0xcf,
    0x11,
    0xe0,
    0xa1,
    0xb1,
    0x1a,
    0xe1,
]);

const hasForbiddenTextControlByte = (buffer) => buffer.some((byte) => (
    byte < 0x20
    && byte !== 0x09
    && byte !== 0x0a
    && byte !== 0x0d
));

const decodeCsvText = (buffer) => {
    try {
        return new TextDecoder('utf-8', { fatal: true })
            .decode(buffer)
            .replace(/^\uFEFF/, '');
    } catch {
        return new TextDecoder('windows-1252')
            .decode(buffer)
            .replace(/^\uFEFF/, '');
    }
};

const hasBalancedCsvQuotes = (text) => {
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
        if (text[index] !== '"') continue;

        if (quoted && text[index + 1] === '"') {
            index += 1;
            continue;
        }

        quoted = !quoted;
    }

    return !quoted;
};

/**
 * Vérifie que le contenu peut être traité comme un fichier CSV texte.
 *
 * Le mapping et les règles métier restent dans le parser M-002. Cette étape
 * refuse seulement un contenu vide, manifestement binaire ou syntaxiquement
 * incohérent au niveau des guillemets CSV.
 */
const inspectCsvImportContent = async ({ filePath }) => {
    const buffer = await readFile(filePath);

    if (
        buffer.length === 0
        || hasForbiddenTextControlByte(buffer)
    ) {
        return false;
    }

    const text = decodeCsvText(buffer);

    return (
        text.trim().length > 0
        && hasBalancedCsvQuotes(text)
    );
};

/**
 * Reconnaît un véritable classeur XLS historique.
 *
 * La signature CFB/OLE seule est insuffisante car plusieurs anciens formats
 * Office utilisent le même conteneur. Le contenu doit également être lisible
 * comme un classeur par le moteur XLSX utilisé par M-002.
 */
const inspectLegacyXlsImportContent = async ({ filePath }) => {
    const buffer = await readFile(filePath);

    if (
        buffer.length < COMPOUND_FILE_BINARY_SIGNATURE.length
        || !buffer
            .subarray(
                0,
                COMPOUND_FILE_BINARY_SIGNATURE.length,
            )
            .equals(COMPOUND_FILE_BINARY_SIGNATURE)
    ) {
        return false;
    }

    try {
        const workbook = XLSX.read(buffer, {
            type: 'buffer',
            bookSheets: true,
            bookProps: true,
        });

        return (
            Array.isArray(workbook.SheetNames)
            && workbook.SheetNames.length > 0
        );
    } catch {
        return false;
    }
};

const PRODUCT_CATALOG_IMPORT_UPLOAD_POLICY = Object.freeze({
    allowedFileTypes: Object.freeze({
        CSV: Object.freeze({
            mimeTypes: Object.freeze([
                'text/csv',
                'application/csv',
                'text/plain',
                'application/vnd.ms-excel',
            ]),
            extensions: Object.freeze(['csv']),
            canonicalMimeType: 'text/csv',
            canonicalExtension: 'csv',
            contentInspector: inspectCsvImportContent,
        }),
        XLS: Object.freeze({
            mimeTypes: Object.freeze([
                'application/vnd.ms-excel',
                'application/xls',
                'application/x-excel',
            ]),
            extensions: Object.freeze(['xls']),
            canonicalMimeType: 'application/vnd.ms-excel',
            canonicalExtension: 'xls',
            contentInspector: inspectLegacyXlsImportContent,
        }),
        XLSX: Object.freeze({
            mimeType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extensions: Object.freeze(['xlsx']),
            canonicalMimeType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            canonicalExtension: 'xlsx',
        }),
    }),
    maxFileSizeBytes: PRODUCT_CATALOG_IMPORT_MAX_FILE_SIZE_BYTES,
});

const createProductCatalogImportUploadService = (
    dependencies = {},
) => createSecureTemporaryUploadService({
    ...dependencies,
    policy: PRODUCT_CATALOG_IMPORT_UPLOAD_POLICY,
});

const productCatalogImportUploadService =
    createProductCatalogImportUploadService();

export {
    createProductCatalogImportUploadService,
    inspectCsvImportContent,
    inspectLegacyXlsImportContent,
    PRODUCT_CATALOG_IMPORT_MAX_FILE_SIZE_BYTES,
    PRODUCT_CATALOG_IMPORT_UPLOAD_POLICY,
    productCatalogImportUploadService,
};
