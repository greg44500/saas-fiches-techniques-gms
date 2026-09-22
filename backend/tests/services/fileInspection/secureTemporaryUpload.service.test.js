import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    FILE_SCAN_STATUS,
} from "../../../constants/file.constants.js";

import {
    createSecureTemporaryUploadService,
} from "../../../services/fileInspection/secureTemporaryUpload.service.js";


const FILE = Object.freeze({
    path: "/temporary/import-file",
    originalname: "catalogue.tab",
    mimetype: "text/x-tabular",
    size: 128,
});

const POLICY = Object.freeze({
    allowedFileTypes: Object.freeze({
        TABULAR: Object.freeze({
            mimeType: "text/x-tabular",
            extensions: Object.freeze([
                "tab",
            ]),
            contentInspector:
                async () => true,
        }),
    }),
    maxFileSizeBytes: 1_024,
});


const createDependencies = () => ({
    createAuditEvent:
        vi.fn().mockResolvedValue({}),
    calculateChecksum:
        vi.fn().mockResolvedValue(
            "a".repeat(64),
        ),
    scanFile:
        vi.fn().mockResolvedValue({
            status: FILE_SCAN_STATUS.CLEAN,
            provider: "test-scanner",
            scannedAt:
                new Date(
                    "2026-09-22T16:00:00.000Z",
                ),
            threatName: null,
            errorCode: null,
        }),
    discardTemporaryFile:
        vi.fn().mockResolvedValue({
            discarded: true,
        }),
});


describe("Secure temporary upload service", () => {
    it("inspecte, remet le temporaire au consommateur puis le détruit sans persistance File", async () => {
        const dependencies =
            createDependencies();

        const service =
            createSecureTemporaryUploadService({
                policy: POLICY,
                ...dependencies,
            });

        const consume =
            vi.fn().mockResolvedValue({
                rows: 12,
            });

        await expect(
            service.processTemporaryUpload({
                file: FILE,
                consume,
            }),
        ).resolves.toEqual({
            rows: 12,
        });

        expect(
            dependencies.calculateChecksum,
        ).toHaveBeenCalledWith(
            FILE.path,
        );

        expect(
            dependencies.scanFile,
        ).toHaveBeenCalledWith({
            filePath: FILE.path,
        });

        expect(consume)
            .toHaveBeenCalledTimes(1);

        expect(
            dependencies.discardTemporaryFile,
        ).toHaveBeenCalledWith(
            FILE.path,
        );
    });


    it("détruit le temporaire lorsque le consommateur métier échoue", async () => {
        const dependencies =
            createDependencies();

        const service =
            createSecureTemporaryUploadService({
                policy: POLICY,
                ...dependencies,
            });

        const processingError =
            new Error("Parsing failed");

        await expect(
            service.processTemporaryUpload({
                file: FILE,
                consume:
                    vi.fn()
                        .mockRejectedValue(
                            processingError,
                        ),
            }),
        ).rejects.toBe(
            processingError,
        );

        expect(
            dependencies.discardTemporaryFile,
        ).toHaveBeenCalledWith(
            FILE.path,
        );
    });


    it("conserve l'erreur métier et l'erreur de nettoyage si les deux échouent", async () => {
        const dependencies =
            createDependencies();

        const processingError =
            new Error("Parsing failed");

        const cleanupError =
            new Error("Cleanup failed");

        dependencies.discardTemporaryFile
            .mockRejectedValue(
                cleanupError,
            );

        const service =
            createSecureTemporaryUploadService({
                policy: POLICY,
                ...dependencies,
            });

        try {
            await service
                .processTemporaryUpload({
                    file: FILE,
                    consume:
                        vi.fn()
                            .mockRejectedValue(
                                processingError,
                            ),
                });

            throw new Error(
                "Le service aurait dû rejeter la promesse.",
            );
        } catch (error) {
            expect(error)
                .toBeInstanceOf(
                    AggregateError,
                );

            expect(error.errors)
                .toEqual([
                    processingError,
                    cleanupError,
                ]);

            expect(error.cause)
                .toBe(
                    processingError,
                );
        }
    });


    it("ne remet jamais le fichier au consommateur si l'antivirus échoue fermé", async () => {
        const dependencies =
            createDependencies();

        dependencies.scanFile
            .mockResolvedValue({
                status:
                    FILE_SCAN_STATUS.ERROR,
                provider: "test-scanner",
                scannedAt:
                    new Date(
                        "2026-09-22T16:00:00.000Z",
                    ),
                threatName: null,
                errorCode:
                    "SCANNER_UNAVAILABLE",
            });

        const service =
            createSecureTemporaryUploadService({
                policy: POLICY,
                ...dependencies,
            });

        const consume = vi.fn();

        await expect(
            service.processTemporaryUpload({
                file: FILE,
                consume,
            }),
        ).rejects.toMatchObject({
            statusCode: 503,
        });

        expect(consume)
            .not.toHaveBeenCalled();

        expect(
            dependencies.discardTemporaryFile,
        ).toHaveBeenCalledWith(
            FILE.path,
        );
    });
});
