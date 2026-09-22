import { useEffect, useRef, useState } from 'react';

import {
  searchGeoplateformeAddresses,
} from '@/features/dossiers/services/geoplateforme-address-provider';

const ADDRESS_AUTOCOMPLETE_MIN_LENGTH = 3;
const ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS = 300;

function useAddressAutocomplete(
  query,
  {
    enabled = true,
    searchProvider = searchGeoplateformeAddresses,
  } = {},
) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const dismissedQueryRef = useRef(null);

  useEffect(() => {
    const normalizedQuery = query?.trim?.() ?? '';

    setIsError(false);

    if (
      !enabled
      || normalizedQuery.length < ADDRESS_AUTOCOMPLETE_MIN_LENGTH
      || dismissedQueryRef.current === normalizedQuery
    ) {
      setSuggestions([]);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setSuggestions([]);

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const nextSuggestions = await searchProvider(normalizedQuery, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setSuggestions(nextSuggestions);
          setIsError(false);
        }
      } catch (error) {
        if (!controller.signal.aborted && error?.name !== 'AbortError') {
          setSuggestions([]);
          setIsError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [enabled, query, searchProvider]);

  function dismiss(selectedQuery = query?.trim?.() ?? '') {
    dismissedQueryRef.current = selectedQuery;
    setSuggestions([]);
    setIsError(false);
    setIsLoading(false);
  }

  return {
    dismiss,
    isError,
    isLoading,
    suggestions,
  };
}

export {
  ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
  ADDRESS_AUTOCOMPLETE_MIN_LENGTH,
  useAddressAutocomplete,
};
