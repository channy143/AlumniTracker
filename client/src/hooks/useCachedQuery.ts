import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCached,
  setCached,
  isCacheFresh,
  subscribeCache,
  normalizeCacheEndpoint,
} from '@/utils/apiCache';

export interface UseCachedQueryOptions<T> {
  enabled?: boolean;
  staleTimeMs?: number;
  initialData?: T;
  onSuccess?: (data: T) => void;
}

export function useCachedQuery<T = any>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions<T> = {}
) {
  const { enabled = true, staleTimeMs, initialData, onSuccess } = options;
  const normKey = cacheKey ? normalizeCacheEndpoint(cacheKey) : null;

  const [data, setDataState] = useState<T | undefined>(() => {
    if (!normKey) return initialData;
    const hit = getCached<T>(normKey);
    return hit !== undefined ? hit : initialData;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!enabled || !normKey) return false;
    return getCached<T>(normKey) === undefined;
  });

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const activeKeyRef = useRef<string | null>(normKey);
  activeKeyRef.current = normKey;

  const setData = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      setDataState((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: T | undefined) => T)(prev)
            : updater;
        if (activeKeyRef.current && next !== undefined) {
          setCached(activeKeyRef.current, next);
        }
        return next;
      });
    },
    []
  );

  const runFetch = useCallback(
    async (isBackground = false) => {
      const targetKey = activeKeyRef.current;
      if (!targetKey || !enabled) return;

      if (isBackground) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetcherRef.current();
        if (activeKeyRef.current !== targetKey) return;
        setCached(targetKey, result);
        setDataState(result);
        onSuccessRef.current?.(result);
      } catch (err) {
        if (activeKeyRef.current !== targetKey) return;
        setError(err);
      } finally {
        if (activeKeyRef.current === targetKey) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled]
  );

  // Sync synchronously when cacheKey changes
  useEffect(() => {
    if (!normKey || !enabled) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const cached = getCached<T>(normKey);
    if (cached !== undefined) {
      setDataState(cached);
      setLoading(false);
      onSuccessRef.current?.(cached);

      // Revalidate in background if stale
      if (!isCacheFresh(normKey, staleTimeMs)) {
        runFetch(true);
      }
    } else {
      setDataState(initialData);
      runFetch(false);
    }
  }, [normKey, enabled, staleTimeMs, runFetch]);

  // Listen to external invalidations (from mutations in other components/modals)
  useEffect(() => {
    if (!normKey || !enabled) return;
    return subscribeCache(normKey, () => {
      const cached = getCached<T>(normKey);
      if (cached !== undefined) {
        setDataState(cached);
      } else {
        runFetch(true);
      }
    });
  }, [normKey, enabled, runFetch]);

  const refetch = useCallback(
    async (silent = false) => {
      await runFetch(silent);
    },
    [runFetch]
  );

  return {
    data: data as T,
    setData,
    loading,
    refreshing,
    error,
    refetch,
  };
}

