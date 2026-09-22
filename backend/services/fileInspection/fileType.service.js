import path from "node:path";

import { fileTypeFromFile } from "file-type";

import {
    ALLOWED_FILE_TYPES,
} from "../../constants/file.constants.js";

import {
    FILE_UPLOAD_REJECTION_REASON,
} from "../../constants/fileAudit.constants.js";

import {
    fileUploadRejectedError,
} from "../../modules/file/fileUploadRejected.error.js";

import {
    normalizeAllowedFileTypes,
} from "./temporaryUploadPolicy.service.js";


/**
 * Construit un inspecteur de type réutilisable.
 *
 * Par défaut, l'inspection s'appuie sur file-type. Un type peut toutefois
 * fournir contentInspector lorsque son format n'est pas identifiable de
 * manière suffisamment fiable par file-type seul.
 */
const createUploadedFileTypeInspector = ({
    allowedFileTypes =
        ALLOWED_FILE_TYPES,
    detectFileType =
        fileTypeFromFile,
} = {}) => {
    if (typeof detectFileType !== "function") {
        throw new TypeError(
            "Le détecteur de type de fichier est invalide.",
        );
    }

    const normalizedAllowedFileTypes =
        normalizeAllowedFileTypes(
            allowedFileTypes,
        );


    /**
     * Exécute l'inspecteur spécifique d'une définition lorsque présent.
     *
     * L'inspecteur doit retourner true uniquement lorsque le contenu a été
     * réellement reconnu comme appartenant au format déclaré.
     */
    const inspectWithCustomContentInspector =
        async ({
            fileType,
            filePath,
            originalName,
            declaredMimeType,
        }) => {
            if (
                typeof fileType.contentInspector
                !== "function"
            ) {
                return false;
            }

            return (
                await fileType.contentInspector({
                    filePath,
                    originalName,
                    declaredMimeType,
                })
            ) === true;
        };


    /**
     * Analyse le type réel d'un fichier temporaire.
     *
     * Deux stratégies coexistent :
     * - détection générique par signature avec file-type ;
     * - inspecteur de contenu fourni par la politique pour les formats que
     *   file-type ne sait pas distinguer de manière suffisante.
     */
    return async function inspectUploadedFileType({
        filePath,
        originalName,
        declaredMimeType,
    }) {
        const normalizedDeclaredMimeType =
            declaredMimeType
                ?.trim()
                .toLowerCase();

        const originalExtension = path
            .extname(originalName ?? "")
            .slice(1)
            .toLowerCase();

        /*
         * Une définition avec inspecteur spécifique est candidate seulement
         * si les métadonnées déclarées correspondent à sa politique. Elles ne
         * suffisent jamais à accepter le fichier : le contenu doit ensuite
         * être reconnu explicitement par contentInspector.
         */
        const customCandidates =
            normalizedAllowedFileTypes.filter(
                (fileType) =>
                    fileType.contentInspector
                    && fileType.mimeTypes.includes(
                        normalizedDeclaredMimeType,
                    )
                    && fileType.extensions.includes(
                        originalExtension,
                    ),
            );

        for (const fileType of customCandidates) {
            const accepted =
                await inspectWithCustomContentInspector({
                    fileType,
                    filePath,
                    originalName,
                    declaredMimeType:
                        normalizedDeclaredMimeType,
                });

            if (accepted) {
                return Object.freeze({
                    mimeType:
                        fileType.canonicalMimeType,
                    extension:
                        fileType.canonicalExtension,
                });
            }
        }

        /*
         * Les formats sans inspecteur spécifique conservent le mécanisme
         * historique fondé sur la signature binaire.
         */
        const detectedFileType =
            await detectFileType(filePath);

        if (!detectedFileType) {
            if (customCandidates.length > 0) {
                throw new fileUploadRejectedError(
                    "Le contenu du fichier ne correspond pas au type autorisé.",
                    415,
                    FILE_UPLOAD_REJECTION_REASON
                        .FILE_TYPE_NOT_ALLOWED,
                );
            }

            throw new fileUploadRejectedError(
                "Le type réel du fichier n'a pas pu être identifié.",
                415,
                FILE_UPLOAD_REJECTION_REASON
                    .FILE_CORRUPTED,
            );
        }

        const allowedFileType =
            normalizedAllowedFileTypes.find(
                (fileType) =>
                    fileType.mimeTypes.includes(
                        detectedFileType.mime,
                    )
                    && fileType.extensions.includes(
                        detectedFileType.ext,
                    )
                    && !fileType.contentInspector,
            );

        if (!allowedFileType) {
            throw new fileUploadRejectedError(
                "Le type réel du fichier n'est pas autorisé.",
                415,
                FILE_UPLOAD_REJECTION_REASON
                    .FILE_TYPE_NOT_ALLOWED,
            );
        }

        /*
         * Un type déclaré différent du contenu réel peut signaler un fichier
         * mal nommé, une erreur du client ou une tentative de contournement.
         */
        if (
            !allowedFileType.mimeTypes.includes(
                normalizedDeclaredMimeType,
            )
        ) {
            throw new fileUploadRejectedError(
                "Le type déclaré du fichier ne correspond pas à son contenu.",
                415,
                FILE_UPLOAD_REJECTION_REASON
                    .FILE_TYPE_NOT_ALLOWED,
            );
        }

        if (
            !allowedFileType.extensions.includes(
                originalExtension,
            )
        ) {
            throw new fileUploadRejectedError(
                "L'extension du fichier ne correspond pas à son contenu.",
                415,
                FILE_UPLOAD_REJECTION_REASON
                    .FILE_TYPE_NOT_ALLOWED,
            );
        }

        return Object.freeze({
            mimeType:
                allowedFileType.canonicalMimeType,
            extension:
                allowedFileType.canonicalExtension,
        });
    };
};


const inspectUploadedFileType =
    createUploadedFileTypeInspector();


export {
    createUploadedFileTypeInspector,
    inspectUploadedFileType,
};
