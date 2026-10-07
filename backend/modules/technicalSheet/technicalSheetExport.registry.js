const TECHNICAL_SHEET_EXPORT_FORMAT = Object.freeze({
    PDF: 'PDF',
    XLSX: 'XLSX',
    CSV: 'CSV',
});

const TECHNICAL_SHEET_EXPORT_DEFINITION = Object.freeze({
    [TECHNICAL_SHEET_EXPORT_FORMAT.PDF]: Object.freeze({
        extension: 'pdf',
        mimeType: 'application/pdf',
    }),
    [TECHNICAL_SHEET_EXPORT_FORMAT.XLSX]: Object.freeze({
        extension: 'xlsx',
        mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    [TECHNICAL_SHEET_EXPORT_FORMAT.CSV]: Object.freeze({
        extension: 'csv',
        mimeType: 'text/csv; charset=utf-8',
    }),
});

export {
    TECHNICAL_SHEET_EXPORT_DEFINITION,
    TECHNICAL_SHEET_EXPORT_FORMAT,
};
