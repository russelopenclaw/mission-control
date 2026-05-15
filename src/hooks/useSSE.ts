'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface MCEvent {
  id: number;
  channel: string;
  data: any;
  timestamp: string;
}

interface UseEventsReturn {
  events: MCEvent[];
  connected: boolean;
  reconnect: () => void;
}

/**
 * Dual-mode event listener:
 * 1. SSE for real-time push (primary)
 * 2. Polling /api/events as fallback (every 30s)
 */
export function useEvents(channel?: string): UseEventsReturn {
  const [events, setEvents] = useState<MCEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const url = channel 
        ? `/api/events?channel=${channel}&limit=50`
        : '/api/events?limit=50';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setConnected(true);
      }
    } catch {
      // Will retry on next poll
    }
  }, [channel]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const channelParam = channel || 'all';
    const es = new EventSource(`/api/websocket?channel=${channelParam}`);
    
    es.addEventListener('connect', () => {
      setConnected(true);
    });

    es.addEventListener('heartbeat', () => {
      setConnected(true);
    });

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setEvents(prev => [parsed, ...prev].slice(0, 50));
      } catch {
        // Ignore malformed
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect SSE after 10 seconds
      setTimeout(connect, 10000);
    };

    eventSourceRef.current = es;
  }, [channel]);

  useEffect(() => {
    // Initial load from persistent store
    loadEvents();
    
    // Try SSE for real-time
    connect();
    
    // Polling fallback every 30s
    pollIntervalRef.current = setInterval(loadEvents, 30000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [connect, loadEvents]);

  return { events, connected, reconnect: () => { loadEvents(); connect(); } };
}