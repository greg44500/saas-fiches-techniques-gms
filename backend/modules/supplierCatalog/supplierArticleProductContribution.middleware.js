import { AppError } from '../../utils/appError.js';
import { SupplierArticle } from './supplier.model.js';
import {
    SUPPLIER_RESOURCE_STATUS,
    SUPPLIER_SCOPE,
} from './supplierCatalog.registry.js';

/**
 * La capacité d'import n'autorise des contributions Produit que dans le
 * contexte d'un Article actif et privé appartenant au Workspace courant.
 */
const assertPrivateActiveSupplierArticle = async (req, _res, next) => {
    try {
        const exists = await SupplierArticle.exists({
            _id: req.validated.params.articleId,
            workspace: req.workspace._id,
            scope: SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
            status: SUPPLIER_RESOURCE_STATUS.ACTIVE,
        });
        if (!exists) {
            return next(new AppError(
                'Article privé actif introuvable dans cet espace de travail.',
                404,
            ));
        }
        return next();
    } catch (error) {
        return next(error);
    }
};

export { assertPrivateActiveSupplierArticle };
