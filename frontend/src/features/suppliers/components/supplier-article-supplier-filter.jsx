import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useListSuppliersQuery } from '@/features/suppliers/api/supplier-api';

// Interroge l'annuaire serveur : aucune limite implicite aux 100 premiers.
function SupplierArticleSupplierFilter({ workspaceId, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const query = useListSuppliersQuery({
    workspaceId, status: 'ALL', search: search.trim() || undefined,
    limit: 50,
  }, { skip: !open });
  const suppliers = query.data?.suppliers ?? [];
  const selectedName = value ? selected?.name || 'Fournisseur sélectionné' : 'Tous les fournisseurs';

  function pick(supplier) {
    setSelected(supplier);
    onChange(supplier?.id ?? null);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Filtrer par fournisseur"
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        type="button"
      >
        <span className="min-w-0 truncate">{selectedName}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-2">
        <Input
          aria-label="Rechercher un fournisseur dans le filtre"
          autoComplete="off"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nom du fournisseur…"
          value={search}
        />
        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
          <Button className="w-full justify-start" onClick={() => pick(null)}
            size="sm" variant={!value ? 'secondary' : 'ghost'}>
            Tous les fournisseurs
          </Button>
          {suppliers.map((supplier) => (
            <Button
              className="w-full justify-start whitespace-normal text-left"
              key={supplier.id}
              onClick={() => pick(supplier)}
              size="sm"
              variant={value === supplier.id ? 'secondary' : 'ghost'}
            >
              {supplier.name}
            </Button>
          ))}
          {query.isFetching && (
            <p className="p-2 text-xs text-muted-foreground">Recherche…</p>
          )}
          {query.isError && <p className="p-2 text-xs text-destructive">Fournisseurs indisponibles.</p>}
          {!query.isFetching && !query.isError && suppliers.length === 0 && (
            <p className="p-2 text-xs text-muted-foreground">Aucun fournisseur trouvé.</p>
          )}
          {(query.data?.pagination?.totalPages ?? 1) > 1 && (
            <p className="p-2 text-xs text-muted-foreground">
              Affinez la recherche pour afficher les autres fournisseurs.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { SupplierArticleSupplierFilter };
