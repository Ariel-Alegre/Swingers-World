import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { disconnectSocket, getSocket } from '../lib/socket';

export function RealtimeConnection() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return undefined;
    }

    void getSocket().catch(() => undefined);
    return () => disconnectSocket();
  }, [user?.id]);

  return null;
}
