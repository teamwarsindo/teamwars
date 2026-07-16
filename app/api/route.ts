import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Fungsi untuk membaca folder secara rekursif (masuk ke dalam folder-folder)
function getApiRoutes(dir: string, baseRoute = '/api'): string[] {
  let routes: string[] = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Kalau ketemu folder, masuk ke dalamnya dan tambahkan nama folder ke URL
        routes = routes.concat(getApiRoutes(fullPath, `${baseRoute}/${file}`));
      } else if (file === 'route.ts' || file === 'route.js') {
        // Kalau ketemu file route.ts, simpan URL-nya
        // Jangan masukkan '/api' yang ini agar tidak duplikat dengan pemanggilannya sendiri
        if (baseRoute !== '/api') {
            routes.push(baseRoute);
        }
      }
    }
  } catch (error) {
    console.error("Gagal membaca folder:", error);
  }
  
  return routes;
}

export async function GET(req: NextRequest) {
  const baseUrl = req.nextUrl.origin;
  
  // Deteksi otomatis lokasi folder app/api (mendukung jika pakai src/app atau langsung app/)
  const apiDirPath = fs.existsSync(path.join(process.cwd(), 'src/app/api')) 
    ? path.join(process.cwd(), 'src/app/api') 
    : path.join(process.cwd(), 'app/api');

  // Jalankan fungsi auto-scan
  const autoEndpoints = getApiRoutes(apiDirPath);

  // Bangun UI HTML
  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>API Scanner - TWI Season 7</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #1e1e2e; color: #cdd6f4; padding: 2rem; max-width: 800px; margin: 0 auto; }
        h1 { border-bottom: 2px solid #313244; padding-bottom: 0.5rem; }
        .card { background: #181825; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #313244; transition: transform 0.2s; }
        .card:hover { transform: translateY(-2px); border-color: #89b4fa; }
        .title { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; color: #89b4fa; }
        .link { display: inline-block; background: #313244; color: #cdd6f4; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-weight: bold; margin-bottom: 0.5rem; transition: background 0.2s; }
        .link:hover { background: #45475a; }
      </style>
    </head>
    <body>
      <h1>🚀 Auto-Scanner API Routes</h1>
      <p>Base URL: <code>${baseUrl}</code></p>
      
      ${autoEndpoints.length > 0 ? autoEndpoints.map(route => `
        <div class="card">
          <div class="title">${route}</div>
          <a class="link" href="${baseUrl}${route}" target="_blank">Buka Endpoint ↗</a>
        </div>
      `).join('') : '<p>Tidak ada API route lain yang ditemukan.</p>'}
      
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
