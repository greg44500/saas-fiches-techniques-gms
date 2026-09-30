import {
  TechnicalSheetReadGate,
} from '@/features/technical-sheets/components/technical-sheet-read-gate';
import {
  TechnicalSheetTrashPage,
} from '@/features/technical-sheets/pages/technical-sheet-trash-page';

function TechnicalSheetTrashRoute() {
  return (
    <TechnicalSheetReadGate>
      <TechnicalSheetTrashPage />
    </TechnicalSheetReadGate>
  );
}

export { TechnicalSheetTrashRoute };
