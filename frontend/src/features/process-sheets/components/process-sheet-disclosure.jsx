import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// The grid track, not conditional mounting, provides a fluid open/close.
// The collapsed content is inert and hidden from assistive technology.
function ProcessSheetDisclosure({ title, children, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);
  const contentId = useId();

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium hover:text-foreground/80"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        id={contentId}
        inert={!open ? true : undefined}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export { ProcessSheetDisclosure };
