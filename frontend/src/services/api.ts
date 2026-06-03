import axios from 'axios';

// URL do seu backend Python
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

export const MixerService = {
  start: (recipeId: string) => api.post('/mixer/start', { recipeId }),
  stop: () => api.post('/mixer/stop'),
  getStatus: () => api.get('/mixer/status'),
};