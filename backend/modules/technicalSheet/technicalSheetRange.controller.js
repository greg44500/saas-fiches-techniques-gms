import { findRangeNameSuggestions } from './technicalSheetRangeSuggestions.service.js';
import {
    archiveRange,
    assignTechnicalSheetRange,
    createRange,
    deleteRange,
    listRanges,
    listRangeOptions,
    reactivateRange,
    renameRange,
} from './technicalSheetRange.service.js';

const list = async (req, res) => {
    const result = await listRanges({
        workspaceId: req.workspace._id, ...req.validated.query,
    });
    res.status(200).json({ status: 'success', data: result });
};

const options = async (req, res) => {
    const ranges = await listRangeOptions({
        workspaceId: req.workspace._id,
        includeArchived: req.validated.query?.includeArchived === 'true',
    });
    res.status(200).json({ status: 'success', data: { ranges } });
};

const suggestions = async (req, res) => {
    const result = await findRangeNameSuggestions({
        workspaceId: req.workspace._id,
        ...req.validated.query,
    });
    res.status(200).json({ status: 'success', data: { suggestions: result } });
};

const create = async (req, res) => {
    const range = await createRange({
        workspaceId: req.workspace._id,
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(201).json({ status: 'success', data: { range } });
};

const rename = async (req, res) => {
    const range = await renameRange({
        workspaceId: req.workspace._id,
        rangeId: req.validated.params.rangeId,
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { range } });
};

const archive = async (req, res) => {
    const range = await archiveRange({
        workspaceId: req.workspace._id,
        rangeId: req.validated.params.rangeId,
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { range } });
};

const reactivate = async (req, res) => {
    const range = await reactivateRange({
        workspaceId: req.workspace._id,
        rangeId: req.validated.params.rangeId,
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { range } });
};

const remove = async (req, res) => {
    const result = await deleteRange({
        workspaceId: req.workspace._id,
        rangeId: req.validated.params.rangeId,
        actorId: req.user._id,
        expectedRevision: req.validated.body.expectedRevision,
    });
    res.status(200).json({ status: 'success', data: result });
};

const assign = async (req, res) => {
    const sheet = await assignTechnicalSheetRange({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        technicalSheetId: req.validated.params.technicalSheetId,
        actorId: req.user._id,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { sheet } });
};

export { archive, assign, create, list, options, reactivate, remove, rename, suggestions };
