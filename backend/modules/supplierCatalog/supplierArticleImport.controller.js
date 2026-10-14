import { productCatalogImportUploadService } from '../productCatalog/productCatalogImportUpload.service.js';
import {
    commitSupplierArticleImport,
    inspectSupplierArticleImport,
    previewSupplierArticleImport,
} from './supplierArticleImport.service.js';
import { SUPPLIER_SCOPE } from './supplierCatalog.registry.js';

const buildHandlers = (globalMode) => {
    const context = (req) => ({
        scope: globalMode ? SUPPLIER_SCOPE.GLOBAL_SHARED : SUPPLIER_SCOPE.WORKSPACE_PRIVATE,
        workspaceId: globalMode ? null : req.workspace._id,
        actorId: req.user._id,
    });
    return {
        inspect: async (req, res) => {
            const result = await productCatalogImportUploadService.processTemporaryUpload({
                file: req.file,
                consume: (file) => inspectSupplierArticleImport({ ...context(req), file }),
            });
            res.status(201).json({ status: 'success', data: result });
        },
        preview: async (req, res) => {
            const result = await previewSupplierArticleImport({
                ...context(req),
                importId: req.validated.params.importId,
                ...req.validated.body,
            });
            res.status(200).json({ status: 'success', data: result });
        },
        commit: async (req, res) => {
            const result = await commitSupplierArticleImport({
                ...context(req), importId: req.validated.params.importId,
            });
            res.status(200).json({ status: 'success', data: result });
        },
    };
};
const workspaceArticleImport = buildHandlers(false);
const globalArticleImport = buildHandlers(true);
export { workspaceArticleImport, globalArticleImport };
