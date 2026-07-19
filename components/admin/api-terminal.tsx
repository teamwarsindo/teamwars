"use client"

interface ApiTerminalProps {
  selectedRoute: string | null
  testResult: string
  isTesting: boolean
  isCopied: boolean
  onRun: () => void
  onCopy: () => void
}

export function ApiTerminal({ selectedRoute, testResult, isTesting, isCopied, onRun, onCopy }: ApiTerminalProps) {
  return (
    <div className="lg:col-span-2 rounded-xl border border-primary/20 bg-black/80 flex flex-col shadow-[inset_0_0_30px_-10px_rgba(0,0,0,1)] h-[40vh] lg:h-[60vh] overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-900 px-3 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 ml-2 truncate max-w-[120px] sm:max-w-xs">
            {selectedRoute ? selectedRoute : "Terminal Idle"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedRoute && (
            <button onClick={onRun} disabled={isTesting} className="flex items-center gap-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 px-2 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-50">
              {isTesting ? "⏳ Running..." : "▶ Run API"}
            </button>
          )}
          {testResult && !isTesting && (
            <button onClick={onCopy} className="flex items-center gap-1 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 px-2 py-1 rounded text-[10px] font-semibold transition-colors">
              {isCopied ? "✅ Copied" : "📋 Copy"}
            </button>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1">
        {isTesting ? (
          <div className="flex items-center gap-2 text-primary font-mono text-xs sm:text-sm"><span className="animate-pulse">_</span> Executing request...</div>
        ) : testResult ? (
          <pre className="text-[10px] sm:text-xs font-mono text-green-400 whitespace-pre-wrap break-all">{testResult}</pre>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-[10px] sm:text-sm text-center">
            <p>/* Pilih API, lalu klik Run API */</p>
          </div>
        )}
      </div>
    </div>
  )
}
