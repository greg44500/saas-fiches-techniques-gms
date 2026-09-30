import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    DOSSIER_STATUS,
} from '../dossier/dossier.registry.js';
import {
    Dossier,
} from '../dossier/dossier.model.js';
import {
    PRODUCT_STATUS,
} from '../productCatalog/productCatalog.registry.js';
import {
    ProductVariant,
} from '../productCatalog/productVariant.model.js';
import {
    buildWorkspaceGovernanceVisibilityFilter,
} from '../productCatalog/productReferenceGovernance.service.js';
import {
    SupplierArticle,
} from './supplier.model.js';
import {
    SupplierTariff,
} from './supplierCatalog.model.js';
import {
    DOSSIER_SUPPLIER_REFERENCE_STATUS,
    INDICATIVE_PRICE_STATUS,
    INVOICED_PRICE_STATUS,
    NEGOTIATED_PRICE_STATUS,
    SUPPLIER_CATALOG_EVENT_ACTION,
    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE,
    SUPPLIER_INVOICED_PRICE_FRESHNESS_MONTHS,
    SUPPLIER_PRICING_POLICY_MODE,
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';
import {
    DossierSupplierReference,
    IndicativePrice,
    InvoicedPrice,
    NegotiatedPrice,
    WorkspaceSupplierPricingPolicy,
} from './supplierPricing.model.js';
import {
    normalizeSupplierPrice,
} from './supplierPriceMath.service.js';
import {
    acquireCommerceLock,
} from './supplierCatalog.service.js';
import {
    createSupplierCatalogEvent,
} from './supplierCatalogEvent.service.js';

const MUTABLE_DOSSIER_STATUSES = Object.freeze([
    DOSSIER_STATUS.ACTIVE,
    DOSSIER_STATUS.PAUSED,
]);

const decimalToString = (value) => (
    value === null || value === undefined
        ? null
        : value.toString()
);

const isPopulatedSupplierArticle = (article) => (
    article
    && typeof article === 'object'
    && article.supplier
    && article.productVariant
);

const serializePrice = (price, kind) => ({
    id: price._id.toString(),
    kind,
    supplierArticleId:
        (
            price.supplierArticle?._id
            ?? price.supplierArticle
        )?.toString() ?? null,
    supplierId:
        (
            price.supplier?._id
            ?? price.supplier
        )?.toString() ?? null,
    supplierArticle:
        isPopulatedSupplierArticle(
            price.supplierArticle,
        )
            ? serializeSupplierArticleSummary(
                price.supplierArticle,
            )
            : null,
    sourceAmount:
        decimalToString(
            price.sourceAmount,
        ),
    sourceBasis:
        price.sourceBasis,
    currency:
        price.currency,
    normalizedAmount:
        decimalToString(
            price.normalizedAmount,
        ),
    normalizedUnit:
        price.normalizedUnit ?? null,
    source:
        price.source ?? null,
    ...(kind === 'NEGOTIATED_PRICE'
        ? {
            validFrom:
                price.validFrom,
            validTo:
                price.validTo,
            status:
                price.status,
        }
        : {
            invoiceDate:
                price.invoiceDate,
            status:
                price.status,
            validatedAt:
                price.validatedAt
                ?? null,
            rejectedAt:
                price.rejectedAt
                ?? null,
        }),
    createdAt:
        price.createdAt,
    updatedAt:
        price.updatedAt,
});

const serializeProductVariantSummary =
    (variant) => ({
        id: variant._id.toString(),
        name: variant.name,
        referenceUnit: variant.referenceUnit,
        productId:
            variant.canonicalProduct?._id
                ? variant.canonicalProduct._id.toString()
                : variant.canonicalProduct?.toString() ?? null,
        productName:
            variant.canonicalProduct?.name ?? null,
    });

const serializeSupplierArticleSummary =
    (article) => ({
        id: article._id.toString(),
        supplierId:
            article.supplier?._id
                ? article.supplier._id
                    .toString()
                : article.supplier
                    .toString(),
        supplierName:
            article.supplier?.name
            ?? null,
        productVariantId:
            article.productVariant?._id
                ? article.productVariant
                    ._id.toString()
                : article.productVariant
                    .toString(),
        productVariantName:
            article.productVariant
                ?.name ?? null,
        supplierReference:
            article.supplierReference,
        supplierDesignation:
            article.supplierDesignation
            ?? null,
        brand:
            article.brand ?? null,
        status:
            article.status,
    });

const assertDossier = async ({
    workspaceId,
    dossierId,
    session = null,
    mutable = false,
}) => {
    const dossier =
        await Dossier.findOne({
            _id: dossierId,
            workspace: workspaceId,
            ...(mutable
                ? {
                    status:
                        mongoose.trusted({
                            $in:
                                MUTABLE_DOSSIER_STATUSES,
                        }),
                }
                : {}),
        }).session(session);

    if (!dossier) {
        throw new AppError(
            mutable
                ? 'Dossier indisponible pour cette modification.'
                : 'Dossier introuvable.',
            mutable ? 409 : 404,
        );
    }

    return dossier;
};

const visibleArticleFilter = ({
    workspaceId,
}) => ({
    $or: mongoose.trusted([
        {
            scope:
                SUPPLIER_SCOPE
                    .GLOBAL_SHARED,
            workspace: null,
        },
        {
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspace: workspaceId,
        },
    ]),
});

const findVisibleSupplierArticle = async ({
    workspaceId,
    articleId,
    session = null,
    requireActive = true,
}) => {
    const article =
        await SupplierArticle.findOne({
            _id: articleId,
            ...visibleArticleFilter({
                workspaceId,
            }),
            ...(requireActive
                ? {
                    status:
                        SUPPLIER_RESOURCE_STATUS
                            .ACTIVE,
                }
                : {}),
        })
            .populate({
                path: 'supplier',
                select:
                    '_id name scope workspace status',
            })
            .populate({
                path: 'productVariant',
                select:
                    '_id name referenceUnit status identityActive canonicalProduct',
                populate: {
                    path: 'canonicalProduct',
                    select: '_id name',
                },
            })
            .session(session);

    if (!article) {
        throw new AppError(
            'Article fournisseur introuvable.',
            404,
        );
    }

    if (
        requireActive
        && (
            article.supplier?.status
                !== SUPPLIER_RESOURCE_STATUS.ACTIVE
            || article.productVariant?.status
                !== PRODUCT_STATUS.ACTIVE
            || !article.productVariant
                ?.identityActive
        )
    ) {
        throw new AppError(
            'Article fournisseur indisponible.',
            409,
        );
    }

    return article;
};

const findActiveProductVariant = async ({
    productVariantId,
    workspaceId,
    session = null,
}) => {
    const productVariant =
        await ProductVariant.findOne({
            _id: productVariantId,
            status: PRODUCT_STATUS.ACTIVE,
            identityActive: true,
            ...buildWorkspaceGovernanceVisibilityFilter(workspaceId),
        })
            .populate({
                path: 'canonicalProduct',
                select: '_id name',
            })
            .session(session);

    if (!productVariant) {
        throw new AppError(
            'Référence Produit introuvable.',
            404,
        );
    }

    return productVariant;
};

const findUsableSupplierArticlesForVariant = async ({
    workspaceId,
    productVariantId,
    session = null,
}) => {
    const candidates =
        await SupplierArticle.find({
            productVariant: productVariantId,
            status: SUPPLIER_RESOURCE_STATUS.ACTIVE,
            ...visibleArticleFilter({ workspaceId }),
        })
            .populate({
                path: 'supplier',
                select: '_id name scope workspace status',
            })
            .populate({
                path: 'productVariant',
                select:
                    '_id name referenceUnit status identityActive canonicalProduct',
                populate: {
                    path: 'canonicalProduct',
                    select: '_id name',
                },
            })
            .sort({
                supplierReference: 1,
                _id: 1,
            })
            .limit(3)
            .session(session);

    return candidates.filter(
        (article) =>
            article.supplier?.status
                === SUPPLIER_RESOURCE_STATUS.ACTIVE
            && article.productVariant?.status
                === PRODUCT_STATUS.ACTIVE
            && article.productVariant?.identityActive,
    );
};

const resolvePricingContext = async ({
    workspaceId,
    articleId = null,
    productVariantId = null,
    session = null,
}) => {
    if (articleId) {
        const article =
            await findVisibleSupplierArticle({
                workspaceId,
                articleId,
                session,
            });

        if (
            productVariantId
            && article.productVariant._id.toString()
                !== productVariantId.toString()
        ) {
            throw new AppError(
                'L’Article fournisseur ne correspond pas à la Référence Produit demandée.',
                409,
            );
        }

        return {
            article,
            productVariant: article.productVariant,
        };
    }

    if (!productVariantId) {
        throw new AppError(
            'Article fournisseur ou Référence Produit requis.',
            400,
        );
    }

    const productVariant =
        await findActiveProductVariant({
            productVariantId,
            workspaceId,
            session,
        });

    const usable =
        await findUsableSupplierArticlesForVariant({
            workspaceId,
            productVariantId: productVariant._id,
            session,
        });

    if (usable.length > 1) {
        const error = new AppError(
            'Plusieurs Articles fournisseur sont exploitables. Une sélection explicite est requise.',
            409,
        );
        error.code =
            'SUPPLIER_ARTICLE_SELECTION_REQUIRED';
        error.candidates =
            usable.map(serializeSupplierArticleSummary);
        throw error;
    }

    return {
        article: usable[0] ?? null,
        productVariant,
    };
};

const resolveSupplierArticle = async (options) => {
    const context =
        await resolvePricingContext(options);

    if (!context.article) {
        throw new AppError(
            'Aucun Article fournisseur exploitable pour cette Référence Produit.',
            404,
        );
    }

    return context.article;
};

const normalizePriceForArticle = ({
    article,
    sourceAmount,
    sourceBasis,
}) => normalizeSupplierPrice({
    sourceAmount,
    sourceBasis,
    packaging:
        article.packaging
            ? {
                totalQuantity:
                    decimalToString(
                        article.packaging
                            .totalQuantity,
                    ),
                unit:
                    article.packaging
                        .unit,
            }
            : null,
    targetUnit:
        article.productVariant
            .referenceUnit,
});

const intervalsOverlap = ({
    leftStart,
    leftEnd,
    rightStart,
    rightEnd,
}) => {
    const leftStartMs =
        new Date(leftStart).getTime();
    const rightStartMs =
        new Date(rightStart).getTime();
    const leftEndMs = leftEnd
        ? new Date(leftEnd).getTime()
        : Number.POSITIVE_INFINITY;
    const rightEndMs = rightEnd
        ? new Date(rightEnd).getTime()
        : Number.POSITIVE_INFINITY;

    return (
        leftStartMs <= rightEndMs
        && rightStartMs <= leftEndMs
    );
};

const buildNegotiatedLockKey = ({
    workspaceId,
    dossierId,
    articleId,
}) => [
    'negotiated-price',
    workspaceId.toString(),
    dossierId.toString(),
    articleId.toString(),
].join(':');

const createNegotiatedPrice = async ({
    workspaceId,
    dossierId,
    actorId,
    articleId,
    sourceAmount,
    sourceBasis,
    currency = 'EUR',
    validFrom,
    validTo = null,
    source = null,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertDossier({
            workspaceId,
            dossierId,
            session,
            mutable: true,
        });

        const article =
            await findVisibleSupplierArticle({
                workspaceId,
                articleId,
                session,
            });

        await acquireCommerceLock({
            key:
                buildNegotiatedLockKey({
                    workspaceId,
                    dossierId,
                    articleId:
                        article._id,
                }),
            session,
        });

        const active =
            await NegotiatedPrice.find({
                workspace:
                    workspaceId,
                dossier:
                    dossierId,
                supplierArticle:
                    article._id,
                status:
                    NEGOTIATED_PRICE_STATUS
                        .ACTIVE,
            }).session(session);

        const overlapping =
            active.find(
                (price) =>
                    intervalsOverlap({
                        leftStart:
                            price.validFrom,
                        leftEnd:
                            price.validTo,
                        rightStart:
                            validFrom,
                        rightEnd:
                            validTo,
                    }),
            );

        if (overlapping) {
            throw new AppError(
                'Une période de Tarif négocié active se chevauche déjà pour cet Article et ce Dossier.',
                409,
            );
        }

        const normalized =
            normalizePriceForArticle({
                article,
                sourceAmount,
                sourceBasis,
            });

        const [price] =
            await NegotiatedPrice.create([
                {
                    workspace:
                        workspaceId,
                    dossier:
                        dossierId,
                    supplierArticle:
                        article._id,
                    sourceAmount,
                    sourceBasis,
                    currency,
                    normalizedAmount:
                        normalized
                            .normalizedAmount,
                    normalizedUnit:
                        normalized
                            .normalizedUnit,
                    validFrom,
                    validTo,
                    source,
                    createdBy:
                        actorId,
                    updatedBy:
                        actorId,
                },
            ], { session });

        await createSupplierCatalogEvent({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId,
            dossierId,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .NEGOTIATED_PRICE_CREATED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .NEGOTIATED_PRICE,
            entityId:
                price._id,
            metadata: {
                supplierArticleId:
                    article._id
                        .toString(),
            },
            session,
        });

        return serializePrice(
            price,
            'NEGOTIATED_PRICE',
        );
    },
);

const archiveNegotiatedPrice = async ({
    workspaceId,
    dossierId,
    priceId,
    actorId,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertDossier({
            workspaceId,
            dossierId,
            session,
            mutable: true,
        });

        const price =
            await NegotiatedPrice.findOne({
                _id: priceId,
                workspace:
                    workspaceId,
                dossier:
                    dossierId,
            }).session(session);

        if (!price) {
            throw new AppError(
                'Tarif négocié introuvable.',
                404,
            );
        }

        if (
            price.status
            === NEGOTIATED_PRICE_STATUS
                .ARCHIVED
        ) {
            return serializePrice(
                price,
                'NEGOTIATED_PRICE',
            );
        }

        price.status =
            NEGOTIATED_PRICE_STATUS
                .ARCHIVED;
        price.archivedAt =
            new Date();
        price.archivedBy =
            actorId;
        price.updatedBy =
            actorId;
        await price.save({
            session,
        });

        await createSupplierCatalogEvent({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId,
            dossierId,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .NEGOTIATED_PRICE_ARCHIVED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .NEGOTIATED_PRICE,
            entityId:
                price._id,
            session,
        });

        return serializePrice(
            price,
            'NEGOTIATED_PRICE',
        );
    },
);

const listNegotiatedPrices = async ({
    workspaceId,
    dossierId,
    articleId = null,
    status = null,
    session = null,
}) => {
    await assertDossier({
        workspaceId,
        dossierId,
        session,
    });

    const filter = {
        workspace: workspaceId,
        dossier: dossierId,
    };

    if (articleId) {
        filter.supplierArticle =
            articleId;
    }

    if (status) {
        filter.status = status;
    }

    const prices =
        await NegotiatedPrice.find(
            filter,
        )
            .populate({
                path: 'supplierArticle',
                populate: [
                    {
                        path: 'supplier',
                        select: '_id name scope status',
                    },
                    {
                        path: 'productVariant',
                        select: '_id name referenceUnit status',
                    },
                ],
            })
            .sort({
                validFrom: -1,
                _id: -1,
            })
            .session(session)
            .lean();

    return prices.map(
        (price) =>
            serializePrice(
                price,
                'NEGOTIATED_PRICE',
            ),
    );
};

const createInvoicedPrice = async ({
    workspaceId,
    dossierId,
    actorId,
    supplierId,
    articleId,
    invoiceDate,
    sourceAmount,
    sourceBasis,
    currency = 'EUR',
    source = null,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertDossier({
            workspaceId,
            dossierId,
            session,
            mutable: true,
        });

        const article =
            await findVisibleSupplierArticle({
                workspaceId,
                articleId,
                session,
            });

        if (
            article.supplier._id
                .toString()
            !== supplierId.toString()
        ) {
            throw new AppError(
                'Le Fournisseur ne correspond pas à l’Article fournisseur.',
                409,
            );
        }

        const normalized =
            normalizePriceForArticle({
                article,
                sourceAmount,
                sourceBasis,
            });

        const [price] =
            await InvoicedPrice.create([
                {
                    workspace:
                        workspaceId,
                    dossier:
                        dossierId,
                    supplier:
                        supplierId,
                    supplierArticle:
                        article._id,
                    invoiceDate,
                    sourceAmount,
                    sourceBasis,
                    currency,
                    normalizedAmount:
                        normalized
                            .normalizedAmount,
                    normalizedUnit:
                        normalized
                            .normalizedUnit,
                    source,
                    createdBy:
                        actorId,
                    updatedBy:
                        actorId,
                },
            ], { session });

        await createSupplierCatalogEvent({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId,
            dossierId,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .INVOICED_PRICE_CREATED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .INVOICED_PRICE,
            entityId:
                price._id,
            metadata: {
                supplierArticleId:
                    article._id
                        .toString(),
            },
            session,
        });

        return serializePrice(
            price,
            'INVOICED_PRICE',
        );
    },
);

const transitionInvoicedPrice = async ({
    workspaceId,
    dossierId,
    priceId,
    actorId,
    status,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertDossier({
            workspaceId,
            dossierId,
            session,
            mutable: true,
        });

        const price =
            await InvoicedPrice.findOne({
                _id: priceId,
                workspace:
                    workspaceId,
                dossier:
                    dossierId,
            }).session(session);

        if (!price) {
            throw new AppError(
                'Prix facturé introuvable.',
                404,
            );
        }

        if (
            price.status
            !== INVOICED_PRICE_STATUS
                .PENDING_VALIDATION
        ) {
            if (
                price.status === status
            ) {
                return serializePrice(
                    price,
                    'INVOICED_PRICE',
                );
            }

            throw new AppError(
                'Le Prix facturé a déjà fait l’objet d’une décision.',
                409,
            );
        }

        const now = new Date();

        price.status = status;
        price.updatedBy = actorId;

        if (
            status
            === INVOICED_PRICE_STATUS
                .VALIDATED
        ) {
            price.validatedAt = now;
            price.validatedBy =
                actorId;
        } else {
            price.rejectedAt = now;
            price.rejectedBy =
                actorId;
        }

        await price.save({
            session,
        });

        await createSupplierCatalogEvent({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId,
            dossierId,
            actorId,
            action:
                status
                === INVOICED_PRICE_STATUS
                    .VALIDATED
                    ? SUPPLIER_CATALOG_EVENT_ACTION
                        .INVOICED_PRICE_VALIDATED
                    : SUPPLIER_CATALOG_EVENT_ACTION
                        .INVOICED_PRICE_REJECTED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .INVOICED_PRICE,
            entityId:
                price._id,
            session,
        });

        return serializePrice(
            price,
            'INVOICED_PRICE',
        );
    },
);

const listInvoicedPrices = async ({
    workspaceId,
    dossierId,
    articleId = null,
    status = null,
    session = null,
}) => {
    await assertDossier({
        workspaceId,
        dossierId,
        session,
    });

    const filter = {
        workspace: workspaceId,
        dossier: dossierId,
    };

    if (articleId) {
        filter.supplierArticle =
            articleId;
    }

    if (status) {
        filter.status = status;
    }

    const prices =
        await InvoicedPrice.find(
            filter,
        )
            .populate({
                path: 'supplierArticle',
                populate: [
                    {
                        path: 'supplier',
                        select: '_id name scope status',
                    },
                    {
                        path: 'productVariant',
                        select: '_id name referenceUnit status',
                    },
                ],
            })
            .sort({
                invoiceDate: -1,
                _id: -1,
            })
            .session(session)
            .lean();

    return prices.map(
        (price) =>
            serializePrice(
                price,
                'INVOICED_PRICE',
            ),
    );
};

const addCalendarMonths = (
    date,
    months,
) => {
    const source =
        new Date(date);
    const year =
        source.getUTCFullYear();
    const month =
        source.getUTCMonth();
    const day =
        source.getUTCDate();

    const firstTarget =
        new Date(Date.UTC(
            year,
            month + months,
            1,
            source.getUTCHours(),
            source.getUTCMinutes(),
            source.getUTCSeconds(),
            source.getUTCMilliseconds(),
        ));

    const lastDay =
        new Date(Date.UTC(
            firstTarget
                .getUTCFullYear(),
            firstTarget
                .getUTCMonth() + 1,
            0,
        )).getUTCDate();

    firstTarget.setUTCDate(
        Math.min(day, lastDay),
    );

    return firstTarget;
};

const findFreshValidatedInvoice = async ({
    workspaceId,
    dossierId,
    articleId,
    atDate,
    session = null,
}) => {
    const latest =
        await InvoicedPrice.findOne({
            workspace: workspaceId,
            dossier: dossierId,
            supplierArticle:
                articleId,
            status:
                INVOICED_PRICE_STATUS
                    .VALIDATED,
            invoiceDate:
                mongoose.trusted({
                    $lte: atDate,
                }),
        })
            .sort({
                invoiceDate: -1,
                _id: -1,
            })
            .session(session)
            .lean();

    if (!latest) {
        return {
            price: null,
            stale: false,
            freshUntil: null,
        };
    }

    const freshUntil =
        addCalendarMonths(
            latest.invoiceDate,
            SUPPLIER_INVOICED_PRICE_FRESHNESS_MONTHS,
        );

    return {
        price:
            atDate <= freshUntil
                ? latest
                : null,
        stale:
            atDate > freshUntil,
        freshUntil,
        latest,
    };
};

const findValidNegotiatedPrice = async ({
    workspaceId,
    dossierId,
    articleId,
    atDate,
    session = null,
}) => NegotiatedPrice.findOne({
    workspace: workspaceId,
    dossier: dossierId,
    supplierArticle: articleId,
    status:
        NEGOTIATED_PRICE_STATUS.ACTIVE,
    validFrom:
        mongoose.trusted({
            $lte: atDate,
        }),
    $or: mongoose.trusted([
        { validTo: null },
        {
            validTo:
                mongoose.trusted({
                    $gte: atDate,
                }),
        },
    ]),
})
    .sort({
        validFrom: -1,
        _id: -1,
    })
    .session(session)
    .lean();

const findApplicableSupplierTariff = async ({
    workspaceId,
    articleId,
    atDate,
    session = null,
}) => {
    const tariffs =
        await SupplierTariff.find({
            supplierArticle:
                articleId,
            isCurrent: true,
            ...visibleArticleFilter({
                workspaceId,
            }),
            $and: mongoose.trusted([
                {
                    $or: [
                        {
                            validFrom:
                                null,
                        },
                        {
                            validFrom:
                                mongoose.trusted({
                                    $lte:
                                        atDate,
                                }),
                        },
                    ],
                },
                {
                    $or: [
                        {
                            validTo: null,
                        },
                        {
                            validTo:
                                mongoose.trusted({
                                    $gte:
                                        atDate,
                                }),
                        },
                    ],
                },
            ]),
        })
            .populate({
                path:
                    'catalogEdition',
                match: {
                    status:
                        SUPPLIER_RESOURCE_STATUS
                            .ACTIVE,
                },
                select:
                    '_id name scope workspace editionDate validFrom validTo integratedAt status',
            })
            .sort({
                validFrom: -1,
                createdAt: -1,
                _id: -1,
            })
            .limit(3)
            .session(session)
            .lean();

    const applicable =
        tariffs.filter(
            ({ catalogEdition }) =>
                Boolean(catalogEdition),
        );

    if (applicable.length > 1) {
        const error = new AppError(
            'Plusieurs Tarifs fournisseur sont simultanément applicables. La gouvernance du catalogue doit être corrigée.',
            409,
        );
        error.code =
            'SUPPLIER_TARIFF_AMBIGUOUS';
        throw error;
    }

    return applicable[0] ?? null;
};

const serializeIndicativePrice = (price) => ({
    id: price._id.toString(),
    workspaceId: price.workspace.toString(),
    dossierId: price.dossier?.toString() ?? null,
    productVariant:
        price.productVariant?._id
            ? serializeProductVariantSummary(price.productVariant)
            : { id: price.productVariant.toString() },
    sourceAmount: decimalToString(price.sourceAmount),
    sourceBasis: price.sourceBasis,
    currency: price.currency,
    normalizedAmount: decimalToString(price.normalizedAmount),
    normalizedUnit: price.normalizedUnit,
    source: price.source ?? null,
    status: price.status,
    createdAt: price.createdAt,
    updatedAt: price.updatedAt,
});

const indicativeScopeFilter = ({
    workspaceId,
    dossierId = null,
}) => ({
    workspace: workspaceId,
    dossier: dossierId ?? null,
});

const populateIndicativeProductVariant = (query) =>
    query.populate({
        path: 'productVariant',
        select:
            '_id name referenceUnit canonicalProduct',
        populate: {
            path: 'canonicalProduct',
            select: '_id name',
        },
    });

const listIndicativePrices = async ({
    workspaceId,
    dossierId = null,
    productId = null,
    productVariantId = null,
    status = INDICATIVE_PRICE_STATUS.ACTIVE,
}) => {
    if (dossierId) {
        await assertDossier({
            workspaceId,
            dossierId,
        });
    }

    let productVariantFilter = null;

    if (productVariantId) {
        productVariantFilter = productVariantId;
    } else if (productId) {
        const productVariantIds = await ProductVariant.find({
            canonicalProduct: productId,
            identityActive: true,
        }).distinct('_id');

        productVariantFilter = mongoose.trusted({
            $in: productVariantIds,
        });
    }

    const query =
        IndicativePrice.find({
            ...indicativeScopeFilter({
                workspaceId,
                dossierId,
            }),
            status,
            ...(productVariantFilter
                ? { productVariant: productVariantFilter }
                : {}),
        })
            .sort({
                updatedAt: -1,
                _id: -1,
            });

    const prices =
        await populateIndicativeProductVariant(query);

    return prices.map(serializeIndicativePrice);
};

const findActiveIndicativePrice = async ({
    workspaceId,
    dossierId = null,
    productVariantId,
    session = null,
}) => {
    const query =
        IndicativePrice.findOne({
            ...indicativeScopeFilter({
                workspaceId,
                dossierId,
            }),
            productVariant: productVariantId,
            status: INDICATIVE_PRICE_STATUS.ACTIVE,
        })
            .sort({
                createdAt: -1,
                _id: -1,
            })
            .session(session);

    return populateIndicativeProductVariant(query);
};

const buildIndicativePriceLockKey = ({
    workspaceId,
    dossierId = null,
    productVariantId,
}) => [
    'indicative-price',
    workspaceId.toString(),
    dossierId
        ? 'dossier:' + dossierId.toString()
        : 'workspace',
    productVariantId.toString(),
].join(':');

const setIndicativePrice = async ({
    workspaceId,
    dossierId = null,
    productVariantId,
    actorId,
    sourceAmount,
    sourceBasis,
    currency = 'EUR',
    source = null,
}) => mongoose.connection.transaction(
    async (session) => {
        if (dossierId) {
            await assertDossier({
                workspaceId,
                dossierId,
                session,
                mutable: true,
            });
        }

        const productVariant =
            await findActiveProductVariant({
                productVariantId,
                workspaceId,
                session,
            });

        const normalized =
            normalizeSupplierPrice({
                sourceAmount,
                sourceBasis,
                targetUnit:
                    productVariant.referenceUnit,
            });

        if (
            !normalized.normalizedAmount
            || !normalized.normalizedUnit
        ) {
            throw new AppError(
                'L’unité du prix indicatif est incompatible avec l’unité de référence du Produit.',
                400,
            );
        }

        await acquireCommerceLock({
            key: buildIndicativePriceLockKey({
                workspaceId,
                dossierId,
                productVariantId,
            }),
            session,
        });

        const previous =
            await IndicativePrice.findOne({
                ...indicativeScopeFilter({
                    workspaceId,
                    dossierId,
                }),
                productVariant: productVariantId,
                status: INDICATIVE_PRICE_STATUS.ACTIVE,
            }).session(session);

        if (previous) {
            previous.status =
                INDICATIVE_PRICE_STATUS.ARCHIVED;
            previous.archivedAt = new Date();
            previous.archivedBy = actorId;
            previous.updatedBy = actorId;
            await previous.save({ session });
        }

        const [price] =
            await IndicativePrice.create([
                {
                    workspace: workspaceId,
                    dossier: dossierId ?? null,
                    productVariant: productVariantId,
                    sourceAmount,
                    sourceBasis,
                    currency,
                    normalizedAmount:
                        normalized.normalizedAmount,
                    normalizedUnit:
                        normalized.normalizedUnit,
                    source: source ?? null,
                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ], { session });

        await createSupplierCatalogEvent({
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspaceId,
            dossierId: dossierId ?? null,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .INDICATIVE_PRICE_SET,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .INDICATIVE_PRICE,
            entityId: price._id,
            metadata: {
                productVariantId:
                    productVariantId.toString(),
                scope:
                    dossierId
                        ? 'DOSSIER'
                        : 'WORKSPACE',
            },
            session,
        });

        await price.populate({
            path: 'productVariant',
            select:
                '_id name referenceUnit canonicalProduct',
            populate: {
                path: 'canonicalProduct',
                select: '_id name',
            },
        });

        return serializeIndicativePrice(price);
    },
);

const archiveIndicativePrice = async ({
    workspaceId,
    dossierId = null,
    productVariantId,
    actorId,
}) => mongoose.connection.transaction(
    async (session) => {
        if (dossierId) {
            await assertDossier({
                workspaceId,
                dossierId,
                session,
                mutable: true,
            });
        }

        await acquireCommerceLock({
            key: buildIndicativePriceLockKey({
                workspaceId,
                dossierId,
                productVariantId,
            }),
            session,
        });

        const price =
            await IndicativePrice.findOne({
                ...indicativeScopeFilter({
                    workspaceId,
                    dossierId,
                }),
                productVariant: productVariantId,
                status: INDICATIVE_PRICE_STATUS.ACTIVE,
            }).session(session);

        if (!price) {
            throw new AppError(
                'Prix indicatif actif introuvable.',
                404,
            );
        }

        price.status =
            INDICATIVE_PRICE_STATUS.ARCHIVED;
        price.archivedAt = new Date();
        price.archivedBy = actorId;
        price.updatedBy = actorId;
        await price.save({ session });

        await createSupplierCatalogEvent({
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            workspaceId,
            dossierId: dossierId ?? null,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .INDICATIVE_PRICE_ARCHIVED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .INDICATIVE_PRICE,
            entityId: price._id,
            metadata: {
                productVariantId:
                    productVariantId.toString(),
                scope:
                    dossierId
                        ? 'DOSSIER'
                        : 'WORKSPACE',
            },
            session,
        });

        return {
            id: price._id.toString(),
            status: price.status,
        };
    },
);

const getPricingPolicy = async ({
    workspaceId,
    session = null,
}) => {
    const policy =
        await WorkspaceSupplierPricingPolicy
            .findOne({
                workspace:
                    workspaceId,
            })
            .session(session)
            .lean();

    return policy
        ? {
            id:
                policy._id
                    .toString(),
            mode:
                policy.mode,
            isDefault: false,
            updatedAt:
                policy.updatedAt,
        }
        : {
            id: null,
            mode:
                SUPPLIER_PRICING_POLICY_MODE
                    .NEGOTIATED_PRICE,
            isDefault: true,
            updatedAt: null,
        };
};

const updatePricingPolicy = async ({
    workspaceId,
    actorId,
    mode,
}) => mongoose.connection.transaction(
    async (session) => {
        let policy =
            await WorkspaceSupplierPricingPolicy
                .findOne({
                    workspace:
                        workspaceId,
                })
                .session(session);

        if (!policy) {
            [policy] =
                await WorkspaceSupplierPricingPolicy
                    .create([
                        {
                            workspace:
                                workspaceId,
                            mode,
                            createdBy:
                                actorId,
                            updatedBy:
                                actorId,
                        },
                    ], { session });
        } else if (
            policy.mode !== mode
        ) {
            policy.mode = mode;
            policy.updatedBy =
                actorId;
            await policy.save({
                session,
            });
        }

        await createSupplierCatalogEvent({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .PRICING_POLICY_UPDATED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .PRICING_POLICY,
            entityId:
                policy._id,
            metadata: { mode },
            session,
        });

        return {
            id:
                policy._id
                    .toString(),
            mode:
                policy.mode,
            isDefault: false,
            updatedAt:
                policy.updatedAt,
        };
    },
);

const serializeApplicableSource = ({
    source,
    price,
    extra = {},
}) => ({
    source,
    id:
        price._id.toString(),
    sourceAmount:
        decimalToString(
            price.sourceAmount,
        ),
    sourceBasis:
        price.sourceBasis,
    currency:
        price.currency,
    normalizedAmount:
        decimalToString(
            price.normalizedAmount,
        ),
    normalizedUnit:
        price.normalizedUnit
        ?? null,
    ...extra,
});

const resolveApplicablePrice = async ({
    workspaceId,
    dossierId,
    articleId = null,
    productVariantId = null,
    atDate = new Date(),
    session = null,
}) => {
    await assertDossier({
        workspaceId,
        dossierId,
        session,
    });

    const {
        article,
        productVariant,
    } = await resolvePricingContext({
        workspaceId,
        articleId,
        productVariantId,
        session,
    });

    const policy =
        await getPricingPolicy({
            workspaceId,
            session,
        });

    const alerts = [];
    const attempted = [];

    if (!article) {
        alerts.push(
            'NO_USABLE_SUPPLIER_ARTICLE',
        );
    }

    if (
        article
        && policy.mode
        === SUPPLIER_PRICING_POLICY_MODE.INVOICED_PRICE
    ) {
        attempted.push('INVOICED_PRICE');
        const invoice =
            await findFreshValidatedInvoice({
                workspaceId,
                dossierId,
                articleId: article._id,
                atDate,
                session,
            });

        if (invoice.price) {
            return {
                article:
                    serializeSupplierArticleSummary(article),
                productVariant:
                    serializeProductVariantSummary(productVariant),
                policy,
                requestedMode: policy.mode,
                resolvedSource: 'INVOICED_PRICE',
                fallbackApplied: false,
                fallbackReason: null,
                price: serializeApplicableSource({
                    source: 'INVOICED_PRICE',
                    price: invoice.price,
                    extra: {
                        invoiceDate:
                            invoice.price.invoiceDate,
                        freshUntil:
                            invoice.freshUntil,
                    },
                }),
                alerts,
                atDate,
            };
        }

        alerts.push(
            invoice.stale
                ? 'LATEST_VALIDATED_INVOICE_STALE'
                : 'NO_VALIDATED_INVOICE',
        );
    }

    if (
        article
        && policy.mode
        !== SUPPLIER_PRICING_POLICY_MODE.SUPPLIER_TARIFF
    ) {
        attempted.push('NEGOTIATED_PRICE');
        const negotiated =
            await findValidNegotiatedPrice({
                workspaceId,
                dossierId,
                articleId: article._id,
                atDate,
                session,
            });

        if (negotiated) {
            return {
                article:
                    serializeSupplierArticleSummary(article),
                productVariant:
                    serializeProductVariantSummary(productVariant),
                policy,
                requestedMode: policy.mode,
                resolvedSource: 'NEGOTIATED_PRICE',
                fallbackApplied:
                    policy.mode
                    !== SUPPLIER_PRICING_POLICY_MODE.NEGOTIATED_PRICE,
                fallbackReason:
                    policy.mode
                    === SUPPLIER_PRICING_POLICY_MODE.INVOICED_PRICE
                        ? alerts[0]
                        : null,
                price: serializeApplicableSource({
                    source: 'NEGOTIATED_PRICE',
                    price: negotiated,
                    extra: {
                        validFrom: negotiated.validFrom,
                        validTo: negotiated.validTo,
                    },
                }),
                alerts,
                atDate,
            };
        }

        alerts.push('NO_VALID_NEGOTIATED_PRICE');
    }

    if (article) {
        attempted.push('SUPPLIER_TARIFF');
        const tariff =
            await findApplicableSupplierTariff({
                workspaceId,
                articleId: article._id,
                atDate,
                session,
            });

        if (tariff) {
            return {
                article:
                    serializeSupplierArticleSummary(article),
                productVariant:
                    serializeProductVariantSummary(productVariant),
                policy,
                requestedMode: policy.mode,
                resolvedSource: 'SUPPLIER_TARIFF',
                fallbackApplied:
                    policy.mode
                    !== SUPPLIER_PRICING_POLICY_MODE.SUPPLIER_TARIFF,
                fallbackReason: alerts[0] ?? null,
                price: serializeApplicableSource({
                    source: 'SUPPLIER_TARIFF',
                    price: tariff,
                    extra: {
                        catalogEdition: {
                            id:
                                tariff.catalogEdition._id.toString(),
                            name:
                                tariff.catalogEdition.name,
                            editionDate:
                                tariff.catalogEdition.editionDate,
                        },
                        validFrom: tariff.validFrom,
                        validTo: tariff.validTo,
                    },
                }),
                alerts,
                atDate,
            };
        }

        alerts.push('NO_APPLICABLE_SUPPLIER_TARIFF');
    }

    attempted.push('INDICATIVE_DOSSIER');
    const dossierIndicative =
        await findActiveIndicativePrice({
            workspaceId,
            dossierId,
            productVariantId: productVariant._id,
            session,
        });

    if (dossierIndicative) {
        return {
            article: null,
            productVariant:
                serializeProductVariantSummary(productVariant),
            policy,
            requestedMode: policy.mode,
            resolvedSource: 'INDICATIVE_DOSSIER',
            fallbackApplied: true,
            fallbackReason:
                alerts[0] ?? 'NO_COMMERCIAL_PRICE',
            price: serializeApplicableSource({
                source: 'INDICATIVE_DOSSIER',
                price: dossierIndicative,
            }),
            alerts,
            atDate,
        };
    }

    alerts.push('NO_DOSSIER_INDICATIVE_PRICE');

    attempted.push('INDICATIVE_WORKSPACE');
    const workspaceIndicative =
        await findActiveIndicativePrice({
            workspaceId,
            dossierId: null,
            productVariantId: productVariant._id,
            session,
        });

    if (workspaceIndicative) {
        return {
            article: null,
            productVariant:
                serializeProductVariantSummary(productVariant),
            policy,
            requestedMode: policy.mode,
            resolvedSource: 'INDICATIVE_WORKSPACE',
            fallbackApplied: true,
            fallbackReason:
                alerts[0] ?? 'NO_COMMERCIAL_PRICE',
            price: serializeApplicableSource({
                source: 'INDICATIVE_WORKSPACE',
                price: workspaceIndicative,
            }),
            alerts,
            atDate,
        };
    }

    alerts.push('NO_WORKSPACE_INDICATIVE_PRICE');

    if (!article) {
        throw new AppError(
            'Aucun Article fournisseur exploitable ni Prix indicatif pour cette Référence Produit.',
            404,
        );
    }

    return {
        article:
            serializeSupplierArticleSummary(article),
        productVariant:
            serializeProductVariantSummary(productVariant),
        policy,
        requestedMode: policy.mode,
        resolvedSource: null,
        fallbackApplied:
            attempted.length > 1,
        fallbackReason:
            alerts[0] ?? null,
        price: null,
        alerts,
        atDate,
    };
};

const addDossierReference = async ({
    workspaceId,
    dossierId,
    articleId,
    actorId,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertDossier({
            workspaceId,
            dossierId,
            session,
            mutable: true,
        });

        const article =
            await findVisibleSupplierArticle({
                workspaceId,
                articleId,
                session,
            });

        let reference =
            await DossierSupplierReference
                .findOne({
                    workspace:
                        workspaceId,
                    dossier:
                        dossierId,
                    supplierArticle:
                        article._id,
                })
                .session(session);

        let created = false;

        if (!reference) {
            [reference] =
                await DossierSupplierReference
                    .create([
                        {
                            workspace:
                                workspaceId,
                            dossier:
                                dossierId,
                            supplierArticle:
                                article._id,
                            createdBy:
                                actorId,
                            updatedBy:
                                actorId,
                        },
                    ], { session });
            created = true;
        } else if (
            reference.status
            !== DOSSIER_SUPPLIER_REFERENCE_STATUS
                .ACTIVE
        ) {
            reference.status =
                DOSSIER_SUPPLIER_REFERENCE_STATUS
                    .ACTIVE;
            reference.updatedBy =
                actorId;
            await reference.save({
                session,
            });
        }

        await createSupplierCatalogEvent({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId,
            dossierId,
            actorId,
            action:
                SUPPLIER_CATALOG_EVENT_ACTION
                    .DOSSIER_REFERENCE_ADDED,
            entityType:
                SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                    .DOSSIER_REFERENCE,
            entityId:
                reference._id,
            metadata: {
                supplierArticleId:
                    article._id
                        .toString(),
            },
            session,
        });

        return {
            id:
                reference._id
                    .toString(),
            supplierArticle:
                serializeSupplierArticleSummary(
                    article,
                ),
            status:
                reference.status,
            created,
        };
    },
);

const removeDossierReference = async ({
    workspaceId,
    dossierId,
    articleId,
    actorId,
}) => mongoose.connection.transaction(
    async (session) => {
        await assertDossier({
            workspaceId,
            dossierId,
            session,
            mutable: true,
        });

        const reference =
            await DossierSupplierReference
                .findOne({
                    workspace:
                        workspaceId,
                    dossier:
                        dossierId,
                    supplierArticle:
                        articleId,
                })
                .session(session);

        if (!reference) {
            throw new AppError(
                'Référence Dossier introuvable.',
                404,
            );
        }

        if (
            reference.status
            !== DOSSIER_SUPPLIER_REFERENCE_STATUS
                .ARCHIVED
        ) {
            reference.status =
                DOSSIER_SUPPLIER_REFERENCE_STATUS
                    .ARCHIVED;
            reference.updatedBy =
                actorId;
            await reference.save({
                session,
            });

            await createSupplierCatalogEvent({
                scope:
                    SUPPLIER_SCOPE
                        .WORKSPACE_PRIVATE,
                workspaceId,
                dossierId,
                actorId,
                action:
                    SUPPLIER_CATALOG_EVENT_ACTION
                        .DOSSIER_REFERENCE_REMOVED,
                entityType:
                    SUPPLIER_CATALOG_EVENT_ENTITY_TYPE
                        .DOSSIER_REFERENCE,
                entityId:
                    reference._id,
                session,
            });
        }

        return {
            id:
                reference._id
                    .toString(),
            status:
                reference.status,
        };
    },
);

const listDossierReferences = async ({
    workspaceId,
    dossierId,
}) => {
    await assertDossier({
        workspaceId,
        dossierId,
    });

    const references =
        await DossierSupplierReference
            .find({
                workspace:
                    workspaceId,
                dossier:
                    dossierId,
                status:
                    DOSSIER_SUPPLIER_REFERENCE_STATUS
                        .ACTIVE,
            })
            .populate({
                path:
                    'supplierArticle',
                populate: [
                    {
                        path: 'supplier',
                        select:
                            '_id name scope workspace status',
                    },
                    {
                        path: 'productVariant',
                        select:
                            '_id name referenceUnit status identityActive',
                    },
                ],
            })
            .sort({
                updatedAt: -1,
                _id: -1,
            });

    return references
        .filter(
            ({ supplierArticle }) =>
                Boolean(
                    supplierArticle,
                ),
        )
        .map((reference) => ({
            id:
                reference._id
                    .toString(),
            status:
                reference.status,
            supplierArticle:
                serializeSupplierArticleSummary(
                    reference
                        .supplierArticle,
                ),
            createdAt:
                reference.createdAt,
            updatedAt:
                reference.updatedAt,
        }));
};

export {
    addCalendarMonths,
    addDossierReference,
    archiveIndicativePrice,
    archiveNegotiatedPrice,
    createInvoicedPrice,
    createNegotiatedPrice,
    findApplicableSupplierTariff,
    findActiveIndicativePrice,
    findFreshValidatedInvoice,
    findValidNegotiatedPrice,
    findVisibleSupplierArticle,
    getPricingPolicy,
    listDossierReferences,
    listIndicativePrices,
    listInvoicedPrices,
    listNegotiatedPrices,
    removeDossierReference,
    resolveApplicablePrice,
    resolveSupplierArticle,
    setIndicativePrice,
    transitionInvoicedPrice,
    updatePricingPolicy,
};
