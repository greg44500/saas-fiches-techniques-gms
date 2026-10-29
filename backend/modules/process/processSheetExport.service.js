import mongoose from 'mongoose';

import { AppError } from '../../utils/appError.js';
import {
    BUSINESS_ACTIVITY_ACTION, BUSINESS_ACTIVITY_ENTITY_TYPE,
} from '../businessActivity/businessActivity.registry.js';
import { createBusinessActivityEvent } from '../businessActivity/businessActivity.service.js';
import { slugifyFileName } from '../technicalSheet/technicalSheetExport.service.js';
import { ProcessSheet } from './processSheet.model.js';
import { getProcessSheet } from './processSheet.service.js';
import { buildProcessSheetPdf } from './processSheetExportPdf.service.js';

const exportProcessSheetPdf = async ({
    workspaceId, dossierId, processSheetId, actorId, dossierName = '',
}) => {
    const data = await getProcessSheet({ workspaceId, dossierId, processSheetId });
    if (!data.draft) throw new AppError('Contenu de Fiche process indisponible.', 409);

    const buffer = buildProcessSheetPdf({
        process: data.process,
        draft: data.draft,
        sourceIngredients: data.sourceIngredients,
        dossierName,
    });

    await mongoose.connection.transaction(async (session) => {
        const current = await ProcessSheet.exists(mongoose.trusted({
            _id: processSheetId, workspace: workspaceId, dossier: dossierId,
            revision: data.process.revision, status: data.process.status,
        })).session(session);
        if (!current) {
            const error = new AppError('La Fiche process a changé pendant son export.', 409);
            error.code = 'PROCESS_SHEET_EXPORT_CONFLICT';
            throw error;
        }
        await createBusinessActivityEvent({
            workspaceId, dossierId, actorId,
            action: BUSINESS_ACTIVITY_ACTION.PROCESS_SHEET_EXPORTED,
            entityType: BUSINESS_ACTIVITY_ENTITY_TYPE.PROCESS_SHEET,
            entityId: processSheetId,
            metadata: {
                format: 'PDF',
                revision: data.process.revision,
                editorialState: data.process.editorialState,
            },
        }, { session });
    });

    return {
        buffer,
        fileName: 'fiche-process-' + slugifyFileName(data.process.title) + '.pdf',
    };
};

export { exportProcessSheetPdf };
