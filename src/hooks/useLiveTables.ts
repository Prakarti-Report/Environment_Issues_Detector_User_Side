import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type LiveStatus = 'connecting' | 'live' | 'polling';

export const useLiveTables = (
  refetch: () => void,
  tables: string[],
  debounceMs = 500
): LiveStatus => {
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tablesKey = tables.join(',');

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const tableList = tablesKey.split(',').filter(Boolean);

    const triggerDebouncedRefetch = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        refetchRef.current();
      }, debounceMs);
    };

    const startPolling = () => {
      if (!pollingTimerRef.current) {
        pollingTimerRef.current = setInterval(() => {
          refetchRef.current();
        }, 30000);
      }
    };

    const stopPolling = () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };

    const channelName = `live-${Math.random().toString(36).substring(2, 9)}`;
    let channel = supabase.channel(channelName);

    tableList.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          triggerDebouncedRefetch();
        }
      );
    });

    channel.subscribe((subStatus) => {
      if (subStatus === 'SUBSCRIBED') {
        setStatus('live');
        stopPolling();
      } else if (
        subStatus === 'CHANNEL_ERROR' ||
        subStatus === 'TIMED_OUT' ||
        subStatus === 'CLOSED'
      ) {
        setStatus('polling');
        startPolling();
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetchRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [tablesKey, debounceMs]);

  return status;
};
