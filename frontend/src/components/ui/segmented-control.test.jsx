import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from '@/components/ui/segmented-control';

describe('SegmentedControl', () => {
  it('expose un choix exclusif accessible et réutilisable', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const { rerender } = render(
      <SegmentedControl
        ariaLabel="TVA"
        items={[
          { value: '550', label: '5,5 %' },
          { value: '1000', label: '10 %' },
        ]}
        onValueChange={onValueChange}
        value="550"
      />,
    );

    expect(screen.getByRole('button', {
      name: '5,5 %',
    })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', {
      name: '10 %',
    }));

    expect(onValueChange).toHaveBeenCalledWith('1000');

    rerender(
      <SegmentedControl
        ariaLabel="TVA"
        items={[
          { value: '550', label: '5,5 %' },
          { value: '1000', label: '10 %' },
        ]}
        onValueChange={onValueChange}
        value="1000"
      />,
    );

    expect(screen.getByRole('button', {
      name: '10 %',
    })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', {
      name: '10 %',
    }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
  });
});
