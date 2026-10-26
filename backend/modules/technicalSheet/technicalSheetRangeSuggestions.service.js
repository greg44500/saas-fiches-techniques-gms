import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    isNearDuplicateKey,
    levenshteinDistance,
} from '../productCatalog/productCatalog.normalization.js';
import { TechnicalSheetRange } from './technicalSheetRange.model.js';
import { normalizeRangeName } from './technicalSheetRangeName.js';

/**
 * Mêmes critères de proximité que les Catégories Produit, mais exclusivement
 * sur les Gammes du Workspace. Les Gammes archivées restent candidates.
 * L'index unique sur normalizedName est l'autorité des doublons exacts.
 */
const findRangeNameSuggestions = async ({
    workspaceId,
    name,
    excludeRangeId = null,
    session = null,
}) => {
    const normalized = normalizeRangeName(name);
    const filter = mongoose.trusted({ workspace: workspaceId });
    if (excludeRangeId) {
        filter._id = mongoose.trusted({
            $ne: new mongoose.Types.ObjectId(excludeRangeId),
        });
    }
    const query = TechnicalSheetRange.find(filter)
        .select('_id name status normalizedName')
        .lean();
    if (session) query.session(session);
    const ranges = await query;

    const exact = ranges.find((range) => range.normalizedName === normalized);
    const candidates = ranges.filter((range) => (
        range.normalizedName !== normalized
        && isNearDuplicateKey(normalized, range.normalizedName)
    )).sort((a, b) => (
        levenshteinDistance(normalized, a.normalizedName)
        - levenshteinDistance(normalized, b.normalizedName)
        || a.name.localeCompare(b.name, 'fr')
    )).map((range) => ({
        id: range._id.toString(),
        name: range.name,
        status: range.status,
    }));

    return {
        exactMatch: exact ? {
            id: exact._id.toString(),
            name: exact.name,
            status: exact.status,
        } : null,
        candidates,
    };
};

const assertRangeNameReviewed = async ({
    workspaceId,
    name,
    excludeRangeId = null,
    reviewedCandidateIds = [],
    session,
}) => {
    const suggestions = await findRangeNameSuggestions({
        workspaceId, name, excludeRangeId, session,
    });

    if (suggestions.exactMatch) {
        throw new AppError('Cette Gamme existe déjà dans votre espace.', 409);
    }

    const confirmed = new Set(reviewedCandidateIds.map(String));
    if (suggestions.candidates.some(({ id }) => !confirmed.has(id))) {
        throw new AppError(
            'Des Gammes proches existent. Vérifiez-les et confirmez que la nouvelle Gamme est différente.',
            409,
        );
    }

    return suggestions;
};

export { assertRangeNameReviewed, findRangeNameSuggestions };
