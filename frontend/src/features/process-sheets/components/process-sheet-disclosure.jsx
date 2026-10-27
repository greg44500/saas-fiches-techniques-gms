import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Reuses the same Base UI disclosure primitive as the phase tree.
// Closed fields are removed from the accessibility and keyboard flow.
function ProcessSheetDisclosure({ title, children, initiallyOpen = false }) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <Collapsible className="border-b border-border/60 last:border-b-0"
      onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{title}</span>
        <ChevronDown aria-hidden="true"
          className={'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none '
            + (open ? 'rotate-180' : '')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="process-sheet-tree-panel">
        <div className="space-y-3 pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { ProcessSheetDisclosure };
