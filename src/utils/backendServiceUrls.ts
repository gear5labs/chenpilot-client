/**
 * Resolve explicit environment-based backend URLs for API, Agent, and Socket services (#331).
 */
export interface BackendServiceUrls {
  apiUrl: string;
  agentUrl: string;
  socketUrl: string;
}

export function resolveBackendServiceUrls(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): BackendServiceUrls {
  const apiUrl = (
    env.NEXT_PUBLIC_API_URL ||
    env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:8000/api'
  ).replace(/\/+$/, '');
  const baseOrigin = apiUrl.replace(/\/api$/, '');
  const agentUrl = (env.NEXT_PUBLIC_AGENT_API_URL || `${apiUrl}/agent`).replace(/\/+$/, '');
  const socketUrl = (
    env.NEXT_PUBLIC_SOCKET_URL ||
    env.NEXT_PUBLIC_WS_URL ||
    baseOrigin
  ).replace(/\/+$/, '');
  return { apiUrl, agentUrl, socketUrl };
}
