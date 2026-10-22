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
import { ProductVariety } from './productVariety.model.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
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
    dimensionType = null,
}) => {
    const isDimension = dataType === 'DIMENSION';
    if (isDimension && !['VARIETY', 'CHARACTERISTIC'].includes(dimensionType)) {
        throw new AppError('Type de Dimension invalide pour la reprise du contrôle.', 400);
    }
    if (!['PRODUCT', 'REFERENCE', 'DIMENSION'].includes(dataType)) {
        throw new AppError('Type de donnée invalide pour le contrôle.', 400);
    }
    const contributionType = dataType === 'PRODUCT'
        ? PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT
        : dataType === 'REFERENCE'
            ? PRODUCT_CONTRIBUTION_TYPE.VARIANT
            : dimensionType === 'VARIETY'
                ? PRODUCT_CONTRIBUTION_TYPE.VARIETY
                : PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC;
    const entityType = dataType === 'PRODUCT'
        ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.PRODUCT
        : dataType === 'REFERENCE'
            ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIANT
            : dimensionType === 'VARIETY'
                ? PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.VARIETY
                : PRODUCT_REFERENCE_EVENT_ENTITY_TYPE.CHARACTERISTIC;
    const Model = dataType === 'PRODUCT'
        ? CanonicalProduct
        : dataType === 'REFERENCE'
            ? ProductVariant
            : dimensionType === 'VARIETY'
                ? ProductVariety
                : ProductCharacteristic;
    if (dataType === 'PRODUCT' && targetId.toString() !== productId.toString()) {
        throw new AppError('Le Produit demandé ne correspond pas au contrôle ciblé.', 409);
    }

    await mongoose.connection.transaction(async (session) => {
        const identityFilter = {
            _id: targetId,
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.PROVISIONAL,
            ...(dataType !== 'PRODUCT'
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
            ...(contributionType === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
                ? { characteristicKind: identity.kind } : {}),
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
        entry.targetId === targetId.toString()
        && entry.dataType === dataType
        && (!isDimension || entry.dimensionType === dimensionType)
    ));
    if (!item) {
        throw new AppError('Le contrôle n’est pas disponible dans la file.', 409);
    }
    return item;
};

export { restoreProductReviewContext };
