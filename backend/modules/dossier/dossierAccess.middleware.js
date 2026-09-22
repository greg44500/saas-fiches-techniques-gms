import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    DOSSIER_ACCESS_GRANT_STATUS,
} from './dossierAccess.registry.js';
import {
    DossierAccessGrant,
} from './dossierAccess.model.js';
import { Dossier } from './dossier.model.js';


const isWorkspaceOwner = (role) =>
    Boolean(
        role?.isSystem
        && role.key === SYSTEM_ROLE_KEY.OWNER,
    );

/**
 * Charge un Dossier dans le tenant courant puis applique le scope magasin.
 *
 * Le 404 est volontairement commun aux ressources absentes, cross-tenant et
 * hors périmètre afin de ne pas créer d'oracle d'énumération.
 */
const loadAuthorizedDossierContext = async (req, res, next) => {
    const dossierId =
        req.validated?.params?.dossierId;

    const dossier = await Dossier.findOne({
        _id: dossierId,
        workspace: req.workspace._id,
    });

    if (!dossier) {
        return next(
            new AppError(
                'Dossier introuvable',
                404,
            ),
        );
    }

    if (isWorkspaceOwner(req.role)) {
        req.dossier = dossier;
        return next();
    }

    const grant = await DossierAccessGrant.findOne({
        workspace: req.workspace._id,
        dossier: dossier._id,
        workspaceMember: req.membership._id,
        status: DOSSIER_ACCESS_GRANT_STATUS.ACTIVE,
    });

    if (!grant) {
        return next(
            new AppError(
                'Dossier introuvable',
                404,
            ),
        );
    }

    req.dossier = dossier;
    req.dossierAccessGrant = grant;

    return next();
};


export {
    isWorkspaceOwner,
    loadAuthorizedDossierContext,
};
