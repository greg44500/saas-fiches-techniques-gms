import '../../setup.js';
import '../../../config/applicationCapability.registry.js';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLAN_SYSTEM_ROLE,
} from '../../../constants/plan.constants.js';

import {
    BusinessActivityEvent,
} from '../../../modules/businessActivity/businessActivity.model.js';
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
    TECHNICAL_SHEET_FEATURE,
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
    exportCurrentValidatedTechnicalSheet,
    getTechnicalSheetExportUsage,
} from '../../../modules/technicalSheet/technicalSheetExport.service.js';
import { Plan } from '../../../modules/plan/plan.model.js';
import {
    deleteTechnicalSheet,
    purgeTechnicalSheet,
    restoreTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetLifecycle.service.js';
import {
    createTechnicalSheet,
    listTechnicalSheets,
    updateTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    createDraftFromValidatedState,
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
                    'UNIT',
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
                    'UNIT',
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

    it('conserve une TVA historique hors registre sans autoriser un nouveau taux arbitraire', async () => {
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
                        'Fiche TVA historique',
                    productionQuantity:
                        '10',
                    productionUnit:
                        'UNIT',
                    vatRateBasisPoints:
                        1000,
                },
            });

        await TechnicalSheetDraft.updateOne(
            { _id: created.draft.id },
            {
                $set: {
                    vatRateBasisPoints: 2000,
                },
            },
        );

        const preserved =
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
                canManageSourcing:
                    true,
                canManageValuation:
                    true,
                data: {
                    vatRateBasisPoints:
                        2000,
                },
            });

        expect(
            preserved.vatRateBasisPoints,
        ).toBe(2000);

        await expect(
            saveTechnicalSheetDraft({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    preserved.revision,
                canManageSourcing:
                    true,
                canManageValuation:
                    true,
                data: {
                    vatRateBasisPoints:
                        1500,
                },
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
            message: 'TVA non autorisée.',
        });
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
                        'UNIT',
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
                        'UNIT',
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
                        'UNIT',
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
                        'UNIT',
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
                        'UNIT',
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

    it('valorise et valide une Référence Produit sans Article grâce au Prix repère global', async () => {
        const globalReference =
            await createActiveProductReference({
                actorId:
                    owner.owner._id,
                name:
                    'Produit repère global M004',
                referenceName:
                    'Produit repère global M004',
                referenceUnit:
                    'UNIT',
                countUnitLabelSingular:
                    'tranche',
                countUnitLabelPlural:
                    'tranches',
                yieldPercent:
                    '100',
            });

        await setIndicativePrice({
            workspaceId: null,
            dossierId: null,
            productVariantId:
                globalReference.variant._id,
            actorId:
                owner.owner._id,
            sourceAmount:
                '3.25',
            sourceBasis:
                'UNIT',
            source:
                'Référentiel de démonstration',
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
                        'Fiche prix repère global',
                    productionQuantity:
                        '10',
                    productionUnit:
                        'UNIT',
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
                        'UNIT',
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
                            globalReference.variant
                                ._id.toString(),
                        netQuantity:
                            '2',
                        inputUnit:
                            'UNIT',
                        order: 0,
                    }],
                },
            });

        expect(
            saved.valuationStatus,
        ).toBe(
            TECHNICAL_SHEET_VALUATION_STATUS.COMPLETE,
        );
        expect(
            saved.lines[0]
                .valuation.applicableSource,
        ).toBe('INDICATIVE_GLOBAL');
        expect(
            saved.lines[0]
                .valuation.supplierArticleId,
        ).toBeNull();
        expect(
            saved.lines[0]
                .valuation.lineCostHt,
        ).toBe('6.5');
        expect(saved.lines[0].productVariant).toMatchObject({
            referenceUnit: 'UNIT',
            countUnitLabelSingular: 'tranche',
            countUnitLabelPlural: 'tranches',
        });

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
                    saved.revision,
                comment:
                    'Validation sur Prix repère global',
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
        ).toBe('INDICATIVE_GLOBAL');
        expect(
            validated.validation.linesSnapshot[0],
        ).toMatchObject({
            inputUnit: 'UNIT',
            normalizedUnit: 'UNIT',
            countUnitLabelSingular: 'tranche',
            countUnitLabelPlural: 'tranches',
        });
        expect(
            validated.validation.linesSnapshot[0]
                .lineCostHt
                .toString(),
        ).toBe('6.5');
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

    it('exporte la version validée dans les trois formats et cumule le quota mensuel', async () => {
        const plan =
            await Plan.findOne({
                systemRole:
                    PLAN_SYSTEM_ROLE.BASELINE,
            });

        plan.features = [
            ...new Set([
                ...(plan.features ?? []),
                TECHNICAL_SHEET_FEATURE.EXPORT,
            ]),
        ];
        plan.limits.set(
            TECHNICAL_SHEET_METRIC
                .EXPORTS_MONTHLY,
            10,
        );
        await plan.save();

        const {
            created,
            valued,
        } = await createValuedDraft();

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
            atDate,
        });

        const csv =
            await exportCurrentValidatedTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                format: 'CSV',
                at: atDate,
            });
        const xlsx =
            await exportCurrentValidatedTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                format: 'XLSX',
                at: atDate,
            });
        const pdf =
            await exportCurrentValidatedTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                format: 'PDF',
                at: atDate,
            });

        expect(csv.mimeType)
            .toContain('text/csv');
        expect(csv.fileName)
            .toMatch(/\.csv$/);
        expect(xlsx.fileName)
            .toMatch(/\.xlsx$/);
        expect(pdf.mimeType)
            .toBe('application/pdf');
        expect(
            pdf.buffer
                .toString(
                    'latin1',
                    0,
                    8,
                ),
        ).toBe('%PDF-1.4');

        const usage =
            await getTechnicalSheetExportUsage({
                workspaceId:
                    owner.workspace._id,
                at: atDate,
            });

        expect(usage).toMatchObject({
            current: 3,
            limit: 10,
            remaining: 7,
            unlimited: false,
        });

        const exportEvents =
            await BusinessActivityEvent
                .find({
                    workspace:
                        owner.workspace._id,
                    action:
                        'TECHNICAL_SHEET_EXPORTED',
                })
                .sort({ _id: 1 })
                .lean();

        expect(exportEvents)
            .toHaveLength(3);
        expect(
            exportEvents.map(
                (event) =>
                    event.metadata.format,
            ),
        ).toEqual([
            'CSV',
            'XLSX',
            'PDF',
        ]);
        expect(
            exportEvents.every(
                (event) =>
                    !Object.hasOwn(
                        event.metadata,
                        'buffer',
                    ),
            ),
        ).toBe(true);
    });

    it('exporte toujours le dernier snapshot validé lorsqu’un nouveau brouillon existe', async () => {
        const plan =
            await Plan.findOne({
                systemRole:
                    PLAN_SYSTEM_ROLE.BASELINE,
            });

        plan.features = [
            ...new Set([
                ...(plan.features ?? []),
                TECHNICAL_SHEET_FEATURE.EXPORT,
            ]),
        ];
        plan.limits.set(
            TECHNICAL_SHEET_METRIC
                .EXPORTS_MONTHLY,
            10,
        );
        await plan.save();

        const {
            created,
            valued,
        } = await createValuedDraft();

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
                atDate,
            });

        await createDraftFromValidatedState({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            technicalSheetId:
                created.sheet.id,
            actorId:
                owner.owner._id,
            expectedSheetRevision:
                validated.sheetRevision,
        });

        await updateTechnicalSheet({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            technicalSheetId:
                created.sheet.id,
            actorId:
                owner.owner._id,
            expectedRevision:
                validated.sheetRevision,
            data: {
                name:
                    'Titre de brouillon non validé',
            },
        });

        const artifact =
            await exportCurrentValidatedTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                format: 'CSV',
                at: atDate,
            });

        const exported =
            artifact.buffer.toString('utf8');

        expect(exported)
            .toContain(
                'Purée de carottes',
            );
        expect(exported)
            .not.toContain(
                'Titre de brouillon non validé',
            );
    });

    it('refuse l’export tant que la Fiche ne possède aucune version validée', async () => {
        const plan =
            await Plan.findOne({
                systemRole:
                    PLAN_SYSTEM_ROLE.BASELINE,
            });

        plan.features = [
            ...new Set([
                ...(plan.features ?? []),
                TECHNICAL_SHEET_FEATURE.EXPORT,
            ]),
        ];
        plan.limits.set(
            TECHNICAL_SHEET_METRIC
                .EXPORTS_MONTHLY,
            10,
        );
        await plan.save();

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
                        'Fiche non validée',
                    productionQuantity:
                        '1',
                    productionUnit:
                        'UNIT',
                    vatRateBasisPoints:
                        1000,
                },
            });

        await expect(
            exportCurrentValidatedTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                format: 'PDF',
                at: atDate,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message:
                'Validez la Fiche technique avant de l’exporter.',
        });

        expect(
            await getUsageMetricValue({
                workspaceId:
                    owner.workspace._id,
                metricKey:
                    TECHNICAL_SHEET_METRIC
                        .EXPORTS_MONTHLY,
                at: atDate,
            }),
        ).toBe(0);
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
            message:
                'Les données économiques ont changé. Les calculs ont été actualisés ; vérifiez-les puis validez à nouveau.',
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
                        'UNIT',
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
                        'UNIT',
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
                        'UNIT',
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
