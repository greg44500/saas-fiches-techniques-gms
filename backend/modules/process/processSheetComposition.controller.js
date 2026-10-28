import {
    getProcessSheetCompositionContext,
} from './processSheetComposition.service.js';

const readComposition = async (req, res) => {
    const result = await getProcessSheetCompositionContext({
        workspaceId: req.workspace._id,
        dossierId: req.dossier._id,
        technicalSheetId: req.validated.params.technicalSheetId,
    });
    res.status(200).json({ status: 'success', data: result });
};

export { readComposition };
