import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { TechnicalSheet } from '../technicalSheet/technicalSheet.model.js';
import { TechnicalSheetDraft } from '../technicalSheet/technicalSheetDraft.model.js';
import {
    TECHNICAL_SHEET_STATUS,
} from '../technicalSheet/technicalSheet.registry.js';
import {
    TechnicalSheetValidation,
} from '../technicalSheet/technicalSheetValidation.model.js';
import { toIngredientProjection } from './processSheetIngredientProjection.js';

/**
 * Reads the parent in its tenant/Dossier scope. This is not a process draft;
 * M-006 creation remains closed until transactional M-004 lifecycle is wired.
 */
const getProcessSheetCompositionContext = async ({
    workspaceId,
    dossierId,
    technicalSheetId,
}) => {
    const filter = mongoose.trusted({
        _id: technicalSheetId,
        workspace: workspaceId,
        dossier: dossierId,
    });
    const sheet = await TechnicalSheet.findOne(filter)
        .select('_id name status currentValidatedState')
        .lean();

    if (!sheet || sheet.status === TECHNICAL_SHEET_STATUS.DELETED) {
        throw new AppError('Fiche technique indisponible.', 404);
    }

    const [draft, validation] = await Promise.all([
        TechnicalSheetDraft.findOne(mongoose.trusted({
            technicalSheet: sheet._id,
            workspace: workspaceId,
            dossier: dossierId,
        })).populate({
            path: 'lines.productVariant',
            select: '_id name',
        }),
        sheet.currentValidatedState
            ? TechnicalSheetValidation.findOne(mongoose.trusted({
                _id: sheet.currentValidatedState,
                technicalSheet: sheet._id,
                workspace: workspaceId,
                dossier: dossierId,
            }))
            : null,
    ]);

    if (sheet.currentValidatedState && !validation) {
        throw new AppError(
            'La composition validée M-004 est introuvable.',
            409,
        );
    }

    const draftComposition = draft
        ? toIngredientProjection({ sourceKind: 'DRAFT', source: draft })
        : null;
    const validatedComposition = validation
        ? toIngredientProjection({ sourceKind: 'VALIDATION', source: validation })
        : null;

    return {
        technicalSheetId: sheet._id.toString(),
        technicalSheetName: sheet.name,
        technicalSheetStatus: sheet.status,
        currentSourceKind: draft
            ? 'DRAFT'
            : validation ? 'VALIDATION' : 'NONE',
        draft: draftComposition,
        validated: validatedComposition,
        // Historical sourceLineId may be absent; consumers must NOT infer
        // identities from variant IDs or silently match ambiguous duplicates.
        requiresExplicitLegacyMapping: Boolean(
            validatedComposition?.hasLegacyLineIdentity,
        ),
    };
};

export { getProcessSheetCompositionContext };
