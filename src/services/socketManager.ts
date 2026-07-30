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
  queueEnabled?: boolean;
  maxQueueSize?: number;
}

type SocketHandler = (...args: any[]) => void;

interface RegisteredHandler {
  socket: Socket;
  event: string;
  callback: SocketHandler;
}

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private reconnectAttempts = 0;
  private eventQueue: Array<{ event: string; data?: any }> = [];
  private queueEnabled: boolean;
  private maxQueueSize: number;
  private registeredHandlers: RegisteredHandler[] = [];

  constructor(config: SocketConfig) {
    const defaults = {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    };

    this.config = {
      ...config,
      options: {
        ...defaults,
        ...(config.options || {}),
      },
    };
    this.queueEnabled = this.config.queueEnabled ?? false;
    this.maxQueueSize = this.config.maxQueueSize ?? 100;
  }

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.removeRegisteredHandlers(this.socket);
      this.socket.disconnect();
    }

    this.socket = io(this.config.url, this.config.options);

    this.registerHandler('connect', (...args: any[]) => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    this.registerHandler('disconnect', (reason: any) => {
      console.log('Socket disconnected:', reason);
    });

    this.registerHandler('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    this.registerHandler('reconnect', (attemptNumber: any) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
      this.flushQueue();
    });

    this.registerHandler('reconnect_error', (error: any) => {
      console.error('Socket reconnection error:', error);
    });

    this.registerHandler('reconnect_failed', () => {
      console.error('Socket reconnection failed after', this.reconnectAttempts, 'attempts');
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      const socket = this.socket;
      this.removeRegisteredHandlers(socket);
      socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  emit(event: string, data?: unknown): boolean {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return true;
    }

    if (this.queueEnabled) {
      if (this.eventQueue.length < this.maxQueueSize) {
        this.eventQueue.push({ event, data });
      } else {
        console.warn('Event queue is full. Dropping event:', event);
      }
      console.warn('Socket not connected. Event queued:', event);
      return false;
    }

    console.warn('Socket not connected. Cannot emit event:', event);
    return false;
  }

  private flushQueue(): void {
    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift()!;
      if (this.socket?.connected) {
        this.socket.emit(event, data);
      } else {
        this.eventQueue.unshift({ event, data });
        break;
      }
    }
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
      this.registeredHandlers.push({
        socket: this.socket,
        event,
        callback: callback as SocketHandler,
      });
    }
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
      this.registeredHandlers = this.registeredHandlers.filter(
        (handler) =>
          handler.socket !== this.socket ||
          handler.event !== event ||
          (callback !== undefined && handler.callback !== callback),
      );
    }
  }

  once(event: string, callback: (...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback);
      this.registeredHandlers.push({
        socket: this.socket,
        event,
        callback: callback as SocketHandler,
      });
    }
  }

  private registerHandler(event: string, callback: SocketHandler): void {
    if (this.socket) {
      this.socket.on(event, callback);
      this.registeredHandlers.push({
        socket: this.socket,
        event,
        callback,
      });
    }
  }

  private removeRegisteredHandlers(socket: Socket): void {
    const handlers = this.registeredHandlers.filter((handler) => handler.socket === socket);

    for (const handler of handlers) {
      socket.off(handler.event, handler.callback);
    }

    this.registeredHandlers = this.registeredHandlers.filter(
      (handler) => handler.socket !== socket,
    );
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
  socketManagerInstance?.disconnect();
  socketManagerInstance = new SocketManager(config);
  return socketManagerInstance;
};
