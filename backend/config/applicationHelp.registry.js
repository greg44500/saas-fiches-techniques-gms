import {
    DOSSIER_HELP_MODULE,
} from '../modules/dossier/dossierHelp.registry.js';
import {
    PRODUCT_CATALOG_HELP_MODULE,
} from '../modules/productCatalog/productCatalogHelp.registry.js';
import {
    REFERENCE_MANAGEMENT_HELP_MODULE,
} from '../modules/referenceManagement/referenceManagementHelp.registry.js';
import {
    SUPPLIER_CATALOG_HELP_MODULE,
} from '../modules/supplierCatalog/supplierCatalogHelp.registry.js';
import {
    TECHNICAL_SHEET_HELP_MODULE,
} from '../modules/technicalSheet/technicalSheetHelp.registry.js';
import {
    composeHelpModuleExtensions,
    createHelpRegistry,
} from '../modules/help/help.registry.js';
import {
    CORE_WORKSPACE_REMEDIATION_HELP_ENTRY_IDS,
} from '../modules/help/helpCoreAccess.registry.js';
import {
    CORE_HELP_CATEGORIES,
    CORE_HELP_ENTRIES,
} from '../modules/help/helpCore.registry.js';

/**
 * Point de composition explicite du centre d’aide du SaaS dérivé.
 *
 * Le Core conserve son corpus générique. Chaque module métier fournit ses
 * propres fiches et s’appuie sur les permissions réellement déclarées par
 * l’application.
 */
const APPLICATION_HELP_MODULES = Object.freeze([
    DOSSIER_HELP_MODULE,
    REFERENCE_MANAGEMENT_HELP_MODULE,
    PRODUCT_CATALOG_HELP_MODULE,
    SUPPLIER_CATALOG_HELP_MODULE,
    TECHNICAL_SHEET_HELP_MODULE,
]);

const helpExtensions = composeHelpModuleExtensions(
    APPLICATION_HELP_MODULES,
);

const ACTIVE_HELP_REGISTRY = createHelpRegistry({
    categories: [
        ...CORE_HELP_CATEGORIES,
        ...helpExtensions.categories,
    ],
    entries: [
        ...CORE_HELP_ENTRIES,
        ...helpExtensions.entries,
    ],
    workspaceRemediationEntryIds: [
        ...CORE_WORKSPACE_REMEDIATION_HELP_ENTRY_IDS,
        ...helpExtensions.workspaceRemediationEntryIds,
    ],
});

export {
    ACTIVE_HELP_REGISTRY,
    APPLICATION_HELP_MODULES,
};