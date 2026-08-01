'use client';

import { useState, useEffect } from 'react';
import { Terminal, Play, Loader2, X, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

export function ApiController() {
  const [isOpen, setIsOpen] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  // 🔍 Ambil otomatis daftar API Route saat modal dibuka
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

  const handleExecuteApi = async () => {
    if (!selectedRoute) return;

    setIsExecuting(true);
    setApiResponse(null);

    try {
      const res = await fetch(selectedRoute, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const formattedResult = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
      setApiResponse(formattedResult);

      if (res.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `API ${selectedRoute} Berhasil!`,
          showConfirmButton: false,
          timer: 2500,
          background: '#171717',
          color: '#fff',
        });
      } else {
        throw new Error(`HTTP Error ${res.status}`);
      }
    } catch (err: any) {
      setApiResponse(`Error: ${err.message || 'Gagal mengeksekusi API'}`);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: `Gagal Eksekusi ${selectedRoute}`,
        showConfirmButton: false,
        timer: 2500,
        background: '#171717',
        color: '#fff',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      {/* Tombol Pemicu di Dashboard */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 rounded-xl text-sm font-medium transition cursor-pointer"
      >
        <Terminal className="w-4 h-4 text-blue-400" />
        <span>API Runner</span>
      </button>

      {/* Modal Console */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Terminal className="w-5 h-5" />
                <h3 className="font-bold text-lg text-white">Auto API Runner</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Dropdown Auto-Detected List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-400">
                    Pilih API Route (Terdeteksi Otomatis):
                  </label>
                  <button
                    onClick={fetchRoutes}
                    className="text-[10px] flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingRoutes ? 'animate-spin' : ''}`} />
                    Scan Ulang
                  </button>
                </div>

                {isLoadingRoutes ? (
                  <div className="flex items-center gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    Mendeteksi folder API...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={httpMethod}
                      onChange={(e) => setHttpMethod(e.target.value as any)}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-bold text-blue-400 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>

                    <select
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-blue-500 cursor-pointer"
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isExecuting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                      <span>{isExecuting ? 'Running...' : 'Run'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Console Output Result */}
              {apiResponse && (
                <div className="mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1 block">
                    Response Output:
                  </span>
                  <pre className="max-h-64 w-full overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 font-mono text-xs text-emerald-400">
                    {apiResponse}
                  </pre>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </>
  );
          }
