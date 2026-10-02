import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SegmentedControl } from '@/components/ui/segmented-control';

const items = [
  { value: 'option-a', label: 'Option A' },
  { value: 'option-b', label: 'Option B' },
];

function ControlledSegmentedControl({ disabled = false }) {
  const [value, setValue] = useState('option-a');

  return (
    <SegmentedControl
      ariaLabel="Choix exclusif"
      disabled={disabled}
      items={items}
      onValueChange={setValue}
      value={value}
    />
  );
}

describe('SegmentedControl', () => {
  it('rend une sélection exclusive accessible via aria-pressed', () => {
    render(<ControlledSegmentedControl />);

    expect(screen.getByRole('button', { name: 'Option A' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Option B' }))
      .toHaveAttribute('aria-pressed', 'false');
  });

  it('conserve une sélection lorsque l’item actif est pressé à nouveau', async () => {
    const user = userEvent.setup();
    render(<ControlledSegmentedControl />);

    const activeItem = screen.getByRole('button', { name: 'Option A' });
    await user.click(activeItem);

    expect(activeItem).toHaveAttribute('aria-pressed', 'true');
  });

  it('change de valeur au clavier sans permettre une sélection multiple', async () => {
    const user = userEvent.setup();
    render(<ControlledSegmentedControl />);

    const first = screen.getByRole('button', { name: 'Option A' });
    const second = screen.getByRole('button', { name: 'Option B' });

    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();

    await user.keyboard(' ');
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(second).toHaveAttribute('aria-pressed', 'true');
  });

  it('désactive tous les segments lorsque le contrôle est disabled', () => {
    render(<ControlledSegmentedControl disabled />);

    expect(screen.getByRole('button', { name: 'Option A' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Option B' })).toBeDisabled();
  });
});
