import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

describe('ToggleGroup', () => {
  it('expose l’état pressed et permet la sélection exclusive', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleGroup
        aria-label="Affichage"
        onValueChange={onValueChange}
        value={['compact']}
      >
        <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
        <ToggleGroupItem value="comfortable">Confortable</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole('button', { name: 'Compact' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Confortable' }))
      .toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'Confortable' }));

    expect(onValueChange).toHaveBeenCalledWith(
      ['comfortable'],
      expect.any(Object),
    );
  });

  it('permet la navigation clavier entre les items', async () => {
    const user = userEvent.setup();

    render(
      <ToggleGroup aria-label="Densité" defaultValue={['small']}>
        <ToggleGroupItem value="small">Petite</ToggleGroupItem>
        <ToggleGroupItem value="large">Grande</ToggleGroupItem>
      </ToggleGroup>,
    );

    const first = screen.getByRole('button', { name: 'Petite' });
    const second = screen.getByRole('button', { name: 'Grande' });

    first.focus();
    await user.keyboard('{ArrowRight}');

    expect(second).toHaveFocus();
  });
});
