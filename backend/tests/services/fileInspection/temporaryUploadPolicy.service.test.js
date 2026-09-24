import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    normalizeAllowedFileTypes,
    normalizeTemporaryUploadPolicy,
} from "../../../services/fileInspection/temporaryUploadPolicy.service.js";


describe("Temporary upload policy", () => {
    it("normalise une politique injectable sans modifier les constantes File", () => {
        const contentInspector = vi.fn();

        const policy =
            normalizeTemporaryUploadPolicy({
                allowedFileTypes: {
                    TABULAR: {
                        mimeTypes: [
                            "text/x-tabular",
                            "application/x-tabular",
                        ],
                        extensions: [
                            ".tab",
                            "TAB",
                        ],
                        canonicalMimeType:
                            "text/x-tabular",
                        canonicalExtension:
                            "tab",
                        contentInspector,
                    },
                },
                maxFileSizeBytes: 2_048,
            });

        expect(policy).toMatchObject({
            allowedMimeTypes: [
                "text/x-tabular",
                "application/x-tabular",
            ],
            maxFileSizeBytes: 2_048,
        });

        expect(
            policy.allowedFileTypes[0],
        ).toMatchObject({
            mimeTypes: [
                "text/x-tabular",
                "application/x-tabular",
            ],
            extensions: ["tab"],
            canonicalMimeType:
                "text/x-tabular",
            canonicalExtension: "tab",
            contentInspector,
        });

        expect(Object.isFrozen(policy))
            .toBe(true);
    });


    it("reste compatible avec le format historique mimeType + extensions", () => {
        const definitions =
            normalizeAllowedFileTypes({
                PDF: {
                    mimeType:
                        "application/pdf",
                    extensions: ["pdf"],
                },
            });

        expect(definitions).toEqual([
            {
                mimeTypes: [
                    "application/pdf",
                ],
                extensions: ["pdf"],
                canonicalMimeType:
                    "application/pdf",
                canonicalExtension: "pdf",
                contentInspector: null,
            },
        ]);
    });


    it("refuse une politique sans taille maximale positive", () => {
        expect(() =>
            normalizeTemporaryUploadPolicy({
                allowedFileTypes: {
                    TEST: {
                        mimeType:
                            "application/x-test",
                        extensions: ["test"],
                    },
                },
                maxFileSizeBytes: 0,
            }),
        ).toThrow(
            "La taille maximale du fichier temporaire doit être un entier positif.",
        );
    });


    it("refuse une définition sans MIME ou extension", () => {
        expect(() =>
            normalizeAllowedFileTypes([
                {
                    extensions: ["test"],
                },
            ]),
        ).toThrow(
            "doit déclarer au moins un MIME et une extension",
        );
    });

    it("peut renormaliser une politique déjà normalisée sans inspecteur spécialisé", () => {
        const policy =
            normalizeTemporaryUploadPolicy({
                allowedFileTypes: {
                    PDF: {
                        mimeType:
                            "application/pdf",
                        extensions: ["pdf"],
                    },
                },
                maxFileSizeBytes: 2_048,
            });

        expect(
            policy.allowedFileTypes[0]
                .contentInspector,
        ).toBeNull();

        expect(() =>
            normalizeAllowedFileTypes(
                policy.allowedFileTypes,
            ),
        ).not.toThrow();
    });


    it("refuse un inspecteur de contenu réellement invalide", () => {
        expect(() =>
            normalizeAllowedFileTypes([
                {
                    mimeType:
                        "application/x-test",
                    extensions: ["test"],
                    contentInspector: "invalid",
                },
            ]),
        ).toThrow(
            "L'inspecteur de contenu du type de fichier #1 est invalide.",
        );
    });

});
