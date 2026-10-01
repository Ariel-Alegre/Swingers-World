import { io, type Socket } from 'socket.io-client';
import { serverUrl } from './api';
import { getToken } from './storage';

let socket: Socket | null = null;

export async function getSocket() {
  const token = await getToken();
  if (!token) throw new Error('Authentication token is unavailable.');

  if (!socket) {
    socket = io(serverUrl, {
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
