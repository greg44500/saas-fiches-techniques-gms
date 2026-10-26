import { updateProcessSheetDraft } from './processSheetDraft.service.js';
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
    res.status(200).json({ status: 'success', data });
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

export { create, eligible, get, list, saveDraft };
