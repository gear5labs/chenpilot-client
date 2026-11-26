import { describe, it, expect } from 'vitest';
import chatReducer, {
  setMessages,
  addMessage,
  updateMessage,
  resolveOptimisticUpdate,
} from '../chatSlice';
import { ChatMessage } from '@/types';

describe('Message Ordering - Race Condition Prevention', () => {
  it('should sort messages by server timestamp on setMessages', () => {
    const state = chatReducer(undefined, { type: '' });

    const messagesOutOfOrder: ChatMessage[] = [
      {
        id: 'msg_3',
        type: 'agent',
        content: 'Third message',
        timestamp: '2024-01-01T12:00:03Z',
      },
      {
        id: 'msg_1',
        type: 'user',
        content: 'First message',
        timestamp: '2024-01-01T12:00:01Z',
      },
      {
        id: 'msg_2',
        type: 'user',
        content: 'Second message',
        timestamp: '2024-01-01T12:00:02Z',
      },
    ];

    const newState = chatReducer(state, setMessages(messagesOutOfOrder));

    expect(newState.messages).toHaveLength(3);
    expect(newState.messages[0].id).toBe('msg_1');
    expect(newState.messages[1].id).toBe('msg_2');
    expect(newState.messages[2].id).toBe('msg_3');
  });

  it('should maintain chronological order when adding messages', () => {
    let state = chatReducer(undefined, { type: '' });

    // Add messages in random order
    state = chatReducer(
      state,
      addMessage({
        id: 'msg_3',
        type: 'agent',
        content: 'Third',
        timestamp: '2024-01-01T12:00:03Z',
      }),
    );

    state = chatReducer(
      state,
      addMessage({
        id: 'msg_1',
        type: 'user',
        content: 'First',
        timestamp: '2024-01-01T12:00:01Z',
      }),
    );

    state = chatReducer(
      state,
      addMessage({
        id: 'msg_2',
        type: 'user',
        content: 'Second',
        timestamp: '2024-01-01T12:00:02Z',
      }),
    );

    // Should be sorted
    expect(state.messages[0].id).toBe('msg_1');
    expect(state.messages[1].id).toBe('msg_2');
    expect(state.messages[2].id).toBe('msg_3');
  });

  it('should re-sort messages when timestamp is updated', () => {
    let state = chatReducer(undefined, { type: '' });

    // Start with ordered messages
    const messages: ChatMessage[] = [
      {
        id: 'msg_1',
        type: 'user',
        content: 'First',
        timestamp: '2024-01-01T12:00:01Z',
      },
      {
        id: 'msg_2',
        type: 'agent',
        content: 'Second',
        timestamp: '2024-01-01T12:00:02Z',
      },
    ];

    state = chatReducer(state, setMessages(messages));

    // Update msg_2 with an earlier timestamp
    state = chatReducer(
      state,
      updateMessage({
        id: 'msg_2',
        updates: {
          timestamp: '2024-01-01T12:00:00Z',
        },
      }),
    );

    // Should be re-sorted
    expect(state.messages[0].id).toBe('msg_2');
    expect(state.messages[1].id).toBe('msg_1');
  });

  it('should handle optimistic updates correctly', () => {
    let state = chatReducer(undefined, { type: '' });

    // Add initial message
    state = chatReducer(
      state,
      addMessage({
        id: 'msg_1',
        type: 'user',
        content: 'First',
        timestamp: '2024-01-01T12:00:01Z',
      }),
    );

    // Resolve optimistic update with server timestamp
    state = chatReducer(
      state,
      resolveOptimisticUpdate({
        clientId: 'msg_optimistic',
        serverMessage: {
          id: 'msg_server_1',
          type: 'agent',
          content: 'Server response',
          timestamp: '2024-01-01T12:00:02Z',
        },
      }),
    );

    // Old optimistic message should be gone, server message should be properly sorted
    expect(state.messages).not.toContainEqual(
      expect.objectContaining({ id: 'msg_optimistic' }),
    );
    expect(state.messages).toContainEqual(
      expect.objectContaining({ id: 'msg_server_1' }),
    );
    expect(state.messages[0].id).toBe('msg_1');
    expect(state.messages[1].id).toBe('msg_server_1');
  });

  it('should handle rapid consecutive sends', () => {
    let state = chatReducer(undefined, { type: '' });

    // Simulate 5 rapid consecutive sends with auto-incrementing timestamps
    for (let i = 1; i <= 5; i++) {
      state = chatReducer(
        state,
        addMessage({
          id: `msg_user_${i}`,
          type: i % 2 === 0 ? 'user' : 'agent',
          content: `Message ${i}`,
          timestamp: `2024-01-01T12:00:${String(i).padStart(2, '0')}Z`,
        }),
      );
    }

    // All messages should be in chronological order
    for (let i = 0; i < 5; i++) {
      expect(state.messages[i].id).toBe(`msg_user_${i + 1}`);
    }
  });

  it('should resolve out-of-order network responses', () => {
    let state = chatReducer(undefined, { type: '' });

    // Add messages as they might arrive out of order
    const timestamp1 = '2024-01-01T12:00:01Z';
    const timestamp3 = '2024-01-01T12:00:03Z';
    const timestamp2 = '2024-01-01T12:00:02Z';

    // Message 3 arrives first
    state = chatReducer(
      state,
      addMessage({
        id: 'msg_3',
        type: 'agent',
        content: 'Response 3',
        timestamp: timestamp3,
      }),
    );

    // Message 1 arrives second
    state = chatReducer(
      state,
      addMessage({
        id: 'msg_1',
        type: 'user',
        content: 'Question 1',
        timestamp: timestamp1,
      }),
    );

    // Message 2 arrives last
    state = chatReducer(
      state,
      addMessage({
        id: 'msg_2',
        type: 'agent',
        content: 'Response 2',
        timestamp: timestamp2,
      }),
    );

    // All should be sorted correctly by timestamp
    expect(state.messages[0].timestamp).toBe(timestamp1);
    expect(state.messages[1].timestamp).toBe(timestamp2);
    expect(state.messages[2].timestamp).toBe(timestamp3);
  });
});
