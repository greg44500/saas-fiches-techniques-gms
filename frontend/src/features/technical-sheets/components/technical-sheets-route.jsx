import {
  TechnicalSheetReadGate,
} from '@/features/technical-sheets/components/technical-sheet-read-gate';
import {
  TechnicalSheetsPage,
} from '@/features/technical-sheets/pages/technical-sheets-page';

function TechnicalSheetsRoute() {
  return (
    <TechnicalSheetReadGate>
      <TechnicalSheetsPage />
    </TechnicalSheetReadGate>
  );
}

export { TechnicalSheetsRoute };
