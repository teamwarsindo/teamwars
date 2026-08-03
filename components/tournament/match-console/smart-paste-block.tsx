"use client";

export function SmartPasteBlock({
  rawText,
  setRawText,
  onParse,
}: {
  rawText: string;
  setRawText: (v: string) => void;
  onParse: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-950/10 p-4 shadow-md space-y-3">
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
        <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider">
          ⚡ Smart Paste Discord Log Parser
        </h3>
        <span className="text-[10px] text-amber-300/80">
          Copy & Paste teks rekap dari channel Discord
        </span>
      </div>
      <textarea
        rows={4}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={`Paste rekap Discord di sini... Contoh:
Line Up All Star Camp
1. L Ikan
2. Kyln
...
All Star vs UX Dino
Kyln D-Hero 1 - 0 Red-Eyes Laplace`}
        className="w-full rounded-xl bg-[#000d21] border border-amber-500/40 p-3 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
      />
      <div className="flex justify-end">
        <button
          onClick={onParse}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-black text-black transition cursor-pointer shadow-md"
        >
          ⚡ Parse & Auto-Fill Form
        </button>
      </div>
    </div>
  );
}
