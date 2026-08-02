import LiveStreamPlayer from '@/app/live/components/live-stream-player';

export default function HostPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-emerald-400">🎛️ Studio Host (Admin)</h1>
      <LiveStreamPlayer 
        roomName="twi-main-stage" 
        username="Admin_Panitia" 
        isHost={true} 
      />
    </div>
  );
}
