import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';

const IMPORT_FILE_ACCEPT = '.csv,.xls,.xlsx';

function ImportFilePicker({ disabled = false, file, id, onChange }) {
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!file && fileInputRef.current) fileInputRef.current.value = '';
  }, [file]);

  return (
    <Field className="min-w-0">
      <FieldLabel htmlFor={id}>Fichier</FieldLabel>
      <input
        accept={IMPORT_FILE_ACCEPT}
        aria-label="Fichier"
        className="sr-only"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          variant="outline"
        >
          Choisir un fichier
        </Button>
        <p
          aria-live="polite"
          className="min-w-0 truncate text-sm text-muted-foreground"
          title={file?.name ?? undefined}
        >
          {file ? 'Fichier choisi : ' + file.name : 'Aucun fichier sélectionné'}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Formats acceptés : CSV, XLS et XLSX.
      </p>
    </Field>
  );
}

export { IMPORT_FILE_ACCEPT, ImportFilePicker };
