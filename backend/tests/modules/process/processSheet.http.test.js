import '../../setup.js';
// Match the production Mongoose filter-sanitization setting in HTTP tests.
import '../../../config/db.js';

import mongoose from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app } from '../../../app.js';
import { Dossier } from '../../../modules/dossier/dossier.model.js';
import { grantDossierAccess } from '../../../modules/dossier/dossierAccess.service.js';
import { ProcessSheet } from '../../../modules/process/processSheet.model.js';
import { ProcessSheetDraft } from '../../../modules/process/processSheetDraft.model.js';
import {
    PROCESS_SHEET_PERMISSION,
} from '../../../modules/process/processSheetPermission.registry.js';
import { createActiveProductReference } from '../../helpers/productCatalogTest.fixtures.js';
import { setIndicativePrice } from '../../../modules/supplierCatalog/supplierPricing.service.js';
import { TechnicalSheet } from '../../../modules/technicalSheet/technicalSheet.model.js';
import { TechnicalSheetDraft } from '../../../modules/technicalSheet/technicalSheetDraft.model.js';
import { TechnicalSheetValidation } from '../../../modules/technicalSheet/technicalSheetValidation.model.js';
import { createTechnicalSheet } from '../../../modules/technicalSheet/technicalSheet.service.js';
import { saveTechnicalSheetDraft, createDraftFromValidatedState } from '../../../modules/technicalSheet/technicalSheetDraft.service.js';
import { validateTechnicalSheet } from '../../../modules/technicalSheet/technicalSheetValidation.service.js';
import {
    archiveTechnicalSheet, reactivateTechnicalSheet,
    deleteTechnicalSheet, restoreTechnicalSheet, purgeTechnicalSheet,
} from '../../../modules/technicalSheet/technicalSheetLifecycle.service.js';
import { BusinessActivityEvent } from '../../../modules/businessActivity/businessActivity.model.js';
import {
    bearer, createWorkspaceMemberFixture, createWorkspaceOwnerFixture,
} from '../../helpers/dossierTest.fixtures.js';

let owner;
let dossier;
let base;
let sequence;

const atDate = new Date('2026-10-26T12:00:00.000Z');

beforeEach(async () => {
    owner = await createWorkspaceOwnerFixture();
    dossier = await Dossier.create({
        workspace: owner.workspace._id,
        name: 'Dossier tests Fiches process',
        technicalSheetSettings: { defaultTargetMarginBasisPoints: 5000 },
        statusChangedBy: owner.owner._id,
        createdBy: owner.owner._id,
        updatedBy: owner.owner._id,
    });
    base = '/api/workspaces/' + owner.workspace._id
        + '/dossiers/' + dossier._id + '/process-sheets';
    sequence = 0;
});

const createDraft = async (name) => createTechnicalSheet({
    workspaceId: owner.workspace._id,
    dossierId: dossier._id,
    actorId: owner.owner._id,
    data: {
        name, productionQuantity: '10', productionUnit: 'UNIT',
        vatRateBasisPoints: 1000,
    },
});

const createValidated = async (name = 'Plat validé') => {
    sequence += 1;
    const variant = await createActiveProductReference({
        actorId: owner.owner._id,
        name: 'Ingrédient process ' + sequence,
        referenceName: 'Ingrédient process ' + sequence,
        referenceUnit: 'KG',
        yieldPercent: '100',
    });
    await setIndicativePrice({
        workspaceId: owner.workspace._id,
        productVariantId: variant.variant._id,
        actorId: owner.owner._id,
        sourceAmount: '2.5',
        sourceBasis: 'KG',
        source: 'Estimation process',
    });
    const created = await createDraft(name);
    const saved = await saveTechnicalSheetDraft({
        workspaceId: owner.workspace._id,
        dossierId: dossier._id,
        technicalSheetId: created.sheet.id,
        actorId: owner.owner._id,
        expectedRevision: created.draft.revision,
        canManageSourcing: true,
        canManageValuation: true,
        data: {
            productionQuantity: '10', productionUnit: 'UNIT',
            vatRateBasisPoints: 1000,
            targetMarginBasisPoints: 5000,
            finalPriceMode: 'ADVISED',
            lines: [{
                kind: 'INGREDIENT',
                productVariantId: variant.variant._id.toString(),
                netQuantity: '2', inputUnit: 'KG', order: 0,
            }],
        },
    });
    const validated = await validateTechnicalSheet({
        workspaceId: owner.workspace._id,
        dossierId: dossier._id,
        technicalSheetId: created.sheet.id,
        actorId: owner.owner._id,
        expectedSheetRevision: created.sheet.revision,
        expectedDraftRevision: saved.revision,
        atDate,
    });
    return { created, validated };
};

const createProcess = (technicalSheetId, title = 'Process du plat', token = owner.token) =>
    request(app).post(base).set(bearer(token)).send({ title, technicalSheetId });

const getCurrentRevision = async (id) =>
    (await TechnicalSheet.findById(id).select('revision')).revision;

describe('M-006 — liste et création guidée uniquement sur M-004 validée', () => {
    it('retourne une liste de process et non une liste de Fiches techniques', async () => {
        await createDraft('Brouillon isolé');
        const response = await request(app).get(base).set(bearer(owner.token)).expect(200);
        expect(response.body.data).toMatchObject({
            processes: [],
            pagination: { total: 0, page: 1 },
        });
        const eligible = await request(app).get(base + '/eligible-technical-sheets')
            .set(bearer(owner.token)).expect(200);
        expect(eligible.body.data.technicalSheets).toEqual([]);
    });

    it('propose uniquement les Fiches actives et validées sans brouillon ouvert', async () => {
        const valid = await createValidated('Validée, disponible');
        await createDraft('Brouillon exclu');
        const other = await createValidated('Validée, à réviser');
        await createDraftFromValidatedState({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            technicalSheetId: other.created.sheet.id,
            actorId: owner.owner._id,
            expectedSheetRevision: other.validated.sheetRevision,
        });
        const response = await request(app).get(base + '/eligible-technical-sheets')
            .set(bearer(owner.token)).expect(200);
        expect(response.body.data.technicalSheets.map((sheet) => sheet.id))
            .toEqual([valid.created.sheet.id]);
        expect(response.body.data.pagination.total).toBe(1);
        expect(response.body.data.technicalSheets[0].name).toBe('Validée, disponible');
    });

    it('crée un brouillon M-006 sans fabriquer une seconde Fiche technique', async () => {
        const valid = await createValidated();
        const result = await createProcess(valid.created.sheet.id, 'Fabrication du plat')
            .expect(201);
        const created = result.body.data.process;
        expect(created).toMatchObject({
            title: 'Fabrication du plat', status: 'ACTIVE',
            editorialState: 'DRAFT',
            technicalSheetId: valid.created.sheet.id,
        });
        const stored = await ProcessSheet.findById(created.id);
        expect(stored.sourceValidation.toString())
            .toBe(valid.validated.validation.id);
        const draft = await ProcessSheetDraft.findOne({ processSheet: created.id });
        expect(draft.phases).toEqual([]);
        expect(await TechnicalSheet.countDocuments({ _id: valid.created.sheet.id }))
            .toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: created.id,
            action: 'PROCESS_SHEET_CREATED',
        })).toBe(1);

        const listed = await request(app).get(base).set(bearer(owner.token)).expect(200);
        expect(listed.body.data.processes).toHaveLength(1);
        expect(listed.body.data.processes[0].technicalSheetName).toBe('Plat validé');
        const detail = await request(app).get(base + '/' + created.id)
            .set(bearer(owner.token)).expect(200);
        expect(detail.body.data.process).toMatchObject({
            id: created.id, title: 'Fabrication du plat',
            status: 'ACTIVE', editorialState: 'DRAFT',
        });
        expect(detail.body.data.dossierOperational).toBe(true);
        expect(detail.body.data.draft).toMatchObject({ revision: 0, phases: [] });
        const eligible = await request(app).get(base + '/eligible-technical-sheets')
            .set(bearer(owner.token)).expect(200);
        expect(eligible.body.data.pagination.total).toBe(0);
    });

    it('rejette la création en doublon même lorsque le premier process est archivé', async () => {
        const valid = await createValidated();
        await createProcess(valid.created.sheet.id).expect(201);
        await createProcess(valid.created.sheet.id, 'Deuxième process').expect(409);
        await archiveTechnicalSheet({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id, actorId: owner.owner._id,
            expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        await createProcess(valid.created.sheet.id, 'Troisième process').expect(409);
        expect(await ProcessSheet.countDocuments()).toBe(1);
    });

    it('refuse brouillon, révision ouverte, fiche archivée et mauvais Dossier', async () => {
        const draftOnly = await createDraft('Sans validation');
        await createProcess(draftOnly.sheet.id).expect(409);
        const valid = await createValidated();
        await createDraftFromValidatedState({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id,
            actorId: owner.owner._id,
            expectedSheetRevision: valid.validated.sheetRevision,
        });
        await createProcess(valid.created.sheet.id).expect(409);
        await TechnicalSheetDraft.deleteOne({ technicalSheet: valid.created.sheet.id });
        await archiveTechnicalSheet({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id, actorId: owner.owner._id,
            expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        await createProcess(valid.created.sheet.id).expect(409);
        const foreignDossier = await Dossier.create({
            workspace: owner.workspace._id, name: 'Dossier cible',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id, updatedBy: owner.owner._id,
        });
        const scoped = base.replace(dossier._id.toString(), foreignDossier._id.toString());
        await request(app).post(scoped).set(bearer(owner.token)).send({
            title: 'Mauvais scope', technicalSheetId: valid.created.sheet.id,
        }).expect(409);
    });

    it('contrôle titres, identifiants, auth, RBAC, Workspace et accès Dossier', async () => {
        const valid = await createValidated();
        await request(app).post(base).send({
            title: 'Sans session', technicalSheetId: valid.created.sheet.id,
        }).expect(401);
        await request(app).post(base).set(bearer(owner.token)).send({
            title: '', technicalSheetId: valid.created.sheet.id,
        }).expect(400);
        await request(app).post(base).set(bearer(owner.token)).send({
            title: 'Injection', technicalSheetId: valid.created.sheet.id, photo: 'x',
        }).expect(400);
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            membershipId: member.membership._id, actorId: owner.owner._id,
        });
        await createProcess(valid.created.sheet.id, 'Interdit', member.token).expect(403);
        await request(app).get(base).set(bearer(member.token)).expect(200);
        const other = await createWorkspaceOwnerFixture();
        const cross = base.replace(owner.workspace._id.toString(), other.workspace._id.toString());
        await request(app).get(cross).set(bearer(owner.token)).expect(403);
        const otherDossier = await Dossier.create({
            workspace: owner.workspace._id, name: 'Sans accès membre',
            statusChangedBy: owner.owner._id,
            createdBy: owner.owner._id, updatedBy: owner.owner._id,
        });
        const noAccess = base.replace(dossier._id.toString(), otherDossier._id.toString());
        await request(app).get(noAccess).set(bearer(member.token)).expect(404);
    });

    it('propage les transitions du parent, conserve le brouillon en corbeille puis purge', async () => {
        const valid = await createValidated();
        const created = (await createProcess(valid.created.sheet.id).expect(201))
            .body.data.process;
        const params = {
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id,
            actorId: owner.owner._id,
        };
        await archiveTechnicalSheet({
            ...params, expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        expect((await ProcessSheet.findById(created.id)).status).toBe('ARCHIVED');
        const archivedDetail = await request(app).get(base + '/' + created.id)
            .set(bearer(owner.token)).expect(200);
        expect(archivedDetail.body.data.process.status).toBe('ARCHIVED');
        expect(archivedDetail.body.data.draft).toBeTruthy();
        await request(app).put(base + '/' + created.id + '/draft')
            .set(bearer(owner.token)).send({
                expectedRevision: archivedDetail.body.data.draft.revision,
                phases: [], unassignedReasons: [],
            }).expect(404);
        await reactivateTechnicalSheet({
            ...params, expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        expect((await ProcessSheet.findById(created.id)).status).toBe('ACTIVE');
        await deleteTechnicalSheet({
            ...params, expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        expect((await ProcessSheet.findById(created.id)).status).toBe('DELETED');
        expect(await ProcessSheetDraft.countDocuments({ processSheet: created.id })).toBe(1);
        await request(app).get(base).set(bearer(owner.token)).expect(200)
            .then((result) => expect(result.body.data.processes).toHaveLength(0));
        await restoreTechnicalSheet({
            ...params, expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        expect((await ProcessSheet.findById(created.id)).status).toBe('ACTIVE');
        await deleteTechnicalSheet({
            ...params, expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        await purgeTechnicalSheet({
            workspaceId: owner.workspace._id,
            technicalSheetId: valid.created.sheet.id,
            actorId: owner.owner._id,
        });
        expect(await ProcessSheet.countDocuments({ _id: created.id })).toBe(0);
        expect(await ProcessSheetDraft.countDocuments({ processSheet: created.id })).toBe(0);
    });

    it('aligne le détail et PUT sur le Dossier actif, sans imposer dossier:read au contributeur', async () => {
        const valid = await createValidated();
        const created = (await createProcess(valid.created.sheet.id).expect(201))
            .body.data.process;
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id,
            actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ, PROCESS_SHEET_PERMISSION.EDIT],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            membershipId: member.membership._id, actorId: owner.owner._id,
        });
        const uri = base + '/' + created.id;
        const active = (await request(app).get(uri)
            .set(bearer(member.token)).expect(200)).body.data;
        expect(active.process.status).toBe('ACTIVE');
        expect(active.dossierOperational).toBe(true);
        expect(active.draft.revision).toBe(0);
        const saved = (await request(app).put(uri + '/draft')
            .set(bearer(member.token))
            .send({ expectedRevision: 0, phases: [], unassignedReasons: [] })
            .expect(200)).body.data.draft;
        expect(saved.revision).toBe(1);

        await Dossier.updateOne({ _id: dossier._id }, { $set: { status: 'PAUSED' } });
        const paused = (await request(app).get(uri)
            .set(bearer(member.token)).expect(200)).body.data;
        expect(paused.process.status).toBe('ACTIVE');
        expect(paused.dossierOperational).toBe(false);
        await request(app).put(uri + '/draft')
            .set(bearer(member.token))
            .send({ expectedRevision: 1, phases: [], unassignedReasons: [] })
            .expect(409);
        expect((await ProcessSheetDraft.findOne({ processSheet: created.id })).revision).toBe(1);
    });

    it('protège la création 1:1 concurrente', async () => {
        const valid = await createValidated();
        const results = await Promise.allSettled([
            createProcess(valid.created.sheet.id, 'Process A'),
            createProcess(valid.created.sheet.id, 'Process B'),
        ]);
        const statuses = results.map((item) =>
            item.status === 'fulfilled' ? item.value.status : 409,
        );
        expect(statuses.sort()).toEqual([201, 409]);
        expect(await ProcessSheet.countDocuments()).toBe(1);
        expect(await ProcessSheetDraft.countDocuments()).toBe(1);
    });
    it('sauvegarde phases et étapes avec la vraie ligne de validation et audit', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const initial = (await request(app).get(uri).set(bearer(owner.token)).expect(200)).body.data;
        expect(initial.sourceIngredients.lines).toHaveLength(1);
        const lineKey = initial.sourceIngredients.lines[0].lineKey;
        expect(lineKey).toMatch(/^line:/);
        const payload = {
            expectedRevision: 0,
            phases: [{
                id: 'editor-phase-1', title: 'Préparer',
                instructions: 'Laver', ingredientLineKeys: [lineKey],
                steps: [{
                    id: 'editor-step-1', title: 'Trancher',
                    instructions: 'Couper finement', ingredientLineKeys: [lineKey],
                    duration: { activeMinutes: 12, restMinutes: 5, treatmentMinutes: 0 },
                    equipment: ['Couteau'], manufacturingVigilance: ['Lame'],
                    qualityControls: [{ instruction: 'Épaisseur', expectedCriterion: '2 mm' }],
                    sanitaryControls: [{ instruction: 'Mains propres' }],
                }],
            }],
            unassignedReasons: [],
        };
        const saved = (await request(app).put(uri + '/draft')
            .set(bearer(owner.token)).send(payload).expect(200)).body.data.draft;
        expect(saved.revision).toBe(1);
        expect(saved.phases[0].steps[0].ingredientLineKeys).toEqual([lineKey]);
        const again = (await request(app).get(uri).set(bearer(owner.token)).expect(200)).body.data;
        expect(again.draft.revision).toBe(1);
        expect(again.draft.phases[0].steps[0].qualityControls[0].instruction).toBe('Épaisseur');
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_DRAFT_SAVED',
        })).toBe(1);
        expect((await ProcessSheet.findById(process.id)).revision).toBe(1);
        await request(app).put(uri + '/draft').set(bearer(owner.token)).send(payload).expect(409);
        expect((await ProcessSheetDraft.findOne({ processSheet: process.id })).revision).toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_DRAFT_SAVED',
        })).toBe(1);
    });

    it('refuse les identifiants ingrédient étrangers et les justifications incohérentes', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id + '/draft';
        const detail = (await request(app).get(base + '/' + process.id)
            .set(bearer(owner.token)).expect(200)).body.data;
        const real = detail.sourceIngredients.lines[0].lineKey;
        const payload = {
            expectedRevision: 0,
            phases: [{ id: 'editor-phase-1', title: 'Préparer',
                ingredientLineKeys: ['line:someone-else'], steps: [] }],
            unassignedReasons: [],
        };
        await request(app).put(uri).set(bearer(owner.token)).send(payload).expect(400);
        payload.phases[0].ingredientLineKeys = [real];
        payload.unassignedReasons = [{ lineKey: real, reason: 'Déjà affecté' }];
        await request(app).put(uri).set(bearer(owner.token)).send(payload).expect(400);
        payload.phases[0].ingredientLineKeys = [];
        payload.unassignedReasons = [{ lineKey: real, reason: 'Non utilisé dans cette recette' }];
        await request(app).put(uri).set(bearer(owner.token)).send(payload).expect(200);
        expect((await ProcessSheetDraft.findOne({ processSheet: process.id }))
            .unassignedReasons[0].lineKey).toBe(real);
    });

    it('interdit les champs photo, économiques, les duplications et les acteurs sans EDIT', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id + '/draft';
        const body = { expectedRevision: 0, phases: [], unassignedReasons: [] };
        await request(app).put(uri).send(body).expect(401);
        await request(app).put(uri).set(bearer(owner.token))
            .send({ ...body, photoUrl: 'file.png' }).expect(400);
        await request(app).put(uri).set(bearer(owner.token))
            .send({ ...body, cost: 12 }).expect(400);
        await request(app).put(uri).set(bearer(owner.token))
            .send({ ...body, phases: [
                { id: 'editor-duplicate', title: 'A', steps: [] },
                { id: 'editor-duplicate', title: 'B', steps: [] },
            ] }).expect(400);
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id, actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            membershipId: member.membership._id, actorId: owner.owner._id,
        });
        await request(app).put(uri).set(bearer(member.token)).send(body).expect(403);
    });

    it('valide sous sanitizeFilter avec des ingrédients non affectés et refuse une seconde validation', async () => {
        expect(mongoose.get('sanitizeFilter')).toBe(true);
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const before = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(before.sourceIngredients.lines).toHaveLength(1);

        // M-006 requires a documented manufacturing step, not assignment
        // of every M-004 ingredient or a reason for leaving it unassigned.
        const phases = [{
            id: 'phase-non-affectes-1', title: 'Préparer', instructions: '',
            ingredientLineKeys: [], steps: [{
                id: 'etape-non-affectes-1', title: 'Assembler',
                instructions: 'Préparer puis dresser la recette',
                ingredientLineKeys: [],
            }],
        }];
        await request(app).put(uri + '/draft')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] })
            .expect(200);

        // This POST previously failed with a CastError: sanitizeFilter
        // interpreted {$ne: 'VALIDATED'} as a literal String field value.
        const validated = (await request(app).post(uri + '/validate')
            .set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200)).body.data.process;
        expect(validated).toMatchObject({
            id: process.id, editorialState: 'VALIDATED', revision: 2,
        });
        expect(validated.validatedAt).toBeTruthy();

        await request(app).post(uri + '/validate')
            .set(bearer(owner.token))
            .send({ expectedRevision: 2 }).expect(409);
        const stored = await ProcessSheet.findById(process.id);
        expect(stored.editorialState).toBe('VALIDATED');
        expect(stored.revision).toBe(2);
        expect(stored.currentValidatedState).toBeNull();
        expect(await ProcessSheetDraft.countDocuments({ processSheet: process.id })).toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(1);
        const parent = await TechnicalSheet.findById(valid.created.sheet.id)
            .select('currentValidatedState');
        expect(parent.currentValidatedState.toString()).toBe(valid.validated.validation.id);
    });

    it('valide un ancien brouillon dépourvu du champ editorialState en MongoDB', async () => {
        const valid = await createValidated('Fiche technique avec process historique');
        const created = (await createProcess(valid.created.sheet.id)
            .expect(201)).body.data.process;
        const uri = base + '/' + created.id;
        const saved = (await request(app).put(uri + '/draft')
            .set(bearer(owner.token))
            .send({
                expectedRevision: 0,
                phases: [{
                    id: 'phase-historique', title: 'Préparer', instructions: '',
                    ingredientLineKeys: [],
                    steps: [{
                        id: 'etape-historique', title: 'Assembler',
                        instructions: 'Mélanger puis dresser',
                        ingredientLineKeys: [],
                    }],
                }],
                unassignedReasons: [],
            }).expect(200)).body.data.draft;

        // Simulate the schema evolution without silently modifying the
        // historical document during deserialization.
        await ProcessSheet.collection.updateOne(
            { _id: new mongoose.Types.ObjectId(created.id) },
            { $unset: { editorialState: '' } },
        );
        const raw = await ProcessSheet.collection.findOne({
            _id: new mongoose.Types.ObjectId(created.id),
        });
        expect(Object.hasOwn(raw, 'editorialState')).toBe(false);

        // A hydrated Mongoose model supplies the DRAFT default, but the
        // conditional MongoDB update must also accept this legacy record.
        const detail = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(detail.process.editorialState).toBe('DRAFT');
        expect(detail.process.revision).toBe(saved.processRevision);

        const result = (await request(app).post(uri + '/validate')
            .set(bearer(owner.token))
            .send({ expectedRevision: detail.process.revision })
            .expect(200)).body.data.process;
        expect(result.editorialState).toBe('VALIDATED');
        expect(result.revision).toBe(saved.processRevision + 1);

        const persisted = await ProcessSheet.collection.findOne({
            _id: new mongoose.Types.ObjectId(created.id),
        });
        expect(persisted.editorialState).toBe('VALIDATED');
        expect(await BusinessActivityEvent.countDocuments({
            entityId: created.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(1);
    });

    it('valide puis revalide le contenu courant avec deux révisions indépendantes', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const detail = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        const lineKey = detail.sourceIngredients.lines[0].lineKey;
        const phases = [{
            id: 'phase-valide-1', title: 'Préparation', instructions: '',
            ingredientLineKeys: [], steps: [{
                id: 'etape-valide-1', title: 'Assembler', instructions: 'Mélanger',
                ingredientLineKeys: [lineKey],
            }],
        }];
        const saved = (await request(app).put(uri + '/draft')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] })
            .expect(200)).body.data.draft;
        expect(saved).toMatchObject({ revision: 1, processRevision: 1 });
        await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(409);

        const first = (await request(app).post(uri + '/validate')
            .set(bearer(owner.token)).send({ expectedRevision: 1 })
            .expect(200)).body.data.process;
        expect(first).toMatchObject({ id: process.id, editorialState: 'VALIDATED', revision: 2 });
        const afterFirst = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(afterFirst.draft.revision).toBe(1);
        expect(afterFirst.process.revision).toBe(2);

        // Identical content must not invalidate the official process state.
        const identical = (await request(app).put(uri + '/draft')
            .set(bearer(owner.token))
            .send({ expectedRevision: 1, phases, unassignedReasons: [] })
            .expect(200)).body.data.draft;
        expect(identical).toMatchObject({ revision: 2, processRevision: 3 });
        expect((await ProcessSheet.findById(process.id)).editorialState).toBe('VALIDATED');

        const revised = structuredClone(phases);
        revised[0].steps[0].instructions = 'Mélanger puis dresser';
        const modified = (await request(app).put(uri + '/draft')
            .set(bearer(owner.token))
            .send({ expectedRevision: 2, phases: revised, unassignedReasons: [] })
            .expect(200)).body.data.draft;
        expect(modified).toMatchObject({ revision: 3, processRevision: 4 });
        const current = await ProcessSheet.findById(process.id);
        expect(current.editorialState).toBe('DRAFT');
        expect(current.validatedAt).toBeNull();
        expect(current.currentValidatedState).toBeNull();
        await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 3 }).expect(409);

        const second = (await request(app).post(uri + '/validate')
            .set(bearer(owner.token)).send({ expectedRevision: 4 })
            .expect(200)).body.data.process;
        expect(second).toMatchObject({ id: process.id, editorialState: 'VALIDATED', revision: 5 });
        expect(await ProcessSheet.countDocuments({ technicalSheet: valid.created.sheet.id })).toBe(1);
        expect(await ProcessSheetDraft.countDocuments({ processSheet: process.id })).toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(2);
    });

    it('refuse la validation vide et la validation HTTP sans permission dédiée', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id + '/validate';
        await request(app).post(uri).set(bearer(owner.token))
            .send({ expectedRevision: 0 }).expect(400);

        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id, actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ, PROCESS_SHEET_PERMISSION.EDIT],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            membershipId: member.membership._id, actorId: owner.owner._id,
        });
        await request(app).post(uri).set(bearer(member.token))
            .send({ expectedRevision: 0 }).expect(403);
        expect((await ProcessSheet.findById(process.id)).editorialState).toBe('DRAFT');
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(0);
    });

    it('valide sur la dernière composition officielle malgré une révision M-004 ouverte', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const detail = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        const phases = [{
            id: 'phase-m004-1', title: 'Préparer', instructions: '', ingredientLineKeys: [],
            steps: [{
                id: 'etape-m004-1', title: 'Assembler', instructions: 'Mélanger',
                ingredientLineKeys: [detail.sourceIngredients.lines[0].lineKey],
            }],
        }];
        await request(app).put(uri + '/draft').set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] }).expect(200);
        await createDraftFromValidatedState({
            workspaceId: owner.workspace._id,
            dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id,
            actorId: owner.owner._id,
            expectedSheetRevision: valid.validated.sheetRevision,
        });
        expect(await TechnicalSheetDraft.exists({
            technicalSheet: valid.created.sheet.id,
        })).toBeTruthy();
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review.status).toBe('CURRENT');
        await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200);
        expect((await ProcessSheet.findById(process.id)).editorialState).toBe('VALIDATED');
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(1);
    });

    it('refuse les écritures si le parent M-004 est archivé et n’altère pas le brouillon', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        await archiveTechnicalSheet({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id, actorId: owner.owner._id,
            expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        const uri = base + '/' + process.id + '/draft';
        await request(app).put(uri).set(bearer(owner.token))
            .send({ expectedRevision: 0, phases: [], unassignedReasons: [] }).expect(404);
        expect((await ProcessSheetDraft.findOne({ processSheet: process.id })).revision).toBe(0);
    });

});


// A second official validation is created as an immutable M-004 snapshot.
// Only this test fixture changes M-004.currentValidatedState directly.
const supersedeM004Validation = async (originalId, technicalSheetId, { quantity, name, variantId } = {}) => {
    const source = await TechnicalSheetValidation.findById(originalId).lean();
    const clone = { ...source, _id: undefined, __v: undefined, createdAt: undefined };
    clone.validatedAt = new Date('2026-10-28T15:00:00.000Z');
    clone.linesSnapshot = source.linesSnapshot.map((line) => ({
        ...line,
        sourceLineId: new mongoose.Types.ObjectId(),
        ...(quantity ? { netQuantity: mongoose.Types.Decimal128.fromString(quantity) } : {}),
        ...(name ? { productVariantName: name } : {}),
        ...(variantId ? { productVariantId: variantId } : {}),
    }));
    const current = await TechnicalSheetValidation.create(clone);
    await TechnicalSheet.updateOne({ _id: technicalSheetId }, {
        $set: { currentValidatedState: current._id },
    });
    return current;
};

describe('M-006 — réconciliation officielle après revalidation M-004', () => {
    it('conserve une Fiche process validée si seule la quantité M-004 évolue, sans version M-006', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const before = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        const phases = [{
            id: 'phase-reconcile-1', title: 'Préparer', instructions: '',
            ingredientLineKeys: [], steps: [{
                id: 'step-reconcile-1', title: 'Assembler', instructions: 'Assembler la recette',
                ingredientLineKeys: [before.sourceIngredients.lines[0].lineKey],
            }],
        }];
        await request(app).put(uri + '/draft').set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] }).expect(200);
        await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200);

        const originalValidation = await TechnicalSheetValidation.findById(
            valid.validated.validation.id,
        ).lean();
        const nextValidation = await supersedeM004Validation(
            valid.validated.validation.id, valid.created.sheet.id, { quantity: '3' },
        );
        // Guard the fixture itself before testing the HTTP behavior:
        // only quantities changed; name and product reference did not.
        expect(nextValidation.linesSnapshot[0].productVariantName)
            .toBe(originalValidation.linesSnapshot[0].productVariantName);
        expect(nextValidation.linesSnapshot[0].productVariantId.toString())
            .toBe(originalValidation.linesSnapshot[0].productVariantId.toString());
        expect(nextValidation.linesSnapshot[0].netQuantity.toString())
            .not.toBe(originalValidation.linesSnapshot[0].netQuantity.toString());
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review.status).toBe('CURRENT');
        // An economic/quantity-only revalidation is not an actionable mapping.
        // A direct reconcile attempt must roll back without changing M-006.
        const unnecessaryReconciliation = await request(app).post(uri + '/reconcile')
            .set(bearer(owner.token))
            .send({
                expectedRevision: 2, expectedDraftRevision: 1,
                currentValidationId: nextValidation._id.toString(), decisions: [],
            }).expect(409);
        expect(unnecessaryReconciliation.body.code).toBe('PROCESS_SHEET_PARENT_CHANGED');
        const refreshed = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(refreshed.compositionOutdated).toBe(false);
        expect(refreshed.draft.phases[0].steps[0].ingredientLineKeys)
            .toEqual([before.sourceIngredients.lines[0].lineKey]);
        const stored = await ProcessSheet.findById(process.id);
        expect(stored.sourceValidation.toString()).toBe(valid.validated.validation.id);
        expect(stored.compositionValidation).toBeNull();
        expect(stored.editorialState).toBe('VALIDATED');
        expect(stored.revision).toBe(2);
        expect(await ProcessSheet.countDocuments({ technicalSheet: valid.created.sheet.id })).toBe(1);
        expect(await ProcessSheetDraft.countDocuments({ processSheet: process.id })).toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_COMPOSITION_RECONCILED',
        })).toBe(0);
    });

    it('valide un Brouillon sans actualisation après modification des seules quantités', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const detail = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        const phases = [{
            id: 'phase-quantity-1', title: 'Préparation', instructions: '',
            ingredientLineKeys: [], steps: [{
                id: 'step-quantity-1', title: 'Assembler',
                instructions: 'Assembler et servir', ingredientLineKeys: [],
            }],
        }];
        await request(app).put(uri + '/draft')
            .set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] }).expect(200);
        await supersedeM004Validation(
            valid.validated.validation.id, valid.created.sheet.id, { quantity: '20' },
        );
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review.status).toBe('CURRENT');
        const fresh = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(fresh.compositionOutdated).toBe(false);
        expect(fresh.sourceIngredients.lines).toHaveLength(detail.sourceIngredients.lines.length);
        await request(app).post(uri + '/validate')
            .set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200);
        const persisted = await ProcessSheet.findById(process.id);
        expect(persisted.editorialState).toBe('VALIDATED');
        expect(persisted.compositionValidation).toBeNull();
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_COMPOSITION_RECONCILED',
        })).toBe(0);
    });

    it('demande une correspondance explicite si le nom d’un ingrédient change, puis valide', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const before = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        const phases = [{
            id: 'phase-changed-1', title: 'Préparation', instructions: '',
            ingredientLineKeys: [], steps: [{
                id: 'step-changed-1', title: 'Assembler', instructions: 'Assembler sans perte',
                ingredientLineKeys: [before.sourceIngredients.lines[0].lineKey],
            }],
        }];
        await request(app).put(uri + '/draft').set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] }).expect(200);
        const originalValidation = await TechnicalSheetValidation.findById(
            valid.validated.validation.id,
        ).lean();
        const nextValidation = await supersedeM004Validation(
            valid.validated.validation.id, valid.created.sheet.id,
            { name: 'Ingrédient renommé' },
        );
        // Name changed, but neither the product reference nor the quantity.
        expect(nextValidation.linesSnapshot[0].productVariantName)
            .not.toBe(originalValidation.linesSnapshot[0].productVariantName);
        expect(nextValidation.linesSnapshot[0].productVariantId.toString())
            .toBe(originalValidation.linesSnapshot[0].productVariantId.toString());
        expect(nextValidation.linesSnapshot[0].netQuantity.toString())
            .toBe(originalValidation.linesSnapshot[0].netQuantity.toString());
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review).toMatchObject({
            status: 'REVIEW_REQUIRED', compositionChanged: true,
            unresolvedCount: 1,
        });
        expect(review.ingredientChanges).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'ADDED', name: 'Ingrédient renommé', count: 1 }),
            expect.objectContaining({ type: 'REMOVED', count: 1 }),
        ]));
        expect(review.assignments).toHaveLength(1);
        expect(review.assignments[0].proposedTo).toBeNull();
        const blockedValidation = await request(app).post(uri + '/validate')
            .set(bearer(owner.token)).send({ expectedRevision: 1 }).expect(409);
        expect(blockedValidation.body.code).toBe('PROCESS_SHEET_PARENT_CHANGED');
        const payload = {
            expectedRevision: 1, expectedDraftRevision: 1,
            currentValidationId: review.currentValidationId, decisions: [],
        };
        const rejected = await request(app).post(uri + '/reconcile')
            .set(bearer(owner.token)).send(payload).expect(400);
        expect(rejected.body.code).toBe('PROCESS_SHEET_MAPPING_REQUIRED');
        const unchanged = await ProcessSheet.findById(process.id);
        expect(unchanged.compositionValidation).toBeNull();
        expect(unchanged.revision).toBe(1);
        expect((await ProcessSheetDraft.findOne({ processSheet: process.id })).revision).toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_COMPOSITION_RECONCILED',
        })).toBe(0);

        await request(app).post(uri + '/reconcile').set(bearer(owner.token))
            .send({ ...payload, decisions: [{
                from: review.assignments[0].from,
                to: review.newIngredients[0].lineKey,
            }] }).expect(200);
        const refreshed = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(refreshed.draft.phases[0].steps[0]).toMatchObject({
            instructions: 'Assembler sans perte',
            ingredientLineKeys: [review.newIngredients[0].lineKey],
        });
        expect(refreshed.process.editorialState).toBe('DRAFT');
        expect(refreshed.process.compositionValidationId).toBe(review.currentValidationId);
        expect(refreshed.process.revision).toBe(2);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_COMPOSITION_RECONCILED',
        })).toBe(1);
        await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 2 }).expect(200);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(1);
    });

    it('retirer volontairement un ingrédient invalide une Fiche process précédemment validée', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        const before = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        const phases = [{
            id: 'phase-removal-1', title: 'Préparer', instructions: '',
            ingredientLineKeys: [], steps: [{
                id: 'step-removal-1', title: 'Assembler', instructions: 'Assembler',
                ingredientLineKeys: [before.sourceIngredients.lines[0].lineKey],
            }],
        }];
        await request(app).put(uri + '/draft').set(bearer(owner.token))
            .send({ expectedRevision: 0, phases, unassignedReasons: [] }).expect(200);
        await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(200);
        await supersedeM004Validation(
            valid.validated.validation.id, valid.created.sheet.id, { name: 'Autre ingrédient' },
        );
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review.compositionChanged).toBe(true);
        await request(app).post(uri + '/reconcile').set(bearer(owner.token))
            .send({
                expectedRevision: 2, expectedDraftRevision: 1,
                currentValidationId: review.currentValidationId,
                decisions: [{ from: review.assignments[0].from, to: null }],
            }).expect(200);
        const state = (await request(app).get(uri).set(bearer(owner.token))
            .expect(200)).body.data;
        expect(state.process.editorialState).toBe('DRAFT');
        expect(state.draft.phases[0].steps[0].ingredientLineKeys).toEqual([]);
        expect(state.draft.phases[0].steps[0].instructions).toBe('Assembler');
    });

    it('protège le rapprochement contre les révisions périmées et les rôles sans autorisation', async () => {
        const valid = await createValidated();
        const process = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const uri = base + '/' + process.id;
        await supersedeM004Validation(valid.validated.validation.id, valid.created.sheet.id, { name: 'Autre nom' });
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        const payload = {
            expectedRevision: 99, expectedDraftRevision: 0,
            currentValidationId: review.currentValidationId, decisions: [],
        };
        const stale = await request(app).post(uri + '/reconcile')
            .set(bearer(owner.token)).send(payload).expect(409);
        expect(stale.body.code).toBe('PROCESS_SHEET_CHANGED');

        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id, actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ, PROCESS_SHEET_PERMISSION.EDIT],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            membershipId: member.membership._id, actorId: owner.owner._id,
        });
        await request(app).post(uri + '/reconcile')
            .set(bearer(member.token)).send({ ...payload, expectedRevision: 0 }).expect(403);
        expect((await ProcessSheet.findById(process.id)).compositionValidation).toBeNull();
    });
});


describe('M-006 — export PDF et suppression autonome', () => {
    it('exporte le contenu courant enregistré en PDF sans modifier M-004', async () => {
        const valid = await createValidated('Fiche parent conservée');
        const created = (await createProcess(valid.created.sheet.id, 'Process à exporter')
            .expect(201)).body.data.process;
        const response = await request(app).get(base + '/' + created.id + '/export/pdf')
            .set(bearer(owner.token)).expect(200);
        expect(response.headers['content-type']).toMatch(/application\/pdf/);
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.headers['content-disposition']).toMatch(/fiche-process-/);
        expect(response.body.toString('latin1').startsWith('%PDF-1.4')).toBe(true);
        expect(await TechnicalSheet.exists({ _id: valid.created.sheet.id })).toBeTruthy();
        expect(await BusinessActivityEvent.countDocuments({
            entityId: created.id, action: 'PROCESS_SHEET_EXPORTED',
        })).toBe(1);
    });

    it('refuse export et suppression à un membre sans permission dédiée', async () => {
        const valid = await createValidated();
        const created = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        const member = await createWorkspaceMemberFixture({
            workspaceId: owner.workspace._id, actorId: owner.owner._id,
            permissions: [PROCESS_SHEET_PERMISSION.READ],
        });
        await grantDossierAccess({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            membershipId: member.membership._id, actorId: owner.owner._id,
        });
        await request(app).get(base + '/' + created.id + '/export/pdf')
            .set(bearer(member.token)).expect(403);
        await request(app).delete(base + '/' + created.id)
            .set(bearer(member.token)).send({ expectedRevision: 0 }).expect(403);
        expect(await ProcessSheet.exists({ _id: created.id })).toBeTruthy();
    });

    it('supprime définitivement uniquement M-006 et libère la relation 1:1', async () => {
        const valid = await createValidated();
        const first = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        await request(app).delete(base + '/' + first.id).set(bearer(owner.token))
            .send({ unexpected: true }).expect(400);
        await request(app).delete(base + '/' + first.id).set(bearer(owner.token))
            .send({ expectedRevision: 10 }).expect(409);
        expect(await ProcessSheet.exists({ _id: first.id })).toBeTruthy();
        const removed = await request(app).delete(base + '/' + first.id)
            .set(bearer(owner.token)).send({ expectedRevision: first.revision }).expect(200);
        expect(removed.body.data).toEqual({ deletedId: first.id });
        expect(await ProcessSheet.exists({ _id: first.id })).toBeFalsy();
        expect(await ProcessSheetDraft.exists({ processSheet: first.id })).toBeFalsy();
        expect(await TechnicalSheet.exists({ _id: valid.created.sheet.id })).toBeTruthy();
        expect(await TechnicalSheetValidation.exists({ _id: valid.validated.validation.id })).toBeTruthy();
        expect(await BusinessActivityEvent.countDocuments({
            entityId: first.id, action: 'PROCESS_SHEET_DELETED',
        })).toBe(1);
        const second = (await createProcess(valid.created.sheet.id, 'Nouveau process')
            .expect(201)).body.data.process;
        expect(second.id).not.toBe(first.id);
    });

    it('interdit la suppression autonome après archivage du parent M-004', async () => {
        const valid = await createValidated();
        const created = (await createProcess(valid.created.sheet.id).expect(201)).body.data.process;
        await archiveTechnicalSheet({
            workspaceId: owner.workspace._id, dossierId: dossier._id,
            technicalSheetId: valid.created.sheet.id, actorId: owner.owner._id,
            expectedRevision: await getCurrentRevision(valid.created.sheet.id),
        });
        await request(app).delete(base + '/' + created.id)
            .set(bearer(owner.token)).send({ expectedRevision: created.revision }).expect(409);
        expect(await ProcessSheet.exists({ _id: created.id })).toBeTruthy();
    });
});
