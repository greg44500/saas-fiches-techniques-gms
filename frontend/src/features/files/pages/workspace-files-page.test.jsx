import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { findToastByText } from '@/test/toast-assertions';

const mocks = vi.hoisted(() => ({
  deleteWorkspaceFile: vi.fn(),
  downloadBlob: vi.fn(),
  downloadWorkspaceFile: vi.fn(),
  uploadWorkspaceFile: vi.fn(),
  useDeleteWorkspaceFileMutation: vi.fn(),
  useDownloadWorkspaceFileMutation: vi.fn(),
  useListWorkspaceFilesQuery: vi.fn(),
  useUploadWorkspaceFileMutation: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  useDeleteWorkspaceFileMutation: mocks.useDeleteWorkspaceFileMutation,
  useDownloadWorkspaceFileMutation: mocks.useDownloadWorkspaceFileMutation,
  useListWorkspaceFilesQuery: mocks.useListWorkspaceFilesQuery,
  useUploadWorkspaceFileMutation: mocks.useUploadWorkspaceFileMutation,
}));

vi.mock('@/features/files/lib/download-blob', () => ({
  downloadBlob: mocks.downloadBlob,
}));

import { SEARCH_DEBOUNCE_MS, WorkspaceFilesPage } from '@/features/files/pages/workspace-files-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };
const file = {
  id: 'file-1',
  originalName: 'contrat.pdf',
  mimeType: 'application/pdf',
  extension: 'pdf',
  sizeBytes: 2048,
  category: 'document',
  status: 'active',
  uploadedBy: 'user-1',
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

function renderPage(
  permissions = [WORKSPACE_PERMISSION.FILE_READ],
  features = [],
) {
  return render(
    <ToastProvider>
      <WorkspaceProvider
        features={features}
        membership={membership}
        permissions={permissions}
        workspace={workspace}
      >
        <WorkspaceFilesPage />
      </WorkspaceProvider>
    </ToastProvider>,
  );
}

describe('WorkspaceFilesPage', () => {
  beforeEach(() => {
    mocks.deleteWorkspaceFile.mockReset();
    mocks.downloadWorkspaceFile.mockReset();
    mocks.downloadBlob.mockReset();
    mocks.uploadWorkspaceFile.mockReset();
    mocks.useDeleteWorkspaceFileMutation.mockReset();
    mocks.useListWorkspaceFilesQuery.mockReset();
    mocks.useDownloadWorkspaceFileMutation.mockReset();
    mocks.useUploadWorkspaceFileMutation.mockReset();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [file],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useDownloadWorkspaceFileMutation.mockReturnValue([
      mocks.downloadWorkspaceFile,
      { isLoading: false },
    ]);
    mocks.useUploadWorkspaceFileMutation.mockReturnValue([
      mocks.uploadWorkspaceFile,
      { isLoading: false },
    ]);
    mocks.useDeleteWorkspaceFileMutation.mockReturnValue([
      mocks.deleteWorkspaceFile,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('affiche un tableau compact sans répéter le MIME ni le type', () => {
    renderPage();

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      page: 1,
      limit: 10,
    });
    expect(screen.getByRole('heading', { name: 'Fichiers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À propos des fichiers' })).toBeInTheDocument();
    expect(
      screen.queryByText('Consultez et téléchargez les fichiers actifs de Acme.'),
    ).not.toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Fichiers actifs du workspace' });
    const fileName = within(table).getByText('contrat.pdf');
    expect(fileName).toBeInTheDocument();
    expect(fileName).toHaveAttribute('title', 'contrat.pdf');
    expect(within(table).getByText('Document')).toBeInTheDocument();
    expect(within(table).getByText('2 Ko')).toBeInTheDocument();
    expect(screen.queryByText('application/pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Type' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Télécharger contrat.pdf' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Pagination des fichiers du workspace' }),
    ).toBeInTheDocument();
  });

  it('conserve le shell et affiche un skeleton de tableau pendant le chargement', () => {
    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Fichiers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fichiers actifs' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement du tableau…');
    expect(screen.queryByRole('searchbox', { name: 'Rechercher un fichier' })).not.toBeInTheDocument();
  });

  it('filtre les catégories côté serveur et revient à la première page', async () => {
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByLabelText('Filtrer par catégorie'));
    await user.click(await screen.findByRole('option', { name: 'Document' }));

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      page: 1,
      limit: 10,
      category: 'document',
    });
  });

  it('recherche le nom côté serveur après temporisation', async () => {
    const user = userEvent.setup();

    renderPage();
    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher un fichier' }),
      'contrat',
    );

    await waitFor(() => {
      expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
        workspaceId: 'workspace-1',
        page: 1,
        limit: 10,
        search: 'contrat',
      });
    });
  });

  it('affiche l’action d’upload uniquement avec file:upload et file_upload', () => {
    const { unmount } = renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_UPLOAD,
    ]);

    expect(screen.queryByRole('button', { name: 'Ajouter un fichier' })).not.toBeInTheDocument();

    unmount();
    renderPage(
      [
        WORKSPACE_PERMISSION.FILE_READ,
        WORKSPACE_PERMISSION.FILE_UPLOAD,
      ],
      [WORKSPACE_FEATURE.FILE_UPLOAD],
    );

    expect(screen.getByRole('button', { name: 'Ajouter un fichier' })).toBeInTheDocument();
  });

  it('affiche l’action de suppression uniquement avec file:delete', () => {
    const { unmount } = renderPage([WORKSPACE_PERMISSION.FILE_READ]);

    expect(screen.queryByRole('button', { name: 'Retirer contrat.pdf' })).not.toBeInTheDocument();

    unmount();
    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_DELETE,
    ]);

    expect(screen.getByRole('button', { name: 'Retirer contrat.pdf' })).toBeInTheDocument();
  });

  it('confirme le soft-delete puis affiche le succès en toast', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue('');

    mocks.deleteWorkspaceFile.mockReturnValue({ unwrap });

    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_DELETE,
    ]);

    await user.click(screen.getByRole('button', { name: 'Retirer contrat.pdf' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/au maximum 30 jours/i)).toBeInTheDocument();
    expect(screen.queryByText(/purge/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirer le fichier' }));

    expect(mocks.deleteWorkspaceFile).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      fileId: 'file-1',
    });
    const toast = await findToastByText('Fichier retiré');
    expect(toast).toHaveTextContent('contrat.pdf');
    expect(toast).toHaveTextContent('suppression définitive');
    expect(toast).not.toHaveTextContent(/purge/i);
  });

  it('conserve le dialogue ouvert et affiche le refus backend', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockRejectedValue({
      status: 403,
      data: { message: 'Vous ne pouvez pas supprimer ce fichier.' },
    });

    mocks.deleteWorkspaceFile.mockReturnValue({ unwrap });

    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_DELETE,
    ]);

    await user.click(screen.getByRole('button', { name: 'Retirer contrat.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Retirer le fichier' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Vous ne pouvez pas supprimer ce fichier.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('change de page via la pagination serveur', async () => {
    const user = userEvent.setup();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [file],
        pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      page: 2,
      limit: 10,
    });
  });

  it('ne réinitialise pas la pagination après le debounce initial vide', () => {
    vi.useFakeTimers();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [file],
        pagination: { page: 1, limit: 10, total: 25, totalPages: 3 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      page: 2,
      limit: 10,
    });

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1);
    });

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      page: 2,
      limit: 10,
    });
  });

  it('change la taille de page côté serveur et revient à la première page', async () => {
    const user = userEvent.setup();

    renderPage();
    const trigger = screen.getByRole('combobox', { name: 'Nombre de lignes par page' });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ x: 24, y: 24, width: 160, height: 36 }),
    );

    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: '20' }));

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      page: 1,
      limit: 20,
    });
  });

  it('télécharge via RTK Query puis délègue le Blob au navigateur', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const unwrap = vi.fn().mockResolvedValue(blob);

    mocks.downloadWorkspaceFile.mockReturnValue({ unwrap });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Télécharger contrat.pdf' }));

    expect(mocks.downloadWorkspaceFile).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      fileId: 'file-1',
    });
    expect(mocks.downloadBlob).toHaveBeenCalledWith(blob, 'contrat.pdf');
  });

  it('présente une erreur de téléchargement dans un toast', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockRejectedValue({
      data: { message: 'Téléchargement interdit' },
    });

    mocks.downloadWorkspaceFile.mockReturnValue({ unwrap });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Télécharger contrat.pdf' }));

    const toast = await findToastByText('Téléchargement impossible');
    expect(toast).toHaveTextContent('Téléchargement interdit');
  });

  it('affiche un état vide explicite', () => {
    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Aucun fichier actif')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('permet de relancer la requête après une erreur', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isFetching: false,
      isLoading: false,
      refetch,
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Fichiers indisponibles');
    expect(screen.getByText('Impossible de charger les fichiers du workspace.')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});