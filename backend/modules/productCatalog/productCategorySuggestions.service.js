import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { ProductCategory } from './productCategory.model.js';
import {
    isNearDuplicateKey,
    levenshteinDistance,
    normalizeProductText,
} from './productCatalog.normalization.js';

/**
 * Suggestions du référentiel global. Les Catégories archivées figurent aussi
 * parmi les candidats pour empêcher une nouvelle identité quasi identique.
 * L'index normalizedKey reste l'autorité pour les doublons exacts.
 */
const findCategoryNameSuggestions = async ({
    name,
    excludeCategoryId = null,
    session = null,
}) => {
    const normalized = normalizeProductText(name);
    const query = ProductCategory.find(excludeCategoryId ? {
        _id: mongoose.trusted({ $ne: new mongoose.Types.ObjectId(excludeCategoryId) }),
    } : {}).lean();

    if (session) query.session(session);
    const categories = await query;

    const exact = categories.find(({ normalizedKey }) => normalizedKey === normalized);
    const candidates = categories
        .filter(({ normalizedKey }) => (
            normalizedKey !== normalized
            && isNearDuplicateKey(normalized, normalizedKey)
        ))
        .sort((a, b) => (
            levenshteinDistance(normalized, a.normalizedKey)
            - levenshteinDistance(normalized, b.normalizedKey)
            || a.name.localeCompare(b.name, 'fr')
        ))
        .map(({ _id, name: existingName, status }) => ({
            id: _id.toString(),
            name: existingName,
            status,
        }));

    return {
        normalizedKey: normalized,
        exactMatch: exact ? {
            id: exact._id.toString(),
            name: exact.name,
            status: exact.status,
        } : null,
        candidates,
    };
};

const assertCategoryNameReviewed = async ({
    name,
    excludeCategoryId = null,
    reviewedCandidateIds = [],
    session,
}) => {
    const suggestions = await findCategoryNameSuggestions({
        name,
        excludeCategoryId,
        session,
    });

    if (suggestions.exactMatch) {
        throw new AppError('Cette catégorie existe déjà.', 409);
    }

    const confirmed = new Set(reviewedCandidateIds.map(String));
    if (suggestions.candidates.some(({ id }) => !confirmed.has(id))) {
        throw new AppError(
            'Des catégories proches existent. Examinez-les avant de confirmer une catégorie distincte.',
            409,
        );
    }
    return suggestions;
};

export { assertCategoryNameReviewed, findCategoryNameSuggestions };
