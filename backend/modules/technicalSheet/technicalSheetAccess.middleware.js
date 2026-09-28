import { AppError } from '../../utils/appError.js';
import {
    DOSSIER_STATUS,
} from '../dossier/dossier.registry.js';

const enforceTechnicalSheetDossierOperational = (
    req,
    res,
    next,
) => {
    if (!req.dossier) {
        return next(
            new AppError(
                'Contexte Dossier indisponible',
                500,
            ),
        );
    }

    if (req.dossier.status !== DOSSIER_STATUS.ACTIVE) {
        return next(
            new AppError(
                'Le Dossier doit être actif pour cette action.',
                409,
            ),
        );
    }

    return next();
};

export { enforceTechnicalSheetDossierOperational };
