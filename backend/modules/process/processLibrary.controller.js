import {
    createTemplate,
    getTemplate,
    listRevisions,
    listTemplates,
    publishTemplate,
    setTemplateStatus,
    toKind,
    updateTemplate,
} from './processLibrary.service.js';

import { PROCESS_LIBRARY_STATUS } from './processLibrary.registry.js';

const context = (req) => ({
    workspaceId: req.workspace._id,
    dossierId: req.dossier?._id ?? null,
    actorId: req.user._id,
    kind: toKind(req.validated.params.kind),
});

const list = async (req, res) => {
    const result = await listTemplates({
        ...context(req), ...req.validated.query,
    });
    res.status(200).json({ status: 'success', data: result });
};

const get = async (req, res) => {
    const template = await getTemplate({
        ...context(req),
        templateId: req.validated.params.templateId,
    });
    res.status(200).json({ status: 'success', data: { template } });
};

const history = async (req, res) => {
    const result = await listRevisions({
        ...context(req),
        templateId: req.validated.params.templateId,
        ...req.validated.query,
    });
    res.status(200).json({ status: 'success', data: result });
};

const create = async (req, res) => {
    const template = await createTemplate({
        ...context(req), ...req.validated.body,
    });
    res.status(201).json({ status: 'success', data: { template } });
};

const update = async (req, res) => {
    const template = await updateTemplate({
        ...context(req),
        templateId: req.validated.params.templateId,
        ...req.validated.body,
    });
    res.status(200).json({ status: 'success', data: { template } });
};

const archive = async (req, res) => {
    const template = await setTemplateStatus({
        ...context(req),
        templateId: req.validated.params.templateId,
        expectedRevision: req.validated.body.expectedRevision,
        nextStatus: PROCESS_LIBRARY_STATUS.ARCHIVED,
    });
    res.status(200).json({ status: 'success', data: { template } });
};

const reactivate = async (req, res) => {
    const template = await setTemplateStatus({
        ...context(req),
        templateId: req.validated.params.templateId,
        expectedRevision: req.validated.body.expectedRevision,
        nextStatus: PROCESS_LIBRARY_STATUS.ACTIVE,
    });
    res.status(200).json({ status: 'success', data: { template } });
};

const publish = async (req, res) => {
    const template = await publishTemplate({
        ...context(req),
        templateId: req.validated.params.templateId,
        expectedRevision: req.validated.body.expectedRevision,
    });
    res.status(201).json({ status: 'success', data: { template } });
};

export { archive, create, get, history, list, publish, reactivate, update };
