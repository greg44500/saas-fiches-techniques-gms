import { Supplier } from '../modules/supplierCatalog/supplier.model.js';
import { normalizeSupplierText } from '../modules/supplierCatalog/supplierCatalog.normalization.js';

const auditM003SupplierNames = async () => {
    const suppliers = await Supplier.find({})
        .select('_id name normalizedName scope workspace status')
        .lean();
    const groups = new Map();
    const invalid = [];
    for (const supplier of suppliers) {
        const normalizedName = normalizeSupplierText(supplier.name);
        if (!normalizedName || supplier.normalizedName !== normalizedName) {
            invalid.push({
                id: String(supplier._id),
                name: supplier.name,
                normalizedName: supplier.normalizedName,
                expected: normalizedName,
            });
        }
        const ownership = supplier.scope === 'GLOBAL_SHARED'
            ? 'GLOBAL_SHARED'
            : 'WORKSPACE_PRIVATE:' + String(supplier.workspace);
        const key = ownership + ':' + normalizedName;
        const group = groups.get(key) ?? [];
        group.push({
            id: String(supplier._id),
            name: supplier.name,
            status: supplier.status,
            scope: supplier.scope,
            workspace: supplier.workspace ? String(supplier.workspace) : null,
        });
        groups.set(key, group);
    }
    const duplicates = [...groups.entries()]
        .filter(([, members]) => members.length > 1)
        .map(([key, members]) => ({ key, members }));
    return {
        total: suppliers.length,
        duplicates,
        invalid,
        safeForUniqueIndexes: duplicates.length === 0 && invalid.length === 0,
    };
};

export { auditM003SupplierNames };
