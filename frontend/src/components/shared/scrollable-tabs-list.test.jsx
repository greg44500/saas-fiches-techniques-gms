import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollableTabsList } from '@/components/shared/scrollable-tabs-list';
import { Tabs, TabsTrigger } from '@/components/ui/tabs';

const categories = [
  { value: 'account', label: 'Mon compte' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'products', label: 'Produits' },
  { value: 'process', label: 'Fiches process' },
];

class MockResizeObserver {
  observe() {}

  disconnect() {}
}

function rect(left, right) {
  return {
    left,
    right,
    top: 0,
    bottom: 35,
    x: left,
    y: 0,
    width: right - left,
    height: 35,
    toJSON() {},
  };
}

function ControlledTabs() {
  const [active, setActive] = useState('account');

  return (
    <Tabs onValueChange={setActive} value={active}>
      <ScrollableTabsList
        activeValue={active}
        aria-label="Catégories du centre d’aide"
      >
        {categories.map(({ label, value }) => (
          <TabsTrigger key={value} value={value} variant="section">
            {label}
          </TabsTrigger>
        ))}
      </ScrollableTabsList>
    </Tabs>
  );
}

function simulateViewport({ width, contentWidth }) {
  const tablist = screen.getByRole('tablist', {
    name: 'Catégories du centre d’aide',
  });
  const viewport = tablist.parentElement;

  Object.defineProperties(viewport, {
    clientWidth: { configurable: true, value: width },
    scrollWidth: { configurable: true, value: contentWidth },
    scrollLeft: { configurable: true, writable: true, value: 0 },
  });
  vi.spyOn(viewport, 'getBoundingClientRect')
    .mockImplementation(() => rect(0, width));

  const tabs = screen.getAllByRole('tab');
  tabs.forEach((tab, index) => {
    vi.spyOn(tab, 'getBoundingClientRect')
      .mockImplementation(() => rect(
        index * 120 - viewport.scrollLeft,
        (index + 1) * 120 - viewport.scrollLeft,
      ));
  });

  const scrollTo = vi.fn(({ left }) => {
    viewport.scrollLeft = left;
    fireEvent.scroll(viewport);
  });
  viewport.scrollTo = scrollTo;

  fireEvent.resize(window);

  return { viewport, scrollTo };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ScrollableTabsList', () => {
  it('conserve les onglets accessibles sans afficher les chevrons si tout tient', () => {
    render(<ControlledTabs />);
    const { viewport } = simulateViewport({ width: 600, contentWidth: 600 });

    expect(screen.getByRole('tab', { name: 'Mon compte' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', {
      name: 'Faire défiler les onglets vers la gauche',
    })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {
      name: 'Faire défiler les onglets vers la droite',
    })).not.toBeInTheDocument();
    expect(viewport.className).toContain('[scrollbar-width:none]');
  });

  it('déplace les onglets masqués par chevrons sans changer la sélection', async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);
    const { viewport, scrollTo } = simulateViewport({
      width: 240,
      contentWidth: 480,
    });

    const left = screen.getByRole('button', {
      name: 'Faire défiler les onglets vers la gauche',
    });
    const right = screen.getByRole('button', {
      name: 'Faire défiler les onglets vers la droite',
    });

    expect(left).toBeDisabled();
    expect(right).toBeEnabled();

    await user.click(right);
    expect(scrollTo).toHaveBeenCalledWith({
      left: 120,
      behavior: expect.stringMatching(/^(auto|smooth)$/),
    });
    expect(viewport.scrollLeft).toBe(120);
    expect(left).toBeEnabled();
    expect(screen.getByRole('tab', { name: 'Mon compte' }))
      .toHaveAttribute('aria-selected', 'true');

    await user.click(left);
    expect(viewport.scrollLeft).toBe(0);
    expect(left).toBeDisabled();
  });

  it('rend visible un onglet sélectionné ou atteint au clavier', async () => {
    const user = userEvent.setup();
    render(<ControlledTabs />);
    const { viewport } = simulateViewport({ width: 240, contentWidth: 480 });

    await user.click(screen.getByRole('tab', { name: 'Fiches process' }));
    expect(screen.getByRole('tab', { name: 'Fiches process' }))
      .toHaveAttribute('aria-selected', 'true');
    expect(viewport.scrollLeft).toBe(240);

    viewport.scrollLeft = 0;
    fireEvent.focus(screen.getByRole('tab', { name: 'Produits' }));
    expect(viewport.scrollLeft).toBe(120);
  });

  it('retire les chevrons lorsque le viewport devient suffisamment large', () => {
    render(<ControlledTabs />);
    const { viewport } = simulateViewport({ width: 240, contentWidth: 480 });

    expect(screen.getByRole('button', {
      name: 'Faire défiler les onglets vers la droite',
    })).toBeInTheDocument();

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 600 },
      scrollWidth: { configurable: true, value: 480 },
    });
    fireEvent.resize(window);

    expect(screen.queryByRole('button', {
      name: 'Faire défiler les onglets vers la droite',
    })).not.toBeInTheDocument();
  });
});
