import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    PRODUCT_CONTRIBUTION_CLASSIFICATION,
    PRODUCT_CONTRIBUTION_STATUS,
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_REFERENCE_EVENT_ACTION,
    PRODUCT_REFERENCE_EVENT_ENTITY_TYPE,
    PRODUCT_REVIEW_QUEUE_TYPE,
} from './productCatalog.registry.js';
import { ProductVariant } from './productVariant.model.js';
import { ReferenceContribution } from './referenceContribution.model.js';
import { createProductReferenceEvent } from './productReferenceEvent.service.js';
import { listProductReviewQueue } from './productReferenceReviewQueue.service.js';

/**
 * Reconstruit exclusivement le lien de gouvernance d'une identité
 * provisoire orpheline. Ne valide pas la Référence et ne crée aucune
 * nouvelle identité Produit.
 *
 * Le verrou d'écriture du document cible sérialise les récupérations
 * concurrentes dans des transactions MongoDB.
 */
const restoreProductReviewContext = async ({
    actorId,
    productId,
    dataType,
    targetId,
}) => {
    const entityType = dataType === 'PRODUCT'
        ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT
        : PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT;
    const contributionType = dataType === 'PRODUCT'
        ? PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT
        : PRODUCT_CONTRIBUTION_TYPE.VARIANT;
    const Model = dataType === 'PRODUCT' ? CanonicalProduct : ProductVariant;
    if (dataType === 'PRODUCT' && targetId.toString() !== productId.toString()) {
        throw new AppError('Le Produit demandé ne correspond pas au contrôle ciblé.', 409);
    }

    await mongoose.connection.transaction(async (session) => {
        const identityFilter = {
            _id: targetId,
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
            ...(dataType === 'REFERENCE'
                ? { canonicalProduct: productId } : {}),
        };
        const identity = await Model.findOne(identityFilter).session(session);
        if (!identity) {
            throw new AppError(
                'Cette identité n’est plus à contrôler ou est introuvable.',
                409,
            );
        }
        if (!identity.contributedFromWorkspace) {
            throw new AppError(
                'Le contrôle ne peut pas être repris automatiquement : '
                + 'l’espace de travail d’origine est inconnu.',
                409,
            );
        }

        // Un changement d'horodatage impose un verrou d'écriture sur l'identité
        // et évite deux contributions actives sur deux clics concurrents.
        await Model.updateOne(identityFilter, {
            $currentDate: { updatedAt: true },
        }, { session });

        const existing = await ReferenceContribution.findOne({
            provisionalEntityType: entityType,
            provisionalEntityId: identity._id,
            status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
        }).session(session);
        if (existing) return;

        const [contribution] = await ReferenceContribution.create([{
            type: contributionType,
            canonicalProduct: dataType === 'PRODUCT'
                ? identity._id : identity.canonicalProduct,
            workspace: identity.contributedFromWorkspace,
            author: identity.createdBy,
            proposedValue: identity.name,
            normalizedValue: identity.normalizedName,
            payload: { candidates: [], recoveredReviewLink: true },
            classification: PRODUCT_CONTRIBUTION_CLASSIFICATION.PROVISIONAL,
            reasons: [{
                code: 'REVIEW_LINK_RESTORED',
                message: 'Reprise de la validation de cette identité provisoire.',
            }],
            status: PRODUCT_CONTRIBUTION_STATUS.PENDING_REVIEW,
            provisionalEntityType: entityType,
            provisionalEntityId: identity._id,
        }], { session });

        await createProductReferenceEvent({
            actorId,
            workspaceId: identity.contributedFromWorkspace,
            action: PRODUCT_REFERENCE_EVENT_ACTION.CONTRIBUTION_SUBMITTED,
            entityType: PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CONTRIBUTION,
            entityId: contribution._id,
            metadata: { recoveredReviewLink: true, targetId: identity._id.toString() },
            session,
        });
    });

    const result = await listProductReviewQueue({
        type: PRODUCT_REVIEW_QUEUE_TYPE.CONTRIBUTION,
        targetId,
        origins: 'omit',
        limit: 1,
        page: 1,
    });
    const item = result.items.find((entry) => (
        entry.targetId === targetId && entry.dataType === dataType
    ));
    if (!item) {
        throw new AppError('Le contrôle n’est pas disponible dans la file.', 409);
    }
    return item;
};

export { restoreProductReviewContext };
