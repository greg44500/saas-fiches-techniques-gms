const APPLICATION_GLOBAL_PERMISSION_KEY_PATTERN =
    /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)+$/;

const freezeDefinition = (definition) => Object.freeze({
    ...definition,
});

const normalizePermissionKeys = (permissionKeys, label) => {
    if (!Array.isArray(permissionKeys)) {
        throw new TypeError(label + ' must be an array');
    }

    return Object.freeze([
        ...new Set(
            permissionKeys.map((permissionKey) => {
                if (typeof permissionKey !== 'string') {
                    throw new TypeError(
                        label + ' must contain only strings',
                    );
                }

                return permissionKey.trim().toLowerCase();
            }),
        ),
    ]);
};

const validatePermissionDefinition = (definition, label) => {
    if (
        definition === null
        || Array.isArray(definition)
        || typeof definition !== 'object'
    ) {
        throw new TypeError(
            label + ' must be an object',
        );
    }

    const {
        key,
        label: permissionLabel,
        category,
        categoryLabel,
        description,
        reserved = false,
    } = definition;

    const normalizedKey = typeof key === 'string'
        ? key.trim().toLowerCase()
        : '';

    if (
        !APPLICATION_GLOBAL_PERMISSION_KEY_PATTERN.test(
            normalizedKey,
        )
    ) {
        throw new TypeError(
            'Invalid application-global permission key',
        );
    }

    for (const value of [
        permissionLabel,
        category,
        categoryLabel,
        description,
    ]) {
        if (typeof value !== 'string' || value.trim() === '') {
            throw new TypeError(
                'Application-global permission presentation fields are required',
            );
        }
    }

    if (typeof reserved !== 'boolean') {
        throw new TypeError(
            'Application-global permission reserved must be a boolean',
        );
    }

    return freezeDefinition({
        key: normalizedKey,
        label: permissionLabel.trim(),
        category: category.trim(),
        categoryLabel: categoryLabel.trim(),
        description: description.trim(),
        reserved,
    });
};

/**
 * Compose le catalogue de permissions globales propres à l'application dérivée.
 *
 * Le Core ne fournit volontairement aucune permission métier globale. Chaque
 * application dérivée déclare explicitement les permissions des modules
 * réellement installés. La composition refuse aussi toute collision avec les
 * registres Workspace et Platform afin qu'une même clé ne puisse jamais avoir
 * plusieurs portées d'autorisation.
 */
const composeApplicationGlobalPermissions = (
    modules = [],
    {
        workspacePermissionKeys = [],
        platformPermissionKeys = [],
    } = {},
) => {
    if (!Array.isArray(modules)) {
        throw new TypeError(
            'Application-global permission modules must be an array',
        );
    }

    const workspaceKeys = new Set(
        normalizePermissionKeys(
            workspacePermissionKeys,
            'workspacePermissionKeys',
        ),
    );
    const platformKeys = new Set(
        normalizePermissionKeys(
            platformPermissionKeys,
            'platformPermissionKeys',
        ),
    );
    const declaredKeys = new Set();
    const definitions = [];

    modules.forEach((moduleDefinition, moduleIndex) => {
        if (
            moduleDefinition === null
            || Array.isArray(moduleDefinition)
            || typeof moduleDefinition !== 'object'
        ) {
            throw new TypeError(
                'Application-global permission module at index '
                + moduleIndex
                + ' must be an object',
            );
        }

        const permissions = moduleDefinition.permissions ?? [];

        if (!Array.isArray(permissions)) {
            throw new TypeError(
                'Application-global permission module permissions must be an array',
            );
        }

        permissions.forEach((definition, permissionIndex) => {
            const normalized = validatePermissionDefinition(
                definition,
                'modules['
                    + moduleIndex
                    + '].permissions['
                    + permissionIndex
                    + ']',
            );

            if (declaredKeys.has(normalized.key)) {
                throw new TypeError(
                    'Duplicate application-global permission: '
                    + normalized.key,
                );
            }

            if (
                workspaceKeys.has(normalized.key)
                || platformKeys.has(normalized.key)
            ) {
                throw new TypeError(
                    'Application-global permission collides with another authorization scope: '
                    + normalized.key,
                );
            }

            if (
                normalized.key.startsWith('platform:')
                || normalized.key.startsWith('workspace:')
            ) {
                throw new TypeError(
                    'Application-global permissions cannot use Platform or Workspace namespaces',
                );
            }

            declaredKeys.add(normalized.key);
            definitions.push(normalized);
        });
    });

    return Object.freeze({
        definitions: Object.freeze(definitions),
        permissionKeys: Object.freeze(
            definitions.map(({ key }) => key),
        ),
        reservedPermissionKeys: Object.freeze(
            definitions
                .filter(({ reserved }) => reserved)
                .map(({ key }) => key),
        ),
    });
};

const getApplicationGlobalPermissionDefinition = (
    permissionKey,
    registry,
) => registry.definitions.find(
    ({ key }) => key === permissionKey,
) ?? null;

export {
    APPLICATION_GLOBAL_PERMISSION_KEY_PATTERN,
    composeApplicationGlobalPermissions,
    getApplicationGlobalPermissionDefinition,
};
