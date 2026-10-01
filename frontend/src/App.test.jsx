import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';

import App from '@/App';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { getComfortStorageKey } from '@/lib/appearance-preferences';
import { createAppStore } from '@/store/store';

function renderApp(storageScope = 'test-user') {
  const store = createAppStore();

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider storageScope={storageScope}>
          <App />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );
}

function readStoredComfortPreferences(storageScope) {
  const storedValue = window.localStorage.getItem(
    getComfortStorageKey(storageScope),
  );

  return storedValue ? JSON.parse(storedValue) : null;
}

describe('App public landing', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('expose les accès canoniques vers inscription et connexion', () => {
    renderApp();

    expect(screen.getByText('GMS')).toBeInTheDocument();
    expect(screen.getByText('Fiches techniques')).toBeInTheDocument();
    expect(screen.queryByText('SaaS Core')).not.toBeInTheDocument();
    expect(screen.queryByText('Socle applicatif')).not.toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Une base professionnelle pour construire votre application SaaS.',
      }),
    ).toBeInTheDocument();

    const registerLink = screen.getByRole('link', { name: /Créer un compte/i });
    expect(registerLink).toHaveAttribute('href', '/register');

    const loginLinks = screen.getAllByRole('link', { name: /Se connecter/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  it('persiste le thème choisi et le restaure au prochain montage', async () => {
    const user = userEvent.setup();
    const firstRender = renderApp('user-1');

    const themeToggle = screen.getByRole('button', {
      name: 'Activer le thème sombre',
    });

    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(themeToggle);

    expect(document.documentElement).toHaveClass('dark');
    expect(readStoredComfortPreferences('user-1')).toMatchObject({
      theme: 'dark',
    });

    firstRender.unmount();
    document.documentElement.classList.remove('dark');

    renderApp('user-1');

    expect(document.documentElement).toHaveClass('dark');
    expect(
      screen.getByRole('button', { name: 'Activer le thème clair' }),
    ).toBeInTheDocument();
  });

  it('isole la préférence de thème entre deux scopes utilisateur', async () => {
    const user = userEvent.setup();
    const firstRender = renderApp('user-1');

    await user.click(
      screen.getByRole('button', { name: 'Activer le thème sombre' }),
    );

    expect(readStoredComfortPreferences('user-1')).toMatchObject({
      theme: 'dark',
    });

    firstRender.unmount();
    document.documentElement.classList.remove('dark');

    renderApp('user-2');

    expect(document.documentElement).not.toHaveClass('dark');
    expect(readStoredComfortPreferences('user-2')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Activer le thème sombre' }),
    ).toBeInTheDocument();
  });
});
