import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hauteur disponible entre la première ligne d'un tableau métier et le bas
 * de la fenêtre. La feature conserve ses filtres, en-têtes et pagination
 * hors du conteneur de défilement. Ne modifie pas la primitive Core DataTable.
 */
function useTableViewport({
  active = true,
  reservedBottom = 96,
  dependency = null,
} = {}) {
  const ref = useRef(null);
  const [height, setHeight] = useState(320);

  useEffect(() => {
    if (!active) return undefined;

    function measure() {
      const top = ref.current?.getBoundingClientRect().top;
      if (typeof top !== 'number') return;
      const available = Math.max(100, Math.floor(
        window.innerHeight - top - reservedBottom,
      ));
      setHeight((previous) => (previous === available ? previous : available));
    }

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, dependency, reservedBottom]);

  const resetScroll = useCallback(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, []);

  return { ref, height, resetScroll };
}

export { useTableViewport };
