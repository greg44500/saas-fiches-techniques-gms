import '../../setup.js';
import '../../../config/applicationCapability.registry.js';

import mongoose from 'mongoose';

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
    setIndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.service.js';
import {
    TechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.model.js';
import {
    applyTechnicalSheetOptimization,
    getTechnicalSheetOptimizationContext,
    simulateTechnicalSheetOptimization,
} from '../../../modules/technicalSheet/technicalSheetOptimizer.service.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    saveTechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.service.js';
import {
    validateTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetValidation.service.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let owner;
let dossier;
let otherDossier;
let reference;
let sheet;
let draft;

const atDate =
    new Date('2026-10-07T10:00:00.000Z');

const requestFor = ({
    mode = 'MANUAL',
    minNetQuantity = '1',
    maxNetQuantity = '3',
    economicAdjustmentPercent = -50,
} = {}) => ({
    expectedRevision:
        draft.revision,
    mode,
    lines: [{
        lineId:
            draft.lines[0].id,
        economicAdjustmentPercent,
        minNetQuantity,
        maxNetQuantity,
        locked: false,
    }],
    autoOptions: {
        adjustQuantities: true,
        productAlternatives: false,
        sourcingAlternatives: false,
    },
});

beforeEach(async () => {
    owner =
        await createWorkspaceOwnerFixture();

    dossier = await Dossier.create({
        workspace:
            owner.workspace._id,
        name:
            'Magasin M005 A',
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

    otherDossier =
        await Dossier.create({
            workspace:
                owner.workspace._id,
            name:
                'Magasin M005 B',
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
                'Carotte M005',
            referenceName:
                'Carotte M005',
            referenceUnit:
                'KG',
            yieldPercent:
                '100',
        });

    await setIndicativePrice({
        workspaceId:
            owner.workspace._id,
        dossierId:
            dossier._id,
        productVariantId:
            reference.variant._id,
        actorId:
            owner.owner._id,
        sourceAmount:
            '10',
        sourceBasis:
            'KG',
        source:
            'Prix Dossier A M005',
    });

    await setIndicativePrice({
        workspaceId:
            owner.workspace._id,
        dossierId:
            otherDossier._id,
        productVariantId:
            reference.variant._id,
        actorId:
            owner.owner._id,
        sourceAmount:
            '2',
        sourceBasis:
            'KG',
        source:
            'Prix Dossier B M005',
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
                    'Purée M005',
                productionQuantity:
                    '10',
                productionUnit:
                    'UNIT',
                portionsPerProductionUnit:
                    '1',
                saleBasis:
                    'PIECE',
                vatRateBasisPoints:
                    1000,
                targetMarginBasisPoints:
                    5000,
            },
        });

    sheet =
        created.sheet;

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
                lines: [{
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
                }],
            },
        });
});

describe('M-005 Atelier d’optimisation', () => {
    it('construit le contexte avec le Prix du Dossier courant uniquement', async () => {
        const context =
            await getTechnicalSheetOptimizationContext({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                atDate,
            });

        expect(
            context.baseline
                .economicSnapshot
                .materialCostHt,
        ).toBe('20');

        expect(
            context.baseline
                .lines[0]
                .materialCostSharePercent,
        ).toBe('100');
    });

    it('simule une baisse sans écrire le brouillon ni compenser une autre ligne', async () => {
        const simulation =
            await simulateTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                request:
                    requestFor(),
                canManageSourcing:
                    true,
                atDate,
            });

        expect(
            simulation.before
                .lines[0]
                .netQuantity,
        ).toBe('2');
        expect(
            simulation.after
                .lines[0]
                .netQuantity,
        ).toBe('1');
        expect(
            simulation.savings,
        ).toEqual({
            amountHt: '10',
            percent: '50',
        });

        const persisted =
            await TechnicalSheetDraft
                .findById(
                    draft.id,
                );

        expect(
            persisted.lines[0]
                .netQuantity
                .toString(),
        ).toBe('2');
        expect(
            persisted.lines[0]
                .optimization
                .minNetQuantity,
        ).toBeNull();
    });

    it('applique la simulation au DRAFT puis snapshotte l’enveloppe à la validation', async () => {
        const request =
            requestFor();
        const simulation =
            await simulateTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                request,
                canManageSourcing:
                    true,
                atDate,
            });

        const applied =
            await applyTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                actorId:
                    owner.owner._id,
                request: {
                    ...request,
                    simulationFingerprint:
                        simulation
                            .simulationFingerprint,
                },
                canManageSourcing:
                    true,
                atDate,
            });

        expect(
            applied.draft
                .lines[0]
                .netQuantity,
        ).toBe('1');
        expect(
            applied.draft
                .lines[0]
                .optimization,
        ).toEqual({
            minNetQuantity: '1',
            maxNetQuantity: '3',
            locked: false,
        });

        const validated =
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
                    applied.draft
                        .revision,
                atDate,
            });

        expect(
            validated.validation
                .linesSnapshot[0]
                .optimization
                .minNetQuantity
                .toString(),
        ).toBe('1');
        expect(
            validated.validation
                .linesSnapshot[0]
                .optimization
                .maxNetQuantity
                .toString(),
        ).toBe('3');
    });

    it('propose en Auto un seul prochain mouvement à 25 % du chemin disponible', async () => {
        const simulation =
            await simulateTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                request:
                    requestFor({
                        mode: 'AUTO',
                    }),
                canManageSourcing:
                    true,
                atDate,
            });

        expect(
            simulation
                .autoSuggestion
                .kind,
        ).toBe('QUANTITY');
        expect(
            simulation.after
                .lines[0]
                .netQuantity,
        ).toBe('1.75');

        const persisted =
            await TechnicalSheetDraft
                .findById(
                    draft.id,
                );

        expect(
            persisted.lines[0]
                .netQuantity
                .toString(),
        ).toBe('2');
    });

    it('refuse une substitution d’Article sans permission sourcing', async () => {
        const request =
            requestFor();

        request.lines[0]
            .supplierArticleId =
                new mongoose.Types.ObjectId()
                    .toString();

        await expect(
            simulateTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                request,
                canManageSourcing:
                    false,
                atDate,
            }),
        ).rejects.toMatchObject({
            statusCode: 403,
        });
    });

    it('refuse l’Apply si le Prix applicable a changé depuis la simulation', async () => {
        const request =
            requestFor();
        const simulation =
            await simulateTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                request,
                canManageSourcing:
                    true,
                atDate,
            });

        await setIndicativePrice({
            workspaceId:
                owner.workspace._id,
            dossierId:
                dossier._id,
            productVariantId:
                reference.variant._id,
            actorId:
                owner.owner._id,
            sourceAmount:
                '12',
            sourceBasis:
                'KG',
            source:
                'Prix Dossier A modifié M005',
        });

        await expect(
            applyTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                actorId:
                    owner.owner._id,
                request: {
                    ...request,
                    simulationFingerprint:
                        simulation
                            .simulationFingerprint,
                },
                canManageSourcing:
                    true,
                atDate,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            code:
                'TECHNICAL_SHEET_OPTIMIZER_SIMULATION_STALE',
        });
    });

    it('refuse un apply construit sur une ancienne révision', async () => {
        const request =
            requestFor();
        const simulation =
            await simulateTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                request,
                canManageSourcing:
                    true,
                atDate,
            });

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
                draft.revision,
            canManageSourcing: true,
            canManageValuation: true,
            data: {
                productionQuantity:
                    '11',
            },
        });

        await expect(
            applyTechnicalSheetOptimization({
                workspaceId:
                    owner.workspace._id,
                dossierId:
                    dossier._id,
                technicalSheetId:
                    sheet.id,
                actorId:
                    owner.owner._id,
                request: {
                    ...request,
                    simulationFingerprint:
                        simulation
                            .simulationFingerprint,
                },
                canManageSourcing:
                    true,
                atDate,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });
});
