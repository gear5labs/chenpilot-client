import { SocketManager, getSocketManager, initializeSocketManager } from '../src/services/socketManager';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    id: 'mock-socket-id',
  };

  return {
    io: jest.fn(() => mockSocket),
    Socket: jest.fn(),
  };
});

describe('SocketManager', () => {
  let manager: SocketManager;

  beforeEach(() => {
    // Reset singleton between tests
    jest.resetModules();
  });

  describe('constructor defaults (Fix #50)', () => {
    it('should use default options when no config.options provided', () => {
      manager = new SocketManager({ url: 'http://localhost:3000' });

      const socket = manager.connect();
      const { io } = require('socket.io-client');

      expect(io).toHaveBeenCalledWith('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });
    });

    it('should extend defaults with provided options, not overwrite them', () => {
      manager = new SocketManager({
        url: 'http://localhost:3000',
        options: {
          transports: ['websocket'],
          timeout: 10000,
        },
      });

      const socket = manager.connect();
      const { io } = require('socket.io-client');

      expect(io).toHaveBeenCalledWith('http://localhost:3000', {
        transports: ['websocket'],        // overridden
        autoConnect: true,                  // from defaults
        reconnection: true,                 // from defaults
        reconnectionDelay: 1000,            // from defaults
        reconnectionAttempts: 5,            // from defaults
        timeout: 10000,                     // overridden
      });
    });

    it('should keep url separate from options after merge', () => {
      manager = new SocketManager({
        url: 'ws://example.com',
        options: { autoConnect: false },
      });

      const socket = manager.connect();
      const { io } = require('socket.io-client');

      expect(io).toHaveBeenCalledWith('ws://example.com', expect.objectContaining({
        autoConnect: false,
        reconnection: true,
      }));
    });
  });

  describe('emit queue (Fix #52)', () => {
    it('should queue events when disconnected and replay on connect', () => {
      manager = new SocketManager({ url: 'http://localhost:3000' });

      // Emit while disconnected
      manager.emit('test-event', { foo: 'bar' });
      manager.emit('another-event', 42);

      // Now connect
      const socket = manager.connect();

      // Trigger the connect callback handler
      const { io } = require('socket.io-client');
      const mockSocket = io.mock.results[0]?.value || io();

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      // Events should have been replayed
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { foo: 'bar' });
      expect(mockSocket.emit).toHaveBeenCalledWith('another-event', 42);
    });

    it('should emit directly when connected', () => {
      manager = new SocketManager({ url: 'http://localhost:3000' });
      const socket = manager.connect();

      const { io } = require('socket.io-client');
      const mockSocket = io.mock.results[0]?.value || io();
      mockSocket.connected = true;

      manager.emit('direct-event', 'data');
      expect(mockSocket.emit).toHaveBeenCalledWith('direct-event', 'data');
    });
  });

  describe('getSocketManager singleton', () => {
    it('should throw if not initialized', () => {
      // Need a fresh module state
      jest.isolateModules(() => {
        const { getSocketManager: gsm } = require('../src/services/socketManager');
        expect(() => gsm()).toThrow('SocketManager not initialized');
      });
    });

    it('should return the same instance', () => {
      const { getSocketManager: gsm, initializeSocketManager: ism } =
        require('../src/services/socketManager');

      ism({ url: 'http://localhost:3000' });
      const instance1 = gsm();
      const instance2 = gsm();
      expect(instance1).toBe(instance2);
    });
  });
});
