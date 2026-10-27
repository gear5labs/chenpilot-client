// Environment configuration for ChenPilot client

export const env = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:2333',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',

  // Application Configuration
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'ChenPilot',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK || '',

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

// Validate required environment variables
export const validateEnv = () => {
  const required = [
    'NEXT_PUBLIC_API_BASE_URL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const missingKeys = missing.join(', ');
    throw new Error(
      `[Env Config Error] Missing required environment variable(s): ${missingKeys}.\n` +
      `Please create or update your '.env.local' file in the project root with valid settings (e.g. NEXT_PUBLIC_API_BASE_URL=http://localhost:2333).\n` +
      `For help troubleshooting environment configuration, see docs/TROUBLESHOOTING.md.`
    );
  }
};

// Initialize environment validation
if (typeof window === 'undefined') {
  validateEnv();
}

/**
 * Returns the Horizon proxy base URL.
 *
 * `window.location.origin` is only available in the browser, so it cannot be
 * read at module-initialisation time (the `env` object is frozen once the
 * module is imported). This function defers the read to the call site so it
 * always reflects the real origin in the browser and safely falls back to the
 * relative path `/horizon` during server-side rendering or in restricted
 * environments (e.g. WebViews that expose no `window`).
 *
 * @returns Absolute Horizon proxy URL in the browser; relative path on the server.
 */
export function getHorizonProxyUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/horizon`;
  }
  return '/horizon';
}
