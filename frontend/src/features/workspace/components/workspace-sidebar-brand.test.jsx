import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';

import { SidebarProvider } from '@/components/ui/sidebar';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';

describe('WorkspaceSidebar application identity', () => {
  it('affiche le nom de l’application à la place du workspace', () => {
    const workspace = { id: 'workspace-1', name: 'Acme' };

    render(
      <MemoryRouter initialEntries={['/workspaces/workspace-1/dashboard']}>
        <SidebarProvider>
          <WorkspaceProvider
            features={[]}
            membership={null}
            permissions={[]}
            workspace={workspace}
          >
            <WorkspaceSidebar
              navigation={[]}
              workspace={workspace}
            />
          </WorkspaceProvider>
        </SidebarProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('GMS')).toBeInTheDocument();
    expect(screen.getByText('Fiches techniques')).toBeInTheDocument();
    expect(screen.queryByText('Application')).not.toBeInTheDocument();
    expect(screen.queryByText('SaaS Core')).not.toBeInTheDocument();
    expect(screen.queryByText('Acme')).not.toBeInTheDocument();
  });
});
