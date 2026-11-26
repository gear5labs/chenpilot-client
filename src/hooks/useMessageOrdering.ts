import { useMemo } from 'react';
import { ChatMessage } from '@/types';

/**
 * Hook to handle message ordering and ensure chronological display
 * Handles race conditions from rapid sends and network delays
 */
export function useMessageOrdering(messages: ChatMessage[]) {
  const sortedMessages = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return [];
    }

    // Sort by server timestamp to handle race conditions
    return [...messages].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      
      if (aTime === bTime) {
        // If timestamps are identical, maintain insertion order by ID
        return a.id.localeCompare(b.id);
      }
      
      return aTime - bTime;
    });
  }, [messages]);

  return sortedMessages;
}

/**
 * Detects if messages are out of order (for debugging)
 */
export function useDetectMessageOrderingIssues(messages: ChatMessage[]) {
  return useMemo(() => {
    for (let i = 1; i < messages.length; i++) {
      const prevTime = new Date(messages[i - 1].timestamp).getTime();
      const currTime = new Date(messages[i].timestamp).getTime();
      
      if (currTime < prevTime) {
        console.warn(
          `Message ordering issue detected: ${messages[i].id} (${messages[i].timestamp}) appears before ${messages[i - 1].id} (${messages[i - 1].timestamp})`,
        );
        return true;
      }
    }
    return false;
  }, [messages]);
}
