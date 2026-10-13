import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DialogContent,
  DialogPortal,
  DialogRoot,
} from '@/components/ui/dialog';
import {
  ImportWizardHeader,
} from '@/features/imports/components/import-wizard-header';

function renderStep(step) {
  render(
    <DialogRoot open>
      <DialogPortal>
        <DialogContent>
          <ImportWizardHeader
            helpText="Vérifiez les informations avant de confirmer."
            step={step}
            title="Importer des Articles fournisseur"
          />
        </DialogContent>
      </DialogPortal>
    </DialogRoot>,
  );
}

describe('ImportWizardHeader', () => {
  it('identifie l’étape active, les étapes terminées et les étapes à venir', () => {
    renderStep('preview');
    const progression = screen.getByRole('navigation', {
      name: 'Progression de l’import',
    });
    expect(progression).toBeInTheDocument();
    expect(screen.getByText('Choisir').closest('li')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Associer').closest('li')).toHaveTextContent('Étape terminée');
    expect(screen.getByText('Vérifier').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Terminer').closest('li')).toHaveTextContent('Étape à venir');
    expect(screen.getByText('Étape 3 sur 4 : Vérifier')).toBeInTheDocument();
  });

  it('place l’explication utilisateur dans une infobulle accessible', () => {
    renderStep('upload');
    expect(screen.getByRole('button', {
      name: 'À propos de « Importer des Articles fournisseur »',
    })).toBeInTheDocument();
    expect(screen.getByText('Choisir').closest('li')).toHaveAttribute('aria-current', 'step');
  });
});
