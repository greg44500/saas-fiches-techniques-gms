import {
    INDICATIVE_PRICE_STATUS,
    INVOICED_PRICE_STATUS,
    NEGOTIATED_PRICE_STATUS,
    SUPPLIER_PRICE_BASIS,
    SUPPLIER_PRICING_POLICY_MODE,
} from './supplierCatalog.registry.js';
import {
    addDossierReference,
    archiveIndicativePrice,
    archiveNegotiatedPrice,
    createInvoicedPrice,
    createNegotiatedPrice,
    getPricingPolicy,
    listDossierReferences,
    listIndicativePrices,
    listInvoicedPrices,
    listNegotiatedPrices,
    removeDossierReference,
    resolveApplicablePrice,
    setIndicativePrice,
    transitionInvoicedPrice,
    updatePricingPolicy,
} from './supplierPricing.service.js';

const metadata = async (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            metadata: {
                priceBases:
                    Object.values(
                        SUPPLIER_PRICE_BASIS,
                    ),
                negotiatedPriceStatuses:
                    Object.values(
                        NEGOTIATED_PRICE_STATUS,
                    ),
                invoicedPriceStatuses:
                    Object.values(
                        INVOICED_PRICE_STATUS,
                    ),
                indicativePriceStatuses:
                    Object.values(
                        INDICATIVE_PRICE_STATUS,
                    ),
                pricingPolicyModes:
                    Object.values(
                        SUPPLIER_PRICING_POLICY_MODE,
                    ),
            },
        },
    });
};

const listNegotiated = async (req, res) => {
    const prices =
        await listNegotiatedPrices({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: { prices },
    });
};

const createNegotiated = async (req, res) => {
    const price =
        await createNegotiatedPrice({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            actorId:
                req.user._id,
            ...req.validated.body,
        });

    res.status(201).json({
        status: 'success',
        data: { price },
    });
};

const archiveNegotiated = async (req, res) => {
    const price =
        await archiveNegotiatedPrice({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            priceId:
                req.validated.params
                    .priceId,
            actorId:
                req.user._id,
        });

    res.status(200).json({
        status: 'success',
        data: { price },
    });
};

const listInvoiced = async (req, res) => {
    const prices =
        await listInvoicedPrices({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: { prices },
    });
};

const createInvoiced = async (req, res) => {
    const price =
        await createInvoicedPrice({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            actorId:
                req.user._id,
            ...req.validated.body,
        });

    res.status(201).json({
        status: 'success',
        data: { price },
    });
};

const decideInvoiced = async (req, res) => {
    const price =
        await transitionInvoicedPrice({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            priceId:
                req.validated.params
                    .priceId,
            actorId:
                req.user._id,
            status:
                req.validated.body
                    .status,
        });

    res.status(200).json({
        status: 'success',
        data: { price },
    });
};

const listReferences = async (req, res) => {
    const references =
        await listDossierReferences({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
        });

    res.status(200).json({
        status: 'success',
        data: { references },
    });
};

const addReference = async (req, res) => {
    const result =
        await addDossierReference({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            articleId:
                req.validated.params
                    .articleId,
            actorId:
                req.user._id,
        });

    res.status(
        result.created ? 201 : 200,
    ).json({
        status: 'success',
        data: {
            reference: result,
        },
    });
};

const removeReference = async (req, res) => {
    const result =
        await removeDossierReference({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            articleId:
                req.validated.params
                    .articleId,
            actorId:
                req.user._id,
        });

    res.status(200).json({
        status: 'success',
        data: {
            reference: result,
        },
    });
};

const listWorkspaceIndicative = async (req, res) => {
    const prices = await listIndicativePrices({
        workspaceId: req.workspace._id,
        dossierId: null,
        ...req.validated.query,
    });

    res.status(200).json({
        status: 'success',
        data: { prices },
    });
};

const setWorkspaceIndicative = async (req, res) => {
    const price = await setIndicativePrice({
        workspaceId: req.workspace._id,
        dossierId: null,
        productVariantId:
            req.validated.params.productVariantId,
        actorId: req.user._id,
        ...req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: { price },
    });
};

const archiveWorkspaceIndicative = async (req, res) => {
    const price = await archiveIndicativePrice({
        workspaceId: req.workspace._id,
        dossierId: null,
        productVariantId:
            req.validated.params.productVariantId,
        actorId: req.user._id,
    });

    res.status(200).json({
        status: 'success',
        data: { price },
    });
};

const listDossierIndicative = async (req, res) => {
    const prices = await listIndicativePrices({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        ...req.validated.query,
    });

    res.status(200).json({
        status: 'success',
        data: { prices },
    });
};

const setDossierIndicative = async (req, res) => {
    const price = await setIndicativePrice({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        productVariantId:
            req.validated.params.productVariantId,
        actorId: req.user._id,
        ...req.validated.body,
    });

    res.status(200).json({
        status: 'success',
        data: { price },
    });
};

const archiveDossierIndicative = async (req, res) => {
    const price = await archiveIndicativePrice({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        productVariantId:
            req.validated.params.productVariantId,
        actorId: req.user._id,
    });

    res.status(200).json({
        status: 'success',
        data: { price },
    });
};

const applicable = async (req, res) => {
    const result =
        await resolveApplicablePrice({
            workspaceId:
                req.workspace._id,
            dossierId:
                req.dossier._id,
            ...req.validated.query,
        });

    res.status(200).json({
        status: 'success',
        data: {
            applicablePrice:
                result,
        },
    });
};

const getPolicy = async (req, res) => {
    const policy =
        await getPricingPolicy({
            workspaceId:
                req.workspace._id,
        });

    res.status(200).json({
        status: 'success',
        data: { policy },
    });
};

const updatePolicy = async (req, res) => {
    const policy =
        await updatePricingPolicy({
            workspaceId:
                req.workspace._id,
            actorId:
                req.user._id,
            mode:
                req.validated.body
                    .mode,
        });

    res.status(200).json({
        status: 'success',
        data: { policy },
    });
};

export {
    addReference,
    applicable,
    archiveDossierIndicative,
    archiveWorkspaceIndicative,
    archiveNegotiated,
    createInvoiced,
    createNegotiated,
    decideInvoiced,
    getPolicy,
    listDossierIndicative,
    listInvoiced,
    listNegotiated,
    listWorkspaceIndicative,
    listReferences,
    metadata,
    removeReference,
    setDossierIndicative,
    setWorkspaceIndicative,
    updatePolicy,
};
