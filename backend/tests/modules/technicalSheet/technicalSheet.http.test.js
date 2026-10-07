import '../../setup.js';
import '../../../config/applicationCapability.registry.js';

import request from 'supertest';

import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import { app } from '../../../app.js';
import {
    PLAN_SYSTEM_ROLE,
} from '../../../constants/plan.constants.js';
import {
    grantDossierAccess,
} from '../../../modules/dossier/dossierAccess.service.js';
import {
    Dossier,
} from '../../../modules/dossier/dossier.model.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';
import {
    SUPPLIER_SCOPE,
} from '../../../modules/supplierCatalog/supplierCatalog.registry.js';
import {
    createSupplier,
    createSupplierArticle,
} from '../../../modules/supplierCatalog/supplierReference.service.js';
import {
    setIndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.service.js';
import {
    TECHNICAL_SHEET_FEATURE,
    TECHNICAL_SHEET_METRIC,
} from '../../../modules/technicalSheet/technicalSheet.registry.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from '../../../modules/technicalSheet/technicalSheetPermission.registry.js';
import {
    deleteTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetLifecycle.service.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    validateTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetValidation.service.js';
import { Plan } from '../../../modules/plan/plan.model.js';
import {
    saveTechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.service.js';

let owner;
let member;
let dossier;
let reference;
let article;
let sheet;
let draft;

beforeEach(async () => {
    owner =
        await createWorkspaceOwnerFixture();

    dossier = await Dossier.create({
        workspace:
            owner.workspace._id,
        name:
            'Magasin RBAC M004',
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
                'Tomate RBAC M004',
            referenceName:
                'Tomate RBAC M004',
        });

    const supplier =
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
                    'Fournisseur RBAC M004',
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
                    'TOM-RBAC',
            },
        });

    await setIndicativePrice({
        workspaceId:
            owner.workspace._id,
        productVariantId:
            reference.variant._id,
        actorId:
            owner.owner._id,
        sourceAmount:
            '2.50',
        sourceBasis:
            'KG',
        source:
            'Fixture HTTP exports',
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
                    'Fiche RBAC M004',
                productionQuantity:
                    '1',
                productionUnit:
                    'UNIT',
                vatRateBasisPoints:
                    1000,
            },
        });

    sheet = created.sheet;

    draft =
        await saveTechnicalSheetDraft({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            technicalSheetId:
                sheet.id,
            actorId:
                owner.owner._id,
            expectedRevision:
                created.draft.revision,
            canManageSourcing: true,
            canManageValuation: true,
            data: {
                lines: [
                    {
                        kind:
                            'INGREDIENT',
                        productVariantId:
                            reference.variant
                                ._id.toString(),
                        netQuantity:
                            '1',
                        inputUnit:
                            'KG',
                        order: 0,
                    },
                ],
            },
        });

    member =
        await createWorkspaceMemberFixture({
            workspaceId:
                owner.workspace._id,
            actorId:
                owner.owner._id,
            permissions: [
                TECHNICAL_SHEET_PERMISSION.READ,
                TECHNICAL_SHEET_PERMISSION
                    .SOURCING_MANAGE,
            ],
        });

    await grantDossierAccess({
        workspaceId:
            owner.workspace._id,
        dossierId:
            dossier._id,
        membershipId:
            member.membership._id,
        actorId:
            owner.owner._id,
    });
});

const basePath = () =>
    '/api/workspaces/'
    + owner.workspace._id.toString()
    + '/dossiers/'
    + dossier._id.toString()
    + '/technical-sheets/'
    + sheet.id;

const workspaceExportUsagePath = () =>
    '/api/workspaces/'
    + owner.workspace._id.toString()
    + '/technical-sheets/exports/usage';

const enableExportFeature = async ({
    limit = 10,
} = {}) => {
    const plan = await Plan.findOne({
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
        limit,
    );
    await plan.save();
};

const validateCurrentSheet = async () => {
    await validateTechnicalSheet({
        workspaceId:
            owner.workspace._id,
        dossierId:
            dossier._id,
        technicalSheetId:
            sheet.id,
        actorId:
            owner.owner._id,
        expectedSheetRevision:
            sheet.revision,
        expectedDraftRevision:
            draft.revision,
    });
};

describe('M-004 RBAC HTTP', () => {
    it('expose les unités de production et bases de vente depuis le backend', async () => {
        const response = await request(app)
            .get(
                '/api/workspaces/'
                + owner.workspace._id.toString()
                + '/dossiers/'
                + dossier._id.toString()
                + '/technical-sheets/metadata',
            )
            .set(bearer(owner.token))
            .expect(200);

        expect(
            response.body.data.metadata.changeKindDefinitions,
        ).toEqual([
            {
                value: 'IDENTITY',
                label: 'Identité',
            },
            {
                value: 'COMPOSITION',
                label: 'Composition',
            },
            {
                value: 'SOURCING',
                label: 'Approvisionnement',
            },
            {
                value: 'ECONOMICS',
                label: 'Économie',
            },
        ]);
        expect(
            response.body.data.metadata.vatRates,
        ).toEqual([
            {
                value: 550,
                label: '5,5 %',
            },
            {
                value: 1000,
                label: '10 %',
            },
        ]);
        expect(
            response.body.data.metadata.defaults
                .vatRateBasisPoints,
        ).toBe(550);
        expect(
            response.body.data.metadata
                .economicMetricDefinitions,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                value: 'manufacturingCostHt',
                label: 'CF HT',
            }),
            expect.objectContaining({
                value: 'actualMarginBasisPoints',
                label: 'Marge réelle',
                description:
                    'MR = Marge réelle. Part du Prix retenu HT restant après déduction du coût de fabrication de la base de vente.',
            }),
            expect.objectContaining({
                value: 'actualMarginAmountHt',
                label: 'Marge sur coût de fabrication HT',
            }),
            expect.objectContaining({
                value: 'targetMarginDeltaProductionHt',
                label: 'Écart production vs cible',
            }),
        ]));
        expect(
            response.body.data.metadata.units,
        ).toEqual([
            {
                value: 'UNIT',
                label: 'Pièce',
            },
        ]);
        expect(
            response.body.data.metadata.statusDefinitions,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                value: 'ACTIVE',
                label: 'Active',
            }),
        ]));
        expect(
            response.body.data.metadata.valuationStatusDefinitions,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                value: 'NOT_VALUED',
                automaticValuationEligible: true,
            }),
            expect.objectContaining({
                value: 'PARTIAL',
                automaticValuationEligible: false,
            }),
            expect.objectContaining({
                value: 'COMPLETE',
                automaticValuationEligible: false,
                validationEligible: true,
            }),
            expect.objectContaining({
                value: 'STALE',
                automaticValuationEligible: true,
            }),
        ]));
        expect(
            response.body.data.metadata.lineValuationStatusDefinitions,
        ).toEqual(expect.arrayContaining([
            expect.objectContaining({
                value: 'NO_PRICE',
                openPricingEligible: true,
            }),
            expect.objectContaining({
                value: 'VALUED',
                openPricingEligible: false,
            }),
        ]));
        expect(
            response.body.data.metadata.lineKindDefinitions,
        ).toEqual([
            expect.objectContaining({
                value: 'INGREDIENT',
                label: 'Ingrédients',
                materialCostShareEligible: true,
                primary: true,
            }),
            expect.objectContaining({
                value: 'ECONOMAT',
                label: 'Économat',
                materialCostShareEligible: false,
                primary: false,
            }),
        ]);
        expect(
            response.body.data.metadata.pricingSources,
        ).toEqual([
            {
                value: 'SUPPLIER_TARIFF',
                label: 'Tarif fournisseur',
            },
            {
                value: 'NEGOTIATED_PRICE',
                label: 'Tarif négocié',
            },
            {
                value: 'INVOICED_PRICE',
                label: 'Prix facturé',
            },
            {
                value: 'INDICATIVE_DOSSIER',
                label: 'Prix indicatif Dossier',
            },
            {
                value: 'INDICATIVE_WORKSPACE',
                label: 'Prix indicatif espace de travail',
            },
            {
                value: 'INDICATIVE_GLOBAL',
                label: 'Prix repère global',
            },
        ]);
        expect(
            response.body.data.metadata.finalPriceModeDefinitions,
        ).toEqual([
            {
                value: 'ADVISED',
                label: 'Conseillé',
                requiresManualPrice: false,
            },
            {
                value: 'MANUAL',
                label: 'Manuel',
                requiresManualPrice: true,
            },
        ]);
        expect(
            response.body.data.metadata.saleBases,
        ).toEqual([
            {
                value: 'PIECE',
                label: 'Pièce',
            },
            {
                value: 'PORTION',
                label: 'Portion',
            },
        ]);
        expect(
            response.body.data.metadata.defaults,
        ).toEqual({
            productionUnit: 'UNIT',
            portionsPerProductionUnit: '1',
            saleBasis: 'PIECE',
            vatRateBasisPoints: 550,
            finalPriceMode: 'ADVISED',
            productSearchScope: 'REFERENCE',
        });
    });

    it('masque une Fiche en corbeille des lectures directes ordinaires', async () => {
        const deleted =
            await deleteTechnicalSheet({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                actorId:
                    owner.owner._id,
                expectedRevision:
                    sheet.revision,
            });

        expect(deleted.status)
            .toBe('DELETED');

        await request(app)
            .get(basePath())
            .set(bearer(member.token))
            .expect(404);

        await request(app)
            .get(
                basePath()
                + '/draft',
            )
            .set(bearer(member.token))
            .expect(404);

        await request(app)
            .get(
                basePath()
                + '/history',
            )
            .set(bearer(member.token))
            .expect(404);
    });

    it('refuse les exports sur le plan Free sans capability, même pour Owner', async () => {
        await request(app)
            .post(
                basePath()
                + '/exports',
            )
            .set(
                bearer(owner.token),
            )
            .send({
                format: 'PDF',
            })
            .expect(403);
    });

    it('refuse l’export à un membre sans technical-sheet:export', async () => {
        await enableExportFeature();
        await validateCurrentSheet();

        await request(app)
            .post(
                basePath()
                + '/exports',
            )
            .set(
                bearer(member.token),
            )
            .send({
                format: 'PDF',
            })
            .expect(403);
    });

    it('refuse l’export lorsque la Fiche n’a pas encore de version validée', async () => {
        await enableExportFeature();

        const response =
            await request(app)
                .post(
                    basePath()
                    + '/exports',
                )
                .set(
                    bearer(owner.token),
                )
                .send({
                    format: 'PDF',
                })
                .expect(409);

        expect(
            response.body.message,
        ).toBe(
            'Validez la Fiche technique avant de l’exporter.',
        );
    });

    it('exporte la version validée et expose le quota mensuel cumulé', async () => {
        await enableExportFeature();
        await validateCurrentSheet();

        const response =
            await request(app)
                .post(
                    basePath()
                    + '/exports',
                )
                .set(
                    bearer(owner.token),
                )
                .send({
                    format: 'CSV',
                })
                .expect(200);

        expect(
            response.headers[
                'content-type'
            ],
        ).toContain('text/csv');
        expect(
            response.headers[
                'content-disposition'
            ],
        ).toContain('.csv');

        const usage =
            await request(app)
                .get(
                    workspaceExportUsagePath(),
                )
                .set(
                    bearer(owner.token),
                )
                .expect(200);

        expect(
            usage.body.data.usage,
        ).toEqual({
            current: 1,
            limit: 10,
            unlimited: false,
            remaining: 9,
        });
    });

    it('bloque le onzième export via le quota Workspace partagé', async () => {
        await enableExportFeature({
            limit: 1,
        });
        await validateCurrentSheet();

        await request(app)
            .post(
                basePath()
                + '/exports',
            )
            .set(
                bearer(owner.token),
            )
            .send({
                format: 'PDF',
            })
            .expect(200);

        await request(app)
            .post(
                basePath()
                + '/exports',
            )
            .set(
                bearer(owner.token),
            )
            .send({
                format: 'XLSX',
            })
            .expect(403);

        const usage =
            await request(app)
                .get(
                    workspaceExportUsagePath(),
                )
                .set(
                    bearer(owner.token),
                )
                .expect(200);

        expect(
            usage.body.data.usage.current,
        ).toBe(1);
        expect(
            usage.body.data.usage.remaining,
        ).toBe(0);
    });

    it('autorise le sourcing sans donner le droit de modifier la recette', async () => {
        await request(app)
            .put(
                basePath()
                + '/draft',
            )
            .set(
                bearer(member.token),
            )
            .send({
                expectedRevision:
                    draft.revision,
                lines: [
                    {
                        id:
                            draft.lines[0].id,
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
                    },
                ],
            })
            .expect(403);

        const sourcing =
            await request(app)
                .patch(
                    basePath()
                    + '/draft/sourcing',
                )
                .set(
                    bearer(member.token),
                )
                .send({
                    expectedRevision:
                        draft.revision,
                    lineId:
                        draft.lines[0].id,
                    supplierArticleId:
                        article.id,
                });

        expect(sourcing.status).toBe(200);
        expect(
            sourcing.body.data.draft
                .lines[0]
                .selectedSupplierArticleId,
        ).toBe(article.id);
    });
});
