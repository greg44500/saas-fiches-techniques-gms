import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

const jsdocIntegrityRules = {
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-property-names': 'error',
    'jsdoc/check-tag-names': 'error',
    'jsdoc/check-types': 'error',
};

export default [
    {
        ignores: [
            'frontend/**',
            'node_modules/**',
            'coverage/**',
        ],
    },
    js.configs.recommended,
    {
        files: ['backend/**/*.js', 'scripts/**/*.js', 'e2e/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.nodeBuiltin,
            },
        },
        plugins: {
            jsdoc,
        },
        rules: {
            ...jsdocIntegrityRules,
        },
    },
    {
        files: ['backend/middlewares/errorHandler.js'],
        rules: {
            // Express reconnaît un error handler grâce à sa signature à 4 arguments.
            'no-unused-vars': [
                'error',
                { argsIgnorePattern: '^next$' },
            ],
        },
    },
    {
        files: [
            'backend/modules/file/file.service.js',
            'backend/services/fileInspection/secureTemporaryUpload.service.js',
            'backend/services/fileInspection/uploadedFileInspection.service.js',
        ],
        rules: {
            /*
             * Ces services utilisent AggregateError pour conserver explicitement
             * l'erreur de traitement et l'erreur de compensation. La règle core
             * preserve-caught-error ne reconnaît pas correctement ce contrat
             * multi-erreurs et produirait ici un faux positif.
             */
            'preserve-caught-error': 'off',
        },
    },
    {
        files: ['backend/tests/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.nodeBuiltin,
            },
        },
        rules: {
            /*
             * Le nettoyage documentaire des tests appartient à DOC-CODE-1.4.
             * Les suites de routes utilisent en outre des imports et signatures
             * de mocks servant à matérialiser l'assemblage sans être lus ensuite.
             */
            'no-unused-vars': 'off',
        },
    },
];
