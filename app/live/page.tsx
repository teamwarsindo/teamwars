import LiveStreamPlayer from './components/-live-stream-player';

export default function ViewerPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4">🔴 Live Stream TWI 2026</h1>
      <LiveStreamPlayer 
        roomName="twi-main-stage" 
        username={`Penonton_${Math.floor(Math.random() * 100)}`} 
        isHost={false} 
      />
    </div>
  );
}
