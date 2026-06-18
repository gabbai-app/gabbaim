// Application configuration
window.CONFIG = {
  APP_TITLE: 'גבאים — מעלה עמוס',
  VERSION: '1.0.0',
  API_URL: 'https://script.google.com/macros/s/AKfycbywnCURd-UcTzwTQMhSNCeixib64kX8ACItjs97YdFWkID3cOuTGGJnORYpYWGE539l/exec',
  CACHE_PREFIX: 'gabbai_',
  CACHE_TTL_MS: 5 * 60 * 1000,            // 5 minutes for read cache
  CACHE_TTL_LONG_MS: 24 * 3600 * 1000,    // 24h for fallback when offline
  NETWORK_TIMEOUT_MS: 25000,
  RETRY_COUNT: 2,
  DEFAULT_PAGE: 'dashboard'
};
