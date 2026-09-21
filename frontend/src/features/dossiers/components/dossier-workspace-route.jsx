import { DossierReadGate } from '@/features/dossiers/components/dossier-read-gate';
import { DossierWorkspacePage } from '@/features/dossiers/pages/dossier-workspace-page';

function DossierWorkspaceRoute() {
  return (
    <DossierReadGate>
      <DossierWorkspacePage />
    </DossierReadGate>
  );
}

export { DossierWorkspaceRoute };
