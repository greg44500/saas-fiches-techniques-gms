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
import { Plan } from '../../../modules/plan/plan.model.js';
import {
    setIndicativePrice,
} from '../../../modules/supplierCatalog/supplierPricing.service.js';
import {
    TECHNICAL_SHEET_FEATURE,
} from '../../../modules/technicalSheet/technicalSheet.registry.js';
import {
    TECHNICAL_SHEET_PERMISSION,
} from '../../../modules/technicalSheet/technicalSheetPermission.registry.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
import {
    saveTechnicalSheetDraft,
} from '../../../modules/technicalSheet/technicalSheetDraft.service.js';
import {
    createActiveProductReference,
} from '../../helpers/productCatalogTest.fixtures.js';
import {
    bearer,
    createWorkspaceMemberFixture,
    createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let owner;
let member;
let dossier;
let sheet;
let draft;

const pathFor = (suffix = '') =>
    '/api/workspaces/'
    + owner.workspace._id.toString()
    + '/dossiers/'
    + dossier._id.toString()
    + '/technical-sheets/'
    + sheet.id
    + '/optimization'
    + suffix;

const enableOptimizer = async () => {
    const plan =
        await Plan.findOne({
            systemRole:
                PLAN_SYSTEM_ROLE.BASELINE,
        });

    plan.features = [
        ...new Set([
            ...(plan.features ?? []),
            TECHNICAL_SHEET_FEATURE
                .OPTIMIZER,
        ]),
    ];
    await plan.save();
};

const simulationBody = () => ({
    expectedRevision:
        draft.revision,
    mode: 'MANUAL',
    lines: [{
        lineId:
            draft.lines[0].id,
        economicAdjustmentPercent: -50,
        minNetQuantity: null,
        maxNetQuantity: null,
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
            'Magasin HTTP M005',
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

    const reference =
        await createActiveProductReference({
            actorId:
                owner.owner._id,
            name:
                'Tomate HTTP M005',
            referenceName:
                'Tomate HTTP M005',
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
            '4',
        sourceBasis:
            'KG',
        source:
            'HTTP M005',
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
                    'Fiche HTTP M005',
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
                        '1',
                    inputUnit:
                        'KG',
                    order: 0,
                }],
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

describe('M-005 HTTP Atelier d’optimisation', () => {
    it('refuse l’Atelier sans capability commerciale, y compris pour l’Owner', async () => {
        await request(app)
            .get(pathFor())
            .set(bearer(owner.token))
            .expect(403);
    });

    it('autorise le contexte avec capability + technical-sheet:update', async () => {
        await enableOptimizer();

        const response =
            await request(app)
                .get(pathFor())
                .set(
                    bearer(
                        owner.token,
                    ),
                )
                .expect(200);

        expect(
            response.body.data
                .context
                .baseline
                .economicSnapshot
                .materialCostHt,
        ).toBe('4');
    });

    it('refuse un membre sans technical-sheet:update même si la capability est active', async () => {
        await enableOptimizer();

        await request(app)
            .get(pathFor())
            .set(
                bearer(
                    member.token,
                ),
            )
            .expect(403);
    });

    it('simule sans mutation puis exige un fingerprint pour apply', async () => {
        await enableOptimizer();

        const simulation =
            await request(app)
                .post(
                    pathFor(
                        '/simulate',
                    ),
                )
                .set(
                    bearer(
                        owner.token,
                    ),
                )
                .send(
                    simulationBody(),
                )
                .expect(200);

        expect(
            simulation.body.data
                .simulation
                .after
                .lines[0]
                .netQuantity,
        ).toBe('0.5');

        await request(app)
            .post(
                pathFor(
                    '/apply',
                ),
            )
            .set(
                bearer(
                    owner.token,
                ),
            )
            .send(
                simulationBody(),
            )
            .expect(400);

        const applied =
            await request(app)
                .post(
                    pathFor(
                        '/apply',
                    ),
                )
                .set(
                    bearer(
                        owner.token,
                    ),
                )
                .send({
                    ...simulationBody(),
                    simulationFingerprint:
                        simulation.body
                            .data
                            .simulation
                            .simulationFingerprint,
                })
                .expect(200);

        expect(
            applied.body.data
                .draft
                .lines[0]
                .netQuantity,
        ).toBe('0.5');
    });
});
