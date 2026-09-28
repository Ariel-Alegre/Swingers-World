import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from './storage';

const localDefault = Platform.select({
  android: 'http://10.0.2.2:3001',
  ios: 'http://localhost:3001',
  default: 'http://localhost:3001',
});

export const serverUrl = (process.env.EXPO_PUBLIC_API_URL || localDefault).replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${serverUrl}/api`,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error. Intentá nuevamente.') {
  if (axios.isAxiosError(error)) {
    if (!error.response) return `No se pudo conectar con ${serverUrl}`;
    const data = error.response.data as { message?: string; error?: string } | string;
    if (typeof data === 'string') return data;
    return data?.message || data?.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
