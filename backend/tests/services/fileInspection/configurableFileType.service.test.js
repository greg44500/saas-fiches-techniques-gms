import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    FILE_UPLOAD_REJECTION_REASON,
} from "../../../constants/fileAudit.constants.js";

import {
    fileUploadRejectedError,
} from "../../../modules/file/fileUploadRejected.error.js";

import {
    createUploadedFileTypeInspector,
} from "../../../services/fileInspection/fileType.service.js";


describe("Configurable uploaded file type inspector", () => {
    it("utilise un inspecteur de contenu spécifique lorsque la signature générique ne suffit pas", async () => {
        const detectFileType = vi.fn();
        const contentInspector =
            vi.fn().mockResolvedValue(true);

        const inspectUploadedFileType =
            createUploadedFileTypeInspector({
                allowedFileTypes: {
                    TABULAR: {
                        mimeTypes: [
                            "text/x-tabular",
                        ],
                        extensions: ["tab"],
                        contentInspector,
                    },
                },
                detectFileType,
            });

        await expect(
            inspectUploadedFileType({
                filePath:
                    "/temporary/tabular-file",
                originalName:
                    "catalogue.tab",
                declaredMimeType:
                    "text/x-tabular",
            }),
        ).resolves.toEqual({
            mimeType: "text/x-tabular",
            extension: "tab",
        });

        expect(contentInspector)
            .toHaveBeenCalledWith({
                filePath:
                    "/temporary/tabular-file",
                originalName:
                    "catalogue.tab",
                declaredMimeType:
                    "text/x-tabular",
            });

        expect(detectFileType)
            .not.toHaveBeenCalled();
    });


    it("échoue fermé lorsque l'inspecteur spécifique ne reconnaît pas le contenu", async () => {
        const inspectUploadedFileType =
            createUploadedFileTypeInspector({
                allowedFileTypes: {
                    TABULAR: {
                        mimeType:
                            "text/x-tabular",
                        extensions: ["tab"],
                        contentInspector:
                            vi.fn()
                                .mockResolvedValue(
                                    false,
                                ),
                    },
                },
                detectFileType:
                    vi.fn()
                        .mockResolvedValue(
                            undefined,
                        ),
            });

        const error =
            await inspectUploadedFileType({
                filePath:
                    "/temporary/tabular-file",
                originalName:
                    "catalogue.tab",
                declaredMimeType:
                    "text/x-tabular",
            }).catch(
                (caughtError) =>
                    caughtError,
            );

        expect(error).toBeInstanceOf(
            fileUploadRejectedError,
        );

        expect(error).toMatchObject({
            statusCode: 415,
            rejectionReason:
                FILE_UPLOAD_REJECTION_REASON
                    .FILE_TYPE_NOT_ALLOWED,
        });
    });


    it("propage une erreur technique de l'inspecteur spécialisé", async () => {
        const inspectionError =
            new Error("Inspector unavailable");

        const inspectUploadedFileType =
            createUploadedFileTypeInspector({
                allowedFileTypes: {
                    TABULAR: {
                        mimeType:
                            "text/x-tabular",
                        extensions: ["tab"],
                        contentInspector:
                            vi.fn()
                                .mockRejectedValue(
                                    inspectionError,
                                ),
                    },
                },
                detectFileType: vi.fn(),
            });

        await expect(
            inspectUploadedFileType({
                filePath:
                    "/temporary/tabular-file",
                originalName:
                    "catalogue.tab",
                declaredMimeType:
                    "text/x-tabular",
            }),
        ).rejects.toBe(
            inspectionError,
        );
    });


    it("conserve la détection générique par signature pour les types binaires", async () => {
        const detectFileType =
            vi.fn().mockResolvedValue({
                mime:
                    "application/x-binary-test",
                ext: "bin",
            });

        const inspectUploadedFileType =
            createUploadedFileTypeInspector({
                allowedFileTypes: {
                    BINARY: {
                        mimeType:
                            "application/x-binary-test",
                        extensions: ["bin"],
                    },
                },
                detectFileType,
            });

        await expect(
            inspectUploadedFileType({
                filePath:
                    "/temporary/binary-file",
                originalName:
                    "payload.bin",
                declaredMimeType:
                    "application/x-binary-test",
            }),
        ).resolves.toEqual({
            mimeType:
                "application/x-binary-test",
            extension: "bin",
        });

        expect(detectFileType)
            .toHaveBeenCalledWith(
                "/temporary/binary-file",
            );
    });
});
