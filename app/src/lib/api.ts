import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from './storage';

const localDefault = Platform.select({
  android: process.env.EXPO_PUBLIC_API_URL,
  ios: process.env.EXPO_PUBLIC_API_URL,
  default: process.env.EXPO_PUBLIC_API_URL,
});

export const serverUrl = (process.env.EXPO_PUBLIC_API_URL || localDefault).replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${serverUrl}/api`,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

export type ApiErrorTranslationKey =
  | 'error.network'
  | 'error.timeout'
  | 'error.invalidCredentials'
  | 'error.emailRegistered'
  | 'error.validation'
  | 'error.unauthorized'
  | 'error.forbidden'
  | 'error.notFound'
  | 'error.conflict'
  | 'error.tooLarge'
  | 'error.rateLimited'
  | 'error.storageUnavailable'
  | 'error.profileIncomplete'
  | 'error.server';

type ErrorTranslator = (key: ApiErrorTranslationKey) => string;

const codeTranslationKeys: Record<string, ApiErrorTranslationKey> = {
  INVALID_CREDENTIALS: 'error.invalidCredentials',
  EMAIL_ALREADY_REGISTERED: 'error.emailRegistered',
  VALIDATION_ERROR: 'error.validation',
  INVALID_PROFILE_TYPE: 'error.validation',
  PROFILE_DETAILS_REQUIRED: 'error.validation',
  TERMS_REQUIRED: 'error.validation',
  UNAUTHORIZED: 'error.unauthorized',
  FORBIDDEN: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  ROUTE_NOT_FOUND: 'error.notFound',
  CONFLICT: 'error.conflict',
  PAYLOAD_TOO_LARGE: 'error.tooLarge',
  FILE_TOO_LARGE: 'error.tooLarge',
  RATE_LIMITED: 'error.rateLimited',
  STORAGE_NOT_CONFIGURED: 'error.storageUnavailable',
  PROFILE_INCOMPLETE: 'error.profileIncomplete',
  PROFILE_INCOMPLETE_FIELDS: 'error.validation',
  INTERNAL_ERROR: 'error.server',
};

const statusTranslationKeys: Record<number, ApiErrorTranslationKey> = {
  400: 'error.validation',
  401: 'error.unauthorized',
  403: 'error.forbidden',
  404: 'error.notFound',
  409: 'error.conflict',
  413: 'error.tooLarge',
  429: 'error.rateLimited',
  500: 'error.server',
  502: 'error.server',
  503: 'error.server',
  504: 'error.server',
};

export function getApiErrorCode(error: unknown) {
  if (!axios.isAxiosError(error)) return null;
  const payload = error.response?.data;
  return payload && typeof payload === 'object' && typeof payload.code === 'string' ? payload.code : null;
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.', translate?: ErrorTranslator) {
  if (!axios.isAxiosError(error)) return fallback;

  if (error.code === 'ECONNABORTED') return translate?.('error.timeout') || fallback;
  if (!error.response) return translate?.('error.network') || fallback;

  const payload = error.response.data;
  const code = getApiErrorCode(error) || '';
  const translationKey = codeTranslationKeys[code] || statusTranslationKeys[error.response.status];
  if (translationKey && translate) return translate(translationKey);

  if (error.response.status < 500 && payload && typeof payload === 'object' && typeof payload.message === 'string') {
    return payload.message;
  }
  return fallback;
}
