import {
  SupplierReadGate,
} from '@/features/suppliers/components/supplier-read-gate';
import {
  SuppliersPage,
} from '@/features/suppliers/pages/suppliers-page';

function SuppliersRoute() {
  return (
    <SupplierReadGate>
      <SuppliersPage />
    </SupplierReadGate>
  );
}

export { SuppliersRoute };
