import {
    TECHNICAL_SHEET_LINE_KIND,
} from '../technicalSheet/technicalSheet.registry.js';

/**
 * Projection stricte : aucune quantité, aucun prix, aucune information fournisseur.
 * Les lignes répétées d'une même Référence Produit restent distinctes.
 *
 * Une ligne d'un ancien snapshot M-004 sans sourceLineId ne peut être identifiée
 * qu'au sein de son snapshot, par validationId + index original.
 */
const toIngredientProjection = ({
    sourceKind,
    source,
}) => {
    const isDraft = sourceKind === 'DRAFT';
    if (!['DRAFT', 'VALIDATION'].includes(sourceKind)) {
        throw new TypeError('Unsupported M-004 composition source.');
    }

    const sourceId = source._id.toString();
    const sourceLines = isDraft ? source.lines : source.linesSnapshot;
    const lines = sourceLines.flatMap((line, originalIndex) => {
        if (line.kind !== TECHNICAL_SHEET_LINE_KIND.INGREDIENT) return [];

        if (isDraft && !line._id) {
            throw new Error('Missing M-004 draft line identity.');
        }
        const explicitId = isDraft
            ? line._id.toString()
            : line.sourceLineId?.toString();

        // Never use productVariantId as a line key (repeated variants exist).
        const lineKey = explicitId
            ? 'line:' + explicitId
            : 'validation:' + sourceId + ':index:' + originalIndex;

        const productVariantId = isDraft
            ? (line.productVariant?._id ?? line.productVariant).toString()
            : line.productVariantId.toString();
        const name = isDraft
            ? line.productVariant?.name ?? null
            : line.productVariantName;

        return [{
            lineKey,
            productVariantId,
            productVariantName: name,
            order: Number.isInteger(line.order) ? line.order : originalIndex,
            identityKind: explicitId ? 'SOURCE_LINE' : 'LEGACY_POSITION',
            sourcePosition: originalIndex,
        }];
    }).sort((a, b) =>
        a.order - b.order || a.sourcePosition - b.sourcePosition,
    );

    if (new Set(lines.map(({ lineKey }) => lineKey)).size !== lines.length) {
        throw new Error('Duplicate composition line identity.');
    }

    const byVariant = new Map();
    for (const line of lines) {
        const existing = byVariant.get(line.productVariantId);
        if (existing) {
            existing.lineKeys.push(line.lineKey);
        } else {
            byVariant.set(line.productVariantId, {
                productVariantId: line.productVariantId,
                productVariantName: line.productVariantName,
                lineKeys: [line.lineKey],
            });
        }
    }

    return {
        sourceKind,
        sourceId,
        revision: isDraft ? source.revision : null,
        hasLegacyLineIdentity: lines.some(
            ({ identityKind }) => identityKind === 'LEGACY_POSITION',
        ),
        lines,
        groupedIngredients: [...byVariant.values()],
    };
};

export { toIngredientProjection };
