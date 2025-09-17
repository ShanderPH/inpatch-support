// API Configuration with security best practices
export interface APIConfig {
  trello: {
    apiKey: string | null;
    apiToken: string | null;
    boardId: string;
    baseUrl: string;
  };
  supabase: {
    url: string | null;
    anonKey: string | null;
  };
}

// Validate environment variables
function validateEnvVar(
  name: string,
  value: string | undefined
): string | null {
  if (!value || value.trim() === '') {
    // Environment variable not set - handle silently in production
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Environment variable ${name} is not set or empty`);
    }

    return null;
  }

  return value.trim();
}

// Get API configuration with validation
export function getAPIConfig(): APIConfig {
  return {
    trello: {
      apiKey: validateEnvVar(
        'NEXT_PUBLIC_TRELLO_API_KEY',
        process.env.NEXT_PUBLIC_TRELLO_API_KEY
      ),
      apiToken: validateEnvVar(
        'NEXT_PUBLIC_TRELLO_API_TOKEN',
        process.env.NEXT_PUBLIC_TRELLO_API_TOKEN
      ),
      boardId:
        process.env.NEXT_PUBLIC_TRELLO_BOARD_ID || '6807e4880c33aea54daabd5c',
      baseUrl: 'https://api.trello.com/1',
    },
    supabase: {
      url: validateEnvVar(
        'NEXT_PUBLIC_SUPABASE_URL',
        process.env.NEXT_PUBLIC_SUPABASE_URL
      ),
      anonKey: validateEnvVar(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    },
  };
}

// Check if Trello is properly configured
export function isTrelloConfigured(): boolean {
  const config = getAPIConfig();

  return !!(config.trello.apiKey && config.trello.apiToken);
}

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const config = getAPIConfig();

  return !!(config.supabase.url && config.supabase.anonKey);
}

// Rate limiting configuration
export const RATE_LIMITS = {
  trello: {
    requestsPerSecond: 10,
    requestsPerMinute: 300,
    burstLimit: 50,
  },
  supabase: {
    requestsPerSecond: 50,
    requestsPerMinute: 1000,
    burstLimit: 100,
  },
} as const;

// API endpoints
export const API_ENDPOINTS = {
  trello: {
    boards: (boardId: string) => `/boards/${boardId}`,
    cards: (boardId: string) => `/boards/${boardId}/cards`,
    lists: (boardId: string) => `/boards/${boardId}/lists`,
    actions: (boardId: string) => `/boards/${boardId}/actions`,
    webhooks: '/webhooks',
  },
} as const;
