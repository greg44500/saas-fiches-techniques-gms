import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
} from '../../config/applicationRolePermission.registry.js';
import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    DOSSIER_PERMISSIONS,
} from '../../modules/dossier/dossierPermission.registry.js';
import {
    getActiveRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';
import {
    PRODUCT_CATALOG_PERMISSIONS,
} from '../../modules/productCatalog/productCatalogPermission.registry.js';
import {
    SUPPLIER_CATALOG_PERMISSIONS,
} from '../../modules/supplierCatalog/supplierCatalogPermission.registry.js';
import {
    TECHNICAL_SHEET_PERMISSIONS,
} from '../../modules/technicalSheet/technicalSheetPermission.registry.js';


describe('application role permission registry', () => {
    it('configure le registre runtime actif avec le registre applicatif', () => {
        expect(getActiveRolePermissionRegistry()).toBe(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY,
        );
    });

    it('conserve toutes les permissions Core dans le registre applicatif', () => {
        expect(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
        ).toEqual(
            expect.arrayContaining(Object.values(CORE_PERMISSION)),
        );
    });

    it('enregistre les six permissions M-001', () => {
        expect(DOSSIER_PERMISSIONS).toHaveLength(6);
        expect(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
        ).toEqual(
            expect.arrayContaining(DOSSIER_PERMISSIONS),
        );
    });

    it('enregistre les permissions M-002, M-003 et M-004', () => {
        expect(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY.permissions,
        ).toEqual(
            expect.arrayContaining([
                ...PRODUCT_CATALOG_PERMISSIONS,
                ...SUPPLIER_CATALOG_PERMISSIONS,
                ...TECHNICAL_SHEET_PERMISSIONS,
            ]),
        );
    });

    it('attribue les permissions métier produit uniquement au rôle système owner', () => {
        expect(
            ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY
                .systemRolePermissions[SYSTEM_ROLE_KEY.OWNER],
        ).toEqual(
            expect.arrayContaining([
                ...DOSSIER_PERMISSIONS,
                ...PRODUCT_CATALOG_PERMISSIONS,
                ...SUPPLIER_CATALOG_PERMISSIONS,
                ...TECHNICAL_SHEET_PERMISSIONS,
            ]),
        );

        for (const roleKey of Object.values(SYSTEM_ROLE_KEY)) {
            if (roleKey === SYSTEM_ROLE_KEY.OWNER) {
                continue;
            }

            const permissions =
                ACTIVE_APPLICATION_ROLE_PERMISSION_REGISTRY
                    .systemRolePermissions[roleKey] ?? [];

            expect(
                permissions.some((permission) =>
                    [
                        ...DOSSIER_PERMISSIONS,
                        ...PRODUCT_CATALOG_PERMISSIONS,
                        ...SUPPLIER_CATALOG_PERMISSIONS,
                        ...TECHNICAL_SHEET_PERMISSIONS,
                    ].includes(permission)),
            ).toBe(false);
        }
    });
});
