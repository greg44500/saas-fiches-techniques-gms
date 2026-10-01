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
    TECHNICAL_SHEET_PERMISSION,
} from '../../../modules/technicalSheet/technicalSheetPermission.registry.js';
import {
    deleteTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetLifecycle.service.js';
import {
    createTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheet.service.js';
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
                    'KG',
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

describe('M-004 RBAC HTTP', () => {
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
