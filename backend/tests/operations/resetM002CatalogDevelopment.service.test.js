import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    assertM002DevelopmentResetAllowed,
    parseMongoTarget,
} from '../../operations/development/resetM002CatalogDevelopment.service.js';

describe('resetM002CatalogDevelopment', () => {
    it('analyse la cible Mongo locale attendue', () => {
        expect(parseMongoTarget(
            'mongodb://127.0.0.1:27017/saas-fiches-techniques-gms-dev?replicaSet=rs0',
        )).toEqual({
            host: '127.0.0.1',
            databaseName: 'saas-fiches-techniques-gms-dev',
        });
    });

    it('refuse absolument production', () => {
        expect(() => assertM002DevelopmentResetAllowed({
            nodeEnv: 'production',
            resetEnabled: true,
            confirmed: true,
            mongodbUri:
                'mongodb://127.0.0.1:27017/saas-fiches-techniques-gms-dev',
        })).toThrow(
            'Le reset M-002 est autorisé uniquement avec NODE_ENV=development.',
        );
    });

    it('reste désactivé sans capability explicite', () => {
        expect(() => assertM002DevelopmentResetAllowed({
            nodeEnv: 'development',
            resetEnabled: false,
            confirmed: true,
            mongodbUri:
                'mongodb://127.0.0.1:27017/saas-fiches-techniques-gms-dev',
        })).toThrow(
            'Activez ALLOW_DEVELOPMENT_DATA_RESET=true',
        );
    });

    it('exige le flag de confirmation', () => {
        expect(() => assertM002DevelopmentResetAllowed({
            nodeEnv: 'development',
            resetEnabled: true,
            confirmed: false,
            mongodbUri:
                'mongodb://127.0.0.1:27017/saas-fiches-techniques-gms-dev',
        })).toThrow(
            'Le reset M-002 exige --confirm-m002-reset.',
        );
    });

    it('refuse une base distante', () => {
        expect(() => assertM002DevelopmentResetAllowed({
            nodeEnv: 'development',
            resetEnabled: true,
            confirmed: true,
            mongodbUri:
                'mongodb://mongo.example.com:27017/saas-fiches-techniques-gms-dev',
        })).toThrow(
            'Le reset M-002 refuse toute base MongoDB non locale.',
        );
    });

    it('refuse une base locale qui ne se termine pas par -dev', () => {
        expect(() => assertM002DevelopmentResetAllowed({
            nodeEnv: 'development',
            resetEnabled: true,
            confirmed: true,
            mongodbUri:
                'mongodb://127.0.0.1:27017/saas-fiches-techniques-gms',
        })).toThrow(
            'Le reset M-002 exige une base MongoDB locale se terminant par -dev.',
        );
    });

    it('accepte uniquement development + capability + confirmation + base locale -dev', () => {
        expect(() => assertM002DevelopmentResetAllowed({
            nodeEnv: 'development',
            resetEnabled: true,
            confirmed: true,
            mongodbUri:
                'mongodb://localhost:27017/saas-fiches-techniques-gms-dev?replicaSet=rs0',
        })).not.toThrow();
    });
});
