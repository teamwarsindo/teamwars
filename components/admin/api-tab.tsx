"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function ApiTab() {
  const [routes, setRoutes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  
  // State untuk hasil test API & Fitur Copy
  const [testResult, setTestResult] = useState<string>("")
  const [isTesting, setIsTesting] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    const scanApis = async () => {
      try {
        const res = await fetch("/api/admin/scan-endpoints")
        const data = await res.json()
        if (data.success) {
          setRoutes(data.routes)
        }
      } catch (error) {
        console.error("Gagal scan API", error)
      } finally {
        setIsLoading(false)
      }
    }
    scanApis()
  }, [])

  // Fungsi untuk sekadar memilih API (tanpa menjalankan)
  const handleSelectRoute = (route: string) => {
    setSelectedRoute(route)
    setTestResult("") // Bersihkan layar terminal saat pindah API
    setIsCopied(false)
  }

  // Fungsi untuk mengeksekusi API (dipanggil dari tombol Run di terminal)
  const handleTestApi = async () => {
    if (!selectedRoute) return
    
    // Konfirmasi native browser sebagai pengamanan ganda (opsional, tapi bagus untuk admin)
    if (!window.confirm(`Yakin ingin mengeksekusi request ke:\n${selectedRoute} ?`)) {
      return
    }

    setIsTesting(true)
    setTestResult("Mengeksekusi request...")
    setIsCopied(false)
    
    try {
      const res = await fetch(selectedRoute)
      const contentType = res.headers.get("content-type")
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
        setTestResult(JSON.stringify(data, null, 2))
      } else {
        data = await res.text()
        setTestResult(data)
      }
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  // Fungsi untuk menyalin isi terminal
  const handleCopy = () => {
    if (!testResult) return
    navigator.clipboard.writeText(testResult)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000) // Reset teks tombol setelah 2 detik
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Panel */}
      <div className="rounded-xl border border-primary/20 bg-background/50 p-4 sm:p-6 backdrop-blur-md flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            📡 API Scanner
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            Deteksi otomatis endpoint API.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl sm:text-2xl font-bold">{routes.length}</span>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Endpoints</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        
        {/* Kolom Kiri: Daftar API (Max height & Scrollable) */}
        <div className="lg:col-span-1 flex flex-col gap-2 rounded-xl border border-border/50 bg-background/30 p-3 sm:p-4 max-h-[35vh] lg:max-h-[60vh] overflow-y-auto custom-scrollbar">
          <h4 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Available Routes</h4>
          
          {isLoading ? (
            <div className="text-xs text-primary animate-pulse">Scanning...</div>
          ) : routes.length > 0 ? (
            routes.map((route, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectRoute(route)}
                className={cn(
                  "text-left flex items-center justify-between p-2.5 sm:p-3 rounded-lg border transition-all text-[11px] sm:text-sm shrink-0",
                  selectedRoute === route 
                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]" 
                    : "bg-background/50 border-border/30 hover:border-primary/50 text-foreground"
                )}
              >
                <span className="font-mono truncate mr-2">{route}</span>
                <span className="text-[9px] sm:text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded shrink-0">GET</span>
              </button>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">Tidak ada API ditemukan.</div>
          )}
        </div>

        {/* Kolom Kanan: Terminal Output (Max height & Scrollable) */}
        <div className="lg:col-span-2 rounded-xl border border-primary/20 bg-black/80 flex flex-col shadow-[inset_0_0_30px_-10px_rgba(0,0,0,1)] h-[40vh] lg:h-[60vh]">
          
          {/* Header Terminal & Aksi */}
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

            {/* Tombol Aksi di Kanan Terminal */}
            <div className="flex items-center gap-2">
              {selectedRoute && (
                <button
                  onClick={handleTestApi}
                  disabled={isTesting}
                  className="flex items-center gap-1 bg-green-500/20 text-green-500 hover:bg-green-500/30 px-2 py-1 rounded text-[10px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isTesting ? "⏳ Running..." : "▶ Run API"}
                </button>
              )}
              {testResult && !isTesting && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                >
                  {isCopied ? "✅ Copied" : "📋 Copy"}
                </button>
              )}
            </div>
          </div>
          
          <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1">
            {isTesting ? (
              <div className="flex items-center gap-2 text-primary font-mono text-xs sm:text-sm">
                <span className="animate-pulse">_</span> Executing request...
              </div>
            ) : testResult ? (
              <pre className="text-[10px] sm:text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                {testResult}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-[10px] sm:text-sm text-center">
                <p>/* Pilih API, lalu klik Run API */</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
        }
    
