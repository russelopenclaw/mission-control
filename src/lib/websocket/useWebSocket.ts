import { useEffect, useState, useCallback, useRef } from 'react';

interface WebSocketMessage {
  channel: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  channels?: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket(
  options: UseWebSocketOptions = {}
): {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  error: string | null;
  sendMessage: (channel: string, data: any) => Promise<void>;
  subscribeTo: (channel: string, callback: (data: any) => void) => () => void;
} {
  const {
    channels = ['all'],
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    reconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
  } = options;

  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageCallbacksRef = useRef<Map<string, (data: any) => void>>(new Map());

  // Helper to construct WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = window.location.host;
    const channelParam = `channel=${channels.join(',')}`;
    return `${protocol}//${baseUrl}/api/websocket?${channelParam}`;
  }, [channels]);

  // Create WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
        console.log('[WebSocket] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);

          // Call channel-specific callbacks
          if (messageCallbacksRef.current.has(data.channel)) {
            messageCallbacksRef.current.get(data.channel)?.(data.data);
          }

          // Also call 'all' callback if channel-specific exists
          if (data.channel !== 'all' && messageCallbacksRef.current.has('all')) {
            messageCallbacksRef.current.get('all')?.(data.data);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', event.data);
        }
      };

      ws.onclose = (event) => {
        setConnected(false);
        console.log(`[WebSocket] Disconnected (code: ${event.code})`);

        if (reconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setTimeout(() => {
            console.log(`[WebSocket] Reconnecting (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            connect();
          }, reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1)); // Exponential backoff
        } else {
          onDisconnect?.();
        }
      };

      ws.onerror = (event) => {
        setError('WebSocket connection error');
        onError?.(event);
        console.error('[WebSocket] Connection error:', event);
      };

      wsRef.current = ws;
    } catch (err) {
      setError('Failed to create WebSocket');
      console.error('[WebSocket] Creation error:', err);
    }
  }, [getWsUrl, onConnect, onDisconnect, onError, onMessage, reconnect, maxReconnectAttempts, reconnectDelay]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Send message to WebSocket server
  const sendMessage = useCallback(async (channel: string, data: any): Promise<void> => {
    if (!connected) {
      throw new Error('WebSocket not connected');
    }

    const message = JSON.stringify({ channel, data, timestamp: new Date().toISOString() });
    wsRef.current?.send(message);
  }, [connected]);

  // Subscribe to channel messages
  const subscribeTo = useCallback((channel: string, callback: (data: any) => void): () => void => {
    messageCallbacksRef.current.set(channel, callback);
    
    // If already connected, also subscribe via POST
    if (connected) {
      // Note: Server-side subscription happens when client connects
      // This is for client-side callback registration only
    }

    return () => {
      messageCallbacksRef.current.delete(channel);
    };
  }, [connected]);

  return {
    connected,
    lastMessage,
    error,
    sendMessage,
    subscribeTo,
  };
}

/**
 * Hook for easy agent status subscription
 */
export function useAgentStatus() {
  const [agentStatus, setAgentStatus] = useState<Record<string, any>>({});

  const { connected, lastMessage, error } = useWebSocket({
    channels: ['agents'],
    onMessage: (message) => {
      if (message.channel === 'agents') {
        setAgentStatus((prev) => ({
          ...prev,
          [message.data.agent]: message.data,
        }));
      }
    },
  });

  return { agentStatus, connected, lastMessage, error };
}

/**
 * Hook for easy task updates subscription
 */
export function useTaskUpdates() {
  const [taskUpdates, setTaskUpdates] = useState<Record<string, any>>({});

  const { connected, lastMessage, error } = useWebSocket({
    channels: ['tasks'],
    onMessage: (message) => {
      if (message.channel === 'tasks') {
        setTaskUpdates((prev) => ({
          ...prev,
          [message.data.taskId]: message.data,
        }));
      }
    },
  });

  return { taskUpdates, connected, lastMessage, error };
}

/**
 * Hook for auto-refreshing agent status with fallback polling
 */
export function useAutoRefreshAgentStatus() {
  const { connected, lastMessage, sendMessage, subscribeTo } = useWebSocket({
    channels: ['agents'],
    reconnect: true,
    maxReconnectAttempts: 3,
  });

  // Fallback polling if WebSocket is not available
  const [agents, setAgents] = useState<Record<string, any>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (connected && lastMessage && lastMessage.channel === 'agents') {
      setAgents((prev) => ({
        ...prev,
        [lastMessage.data.agent]: lastMessage.data,
      }));
      setLastUpdate(new Date());
    }
  }, [connected, lastMessage]);

  // Poll every 30 seconds if WebSocket not connected
  useEffect(() => {
    if (!connected) {
      const fetchAgents = async () => {
        try {
          const res = await fetch('/api/status');
          const data = await res.json();
          setAgents(data.agents || {});
          setLastUpdate(new Date());
        } catch (error) {
          console.error('Failed to fetch agents via polling:', error);
        }
      };

      fetchAgents();
      const interval = setInterval(fetchAgents, 30000);
      return () => clearInterval(interval);
    }
  }, [connected]);

  // Subscribe to updates via SSE
  useEffect(() => {
    if (connected) {
      subscribeTo('agents', (data: any) => {
        setAgents((prev) => ({
          ...prev,
          [data.agent]: data,
        }));
        setLastUpdate(new Date());
      });
    }
  }, [connected, subscribeTo]);

  return {
    agents,
    connected,
    lastUpdate,
    sendMessage,
  };
}
