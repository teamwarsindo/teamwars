"use client";

export function MetadataBlock({
  referee,
  setReferee,
  streamer,
  setStreamer,
  streamLink,
  setStreamLink,
}: {
  referee: string;
  setReferee: (v: string) => void;
  streamer: string;
  setStreamer: (v: string) => void;
  streamLink: string;
  setStreamLink: (v: string) => void;
}) {
  const inputBase =
    "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <section className="glass glow-border rounded-2xl border p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <span className="h-6 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-foreground">1. Identitas Wasit & Streamer</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Wasit / Referee Bertugas
          </label>
          <input
            type="text"
            placeholder="Nama Wasit"
            value={referee}
            onChange={(e) => setReferee(e.target.value)}
            className={inputBase}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Streamer / Caster
          </label>
          <input
            type="text"
            placeholder="Nama Streamer"
            value={streamer}
            onChange={(e) => setStreamer(e.target.value)}
            className={inputBase}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
            Link TAYANGAN LIVE (YOUTUBE)
          </label>
          <input
            type="text"
            placeholder="https://youtube.com/live/..."
            value={streamLink}
            onChange={(e) => setStreamLink(e.target.value)}
            className={inputBase}
          />
        </div>
      </div>
    </section>
  );
}