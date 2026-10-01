import { HELP_CONTEXT } from '../help/help.registry.js';

const PLATFORM_REFERENCE_MANAGEMENT_HELP_CATEGORY_ID =
    'platform_reference_management';

const REFERENCE_MANAGEMENT_HELP_MODULE = Object.freeze({
    key: 'reference-management',
    categories: Object.freeze([
        {
            id: PLATFORM_REFERENCE_MANAGEMENT_HELP_CATEGORY_ID,
            context: HELP_CONTEXT.PLATFORM,
            label: 'Gestion des référentiels',
            description:
                'Consultation et gouvernance des référentiels Produits et Fournisseurs partagés.',
            order: 100,
        },
    ]),
    entries: Object.freeze([]),
    workspaceRemediationEntryIds: Object.freeze([]),
});

export {
    PLATFORM_REFERENCE_MANAGEMENT_HELP_CATEGORY_ID,
    REFERENCE_MANAGEMENT_HELP_MODULE,
};
