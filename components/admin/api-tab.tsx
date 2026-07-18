"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export function ApiTab() {
  const [routes, setRoutes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)
  
  // State untuk hasil test API
  const [testResult, setTestResult] = useState<string>("")
  const [isTesting, setIsTesting] = useState(false)

  // Scan API saat tab dibuka
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

  // Fungsi untuk memanggil (test) API yang dipilih
  const handleTestApi = async (route: string) => {
    setSelectedRoute(route)
    setIsTesting(true)
    setTestResult("Mengeksekusi request...")
    
    try {
      const res = await fetch(route)
      
      // Ambil tipe konten untuk mengecek apakah balasan berupa JSON atau Text
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Panel */}
      <div className="rounded-xl border border-primary/20 bg-background/50 p-6 backdrop-blur-md flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            📡 API Scanner & Explorer
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Sistem otomatis mendeteksi semua endpoint API yang ada di proyek ini.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{routes.length}</span>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Endpoints</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Daftar API */}
        <div className="lg:col-span-1 flex flex-col gap-2 rounded-xl border border-border/50 bg-background/30 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Available Routes</h4>
          
          {isLoading ? (
            <div className="text-xs text-primary animate-pulse">Scanning system files...</div>
          ) : routes.length > 0 ? (
            routes.map((route, idx) => (
              <button
                key={idx}
                onClick={() => handleTestApi(route)}
                className={cn(
                  "text-left flex items-center justify-between p-3 rounded-lg border transition-all text-sm",
                  selectedRoute === route 
                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_-3px_rgba(220,38,38,0.3)]" 
                    : "bg-background/50 border-border/30 hover:border-primary/50 text-foreground"
                )}
              >
                <span className="font-mono">{route}</span>
                <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-1 rounded">GET</span>
              </button>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4">Tidak ada API ditemukan.</div>
          )}
        </div>

        {/* Kolom Kanan: Terminal Output (Cyberpunk style) */}
        <div className="lg:col-span-2 rounded-xl border border-primary/20 bg-black/80 overflow-hidden flex flex-col shadow-[inset_0_0_30px_-10px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 border-b border-zinc-800">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 ml-2">
              {selectedRoute ? `Testing: ${selectedRoute}` : "Terminal Idle"}
            </span>
          </div>
          
          <div className="p-4 flex-1 min-h-[300px] overflow-auto custom-scrollbar">
            {isTesting ? (
              <div className="flex items-center gap-2 text-primary font-mono text-sm">
                <span className="animate-pulse">_</span> Executing request...
              </div>
            ) : testResult ? (
              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                {testResult}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 font-mono text-sm">
                <p>/* Pilih API di sebelah kiri untuk melihat response */</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
      }
                
