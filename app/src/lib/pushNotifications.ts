import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const PUSH_TOKEN_KEY = 'swingers_world_expo_push_token';

export async function saveRegisteredPushToken(token: string) {
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export async function unregisterCurrentPushToken() {
  const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await api.delete('/push-tokens', { data: { token } });
  } finally {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
  }
}
