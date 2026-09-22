import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';

import { DEFAULT_DATA_PAGE_SIZE } from '@/components/data-display/data-pagination-config';
import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTableSkeleton } from '@/components/data-display/data-table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useDeleteWorkspaceFileMutation,
  useDownloadWorkspaceFileMutation,
  useListWorkspaceFilesQuery,
} from '@/features/files/api/files-api';
import { FileDeleteDialog } from '@/features/files/components/file-delete-dialog';
import { FileListFilters } from '@/features/files/components/file-list-filters';
import { FilePreviewDialog } from '@/features/files/components/file-preview-dialog';
import { FileUploadDialog } from '@/features/files/components/file-upload-dialog';
import { FilesTable } from '@/features/files/components/files-table';
import { downloadBlob } from '@/features/files/lib/download-blob';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { useDataPagination } from '@/hooks/use-data-pagination';

const PAGE_SIZE = DEFAULT_DATA_PAGE_SIZE;
const SEARCH_DEBOUNCE_MS = 300;

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function WorkspaceFilesPage({ embedded = false, hideSectionTitle = false }) {
  const { workspace, can, hasFeature } = useWorkspaceContext();
  const { toast } = useToast();
  const {
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useDataPagination({ initialPageSize: PAGE_SIZE });
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filePendingPreview, setFilePendingPreview] = useState(null);
  const [filePendingDeletion, setFilePendingDeletion] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    const nextSearch = searchInput.trim();

    if (nextSearch === search) return undefined;

    const timeoutId = window.setTimeout(() => {
      setSearch(nextSearch);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [search, searchInput, setPage]);

  const filesQuery = useListWorkspaceFilesQuery({
    workspaceId: workspace.id,
    page,
    limit: pageSize,
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  });
  const [downloadWorkspaceFile] = useDownloadWorkspaceFileMutation();
  const [deleteWorkspaceFile, deleteState] = useDeleteWorkspaceFileMutation();

  const files = filesQuery.data?.files ?? [];
  const pagination = filesQuery.data?.pagination;
  const totalFiles = pagination?.total ?? files.length;
  const hasFilters = Boolean(category || searchInput.trim());
  const hasLoadError = Boolean(filesQuery.error);
  const canUpload = can(WORKSPACE_PERMISSION.FILE_UPLOAD)
    && hasFeature(WORKSPACE_FEATURE.FILE_UPLOAD);
  const canDelete = can(WORKSPACE_PERMISSION.FILE_DELETE);

  async function handleDownload(file) {
    setDownloadingFileId(file.id);

    try {
      const blob = await downloadWorkspaceFile({
        workspaceId: workspace.id,
        fileId: file.id,
      }).unwrap();

      downloadBlob(blob, file.originalName);
    } catch (error) {
      toast({
        title: 'Téléchargement impossible',
        description: getApiMessage(error, 'Le téléchargement du fichier a échoué.'),
        variant: 'error',
      });
    } finally {
      setDownloadingFileId(null);
    }
  }

  function openDeleteDialog(file) {
    setDeleteError(null);
    setFilePendingDeletion(file);
  }

  function closeDeleteDialog() {
    if (deleteState.isLoading) return;
    setDeleteError(null);
    setFilePendingDeletion(null);
  }

  async function confirmDelete() {
    if (!filePendingDeletion) return;

    setDeleteError(null);

    try {
      await deleteWorkspaceFile({
        workspaceId: workspace.id,
        fileId: filePendingDeletion.id,
      }).unwrap();

      const deletedFileName = filePendingDeletion.originalName;
      setFilePendingDeletion(null);

      // Une suppression peut réduire le nombre total de pages. Revenir à la
      // première garantit qu'une invalidation RTK Query ne laisse pas l'UI sur
      // une page devenue inexistante ou vide.
      setPage(1);
      toast({
        title: 'Fichier retiré',
        description: `${deletedFileName} a été retiré des fichiers actifs. Son contenu reste temporairement conservé avant sa suppression définitive.`,
        variant: 'success',
      });
    } catch (error) {
      setDeleteError(
        getApiMessage(error, 'Le fichier n’a pas pu être retiré.'),
      );
    }
  }

  function handleCategoryChange(value) {
    setCategory(value);
    setPage(1);
  }

  function clearFilters() {
    setCategory('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  const uploadButton = canUpload ? (
    <Button
      onClick={() => setUploadDialogOpen(true)}
      type="button"
    >
      <Upload aria-hidden="true" className="size-4" />
      Ajouter un fichier
    </Button>
  ) : null;

  const showSectionHeader = !hideSectionTitle || (embedded && uploadButton);

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Fichiers</h1>
            <InfoTooltip
              content={`Consultez, prévisualisez et téléchargez les fichiers actifs de ${workspace.name}.`}
              label="À propos des fichiers"
            />
          </div>
          {uploadButton}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card">
        {showSectionHeader ? (
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            {!hideSectionTitle ? (
              <div>
                <h2 className="text-lg font-semibold">Fichiers actifs</h2>
                {!filesQuery.isLoading && !hasLoadError && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalFiles} fichier{totalFiles === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            ) : null}
            {embedded ? uploadButton : null}
          </div>
        ) : null}

        {filesQuery.isLoading ? (
          <DataTableSkeleton columns={5} rows={6} />
        ) : hasLoadError ? (
          <ErrorState
            description="Impossible de charger les fichiers du workspace."
            onRetry={filesQuery.refetch}
            title="Fichiers indisponibles"
          />
        ) : (
          <>
            <FileListFilters
              category={category}
              onCategoryChange={handleCategoryChange}
              onClear={clearFilters}
              onSearchChange={setSearchInput}
              search={searchInput}
            />

            {files.length === 0 ? (
              <EmptyState
                description={
                  hasFilters
                    ? 'Modifiez ou effacez les filtres pour élargir la recherche.'
                    : 'Aucun fichier n’est actuellement disponible dans ce workspace.'
                }
                title={
                  hasFilters
                    ? 'Aucun fichier ne correspond aux filtres'
                    : 'Aucun fichier actif'
                }
              />
            ) : (
              <FilesTable
                canDelete={canDelete}
                downloadingFileId={downloadingFileId}
                files={files}
                onDelete={openDeleteDialog}
                onDownload={handleDownload}
                onPreview={setFilePendingPreview}
              />
            )}

            <div className="px-5 pb-5">
              <DataPagination
                ariaLabel="Pagination des fichiers du workspace"
                disabled={filesQuery.isFetching}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                page={page}
                pageSize={pageSize}
                pagination={pagination}
              />
            </div>
          </>
        )}
      </section>

      {canUpload && (
        <FileUploadDialog
          onClose={() => setUploadDialogOpen(false)}
          onUploaded={(uploadedFile) => {
            setPage(1);
            toast({
              title: 'Fichier ajouté',
              description: uploadedFile?.originalName
                ? `${uploadedFile.originalName} est maintenant disponible dans le workspace.`
                : undefined,
              variant: 'success',
            });
          }}
          open={uploadDialogOpen}
        />
      )}

      <FilePreviewDialog
        file={filePendingPreview}
        onClose={() => setFilePendingPreview(null)}
        open={Boolean(filePendingPreview)}
        workspaceId={workspace.id}
      />

      {canDelete && (
        <FileDeleteDialog
          errorMessage={deleteError}
          file={filePendingDeletion}
          onCancel={closeDeleteDialog}
          onConfirm={confirmDelete}
          open={Boolean(filePendingDeletion)}
          pending={deleteState.isLoading}
        />
      )}
    </div>
  );
}

export {
  PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  WorkspaceFilesPage,
  getApiMessage,
};
