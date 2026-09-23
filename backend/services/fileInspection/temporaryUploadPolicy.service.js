/**
 * Normalise une définition de type de fichier autorisé.
 *
 * Le Core ne connaît aucun format métier particulier. Chaque consommateur
 * déclare les MIME/ extensions qu'il accepte et peut fournir un inspecteur de
 * contenu lorsqu'une détection générique par signature binaire ne suffit pas.
 */
const normalizeFileTypeDefinition = (
    definition,
    index,
) => {
    if (
        !definition
        || typeof definition !== "object"
        || Array.isArray(definition)
    ) {
        throw new TypeError(
            `La définition du type de fichier #${index + 1} est invalide.`,
        );
    }

    const rawMimeTypes = Array.isArray(definition.mimeTypes)
        ? definition.mimeTypes
        : definition.mimeType
            ? [definition.mimeType]
            : [];

    const mimeTypes = [
        ...new Set(
            rawMimeTypes.map((mimeType) =>
                typeof mimeType === "string"
                    ? mimeType.trim().toLowerCase()
                    : "",
            ),
        ),
    ].filter(Boolean);

    const extensions = [
        ...new Set(
            (definition.extensions ?? []).map((extension) =>
                typeof extension === "string"
                    ? extension
                        .trim()
                        .toLowerCase()
                        .replace(/^\./, "")
                    : "",
            ),
        ),
    ].filter(Boolean);

    if (
        mimeTypes.length === 0
        || extensions.length === 0
    ) {
        throw new TypeError(
            `Le type de fichier #${index + 1} doit déclarer au moins un MIME et une extension.`,
        );
    }

    if (
        definition.contentInspector !== undefined
        && definition.contentInspector !== null
        && typeof definition.contentInspector !== "function"
    ) {
        throw new TypeError(
            `L'inspecteur de contenu du type de fichier #${index + 1} est invalide.`,
        );
    }

    const canonicalMimeType = (
        definition.canonicalMimeType
        ?? definition.mimeType
        ?? mimeTypes[0]
    ).trim().toLowerCase();

    const canonicalExtension = (
        definition.canonicalExtension
        ?? extensions[0]
    )
        .trim()
        .toLowerCase()
        .replace(/^\./, "");

    if (
        !mimeTypes.includes(canonicalMimeType)
        || !extensions.includes(canonicalExtension)
    ) {
        throw new TypeError(
            `Le type de fichier #${index + 1} possède une représentation canonique incohérente.`,
        );
    }

    return Object.freeze({
        mimeTypes: Object.freeze(mimeTypes),
        extensions: Object.freeze(extensions),
        canonicalMimeType,
        canonicalExtension,
        contentInspector:
            definition.contentInspector ?? null,
    });
};


/**
 * Accepte le format historique objet ainsi qu'un tableau de définitions.
 */
const normalizeAllowedFileTypes = (
    allowedFileTypes,
) => {
    const definitions = Array.isArray(allowedFileTypes)
        ? allowedFileTypes
        : (
            allowedFileTypes
            && typeof allowedFileTypes === "object"
        )
            ? Object.values(allowedFileTypes)
            : [];

    if (definitions.length === 0) {
        throw new TypeError(
            "La politique d'upload doit autoriser au moins un type de fichier.",
        );
    }

    return Object.freeze(
        definitions.map(
            normalizeFileTypeDefinition,
        ),
    );
};


/**
 * Normalise la politique complète utilisée par le pipeline temporaire.
 */
const normalizeTemporaryUploadPolicy = ({
    allowedFileTypes,
    maxFileSizeBytes,
}) => {
    if (
        !Number.isInteger(maxFileSizeBytes)
        || maxFileSizeBytes <= 0
    ) {
        throw new TypeError(
            "La taille maximale du fichier temporaire doit être un entier positif.",
        );
    }

    const normalizedAllowedFileTypes =
        normalizeAllowedFileTypes(
            allowedFileTypes,
        );

    const allowedMimeTypes = Object.freeze([
        ...new Set(
            normalizedAllowedFileTypes
                .flatMap(({ mimeTypes }) =>
                    mimeTypes,
                ),
        ),
    ]);

    return Object.freeze({
        allowedFileTypes:
            normalizedAllowedFileTypes,
        allowedMimeTypes,
        maxFileSizeBytes,
    });
};


export {
    normalizeAllowedFileTypes,
    normalizeTemporaryUploadPolicy,
};
