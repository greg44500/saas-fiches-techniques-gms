import multer from 'multer';

import { AppError } from '../../utils/appError.js';

const productImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
}).single('file');

const uploadProductImportFile = (req, res, next) => {
    productImportUpload(req, res, (error) => {
        if (error) {
            return next(
                new AppError(
                    error.code === 'LIMIT_FILE_SIZE'
                        ? 'Le fichier d’import dépasse 5 Mo.'
                        : 'Le fichier d’import est invalide.',
                    400,
                ),
            );
        }

        if (!req.file) {
            return next(new AppError('Le fichier d’import est obligatoire.', 400));
        }

        return next();
    });
};

export { uploadProductImportFile };
