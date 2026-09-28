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
    valuateTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetValuation.service.js';
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

const createValuedDraft = async () => {
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
                portions:
                    '20',
                vatRateBasisPoints:
                    1000,
                targetMarginBasisPoints:
                    5000,
                finalPriceMode:
                    'ADVISED',
                lines: [
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

    const valued =
        await valuateTechnicalSheet({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            technicalSheetId:
                created.sheet.id,
            actorId:
                owner.owner._id,
            expectedRevision:
                saved.revision,
            atDate,
        });

    return {
        created,
        saved,
        valued,
    };
};

describe('M-004 services Fiches techniques', () => {
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
            valued.draft.economicSnapshot
                .finalPriceTtcMinor,
        ).toBe(5500);

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

    it('refuse la validation si le Prix applicable change et persiste STALE avant revalorisation', async () => {
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
                'TECHNICAL_SHEET_REVALUATION_REQUIRED',
        });

        const stale =
            await TechnicalSheetDraft.findOne({
                technicalSheet:
                    created.sheet.id,
            });

        expect(
            stale.valuationStatus,
        ).toBe(
            TECHNICAL_SHEET_VALUATION_STATUS.STALE,
        );

        const revalued =
            await valuateTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    created.sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    stale.revision,
                atDate,
            });

        expect(
            revalued.draft.lines[0]
                .valuation.lineCostHt,
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
                    revalued.draft.revision,
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
