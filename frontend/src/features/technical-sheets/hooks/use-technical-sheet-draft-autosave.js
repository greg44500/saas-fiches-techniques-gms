import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const TECHNICAL_SHEET_AUTOSAVE_STATUS = Object.freeze({
  SAVED: 'SAVED',
  PENDING: 'PENDING',
  SAVING: 'SAVING',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
});

const DEFAULT_AUTOSAVE_DELAY_MS = 700;

function useTechnicalSheetDraftAutosave({
  buildRequest,
  debounceMs = DEFAULT_AUTOSAVE_DELAY_MS,
  enabled = true,
  initialRevision = null,
  onError,
  onSaved,
  save,
}) {
  const [status, setStatus] = useState(
    TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED,
  );
  const [blockedReason, setBlockedReason] = useState(null);

  const activeRef = useRef(true);
  const buildRequestRef = useRef(buildRequest);
  const cycleRef = useRef(0);
  const enabledRef = useRef(enabled);
  const onErrorRef = useRef(onError);
  const onSavedRef = useRef(onSaved);
  const pendingRef = useRef(null);
  const revisionRef = useRef(initialRevision);
  const runSaveRef = useRef(null);
  const saveRef = useRef(save);
  const savingRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    buildRequestRef.current = buildRequest;
  }, [buildRequest]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    revisionRef.current = initialRevision;
  }, [initialRevision]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runSave = useCallback(async () => {
    clearTimer();

    if (
      !enabledRef.current
      || savingRef.current
      || !pendingRef.current
      || revisionRef.current === null
      || revisionRef.current === undefined
    ) {
      return;
    }

    const pending = pendingRef.current;
    const cycle = cycleRef.current;
    const built = buildRequestRef.current?.(
      pending.form,
      revisionRef.current,
    );

    if (!built?.request) {
      setBlockedReason(
        built?.reason
        ?? 'Le brouillon doit être complété avant son enregistrement.',
      );
      setStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.BLOCKED);
      return;
    }

    pendingRef.current = null;
    savingRef.current = true;
    setBlockedReason(null);
    setStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVING);

    let shouldContinue = false;

    try {
      const request = saveRef.current(built.request);
      const savedDraft = request?.unwrap
        ? await request.unwrap()
        : await request;

      if (!activeRef.current || cycle !== cycleRef.current) {
        return;
      }

      revisionRef.current = savedDraft.revision;

      const hasPendingChanges = Boolean(pendingRef.current);

      onSavedRef.current?.(savedDraft, {
        hasPendingChanges,
        snapshot: pending.form,
      });

      setStatus(
        hasPendingChanges
          ? TECHNICAL_SHEET_AUTOSAVE_STATUS.PENDING
          : TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED,
      );
      shouldContinue = hasPendingChanges;
    } catch (error) {
      if (!activeRef.current || cycle !== cycleRef.current) {
        return;
      }

      pendingRef.current = pendingRef.current ?? pending;
      setStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.ERROR);
      onErrorRef.current?.(error);
    } finally {
      savingRef.current = false;

      const cycleChanged = cycle !== cycleRef.current;
      if (
        activeRef.current
        && (shouldContinue || (cycleChanged && pendingRef.current))
      ) {
        setTimeout(() => runSaveRef.current?.(), 0);
      }
    }
  }, [clearTimer]);

  runSaveRef.current = runSave;

  const queue = useCallback((form, { immediate = false } = {}) => {
    pendingRef.current = { form };
    clearTimer();
    setBlockedReason(null);
    setStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.PENDING);

    if (!enabledRef.current) return;

    if (immediate) {
      Promise.resolve().then(() => runSaveRef.current?.());
      return;
    }

    timerRef.current = setTimeout(
      () => runSaveRef.current?.(),
      debounceMs,
    );
  }, [clearTimer, debounceMs]);

  const flush = useCallback(() => {
    clearTimer();
    return runSaveRef.current?.();
  }, [clearTimer]);

  const retry = useCallback(() => {
    if (!pendingRef.current) return;
    setBlockedReason(null);
    setStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.PENDING);
    return runSaveRef.current?.();
  }, []);

  const reset = useCallback((nextRevision = null) => {
    cycleRef.current += 1;
    clearTimer();
    pendingRef.current = null;
    revisionRef.current = nextRevision;
    setBlockedReason(null);
    setStatus(TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED);
  }, [clearTimer]);

  useEffect(() => {
    activeRef.current = true;

    return () => {
      activeRef.current = false;
      clearTimer();
      cycleRef.current += 1;
      pendingRef.current = null;
    };
  }, [clearTimer]);

  return {
    blockedReason,
    flush,
    hasUnsavedChanges:
      status !== TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVED,
    isSaving:
      status === TECHNICAL_SHEET_AUTOSAVE_STATUS.SAVING,
    queue,
    reset,
    retry,
    status,
  };
}

export {
  DEFAULT_AUTOSAVE_DELAY_MS,
  TECHNICAL_SHEET_AUTOSAVE_STATUS,
  useTechnicalSheetDraftAutosave,
};
