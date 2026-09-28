import {
    productCatalogImportUploadService,
} from '../productCatalog/productCatalogImportUpload.service.js';

const uploadSupplierCatalogImportFile =
    productCatalogImportUploadService
        .uploadSingleFile('file');

const cleanupSupplierCatalogImportUploadOnError =
    productCatalogImportUploadService
        .cleanupTemporaryUploadOnError;

export {
    cleanupSupplierCatalogImportUploadOnError,
    uploadSupplierCatalogImportFile,
};
