'use client';

import { useState, useEffect } from 'react';
import { Terminal, Play, Loader2, X, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export function ApiController() {
  const [isOpen, setIsOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  const fetchRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const res = await fetch('/api/list-routes');
      const data = await res.json();
      if (data.success && data.routes.length > 0) {
        setAvailableRoutes(data.routes);
        setSelectedRoute(data.routes[0]);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar API:', err);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
    }
  }, [isOpen]);

  // 🎯 Run Biasa Sesuai Apa Adanya API
  const handleExecuteApi = async () => {
    if (!selectedRoute) return;

    setIsExecuting(true);
    setApiResponse('⏳ Sedang memproses request API...');

    try {
      const res = await fetch(selectedRoute, {
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const formattedData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
      
      let resultText = `========================================\n`;
      resultText += `🔹 RESPONSE STATUS: ${res.status} ${res.statusText}\n`;
      resultText += `========================================\n`;
      resultText += `${formattedData}`;

      setApiResponse(resultText);

      if (res.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `API ${selectedRoute} Selesai!`,
          showConfirmButton: false,
          timer: 2000,
          background: '#171717',
          color: '#fff',
        });
      }
    } catch (err: any) {
      setApiResponse(`❌ Error Eksekusi: ${err.message || 'Gagal terhubung ke API'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl text-sm font-medium transition cursor-pointer"
      >
        <Terminal className="w-4 h-4 text-blue-400" />
        <span>API Runner</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-3 py-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2 text-blue-400">
                <Terminal className="w-5 h-5" />
                <h3 className="font-bold text-base sm:text-lg text-white">Auto API Runner</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-400">
                    Pilih API Route:
                  </label>
                  <button
                    onClick={fetchRoutes}
                    className="text-[11px] flex items-center gap-1 text-blue-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRoutes ? 'animate-spin' : ''}`} />
                    Scan Ulang
                  </button>
                </div>

                {isLoadingRoutes ? (
                  <div className="flex items-center gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Mendeteksi API Route...
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <select
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-3 text-xs font-mono text-white outline-none focus:border-blue-500 cursor-pointer truncate"
                    >
                      {availableRoutes.map((route, idx) => (
                        <option key={idx} value={route}>
                          {route}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleExecuteApi}
                      disabled={isExecuting || !selectedRoute}
                      className="w-full mt-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50 cursor-pointer shrink-0 shadow-lg shadow-blue-600/20"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isExecuting ? 'Memproses API...' : '⚡ JALANKAN API'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  📟 Hasil Respon Console:
                </span>
                <pre className="h-56 w-full overflow-x-auto overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/90 p-3 font-mono text-[10px] leading-relaxed text-emerald-400 whitespace-pre-wrap break-all">
                  {apiResponse || '// Klik "Jalankan API" untuk mengeksekusi.'}
                </pre>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
