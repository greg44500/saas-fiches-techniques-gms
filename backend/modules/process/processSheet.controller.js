import {
    getProcessSheetReconciliation, reconcileProcessSheet,
} from './processSheetReconciliation.service.js';
import { deleteProcessSheet } from './processSheetDelete.service.js';
import { exportProcessSheetPdf } from './processSheetExport.service.js';
import { DOSSIER_STATUS } from '../dossier/dossier.registry.js';
import { updateProcessSheetDraft } from './processSheetDraft.service.js';
import { validateProcessSheet } from './processSheetValidation.service.js';
import {
    createProcessSheet, getProcessSheet,
    listEligibleTechnicalSheets, listProcessSheets,
} from './processSheet.service.js';

const scope = (req) => ({
    workspaceId: req.workspace._id,
    dossierId: req.dossier._id,
});

const list = async (req, res) => {
    const data = await listProcessSheets({ ...scope(req), ...req.validated.query });
    res.status(200).json({ status: 'success', data });
};

const eligible = async (req, res) => {
    const data = await listEligibleTechnicalSheets({
        ...scope(req), ...req.validated.query,
    });
    res.status(200).json({ status: 'success', data });
};

const get = async (req, res) => {
    const data = await getProcessSheet({
        ...scope(req), processSheetId: req.validated.params.processSheetId,
    });
    // Context is already scoped and authorized by the read route.
    // Expose the operational predicate without requiring dossier:read.
    res.status(200).json({
        status: 'success',
        data: { ...data, dossierOperational: req.dossier.status === DOSSIER_STATUS.ACTIVE },
    });
};

const create = async (req, res) => {
    const process = await createProcessSheet({
        ...scope(req), actorId: req.user._id, ...req.validated.body,
    });
    res.status(201).json({ status: 'success', data: { process } });
};

const saveDraft = async (req, res) => {
    const draft = await updateProcessSheetDraft({
        ...scope(req),
        processSheetId: req.validated.params.processSheetId,
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { draft } });
};

const getReconciliation = async (req, res) => {
    const review = await getProcessSheetReconciliation({
        ...scope(req), processSheetId: req.validated.params.processSheetId,
    });
    res.status(200).json({ status: 'success', data: review });
};

const applyReconciliation = async (req, res) => {
    const result = await reconcileProcessSheet({
        ...scope(req),
        processSheetId: req.validated.params.processSheetId,
        actorId: req.user._id, ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: result });
};

const validate = async (req, res) => {
    const process = await validateProcessSheet({
        ...scope(req),
        processSheetId: req.validated.params.processSheetId,
        actorId: req.user._id, ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { process } });
};

const remove = async (req, res) => {
    const data = await deleteProcessSheet({
        ...scope(req), processSheetId: req.validated.params.processSheetId,
        actorId: req.user._id, expectedRevision: req.validated.body.expectedRevision,
    });
    res.status(200).json({ status: 'success', data });
};

const exportPdf = async (req, res) => {
    const artifact = await exportProcessSheetPdf({
        ...scope(req), processSheetId: req.validated.params.processSheetId,
        actorId: req.user._id, dossierName: req.dossier.name,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
        "attachment; filename*=UTF-8''" + encodeURIComponent(artifact.fileName));
    res.setHeader('Content-Length', artifact.buffer.length);
    res.status(200).send(artifact.buffer);
};

export {
    create, eligible, get, list, saveDraft, validate, remove, exportPdf,
    getReconciliation, applyReconciliation,
};
