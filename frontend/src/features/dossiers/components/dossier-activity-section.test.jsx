import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const activityQuery = vi.hoisted(() => vi.fn());

vi.mock('@/features/dossiers/api/dossiers-api', () => ({
  useGetDossierActivityQuery: activityQuery,
}));

import { DossierActivitySection } from '@/features/dossiers/components/dossier-activity-section';

describe('DossierActivitySection', () => {
  it('présente les actions avec les labels backend-driven', () => {
    activityQuery.mockReturnValue({
      data: {
        activity: [
          {
            id: 'event-1',
            action: 'DOSSIER_CREATED',
            actor: {
              firstName: 'Alice',
              lastName: 'Owner',
            },
            createdAt: '2026-09-21T12:00:00.000Z',
          },
        ],
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <DossierActivitySection
        dossierId="dossier-1"
        metadata={{
          businessActivityActions: [
            {
              value: 'DOSSIER_CREATED',
              label: 'Dossier créé',
            },
          ],
        }}
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByText('Dossier créé')).toBeInTheDocument();
    expect(screen.getByText('Alice Owner')).toBeInTheDocument();
  });
});
