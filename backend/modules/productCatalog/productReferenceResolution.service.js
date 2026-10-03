import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    SupplierArticle,
} from '../supplierCatalog/supplier.model.js';
import {
    SupplierCatalogLine,
} from '../supplierCatalog/supplierCatalog.model.js';
import {
    IndicativePrice,
} from '../supplierCatalog/supplierPricing.model.js';
import {
    TechnicalSheetDraft,
} from '../technicalSheet/technicalSheetDraft.model.js';
import { CanonicalProduct } from './canonicalProduct.model.js';
import {
    buildSearchGrams,
    buildSearchKeys,
    buildVariantSignature,
    normalizeProductText,
} from './productCatalog.normalization.js';
import {
    PRODUCT_CONTRIBUTION_TYPE,
    PRODUCT_DIMENSION_REVIEW_STATUS,
    PRODUCT_GOVERNANCE_STATUS,
    PRODUCT_STATUS,
    WORKSPACE_PRODUCT_STATUS,
} from './productCatalog.registry.js';
import { ProductCharacteristic } from './productCharacteristic.model.js';
import { ProductVariant } from './productVariant.model.js';
import { ProductVariety } from './productVariety.model.js';
import { WorkspaceProduct } from './workspaceProduct.model.js';

const conflict = (message) => {
    throw new AppError(message, 409);
};

const referenceModelForType = (type) => {
    if (type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT) {
        return CanonicalProduct;
    }
    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIANT) {
        return ProductVariant;
    }
    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
        return ProductVariety;
    }
    if (type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC) {
        return ProductCharacteristic;
    }
    throw new AppError('Type de contribution non résoluble.', 400);
};

const loadReference = async ({
    type,
    referenceId,
    session,
}) => referenceModelForType(type).findOne({
    _id: referenceId,
    identityActive: true,
    status: mongoose.trusted({
        $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
    }),
}).session(session);

const assertApprovedTarget = async ({
    source,
    type,
    targetReferenceId,
    session,
}) => {
    const Model = referenceModelForType(type);
    const target = await Model.findOne({
        _id: targetReferenceId,
        identityActive: true,
        governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        status: mongoose.trusted({
            $in: [PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.ARCHIVED],
        }),
        ...(type === PRODUCT_CONTRIBUTION_TYPE.VARIANT
            ? { canonicalProduct: source.canonicalProduct }
            : {}),
        ...(type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
            ? { canonicalProduct: source.canonicalProduct }
            : {}),
        ...(type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
            ? {
                canonicalProduct: source.canonicalProduct,
                kind: source.kind,
            }
            : {}),
    }).session(session);

    if (!target) {
        throw new AppError(
            'La référence cible de fusion est introuvable ou non validée.',
            409,
        );
    }

    return target;
};

const assertNoIndicativePriceCollision = async ({
    sourceVariantId,
    targetVariantId,
    session,
}) => {
    const prices = await IndicativePrice.find({
        productVariant: sourceVariantId,
        status: 'ACTIVE',
    }).session(session);

    for (const price of prices) {
        const existing = await IndicativePrice.exists({
            _id: mongoose.trusted({ $ne: price._id }),
            workspace: price.workspace,
            dossier: price.dossier ?? null,
            productVariant: targetVariantId,
            status: 'ACTIVE',
        }).session(session);

        if (existing) {
            conflict(
                'La fusion créerait un doublon de Prix indicatif actif. '
                + 'Résolvez ce prix avant de fusionner les références.',
            );
        }
    }
};

const repointWorkspaceProducts = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => {
    const entries = await WorkspaceProduct.find({
        productVariant: sourceVariantId,
    }).session(session);

    for (const entry of entries) {
        const targetEntry = await WorkspaceProduct.findOne({
            workspace: entry.workspace,
            productVariant: targetVariantId,
        }).session(session);

        if (targetEntry) {
            if (
                entry.status === WORKSPACE_PRODUCT_STATUS.ACTIVE
                && targetEntry.status !== WORKSPACE_PRODUCT_STATUS.ACTIVE
            ) {
                targetEntry.status = WORKSPACE_PRODUCT_STATUS.ACTIVE;
                targetEntry.updatedBy = actorId;
                await targetEntry.save({ session });
            }

            entry.status = WORKSPACE_PRODUCT_STATUS.ARCHIVED;
            entry.updatedBy = actorId;
            await entry.save({ session });
            continue;
        }

        await WorkspaceProduct.collection.updateOne(
            { _id: entry._id },
            {
                $set: {
                    productVariant: targetVariantId,
                    updatedBy: actorId,
                },
            },
            { session },
        );
    }
};

const repointVariantDependencies = async ({
    sourceVariantId,
    targetVariantId,
    actorId,
    session,
}) => {
    await assertNoIndicativePriceCollision({
        sourceVariantId,
        targetVariantId,
        actorId,
        session,
    });

    await repointWorkspaceProducts({
        sourceVariantId,
        targetVariantId,
        session,
    });

    await SupplierArticle.collection.updateMany(
        { productVariant: sourceVariantId },
        {
            $set: {
                productVariant: targetVariantId,
                updatedBy: actorId,
            },
        },
        { session },
    );
    await SupplierCatalogLine.collection.updateMany(
        { productVariant: sourceVariantId },
        {
            $set: {
                productVariant: targetVariantId,
                updatedBy: actorId,
            },
        },
        { session },
    );
    await IndicativePrice.collection.updateMany(
        { productVariant: sourceVariantId },
        {
            $set: {
                productVariant: targetVariantId,
                updatedBy: actorId,
            },
        },
        { session },
    );
    await TechnicalSheetDraft.collection.updateMany(
        { 'lines.productVariant': sourceVariantId },
        {
            $set: {
                'lines.$[line].productVariant': targetVariantId,
                valuationStatus: 'NOT_VALUED',
                valuedAt: null,
                valuationFingerprint: null,
                economicSnapshot: null,
                updatedBy: actorId,
            },
        },
        {
            session,
            arrayFilters: [{ 'line.productVariant': sourceVariantId }],
        },
    );
};

const loadVariantIdentity = async ({ variantId, session }) => (
    ProductVariant.findById(variantId)
        .populate('variety')
        .populate('characteristics')
        .session(session)
);

const variantCanBeApproved = async ({ variant, session }) => {
    const product = await CanonicalProduct.findById(
        variant.canonicalProduct,
    ).session(session);
    if (
        !product
        || product.governanceStatus !== PRODUCT_GOVERNANCE_STATUS.APPROVED
    ) {
        return false;
    }

    const variety = variant.variety?._id
        ? variant.variety
        : variant.variety
            ? await ProductVariety.findById(variant.variety).session(session)
            : null;
    if (
        variety
        && variety.governanceStatus !== PRODUCT_GOVERNANCE_STATUS.APPROVED
    ) {
        return false;
    }

    const characteristics = (
        variant.characteristics ?? []
    ).filter(Boolean);
    const hydrated = characteristics.some((value) => !value?._id)
        ? await ProductCharacteristic.find({
            _id: mongoose.trusted({
                $in: characteristics.map((value) => value._id ?? value),
            }),
        }).session(session)
        : characteristics;

    return hydrated.every((characteristic) => (
        characteristic.governanceStatus
        === PRODUCT_GOVERNANCE_STATUS.APPROVED
    ));
};

const refreshVariantIdentity = async ({
    variantId,
    session,
}) => {
    const variant = await loadVariantIdentity({ variantId, session });
    if (!variant || !variant.identityActive) return null;

    variant.normalizedSignature = buildVariantSignature({
        name: variant.name,
        varietyId: variant.variety?._id ?? variant.variety,
        characteristics: (variant.characteristics ?? []).map(
            (characteristic) => ({
                id: characteristic._id ?? characteristic,
                kind: characteristic.kind ?? '_',
            }),
        ),
    });

    if (await variantCanBeApproved({ variant, session })) {
        variant.governanceStatus = PRODUCT_GOVERNANCE_STATUS.APPROVED;
    } else {
        variant.governanceStatus = PRODUCT_GOVERNANCE_STATUS.PROVISIONAL;
    }

    try {
        await variant.save({ session });
    } catch (error) {
        if (error?.code === 11000) {
            conflict(
                'La résolution créerait une Référence Produit en doublon. '
                + 'Une fusion explicite de cette Référence est requise.',
            );
        }
        throw error;
    }

    return variant;
};

const resolveVariantCollisionOrSave = async ({
    variantId,
    actorId,
    session,
}) => {
    const variant = await loadVariantIdentity({ variantId, session });
    if (!variant || !variant.identityActive) return;

    const signature = buildVariantSignature({
        name: variant.name,
        varietyId: variant.variety?._id ?? variant.variety,
        characteristics: (variant.characteristics ?? []).map(
            (characteristic) => ({
                id: characteristic._id ?? characteristic,
                kind: characteristic.kind ?? '_',
            }),
        ),
    });

    const duplicate = await ProductVariant.findOne({
        _id: mongoose.trusted({ $ne: variant._id }),
        canonicalProduct: variant.canonicalProduct,
        normalizedSignature: signature,
        identityActive: true,
        governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
    }).session(session);

    if (duplicate) {
        await repointVariantDependencies({
            sourceVariantId: variant._id,
            targetVariantId: duplicate._id,
            actorId,
            session,
        });
        variant.governanceStatus = PRODUCT_GOVERNANCE_STATUS.RESOLVED;
        variant.identityActive = false;
        await variant.save({ session });
        return;
    }

    await refreshVariantIdentity({ variantId: variant._id, session });
};

const affectedVariantIds = async ({
    type,
    referenceId,
    session,
}) => {
    if (type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT) {
        return ProductVariant.find({
            canonicalProduct: referenceId,
            identityActive: true,
        }).distinct('_id').session(session);
    }
    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIANT) {
        return [referenceId];
    }
    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
        return ProductVariant.find({
            variety: referenceId,
            identityActive: true,
        }).distinct('_id').session(session);
    }
    return ProductVariant.find({
        characteristics: referenceId,
        identityActive: true,
    }).distinct('_id').session(session);
};

const refreshAffectedVariants = async ({
    type,
    referenceId,
    actorId,
    session,
}) => {
    const variantIds = await affectedVariantIds({
        type,
        referenceId,
        session,
    });
    for (const variantId of variantIds) {
        await resolveVariantCollisionOrSave({
            variantId,
            actorId,
            session,
        });
    }
};

const correctReferenceValue = async ({
    reference,
    correctedValue,
    actorId,
    session,
}) => {
    if (!correctedValue) return;
    const name = String(correctedValue).trim();
    const normalizedName = normalizeProductText(name);
    if (!normalizedName) {
        throw new AppError('La valeur corrigée est invalide.', 400);
    }

    reference.name = name;
    reference.normalizedName = normalizedName;
    reference.searchKeys = buildSearchKeys(name, reference.aliases ?? []);
    reference.searchGrams = buildSearchGrams(reference.searchKeys);
    reference.updatedBy = actorId;
    await reference.save({ session });
};

const promoteProvisionalReference = async ({
    type,
    reference,
    actorId,
    correctedValue = null,
    session,
}) => {
    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIANT) {
        const variant = await loadVariantIdentity({
            variantId: reference._id,
            session,
        });

        if (!variant || !variant.identityActive) {
            throw new AppError('Référence Produit provisoire introuvable.', 409);
        }

        if (!(await variantCanBeApproved({ variant, session }))) {
            conflict(
                'Cette Référence dépend encore de valeurs à contrôler. '
                + 'Validez d’abord ses Dimensions.',
            );
        }

        if (correctedValue) {
            const name = String(correctedValue).trim();
            const normalizedName = normalizeProductText(name);
            if (!normalizedName) {
                throw new AppError(
                    'Le nom corrigé de la Référence est invalide.',
                    400,
                );
            }
            variant.name = name;
            variant.normalizedName = normalizedName;
        }

        variant.normalizedSignature = buildVariantSignature({
            name: variant.name,
            varietyId: variant.variety?._id ?? variant.variety,
            characteristics: (variant.characteristics ?? []).map(
                (characteristic) => ({
                    id: characteristic._id ?? characteristic,
                    kind: characteristic.kind ?? '_',
                }),
            ),
        });
        variant.governanceStatus = PRODUCT_GOVERNANCE_STATUS.APPROVED;
        variant.updatedBy = actorId;

        try {
            await variant.save({ session });
        } catch (error) {
            if (error?.code === 11000) {
                conflict(
                    'Une Référence Produit équivalente existe déjà. '
                    + 'Utilisez la fusion.',
                );
            }
            throw error;
        }

        return variant;
    }

    await correctReferenceValue({
        reference,
        correctedValue,
        actorId,
        session,
    });

    reference.governanceStatus = PRODUCT_GOVERNANCE_STATUS.APPROVED;
    if (
        type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
        || type === PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC
    ) {
        reference.qualityReviewStatus =
            PRODUCT_DIMENSION_REVIEW_STATUS.REVIEWED;
        reference.qualityReviewedAt = new Date();
        reference.qualityReviewedBy = actorId;
    }
    reference.updatedBy = actorId;
    try {
        await reference.save({ session });
    } catch (error) {
        if (error?.code === 11000) {
            conflict(
                'Une référence canonique équivalente existe déjà. '
                + 'Utilisez la fusion au lieu de valider cette proposition.',
            );
        }
        throw error;
    }

    await refreshAffectedVariants({
        type,
        referenceId: reference._id,
        actorId,
        session,
    });

    return reference;
};

const mergeDimensionReference = async ({
    type,
    source,
    target,
    actorId,
    session,
}) => {
    const variants = await ProductVariant.find(
        type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
            ? { variety: source._id, identityActive: true }
            : { characteristics: source._id, identityActive: true },
    ).session(session);

    for (const variant of variants) {
        if (type === PRODUCT_CONTRIBUTION_TYPE.VARIETY) {
            variant.variety = target._id;
        } else {
            variant.characteristics = (variant.characteristics ?? []).map(
                (id) => id.toString() === source._id.toString()
                    ? target._id
                    : id,
            );
        }
        await variant.save({ session });
        await resolveVariantCollisionOrSave({
            variantId: variant._id,
            actorId,
            session,
        });
    }

    source.governanceStatus = PRODUCT_GOVERNANCE_STATUS.RESOLVED;
    source.identityActive = false;
    source.updatedBy = actorId;
    await source.save({ session });

    return target;
};

const moveOrMergeProductDimensions = async ({
    sourceProduct,
    targetProduct,
    actorId,
    session,
}) => {
    const varieties = await ProductVariety.find({
        canonicalProduct: sourceProduct._id,
        identityActive: true,
    }).session(session);

    for (const source of varieties) {
        const target = await ProductVariety.findOne({
            canonicalProduct: targetProduct._id,
            normalizedName: source.normalizedName,
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        }).session(session);

        if (target) {
            await mergeDimensionReference({
                type: PRODUCT_CONTRIBUTION_TYPE.VARIETY,
                source,
                target,
                actorId,
                session,
            });
            continue;
        }

        await ProductVariety.collection.updateOne(
            { _id: source._id },
            {
                $set: {
                    canonicalProduct: targetProduct._id,
                    governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
                    updatedBy: actorId,
                },
            },
            { session },
        );
    }

    const characteristics = await ProductCharacteristic.find({
        canonicalProduct: sourceProduct._id,
        identityActive: true,
    }).session(session);

    for (const source of characteristics) {
        const target = await ProductCharacteristic.findOne({
            canonicalProduct: targetProduct._id,
            kind: source.kind,
            normalizedName: source.normalizedName,
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
        }).session(session);

        if (target) {
            await mergeDimensionReference({
                type: PRODUCT_CONTRIBUTION_TYPE.CHARACTERISTIC,
                source,
                target,
                actorId,
                session,
            });
            continue;
        }

        await ProductCharacteristic.collection.updateOne(
            { _id: source._id },
            {
                $set: {
                    canonicalProduct: targetProduct._id,
                    governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
                    updatedBy: actorId,
                },
            },
            { session },
        );
    }
};

const mergeCanonicalProduct = async ({
    source,
    target,
    actorId,
    session,
}) => {
    await moveOrMergeProductDimensions({
        sourceProduct: source,
        targetProduct: target,
        actorId,
        session,
    });

    const sourceVariants = await ProductVariant.find({
        canonicalProduct: source._id,
        identityActive: true,
    }).session(session);

    for (const sourceVariant of sourceVariants) {
        const hydrated = await loadVariantIdentity({
            variantId: sourceVariant._id,
            session,
        });
        const signature = buildVariantSignature({
            name: hydrated.name,
            varietyId: hydrated.variety?._id ?? hydrated.variety,
            characteristics: (hydrated.characteristics ?? []).map(
                (characteristic) => ({
                    id: characteristic._id ?? characteristic,
                    kind: characteristic.kind ?? '_',
                }),
            ),
        });

        const targetVariant = await ProductVariant.findOne({
            canonicalProduct: target._id,
            identityActive: true,
            governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
            $or: [
                { normalizedName: hydrated.normalizedName },
                { normalizedSignature: signature },
            ],
        }).session(session);

        if (targetVariant) {
            await repointVariantDependencies({
                sourceVariantId: hydrated._id,
                targetVariantId: targetVariant._id,
                actorId,
                session,
            });
            hydrated.governanceStatus = PRODUCT_GOVERNANCE_STATUS.RESOLVED;
            hydrated.identityActive = false;
            await hydrated.save({ session });
            continue;
        }

        await ProductVariant.collection.updateOne(
            { _id: hydrated._id },
            {
                $set: {
                    canonicalProduct: target._id,
                    normalizedSignature: signature,
                    governanceStatus: PRODUCT_GOVERNANCE_STATUS.APPROVED,
                    updatedBy: actorId,
                },
            },
            { session },
        );
    }

    source.governanceStatus = PRODUCT_GOVERNANCE_STATUS.RESOLVED;
    source.identityActive = false;
    source.replacementProduct = target._id;
    source.updatedBy = actorId;
    await source.save({ session });

    return target;
};

const mergeVariantReference = async ({
    source,
    target,
    actorId,
    session,
}) => {
    await repointVariantDependencies({
        sourceVariantId: source._id,
        targetVariantId: target._id,
        actorId,
        session,
    });

    source.governanceStatus = PRODUCT_GOVERNANCE_STATUS.RESOLVED;
    source.identityActive = false;
    source.replacementVariant = target._id;
    source.updatedBy = actorId;
    await source.save({ session });

    return target;
};

const mergeProvisionalReference = async ({
    type,
    reference,
    targetReferenceId,
    actorId,
    session,
}) => {
    const target = await assertApprovedTarget({
        source: reference,
        type,
        targetReferenceId,
        session,
    });

    if (type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT) {
        return mergeCanonicalProduct({
            source: reference,
            target,
            actorId,
            session,
        });
    }

    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIANT) {
        return mergeVariantReference({
            source: reference,
            target,
            actorId,
            session,
        });
    }

    return mergeDimensionReference({
        type,
        source: reference,
        target,
        actorId,
        session,
    });
};

const rejectProvisionalReference = async ({
    type,
    reference,
    actorId,
    session,
}) => {
    if (type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT) {
        const variants = await ProductVariant.find({
            canonicalProduct: reference._id,
            identityActive: true,
        }).session(session);
        const variantIds = variants.map(({ _id }) => _id);

        if (variantIds.length > 0) {
            const durableUse = await Promise.all([
                SupplierArticle.exists({
                    productVariant: mongoose.trusted({ $in: variantIds }),
                }).session(session),
                SupplierCatalogLine.exists({
                    productVariant: mongoose.trusted({ $in: variantIds }),
                }).session(session),
                IndicativePrice.exists({
                    productVariant: mongoose.trusted({ $in: variantIds }),
                }).session(session),
                TechnicalSheetDraft.exists({
                    'lines.productVariant': mongoose.trusted({
                        $in: variantIds,
                    }),
                }).session(session),
            ]);

            if (durableUse.some(Boolean)) {
                conflict(
                    'Ce Produit provisoire est déjà utilisé. '
                    + 'Fusionnez-le avec un Produit validé plutôt que de le refuser.',
                );
            }

            await WorkspaceProduct.updateMany(
                {
                    productVariant: mongoose.trusted({
                        $in: variantIds,
                    }),
                },
                {
                    $set: {
                        status: WORKSPACE_PRODUCT_STATUS.ARCHIVED,
                        updatedBy: actorId,
                    },
                },
                { session },
            );

            await ProductVariant.updateMany(
                { _id: mongoose.trusted({ $in: variantIds }) },
                {
                    $set: {
                        governanceStatus:
                            PRODUCT_GOVERNANCE_STATUS.REJECTED,
                        identityActive: false,
                        updatedBy: actorId,
                    },
                },
                { session },
            );
        }

        await ProductVariety.updateMany(
            {
                canonicalProduct: reference._id,
                identityActive: true,
            },
            {
                $set: {
                    governanceStatus: PRODUCT_GOVERNANCE_STATUS.REJECTED,
                    identityActive: false,
                    updatedBy: actorId,
                },
            },
            { session },
        );
        await ProductCharacteristic.updateMany(
            {
                canonicalProduct: reference._id,
                identityActive: true,
            },
            {
                $set: {
                    governanceStatus: PRODUCT_GOVERNANCE_STATUS.REJECTED,
                    identityActive: false,
                    updatedBy: actorId,
                },
            },
            { session },
        );

        reference.governanceStatus = PRODUCT_GOVERNANCE_STATUS.REJECTED;
        reference.identityActive = false;
        reference.updatedBy = actorId;
        await reference.save({ session });
        return reference;
    }

    if (type === PRODUCT_CONTRIBUTION_TYPE.VARIANT) {
        const durableUse = await Promise.all([
            SupplierArticle.exists({
                productVariant: reference._id,
            }).session(session),
            SupplierCatalogLine.exists({
                productVariant: reference._id,
            }).session(session),
            IndicativePrice.exists({
                productVariant: reference._id,
            }).session(session),
            TechnicalSheetDraft.exists({
                'lines.productVariant': reference._id,
            }).session(session),
        ]);

        if (durableUse.some(Boolean)) {
            conflict(
                'Cette Référence provisoire est déjà utilisée. '
                + 'Fusionnez-la avec une Référence validée plutôt que de la refuser.',
            );
        }

        await WorkspaceProduct.updateMany(
            { productVariant: reference._id },
            {
                $set: {
                    status: WORKSPACE_PRODUCT_STATUS.ARCHIVED,
                    updatedBy: actorId,
                },
            },
            { session },
        );

        reference.governanceStatus = PRODUCT_GOVERNANCE_STATUS.REJECTED;
        reference.identityActive = false;
        reference.updatedBy = actorId;
        await reference.save({ session });
        return reference;
    }

    const used = type === PRODUCT_CONTRIBUTION_TYPE.CANONICAL_PRODUCT
        ? await ProductVariant.exists({
            canonicalProduct: reference._id,
            identityActive: true,
        }).session(session)
        : type === PRODUCT_CONTRIBUTION_TYPE.VARIETY
            ? await ProductVariant.exists({
                variety: reference._id,
                identityActive: true,
            }).session(session)
            : await ProductVariant.exists({
                characteristics: reference._id,
                identityActive: true,
            }).session(session);

    if (used) {
        conflict(
            'Cette valeur provisoire est déjà utilisée. '
            + 'Fusionnez-la avec une valeur canonique avant de la rejeter.',
        );
    }

    reference.governanceStatus = PRODUCT_GOVERNANCE_STATUS.REJECTED;
    reference.identityActive = false;
    reference.updatedBy = actorId;
    await reference.save({ session });
    return reference;
};

const resolveProvisionalContribution = async ({
    contribution,
    actorId,
    decision,
    targetReferenceId = null,
    correctedValue = null,
    session,
}) => {
    if (!contribution.provisionalEntityId) {
        return null;
    }

    const reference = await loadReference({
        type: contribution.type,
        referenceId: contribution.provisionalEntityId,
        session,
    });

    if (
        !reference
        || reference.governanceStatus
            !== PRODUCT_GOVERNANCE_STATUS.PROVISIONAL
    ) {
        throw new AppError(
            'La valeur provisoire liée à cette contribution est introuvable.',
            409,
        );
    }

    if (decision === 'REJECT') {
        await rejectProvisionalReference({
            type: contribution.type,
            reference,
            actorId,
            session,
        });
        return {
            reference,
            resolutionEntityId: null,
        };
    }

    if (decision === 'MERGE') {
        if (!targetReferenceId) {
            throw new AppError(
                'Une cible canonique est requise pour fusionner.',
                400,
            );
        }
        const target = await mergeProvisionalReference({
            type: contribution.type,
            reference,
            targetReferenceId,
            actorId,
            session,
        });
        return {
            reference: target,
            resolutionEntityId: target._id,
        };
    }

    if (decision !== 'APPROVE') {
        throw new AppError('Décision de contribution invalide.', 400);
    }

    const approved = await promoteProvisionalReference({
        type: contribution.type,
        reference,
        actorId,
        correctedValue,
        session,
    });
    return {
        reference: approved,
        resolutionEntityId: approved._id,
    };
};

export {
    mergeProvisionalReference,
    promoteProvisionalReference,
    repointVariantDependencies,
    resolveProvisionalContribution,
};
