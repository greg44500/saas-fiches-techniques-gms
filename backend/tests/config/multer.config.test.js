import {
    describe,
    expect,
    it,
} from "vitest";

import {
    FILE_UPLOAD_REJECTION_REASON,
} from "../../constants/fileAudit.constants.js";

import {
    fileUploadRejectedError,
} from "../../modules/file/fileUploadRejected.error.js";

import {
    createPreliminaryMimeTypeFilter,
} from "../../config/multer.config.js";


const runFilter = ({
    allowedMimeTypes,
    mimetype,
}) => new Promise((resolve, reject) => {
    const filter =
        createPreliminaryMimeTypeFilter({
            allowedMimeTypes,
        });

    filter(
        {},
        {
            mimetype,
        },
        (error, accepted) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(accepted);
        },
    );
});


describe("Configurable Multer policy", () => {
    it("accepte un MIME déclaré par la politique dérivée", async () => {
        await expect(
            runFilter({
                allowedMimeTypes: [
                    "text/x-tabular",
                ],
                mimetype:
                    "text/x-tabular",
            }),
        ).resolves.toBe(true);
    });


    it("refuse un MIME absent de la politique dérivée", async () => {
        const error =
            await runFilter({
                allowedMimeTypes: [
                    "text/x-tabular",
                ],
                mimetype:
                    "application/pdf",
            }).catch(
                (caughtError) =>
                    caughtError,
            );

        expect(error)
            .toBeInstanceOf(
                fileUploadRejectedError,
            );

        expect(error)
            .toMatchObject({
                statusCode: 415,
                rejectionReason:
                    FILE_UPLOAD_REJECTION_REASON
                        .FILE_TYPE_NOT_ALLOWED,
            });
    });


    it("refuse une politique MIME vide", () => {
        expect(() =>
            createPreliminaryMimeTypeFilter({
                allowedMimeTypes: [],
            }),
        ).toThrow(
            "La liste des types MIME autorisés est invalide.",
        );
    });
});
