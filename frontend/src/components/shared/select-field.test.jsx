import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SelectField } from '@/components/shared/select-field';
import { TooltipProvider } from '@/components/ui/tooltip';

const items = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif', disabled: true },
];

describe('SelectField', () => {
  it('affiche le placeholder puis transmet la valeur choisie', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SelectField
        id="status"
        items={items}
        label="Statut"
        onValueChange={onValueChange}
        placeholder="Choisir un statut"
        value=""
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Statut' });
    expect(trigger).toHaveTextContent('Choisir un statut');

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );

    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Actif' }));

    expect(onValueChange).toHaveBeenCalledWith('active');
  });

  it('propage les états disabled du champ et des items', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SelectField
        id="status"
        items={items}
        label="Statut"
        onValueChange={vi.fn()}
        value="active"
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Statut' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 240, height: 40 }),
    );

    await user.click(trigger);
    expect(await screen.findByRole('option', { name: 'Inactif' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    rerender(
      <SelectField
        disabled
        id="status"
        items={items}
        label="Statut"
        onValueChange={vi.fn()}
        value="active"
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Statut' })).toBeDisabled();
  });

  it('associe une erreur au trigger via le contrat Field partagé', () => {
    render(
      <SelectField
        error="Choisissez un statut."
        id="status"
        items={items}
        label="Statut"
        onValueChange={vi.fn()}
        value=""
      />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Statut' });
    const error = screen.getByRole('alert');

    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toHaveAttribute('aria-describedby', error.id);
    expect(error).toHaveAttribute('data-slot', 'field-error');
  });

  it('expose une aide pédagogique à la demande sans l’afficher sous le champ', () => {
    render(
      <TooltipProvider>
        <SelectField
          id="status"
          info="Cette valeur décrit le cycle de vie du compte."
          items={items}
          label="Statut"
          onValueChange={vi.fn()}
          value="active"
        />
      </TooltipProvider>,
    );

    expect(
      screen.getByRole('button', { name: 'À propos de Statut' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Cette valeur décrit le cycle de vie du compte.'),
    ).not.toBeInTheDocument();
  });
});
