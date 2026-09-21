import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
  useAddressAutocomplete,
} from '@/features/dossiers/hooks/use-address-autocomplete';

describe('useAddressAutocomplete', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('attend trois caractères puis applique le debounce avant le provider', async () => {
    vi.useFakeTimers();
    const provider = vi.fn().mockResolvedValue([
      {
        id: '1',
        label: '1 rue Exemple',
        address: '1 rue Exemple',
        postalCode: '44000',
        city: 'Nantes',
      },
    ]);

    const { result, rerender } = renderHook(
      ({ query }) => useAddressAutocomplete(query, {
        searchProvider: provider,
      }),
      {
        initialProps: { query: 'Na' },
      },
    );

    expect(provider).not.toHaveBeenCalled();

    rerender({ query: 'Nan' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
      );
    });

    expect(provider).toHaveBeenCalledWith(
      'Nan',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result.current.suggestions).toHaveLength(1);
  });

  it('reste non bloquant lorsque le provider échoue', async () => {
    vi.useFakeTimers();
    const provider = vi.fn().mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useAddressAutocomplete(
      'Nantes',
      { searchProvider: provider },
    ));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        ADDRESS_AUTOCOMPLETE_DEBOUNCE_MS,
      );
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.suggestions).toEqual([]);
  });
});
