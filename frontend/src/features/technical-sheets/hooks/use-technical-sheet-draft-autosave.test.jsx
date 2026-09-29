import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TECHNICAL_SHEET_AUTOSAVE_STATUS,
  useTechnicalSheetDraftAutosave,
} from '@/features/technical-sheets/hooks/use-technical-sheet-draft-autosave';

function createSaveMock(result) {
  const unwrap = vi.fn().mockResolvedValue(result);
  const save = vi.fn(() => ({ unwrap }));

  return { save };
}

function createDeferred() {
  let resolve;

  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe('useTechnicalSheetDraftAutosave', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('regroupe les frappes et enregistre après le délai', async () => {
    vi.useFakeTimers();

    const { save } = createSaveMock({ revision: 2 });
    const onSaved = vi.fn();

    const { result } = renderHook(() => (
      useTechnicalSheetDraftAutosave({
        buildRequest: (form, revision) => ({
          request: {
            expectedRevision: revision,
            value: form.value,
          },
        }),
        debounceMs: 700,
        initialRevision: 1,
        onSaved,
        save,
      })
    ));

    act(() => {
      result.current.queue({ value: 'A' });
      result.current.queue({ value: 'AB' });
    });

    expect(result.current.status)
      .toBe(TECHNICAL_SHEET_AUTOSAVE_STATUS.PENDING);
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      expectedRevision: 1,
      value: 'AB',
    });
    expect(onSaved).toHaveBeenCalledWith(
      { revision: 2 },
      expect.objectContaining({
        hasPendingChanges: false,
        snapshot: { value: 'AB' },
      }),
    );
    expect(result.current.status)
      .toBe(TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED);
  });

  it('sérialise les écritures et réutilise la nouvelle révision serveur', async () => {
    vi.useFakeTimers();

    const first = createDeferred();
    const second = createDeferred();
    const save = vi.fn()
      .mockImplementationOnce(() => ({ unwrap: () => first.promise }))
      .mockImplementationOnce(() => ({ unwrap: () => second.promise }));

    const { result } = renderHook(() => (
      useTechnicalSheetDraftAutosave({
        buildRequest: (form, revision) => ({
          request: {
            expectedRevision: revision,
            value: form.value,
          },
        }),
        debounceMs: 700,
        initialRevision: 1,
        save,
      })
    ));

    act(() => {
      result.current.queue({ value: 'A' }, { immediate: true });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenNthCalledWith(1, {
      expectedRevision: 1,
      value: 'A',
    });

    act(() => {
      result.current.queue({ value: 'AB' }, { immediate: true });
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve({ revision: 2 });
      await Promise.resolve();
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenNthCalledWith(2, {
      expectedRevision: 2,
      value: 'AB',
    });

    await act(async () => {
      second.resolve({ revision: 3 });
      await Promise.resolve();
    });

    expect(result.current.status)
      .toBe(TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED);
  });

  it('bloque sans requête lorsque le formulaire est incomplet', async () => {
    vi.useFakeTimers();

    const { save } = createSaveMock({ revision: 2 });

    const { result } = renderHook(() => (
      useTechnicalSheetDraftAutosave({
        buildRequest: () => ({
          request: null,
          reason: 'Champ obligatoire',
        }),
        debounceMs: 700,
        initialRevision: 1,
        save,
      })
    ));

    act(() => {
      result.current.queue({ value: '' });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(save).not.toHaveBeenCalled();
    expect(result.current.status)
      .toBe(TECHNICAL_SHEET_AUTOSAVE_STATUS.BLOCKED);
    expect(result.current.blockedReason).toBe('Champ obligatoire');
  });
});
