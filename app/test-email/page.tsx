'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<any>(null);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLog('Sedang mengirim request...');

    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setLog(data);
    } catch (err: any) {
      setLog({ error: 'Gagal terhubung ke API', detail: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px' }}>
      <h2>🧪 Tester Email Debugger</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Gunakan halaman ini untuk tes kirim email dan melihat response/error dari Resend secara langsung.
      </p>

      <form onSubmit={handleSendTest} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
            Email Tujuan Test:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="masukkan.email@gmail.com"
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px',
            backgroundColor: loading ? '#888' : '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Mengirim...' : '🚀 Kirim Test Email'}
        </button>
      </form>

      {log && (
        <div style={{ marginTop: '30px' }}>
          <h3>📋 Hasil / Response Log:</h3>
          <pre
            style={{
              backgroundColor: '#1e1e1e',
              color: '#00ff66',
              padding: '16px',
              borderRadius: '8px',
              overflowX: 'auto',
              fontSize: '13px',
              maxHeight: '400px'
            }}
          >
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
              }
