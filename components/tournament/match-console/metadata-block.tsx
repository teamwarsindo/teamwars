"use client";

export function MetadataBlock({
  referee,
  setReferee,
  streamer,
  setStreamer,
  streamLink,
  setStreamLink,
  onSave,
}: {
  referee: string;
  setReferee: (v: string) => void;
  streamer: string;
  setStreamer: (v: string) => void;
  streamLink: string;
  setStreamLink: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-sky-500/30 bg-[#001738] p-4 shadow-md space-y-3">
      <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
        <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">
          1. Admin & Streamer Metadata
        </h3>
        <button
          onClick={onSave}
          className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
        >
          💾 Save Metadata
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-[10px] text-sky-300 font-bold mb-1">
            REFEREE (WASIT)
          </label>
          <input
            type="text"
            value={referee}
            onChange={(e) => setReferee(e.target.value)}
            placeholder="Nama Wasit"
            className="w-full rounded-xl bg-[#000d21] border border-sky-500/40 p-2.5 text-white font-semibold focus:outline-none focus:border-sky-400"
          />
        </div>
        <div>
          <label className="block text-[10px] text-sky-300 font-bold mb-1">
            STREAMER
          </label>
          <input
            type="text"
            value={streamer}
            onChange={(e) => setStreamer(e.target.value)}
            placeholder="Nama Streamer"
            className="w-full rounded-xl bg-[#000d21] border border-sky-500/40 p-2.5 text-white font-semibold focus:outline-none focus:border-sky-400"
          />
        </div>
        <div>
          <label className="block text-[10px] text-sky-300 font-bold mb-1">
            STREAM LINK
          </label>
          <input
            type="text"
            value={streamLink}
            onChange={(e) => setStreamLink(e.target.value)}
            placeholder="https://youtube.com/..."
            className="w-full rounded-xl bg-[#000d21] border border-sky-500/40 p-2.5 text-white font-semibold focus:outline-none focus:border-sky-400"
          />
        </div>
      </div>
    </div>
  );
}
