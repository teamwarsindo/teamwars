'use client';

import { useEffect, useState } from 'react';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from '@livekit/components-react';

interface LiveStreamProps {
  roomName: string;
  username: string;
  isHost?: boolean;
}

export default function LiveStreamPlayer({ roomName, username, isHost = false }: LiveStreamProps) {
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/livekit/token?room=${roomName}&username=${username}&host=${isHost}`);
        const data = await res.json();
        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (e) {
        console.error("Gagal mengambil token LiveKit:", e);
      }
    })();
  }, [roomName, username, isHost]);

  if (!token || !wsUrl) {
    return <div className="p-8 text-center text-white">Memuat ruangan siaran...</div>;
  }

  return (
    <LiveKitRoom
      video={false} // Default kamera mati
      audio={isHost} // Audio hidup hanya jika Host
      token={token}
      serverUrl={wsUrl}
      data-lk-theme="default"
      style={{ height: '80vh' }}
    >
      {/* Komponen Otomatis Menampilkan Video / Screen Share */}
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
    }
