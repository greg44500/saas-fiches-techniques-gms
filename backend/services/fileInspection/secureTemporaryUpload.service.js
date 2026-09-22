import {
    createMulterUpload,
} from "../../config/multer.config.js";

import {
    createAuditLog,
} from "../../modules/auditLog/auditLog.service.js";

import {
    createCleanupTemporaryUploadOnError,
} from "../../middlewares/cleanupTemporaryUploadOnError.js";

import {
    createUploadSingleFile,
} from "../../middlewares/uploadMiddleware.js";

import {
    malwareScanService,
} from "../malwareScan/malwareScan.service.js";

import {
    temporaryFileService,
} from "../storage/temporaryFile.service.js";

import {
    calculateFileSha256,
} from "./fileChecksum.service.js";

import {
    createUploadedFileTypeInspector,
} from "./fileType.service.js";

import {
    normalizeTemporaryUploadPolicy,
} from "./temporaryUploadPolicy.service.js";

import {
    createUploadedFileInspectionService,
} from "./uploadedFileInspection.service.js";


/**
 * Nettoie un temporaire après un échec du consommateur sans masquer la cause.
 */
const discardAfterConsumerFailure = async ({
    filePath,
    processingError,
    discardTemporaryFile,
}) => {
    try {
        await discardTemporaryFile(filePath);
    } catch (cleanupError) {
        throw new AggregateError(
            [
                processingError,
                cleanupError,
            ],
            "Le traitement du fichier temporaire et son nettoyage ont échoué.",
            {
                cause: processingError,
            },
        );
    }

    throw processingError;
};


/**
 * Construit un pipeline sécurisé pour un fichier technique temporaire.
 *
 * Cette primitive ne crée aucun document File, ne consomme aucun quota de
 * stockage durable et n'impose aucune capability file_upload. Le consommateur
 * reste responsable de ses propres permissions et règles métier.
 */
const createSecureTemporaryUploadService = ({
    policy,
    createAuditEvent =
        createAuditLog,
    calculateChecksum =
        calculateFileSha256,
    scanFile = ({ filePath }) =>
        malwareScanService.scanFile({
            filePath,
        }),
    discardTemporaryFile = (filePath) =>
        temporaryFileService
            .discardTemporaryFile(filePath),
} = {}) => {
    const normalizedPolicy =
        normalizeTemporaryUploadPolicy(
            policy ?? {},
        );

    const upload = createMulterUpload({
        allowedMimeTypes:
            normalizedPolicy.allowedMimeTypes,
        maxFileSizeBytes:
            normalizedPolicy.maxFileSizeBytes,
    });

    const uploadSingleFile =
        createUploadSingleFile({
            upload,
            createAuditEvent,
        });

    const inspectFileType =
        createUploadedFileTypeInspector({
            allowedFileTypes:
                normalizedPolicy.allowedFileTypes,
        });

    const inspectionService =
        createUploadedFileInspectionService({
            inspectFileType,
            calculateChecksum,
            scanFile,
            discardTemporaryFile,
        });

    const cleanupTemporaryUploadOnError =
        createCleanupTemporaryUploadOnError({
            discardTemporaryFile,
        });


    /**
     * Inspecte un fichier Multer et remet le temporaire vérifié au consommateur.
     *
     * Le callback consume s'exécute uniquement après validation du type,
     * checksum et antivirus. Le fichier est supprimé après le callback, que
     * celui-ci réussisse ou échoue.
     */
    const processTemporaryUpload = async ({
        file,
        consume,
    }) => {
        if (
            !file
            || typeof file !== "object"
            || typeof consume !== "function"
        ) {
            throw new TypeError(
                "Le fichier temporaire et son consommateur sont obligatoires.",
            );
        }

        const inspectedFile =
            await inspectionService
                .inspectUploadedFile({
                    filePath: file.path,
                    originalName:
                        file.originalname,
                    declaredMimeType:
                        file.mimetype,
                    sizeBytes: file.size,
                });

        let result;

        try {
            result = await consume(
                inspectedFile,
            );
        } catch (processingError) {
            return discardAfterConsumerFailure({
                filePath:
                    inspectedFile.filePath,
                processingError,
                discardTemporaryFile,
            });
        }

        await discardTemporaryFile(
            inspectedFile.filePath,
        );

        return result;
    };


    return Object.freeze({
        uploadSingleFile,
        inspectUploadedFile:
            inspectionService
                .inspectUploadedFile,
        processTemporaryUpload,
        cleanupTemporaryUploadOnError,
        discardTemporaryFile,
    });
};


export {
    createSecureTemporaryUploadService,
};
