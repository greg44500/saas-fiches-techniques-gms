import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('expose une variante warning basée uniquement sur les tokens sémantiques', () => {
    render(<Button variant="warning">Action secondaire</Button>);

    expect(screen.getByRole('button', { name: 'Action secondaire' }))
      .toHaveClass(
        'bg-warning/85',
        'text-warning-foreground',
        'hover:bg-warning',
      );
  });
});
