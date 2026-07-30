import { io, Socket } from 'socket.io-client';

export interface SocketConfig {
  url: string;
  options?: {
    transports?: ('polling' | 'websocket')[];
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionDelay?: number;
    reconnectionAttempts?: number;
    timeout?: number;
  };
}

interface PendingEvent {
  event: string;
  data?: any;
}

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private reconnectAttempts = 0;
  private pendingEvents: PendingEvent[] = [];

  constructor(config: SocketConfig) {
    // Fix #50: Merge options properly — config.options extends defaults,
    // not overwrites them. Extract url separately so ...config doesn't
    // re-apply raw config.options over the merged block.
    const { url, options = {} } = config;
    this.config = {
      url,
      options: {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        ...options,
      },
    };
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(this.config.url, this.config.options);

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Fix #52: Replay pending events after (re)connect
      if (this.pendingEvents.length > 0) {
        console.log(`Replaying ${this.pendingEvents.length} pending events`);
        const events = [...this.pendingEvents];
        this.pendingEvents = [];
        for (const { event, data } of events) {
          this.socket?.emit(event, data);
        }
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after', this.reconnectAttempts, 'attempts');
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Fix #52: Queue events when disconnected so they replay on reconnect
      console.warn('Socket not connected. Queueing event:', event);
      this.pendingEvents.push({ event, data });
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  once(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }
}

// Singleton instance
let socketManagerInstance: SocketManager | null = null;

export const getSocketManager = (config?: SocketConfig): SocketManager => {
  if (!socketManagerInstance && config) {
    socketManagerInstance = new SocketManager(config);
  }
  if (!socketManagerInstance) {
    throw new Error('SocketManager not initialized. Call getSocketManager with config first.');
  }
  return socketManagerInstance;
};

export const initializeSocketManager = (config: SocketConfig): SocketManager => {
  socketManagerInstance = new SocketManager(config);
  return socketManagerInstance;
};
