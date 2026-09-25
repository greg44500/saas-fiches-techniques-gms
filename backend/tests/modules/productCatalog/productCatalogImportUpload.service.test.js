import {
    access,
    mkdtemp,
    rm,
    unlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as XLSX from '@e965/xlsx';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    FILE_SCAN_STATUS,
} from '../../../constants/file.constants.js';
import {
    createProductCatalogImportUploadService,
} from '../../../modules/productCatalog/productCatalogImportUpload.service.js';

let testDirectory;

beforeEach(async () => {
    testDirectory = await mkdtemp(
        path.join(tmpdir(), 'm002-secure-import-'),
    );
});

afterEach(async () => {
    await rm(testDirectory, {
        recursive: true,
        force: true,
    });
});

const workbookBuffer = (bookType) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['Produit', 'Unité'],
        ['Carotte', 'kg'],
    ]);

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Produits',
    );

    return XLSX.write(workbook, {
        bookType,
        type: 'buffer',
    });
};

const createTemporaryFile = async (content) => {
    const filePath = path.join(
        testDirectory,
        'quarantine-file',
    );

    await writeFile(filePath, content);

    return filePath;
};

const createCleanUploadService = () =>
    createProductCatalogImportUploadService({
        scanFile: vi.fn().mockResolvedValue({
            status: FILE_SCAN_STATUS.CLEAN,
            provider: 'test-scanner',
            scannedAt: new Date(
                '2026-09-22T18:00:00.000Z',
            ),
            threatName: null,
            errorCode: null,
        }),
        discardTemporaryFile: (filePath) =>
            unlink(filePath),
    });

const expectFileRemoved = async (filePath) => {
    await expect(access(filePath)).rejects.toBeDefined();
};

describe('M-002 secure product import upload', () => {
    it('accepte un CSV texte inspecté puis supprime le temporaire', async () => {
        const filePath = await createTemporaryFile(
            Buffer.from(
                'Produit;Unité\nCarotte;kg',
                'utf8',
            ),
        );
        const service = createCleanUploadService();
        const consume = vi.fn().mockResolvedValue({
            rows: 1,
        });

        await expect(
            service.processTemporaryUpload({
                file: {
                    path: filePath,
                    originalname: 'produits.csv',
                    mimetype: 'text/csv',
                    size: 25,
                },
                consume,
            }),
        ).resolves.toEqual({
            rows: 1,
        });

        expect(consume).toHaveBeenCalledWith(
            expect.objectContaining({
                extension: 'csv',
                mimeType: 'text/csv',
                checksumSha256: expect.stringMatching(
                    /^[a-f0-9]{64}$/,
                ),
            }),
        );
        await expectFileRemoved(filePath);
    });

    it('accepte un véritable classeur XLS historique', async () => {
        const buffer = workbookBuffer('biff8');
        const filePath = await createTemporaryFile(buffer);
        const service = createCleanUploadService();

        await expect(
            service.processTemporaryUpload({
                file: {
                    path: filePath,
                    originalname: 'produits.xls',
                    mimetype: 'application/vnd.ms-excel',
                    size: buffer.length,
                },
                consume: async ({ extension }) => extension,
            }),
        ).resolves.toBe('xls');

        await expectFileRemoved(filePath);
    });

    it('accepte un classeur XLSX via la détection OOXML du Core', async () => {
        const buffer = workbookBuffer('xlsx');
        const filePath = await createTemporaryFile(buffer);
        const service = createCleanUploadService();

        await expect(
            service.processTemporaryUpload({
                file: {
                    path: filePath,
                    originalname: 'produits.xlsx',
                    mimetype:
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    size: buffer.length,
                },
                consume: async ({ extension }) => extension,
            }),
        ).resolves.toBe('xlsx');

        await expectFileRemoved(filePath);
    });

    it('refuse un faux XLS portant seulement la signature CFB/OLE', async () => {
        const fakeXls = Buffer.concat([
            Buffer.from([
                0xd0,
                0xcf,
                0x11,
                0xe0,
                0xa1,
                0xb1,
                0x1a,
                0xe1,
            ]),
            Buffer.alloc(128),
        ]);
        const filePath = await createTemporaryFile(fakeXls);
        const service = createCleanUploadService();
        const consume = vi.fn();

        await expect(
            service.processTemporaryUpload({
                file: {
                    path: filePath,
                    originalname: 'produits.xls',
                    mimetype: 'application/vnd.ms-excel',
                    size: fakeXls.length,
                },
                consume,
            }),
        ).rejects.toMatchObject({
            statusCode: 415,
        });

        expect(consume).not.toHaveBeenCalled();
        await expectFileRemoved(filePath);
    });

    it('refuse un CSV manifestement binaire', async () => {
        const buffer = Buffer.from([
            0x50,
            0x72,
            0x6f,
            0x64,
            0x75,
            0x69,
            0x74,
            0x00,
            0x01,
        ]);
        const filePath = await createTemporaryFile(buffer);
        const service = createCleanUploadService();

        await expect(
            service.processTemporaryUpload({
                file: {
                    path: filePath,
                    originalname: 'produits.csv',
                    mimetype: 'text/csv',
                    size: buffer.length,
                },
                consume: vi.fn(),
            }),
        ).rejects.toMatchObject({
            statusCode: 415,
        });

        await expectFileRemoved(filePath);
    });

    it('reste fail-closed si l’antivirus est indisponible', async () => {
        const filePath = await createTemporaryFile(
            Buffer.from(
                'Produit\nCarotte',
                'utf8',
            ),
        );
        const discardTemporaryFile = vi.fn(
            (temporaryPath) => unlink(temporaryPath),
        );
        const service =
            createProductCatalogImportUploadService({
                scanFile: vi.fn().mockResolvedValue({
                    status: FILE_SCAN_STATUS.ERROR,
                    provider: 'test-scanner',
                    scannedAt: new Date(
                        '2026-09-22T18:00:00.000Z',
                    ),
                    threatName: null,
                    errorCode: 'SCANNER_UNAVAILABLE',
                }),
                discardTemporaryFile,
            });
        const consume = vi.fn();

        await expect(
            service.processTemporaryUpload({
                file: {
                    path: filePath,
                    originalname: 'produits.csv',
                    mimetype: 'text/csv',
                    size: 15,
                },
                consume,
            }),
        ).rejects.toMatchObject({
            statusCode: 503,
        });

        expect(consume).not.toHaveBeenCalled();
        expect(discardTemporaryFile)
            .toHaveBeenCalledWith(filePath);
        await expectFileRemoved(filePath);
    });
});
