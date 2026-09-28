import {
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';
import { AppError } from '../../utils/appError.js';

const requireWorkspaceOwner = (
    req,
    res,
    next,
) => {
    if (
        !req.role?.isSystem
        || req.role.key
            !== SYSTEM_ROLE_KEY.OWNER
    ) {
        return next(
            new AppError(
                'Cette action est réservée au propriétaire du Workspace.',
                403,
            ),
        );
    }

    return next();
};

export { requireWorkspaceOwner };
