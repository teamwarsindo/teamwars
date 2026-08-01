'use client';

import { useState } from 'react';
import { Terminal, Play, Loader2, X } from 'lucide-react';
import Swal from 'sweetalert2';

export function ApiController() {
  const [isOpen, setIsOpen] = useState(false);
  const [pathInput, setPathInput] = useState('/api/create-emojis');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [isExecuting, setIsExecuting] = useState(false);
  const [apiResponse, setApiResponse] = useState<string | null>(null);

  const handleExecuteApi = async () => {
    if (!pathInput.trim()) return;

    // Otomatis pastikan diawali tanda '/'
    let cleanPath = pathInput.trim();
    if (!cleanPath.startsWith('/')) {
      cleanPath = `/${cleanPath}`;
    }

    setIsExecuting(true);
    setApiResponse(null);

    try {
      const res = await fetch(cleanPath, {
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
          title: `API ${cleanPath} Berhasil!`,
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
        title: `Gagal Eksekusi ${cleanPath}`,
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
                <h3 className="font-bold text-lg text-white">Universal API Console</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              
              <div>
                <label className="text-xs font-semibold text-neutral-400 mb-1.5 block">
                  Ketik / Paste Path API Route Kamu:
                </label>
                
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

                  <input
                    type="text"
                    placeholder="/api/nama-folder-kamu"
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-blue-500"
                  />

                  <button
                    onClick={handleExecuteApi}
                    disabled={isExecuting || !pathInput.trim()}
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
              
