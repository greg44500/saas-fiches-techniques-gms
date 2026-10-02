import '../../setup.js';
import '../../../config/applicationCapability.registry.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    Dossier,
} from '../../../modules/dossier/dossier.model.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    createCatalogEdition,
    upsertCatalogLine,
} from '../../../modules/supplierCatalog/supplierCatalog.service.js';
import {
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    createNegotiatedPrice,
    setIndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.service.js';
import {
    createSupplier,
    createSupplierArticle,
} from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    TECHNICAL_SHEET_METRIC,
    TECHNICAL_SHEET_VALUATION_STATUS,
} from '../../../modules/technicalSheet/technicalSheet.registry.js';
import {
    TechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    TechnicalSheetValidation,
} from '../../../modules/technicalSheet/technicalSheetValidation.model.js';
import {
    copyTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetCopy.service.js';
import {
    deleteTechnicalSheet,
    purgeTechnicalSheet,
    restoreTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetLifecycle.service.js';
import {
    createTechnicalSheet,
    listTechnicalSheets,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    saveTechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.service.js';
import {
    validateTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetValidation.service.js';
import {
    getUsageMetricValue,
} from '../../../modules/usageMetric/usageMetric.service.js';

let owner;
let dossier;
let reference;
let supplier;
let article;

const atDate =
    new Date('2026-09-27T12:00:00.000Z');

beforeEach(async () => {
    owner =
        await createWorkspaceOwnerFixture();

    dossier = await Dossier.create({
        workspace:
            owner.workspace._id,
        name:
            'Magasin M004',
        technicalSheetSettings: {
            defaultTargetMarginBasisPoints:
                5000,
        },
        statusChangedBy:
            owner.owner._id,
        createdBy:
            owner.owner._id,
        updatedBy:
            owner.owner._id,
    });

    reference =
        await createActiveProductReference({
            actorId:
                owner.owner._id,
            name:
                'Carotte M004',
            referenceName:
                'Carotte M004',
            referenceUnit:
                'KG',
            yieldPercent:
                '80',
        });

    supplier =
        await createSupplier({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            data: {
                name:
                    'Fournisseur M004',
            },
        });

    article =
        await createSupplierArticle({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            data: {
                supplierId:
                    supplier.id,
                productVariantId:
                    reference.variant._id,
                supplierReference:
                    'CAR-M004',
                supplierDesignation:
                    'Carotte M004',
            },
        });

    const catalog =
        await createCatalogEdition({
            scope:
                SUPPLIER_SCOPE
                    .WORKSPACE_PRIVATE,
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            supplierId:
                supplier.id,
            data: {
                name:
                    'Catalogue M004',
                validFrom:
                    new Date(
                        '2026-01-01T00:00:00.000Z',
                    ),
            },
        });

    await upsertCatalogLine({
        scope:
            SUPPLIER_SCOPE
                .WORKSPACE_PRIVATE,
        workspaceId:
            owner.workspace._id,
        catalogId:
            catalog.catalog.id,
        actorId:
            owner.owner._id,
        row: {
            supplierReference:
                article.supplierReference,
            designation:
                'Carotte M004',
            supplierArticleId:
                article.id,
            sourcePrice: {
                amount: '10',
                basis: 'KG',
                currency: 'EUR',
            },
        },
    });
});

const createValuedDraft = async ({
    lines = null,
} = {}) => {
    const created =
        await createTechnicalSheet({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            actorId:
                owner.owner._id,
            data: {
                name:
                    'Purée de carottes',
                description:
                    'Test M-004',
                productionQuantity:
                    '10',
                productionUnit:
                    'KG',
                vatRateBasisPoints:
                    1000,
            },
        });

    const saved =
        await saveTechnicalSheetDraft({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            technicalSheetId:
                created.sheet.id,
            actorId:
                owner.owner._id,
            expectedRevision:
                created.draft.revision,
            canManageSourcing: true,
            canManageValuation: true,
            data: {
                productionQuantity:
                    '10',
                productionUnit:
                    'KG',
                vatRateBasisPoints:
                    1000,
                targetMarginBasisPoints:
                    5000,
                finalPriceMode:
                    'ADVISED',
                lines: lines ?? [
                    {
                        kind:
                            'INGREDIENT',
                        productVariantId:
                            reference.variant
                                ._id.toString(),
                        netQuantity:
                            '2',
                        inputUnit:
                            'KG',
                        order: 0,
                        selectedSupplierArticleId:
                            article.id,
                    },
                ],
            },
        });

    return {
        created,
        saved,
        valued: {
            draft: saved,
        },
    };
};

describe('M-004 services Fiches techniques', () => {
    it('refuse une création sans paramètres de production', async () => {
        await expect(
            createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche incomplète M004',
                },
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it('autorise un Dossier historique sans marge si la Fiche fournit sa propre marge', async () => {
        const legacyDossier =
            await Dossier.create({
                workspace:
                    owner.workspace._id,
                name:
                    'Magasin historique M004',
                statusChangedBy:
                    owner.owner._id,
                createdBy:
                    owner.owner._id,
                updatedBy:
                    owner.owner._id,
            });

        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    legacyDossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche avec marge propre',
                    productionQuantity:
                        '10',
                    productionUnit:
                        'UNIT',
                    vatRateBasisPoints:
                        1000,
                    targetMarginBasisPoints:
                        3000,
                },
            });

        expect(
            created.draft.targetMarginBasisPoints,
        ).toBe(3000);
    });

    it('refuse un Dossier historique sans marge si la Fiche n’en fournit aucune', async () => {
        const legacyDossier =
            await Dossier.create({
                workspace:
                    owner.workspace._id,
                name:
                    'Magasin historique sans marge M004',
                statusChangedBy:
                    owner.owner._id,
                createdBy:
                    owner.owner._id,
                updatedBy:
                    owner.owner._id,
            });

        await expect(
            createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    legacyDossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche sans marge',
                    productionQuantity:
                        '10',
                    productionUnit:
                        'UNIT',
                    vatRateBasisPoints:
                        1000,
                },
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
        });
    });

    it('liste les Fiches actives par défaut avec sanitizeFilter activé', async () => {
        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche liste M004',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const result =
            await listTechnicalSheets({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
            });

        expect(result.pagination.total).toBe(1);
        expect(
            result.sheets.map((sheet) => sheet.id),
        ).toContain(created.sheet.id);
    });

    it('calcule %CM comme contribution de chaque Ingrédient au coût matière total', async () => {
        const commonLine = {
            kind: 'INGREDIENT',
            productVariantId:
                reference.variant._id.toString(),
            inputUnit: 'KG',
            selectedSupplierArticleId: article.id,
        };

        const { valued } = await createValuedDraft({
            lines: [
                {
                    ...commonLine,
                    netQuantity: '1',
                    order: 0,
                },
                {
                    ...commonLine,
                    netQuantity: '3',
                    order: 1,
                },
                {
                    ...commonLine,
                    kind: 'ECONOMAT',
                    netQuantity: '1',
                    order: 2,
                },
            ],
        });

        expect(
            valued.draft.lines.map(
                (line) => line.valuation.materialCostSharePercent,
            ),
        ).toEqual(['25', '75', null]);
    });
    it('normalise une ancienne unité de ligne vers l’unité de référence du Produit', async () => {
        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche normalisation unité',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const saved =
            await saveTechnicalSheetDraft({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    created.draft.revision,
                canManageSourcing: true,
                canManageValuation: true,
                data: {
                    targetMarginBasisPoints:
                        5000,
                    lines: [{
                        kind:
                            'INGREDIENT',
                        productVariantId:
                            reference.variant._id
                                .toString(),
                        netQuantity:
                            '1000',
                        inputUnit:
                            'G',
                        order: 0,
                    }],
                },
            });

        expect(
            saved.lines[0].netQuantity,
        ).toBe('1');
        expect(
            saved.lines[0].inputUnit,
        ).toBe('KG');
        expect(
            saved.lines[0].calculation.grossUnit,
        ).toBe('KG');
    });

    it('dérive l’unité de ligne lorsque le client ne l’envoie pas', async () => {
        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche unité dérivée',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const saved =
            await saveTechnicalSheetDraft({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    created.draft.revision,
                canManageSourcing: true,
                canManageValuation: true,
                data: {
                    targetMarginBasisPoints:
                        5000,
                    lines: [{
                        kind:
                            'INGREDIENT',
                        productVariantId:
                            reference.variant._id
                                .toString(),
                        netQuantity:
                            '2',
                        order: 0,
                    }],
                },
            });

        expect(
            saved.lines[0].inputUnit,
        ).toBe('KG');
        expect(
            saved.lines[0].netQuantity,
        ).toBe('2');
    });

    it('valorise et valide une Référence Produit sans Article grâce au Prix indicatif Workspace', async () => {
        const indicativeReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit indicatif M004',
                referenceName:
                    'Produit indicatif M004',
                referenceUnit:
                    'KG',
                yieldPercent:
                    '100',
            });

        await setIndicativePrice({
            workspaceId:
                owner.workspace._id,
            productVariantId:
                indicativeReference.variant._id,
            actorId:
                owner.owner._id,
            sourceAmount:
                '2.5',
            sourceBasis:
                'KG',
            source:
                'Estimation interne',
        });

        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche prix indicatif',
                    productionQuantity:
                        '10',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const saved =
            await saveTechnicalSheetDraft({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    created.draft.revision,
                canManageSourcing: true,
                canManageValuation: true,
                data: {
                    productionQuantity:
                        '10',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                    targetMarginBasisPoints:
                        5000,
                    finalPriceMode:
                        'ADVISED',
                    lines: [{
                        kind:
                            'INGREDIENT',
                        productVariantId:
                            indicativeReference.variant
                                ._id.toString(),
                        netQuantity:
                            '2',
                        inputUnit:
                            'KG',
                        order: 0,
                    }],
                },
            });

        const valued = {
            draft: saved,
        };

        expect(
            valued.draft.valuationStatus,
        ).toBe(
            TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE,
        );
        expect(
            valued.draft.lines[0]
                .valuation.applicableSource,
        ).toBe('INDICATIVE_WORKSPACE');
        expect(
            valued.draft.lines[0]
                .valuation.supplierArticleId,
        ).toBeNull();
        expect(
            valued.draft.lines[0]
                .valuation.lineCostHt,
        ).toBe('5');

        const validated =
            await validateTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedSheetRevision:
                    created.sheet.revision,
                expectedDraftRevision:
                    valued.draft.revision,
                comment:
                    'Validation sur estimation interne',
                atDate,
            });

        expect(
            validated.validation.linesSnapshot[0]
                .supplierArticleId,
        ).toBeNull();
        expect(
            validated.validation.linesSnapshot[0]
                .supplierName,
        ).toBeNull();
        expect(
            validated.validation.linesSnapshot[0]
                .applicableSource,
        ).toBe('INDICATIVE_WORKSPACE');
    });

    it('crée, compose, valorise et valide un snapshot historique immuable', async () => {
        const {
            created,
            valued,
        } = await createValuedDraft();

        expect(
            valued.draft.valuationStatus,
        ).toBe(
            TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE,
        );
        expect(
            valued.draft.lines[0]
                .calculation.grossQuantity,
        ).toBe('2.5');
        expect(
            valued.draft.lines[0]
                .valuation.lineCostHt,
        ).toBe('25');
        expect(
            valued.draft.lines[0]
                .valuation.materialCostSharePercent,
        ).toBe('100');
        expect(
            valued.draft.economicSnapshot
                .finalPriceTtcMinor,
        ).toBe(550);

        const result =
            await validateTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedSheetRevision:
                    created.sheet.revision,
                expectedDraftRevision:
                    valued.draft.revision,
                comment:
                    'Validation initiale',
                atDate,
            });

        expect(
            result.validation.comment,
        ).toBe('Validation initiale');
        expect(
            result.validation.linesSnapshot,
        ).toHaveLength(1);
        expect(
            result.validation.linesSnapshot[0]
                .materialCostSharePercent
                .toString(),
        ).toBe('100');
        expect(
            await TechnicalSheetDraft.countDocuments({
                technicalSheet:
                    created.sheet.id,
            }),
        ).toBe(0);
        expect(
            await TechnicalSheetValidation.countDocuments({
                technicalSheet:
                    created.sheet.id,
            }),
        ).toBe(1);
    });

    it('actualise automatiquement les calculs si le Prix applicable change avant validation', async () => {
        const {
            created,
            valued,
        } = await createValuedDraft();

        await createNegotiatedPrice({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            actorId:
                owner.owner._id,
            articleId:
                article.id,
            sourceAmount:
                '12',
            sourceBasis:
                'KG',
            validFrom:
                new Date(
                    '2026-01-01T00:00:00.000Z',
                ),
        });

        await expect(
            validateTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedSheetRevision:
                    created.sheet.revision,
                expectedDraftRevision:
                    valued.draft.revision,
                atDate,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            code:
                'TECHNICAL_SHEET_VALUATION_REFRESHED',
        });

        const refreshed =
            await TechnicalSheetDraft.findOne({
                technicalSheet:
                    created.sheet.id,
            });

        expect(
            refreshed.valuationStatus,
        ).toBe(
            TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE,
        );
        expect(
            refreshed.lines[0]
                .valuation.lineCostHt
                .toString(),
        ).toBe('30');

        await expect(
            validateTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedSheetRevision:
                    created.sheet.revision,
                expectedDraftRevision:
                    refreshed.revision,
                atDate,
            }),
        ).resolves.toMatchObject({
            sheetRevision: 1,
        });
    });

    it('refuse la copie tant qu’un brouillon est ouvert', async () => {
        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche brouillon non copiable',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const target =
            await Dossier.create({
                workspace:
                    owner.workspace._id,
                name:
                    'Magasin cible M004',
                statusChangedBy:
                    owner.owner._id,
                createdBy:
                    owner.owner._id,
                updatedBy:
                    owner.owner._id,
            });

        await expect(
            copyTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                sourceDossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                targetDossierId:
                    target._id,
                actorId:
                    owner.owner._id,
                membershipId:
                    owner.membership._id,
                isOwner: true,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            code:
                'TECHNICAL_SHEET_COPY_DRAFT_FORBIDDEN',
        });
    });

    it('refuse la restauration lorsque l échéance de corbeille est atteinte', async () => {
        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche rétention M004',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const deletedAt =
            new Date(
                '2026-09-01T00:00:00.000Z',
            );
        const deleted =
            await deleteTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    created.sheet.revision,
                now: deletedAt,
            });

        await expect(
            restoreTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    deleted.revision,
                now:
                    new Date(
                        deleted.purgeScheduledAt,
                    ),
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            await getUsageMetricValue({
                workspaceId:
                    owner.workspace._id,
                metricKey:
                    TECHNICAL_SHEET_METRIC
                        .TECHNICAL_SHEETS,
            }),
        ).toBe(1);
    });

    it('conserve le quota en corbeille et ne le libère qu’à la purge', async () => {
        const created =
            await createTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                actorId:
                    owner.owner._id,
                data: {
                    name:
                        'Fiche quota M004',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'KG',
                    vatRateBasisPoints:
                        1000,
                },
            });

        const getUsage = () =>
            getUsageMetricValue({
                workspaceId:
                    owner.workspace._id,
                metricKey:
                    TECHNICAL_SHEET_METRIC
                        .TECHNICAL_SHEETS,
            });

        expect(await getUsage()).toBe(1);

        const deleted =
            await deleteTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    created.sheet.revision,
            });

        expect(await getUsage()).toBe(1);

        const restored =
            await restoreTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    deleted.revision,
            });

        expect(await getUsage()).toBe(1);

        const deletedAgain =
            await deleteTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    restored.revision,
            });

        await purgeTechnicalSheet({
            workspaceId:
                owner.workspace._id,
            technicalSheetId:
                created.sheet.id,
            actorId:
                owner.owner._id,
            expectedRevision:
                deletedAgain.revision,
        });

        expect(await getUsage()).toBe(0);
    });
});
