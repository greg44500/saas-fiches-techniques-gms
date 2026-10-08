import { ErrorState } from '@/components/shared/error-state';
import {
  TECHNICAL_SHEET_FEATURE,
} from '@/features/technical-sheets/constants/technical-sheet-features';
import {
  TECHNICAL_SHEET_PERMISSION,
} from '@/features/technical-sheets/constants/technical-sheet-permissions';
import {
  TechnicalSheetOptimizerPage,
} from '@/features/technical-sheets/pages/technical-sheet-optimizer-page';
import {
  useWorkspaceContext,
} from '@/features/workspace/components/workspace-context';

function TechnicalSheetOptimizerRoute() {
  const {
    can,
    hasFeature,
  } = useWorkspaceContext();

  if (
    !can(TECHNICAL_SHEET_PERMISSION.UPDATE)
    || !hasFeature(
      TECHNICAL_SHEET_FEATURE.OPTIMIZER,
    )
  ) {
    return (
      <ErrorState
        description="Votre rôle ou l’offre du Workspace ne permet pas d’utiliser l’Atelier d’optimisation."
        title="Atelier indisponible"
      />
    );
  }

  return <TechnicalSheetOptimizerPage />;
}

export { TechnicalSheetOptimizerRoute };
