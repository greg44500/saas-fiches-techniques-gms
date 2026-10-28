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

    it('refuse la validation tant qu’une révision M-004 est ouverte', async () => {
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
        expect(review.status).toBe('PARENT_REVISION_OPEN');
        const blocked = await request(app).post(uri + '/validate').set(bearer(owner.token))
            .send({ expectedRevision: 1 }).expect(409);
        expect(blocked.body.code).toBe('PROCESS_SHEET_PARENT_REVISION_OPEN');
        expect((await ProcessSheet.findById(process.id)).editorialState).toBe('DRAFT');
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_VALIDATED',
        })).toBe(0);
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
const supersedeM004Validation = async (originalId, technicalSheetId, { quantity } = {}) => {
    const source = await TechnicalSheetValidation.findById(originalId).lean();
    const clone = { ...source, _id: undefined, __v: undefined, createdAt: undefined };
    clone.validatedAt = new Date('2026-10-28T15:00:00.000Z');
    clone.linesSnapshot = source.linesSnapshot.map((line) => ({
        ...line,
        sourceLineId: new mongoose.Types.ObjectId(),
        ...(quantity ? { netQuantity: mongoose.Types.Decimal128.fromString(quantity) } : {}),
    }));
    const current = await TechnicalSheetValidation.create(clone);
    await TechnicalSheet.updateOne({ _id: technicalSheetId }, {
        $set: { currentValidatedState: current._id },
    });
    return current;
};

describe('M-006 — réconciliation officielle après revalidation M-004', () => {
    it('conserve une Fiche process validée si la recette est identique, sans nouvelle version M-006', async () => {
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

        const next = await supersedeM004Validation(
            valid.validated.validation.id, valid.created.sheet.id,
        );
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review).toMatchObject({
            status: 'REVIEW_REQUIRED', compositionChanged: false,
            processRevision: 2, draftRevision: 1, unresolvedCount: 0,
        });
        expect(review.assignments[0].proposedTo).toBeTruthy();

        const applied = (await request(app).post(uri + '/reconcile')
            .set(bearer(owner.token))
            .send({
                expectedRevision: review.processRevision,
                expectedDraftRevision: review.draftRevision,
                currentValidationId: review.currentValidationId, decisions: [],
            }).expect(200)).body.data;
        expect(applied).toMatchObject({ processRevision: 3, draftRevision: 2, editorialState: 'VALIDATED' });
        const refreshed = (await request(app).get(uri)
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(refreshed.compositionOutdated).toBe(false);
        expect(refreshed.draft.phases[0].steps[0].ingredientLineKeys)
            .toEqual([review.assignments[0].proposedTo]);
        const stored = await ProcessSheet.findById(process.id);
        expect(stored.sourceValidation.toString()).toBe(valid.validated.validation.id);
        expect(stored.compositionValidation.toString()).toBe(next._id.toString());
        expect(stored.editorialState).toBe('VALIDATED');
        expect(await ProcessSheet.countDocuments({ technicalSheet: valid.created.sheet.id })).toBe(1);
        expect(await ProcessSheetDraft.countDocuments({ processSheet: process.id })).toBe(1);
        expect(await BusinessActivityEvent.countDocuments({
            entityId: process.id, action: 'PROCESS_SHEET_COMPOSITION_RECONCILED',
        })).toBe(1);
    });

    it('demande une correspondance explicite lorsque la fabrication change, puis autorise la validation', async () => {
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
        await supersedeM004Validation(
            valid.validated.validation.id, valid.created.sheet.id, { quantity: '3' },
        );
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review).toMatchObject({
            status: 'REVIEW_REQUIRED', compositionChanged: true,
            unresolvedCount: 1,
        });
        const payload = {
            expectedRevision: 1, expectedDraftRevision: 1,
            currentValidationId: review.currentValidationId, decisions: [],
        };
        const rejected = await request(app).post(uri + '/reconcile')
            .set(bearer(owner.token)).send(payload).expect(400);
        expect(rejected.body.code).toBe('PROCESS_SHEET_MAPPING_REQUIRED');
        expect((await ProcessSheet.findById(process.id)).compositionValidation).toBeNull();

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
            valid.validated.validation.id, valid.created.sheet.id,
        );
        const review = (await request(app).get(uri + '/composition-review')
            .set(bearer(owner.token)).expect(200)).body.data;
        expect(review.compositionChanged).toBe(false);
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
        await supersedeM004Validation(valid.validated.validation.id, valid.created.sheet.id);
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
