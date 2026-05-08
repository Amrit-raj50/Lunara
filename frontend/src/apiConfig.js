const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// Remove trailing slash if it exists to prevent double slashes in paths
export const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
export const API_V1_URL = `${API_BASE_URL}/api/v1`;
