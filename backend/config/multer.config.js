import { randomUUID } from "node:crypto";

import multer from "multer";

import {
    ALLOWED_FILE_MIME_TYPES,
} from "../constants/file.constants.js";

import { storageConfig } from "./storage.config.js";
import { env } from "./env.js";

import {
    FILE_UPLOAD_REJECTION_REASON,
} from "../constants/fileAudit.constants.js";

import {
    fileUploadRejectedError,
} from "../modules/file/fileUploadRejected.error.js";


/**
 * Stocke temporairement les fichiers sur disque.
 *
 * Le nom d'origine n'est jamais utilisé comme nom physique. Aucune extension
 * n'est ajoutée avant que le type réel du contenu ait été identifié.
 */
const temporaryDiskStorage = multer.diskStorage({
    destination:
        storageConfig.local.temporaryDirectory,

    filename: (request, file, callback) => {
        callback(null, randomUUID());
    },
});


/**
 * Construit le filtrage préliminaire du MIME déclaré par le client.
 *
 * Ce contrôle reste volontairement une première barrière. L'acceptation
 * définitive dépend toujours de l'inspection du contenu après réception.
 */
const createPreliminaryMimeTypeFilter = ({
    allowedMimeTypes,
}) => {
    if (
        !Array.isArray(allowedMimeTypes)
        || allowedMimeTypes.length === 0
        || allowedMimeTypes.some(
            (mimeType) =>
                typeof mimeType !== "string"
                || mimeType.trim() === "",
        )
    ) {
        throw new TypeError(
            "La liste des types MIME autorisés est invalide.",
        );
    }

    const allowedMimeTypeSet = new Set(
        allowedMimeTypes.map((mimeType) =>
            mimeType.trim().toLowerCase(),
        ),
    );

    return (
        request,
        file,
        callback,
    ) => {
        const declaredMimeType =
            file.mimetype?.trim().toLowerCase();

        if (
            !allowedMimeTypeSet.has(
                declaredMimeType,
            )
        ) {
            callback(
                new fileUploadRejectedError(
                    "Le type de fichier déclaré n’est pas autorisé.",
                    415,
                    FILE_UPLOAD_REJECTION_REASON
                        .FILE_TYPE_NOT_ALLOWED,
                ),
            );

            return;
        }

        callback(null, true);
    };
};


/**
 * Construit une instance Multer pour un pipeline temporaire sécurisé.
 *
 * La politique par défaut correspond strictement au module File historique.
 * Un SaaS dérivé peut fournir une autre liste MIME et une autre limite sans
 * modifier la politique des fichiers durables du Core.
 */
const createMulterUpload = ({
    allowedMimeTypes =
        ALLOWED_FILE_MIME_TYPES,
    maxFileSizeBytes =
        env.UPLOAD_MAX_FILE_SIZE_BYTES,
    storage = temporaryDiskStorage,
} = {}) => {
    if (
        !Number.isInteger(maxFileSizeBytes)
        || maxFileSizeBytes <= 0
    ) {
        throw new TypeError(
            "La taille maximale du fichier est invalide.",
        );
    }

    return multer({
        storage,
        fileFilter:
            createPreliminaryMimeTypeFilter({
                allowedMimeTypes,
            }),

        limits: {
            fileSize: maxFileSizeBytes,
            files: 1,
            fields: 5,
            parts: 6,
            fieldNameSize: 100,
            fieldSize: 16 * 1024,
            headerPairs: 100,
            fieldNestingDepth: 0,
        },

        preservePath: false,
        defParamCharset: "utf8",
    });
};


/**
 * Instance historique utilisée par le module File.
 *
 * Elle conserve exactement la politique PDF/JPEG/PNG et la taille maximale
 * configurée par l'environnement.
 */
const multerUpload = createMulterUpload();


export {
    createMulterUpload,
    createPreliminaryMimeTypeFilter,
    multerUpload,
};
