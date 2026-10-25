import { describe, expect, it } from 'vitest';
import { resolveBackendServiceUrls } from './backendServiceUrls';

describe('resolveBackendServiceUrls (#331)', () => {
  it('derives agent and socket URLs from NEXT_PUBLIC_API_URL when overrides are absent', () => {
    expect(
      resolveBackendServiceUrls({
        NEXT_PUBLIC_API_URL: 'https://api.chenpilot.xyz/api/',
      })
    ).toEqual({
      apiUrl: 'https://api.chenpilot.xyz/api',
      agentUrl: 'https://api.chenpilot.xyz/api/agent',
      socketUrl: 'https://api.chenpilot.xyz',
    });
  });

  it('honors explicit agent and socket overrides without trailing slashes', () => {
    expect(
      resolveBackendServiceUrls({
        NEXT_PUBLIC_API_URL: 'https://api.chenpilot.xyz/api',
        NEXT_PUBLIC_AGENT_API_URL: 'https://agent.chenpilot.xyz/',
        NEXT_PUBLIC_SOCKET_URL: 'wss://ws.chenpilot.xyz/',
      })
    ).toEqual({
      apiUrl: 'https://api.chenpilot.xyz/api',
      agentUrl: 'https://agent.chenpilot.xyz',
      socketUrl: 'wss://ws.chenpilot.xyz',
    });
  });
});
