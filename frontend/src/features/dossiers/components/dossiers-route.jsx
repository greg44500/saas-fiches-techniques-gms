import { DossierReadGate } from '@/features/dossiers/components/dossier-read-gate';
import { DossiersPage } from '@/features/dossiers/pages/dossiers-page';

function DossiersRoute() {
  return (
    <DossierReadGate>
      <DossiersPage />
    </DossierReadGate>
  );
}

export { DossiersRoute };
