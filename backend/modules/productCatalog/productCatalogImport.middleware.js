import {
    productCatalogImportUploadService,
} from './productCatalogImportUpload.service.js';

const uploadProductImportFile =
    productCatalogImportUploadService
        .uploadSingleFile('file');

const cleanupProductImportUploadOnError =
    productCatalogImportUploadService
        .cleanupTemporaryUploadOnError;

export {
    cleanupProductImportUploadOnError,
    uploadProductImportFile,
};
