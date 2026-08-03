import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    
    // Fungsi rekursif untuk membaca seluruh folder di app/api
    function getApiRoutes(dir: string, baseRoute = '/api'): string[] {
      let routes: string[] = [];
      if (!fs.existsSync(dir)) return routes;

      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const subDir = path.join(dir, item.name);
          const routePath = `${baseRoute}/${item.name}`;
          
          // Cek jika ada file route.ts / route.js di dalam folder tersebut
          const hasRouteFile = fs.readdirSync(subDir).some(file => /^route\.(ts|js|tsx|jsx)$/.test(file));
          if (hasRouteFile && routePath !== '/api/list-routes') {
            routes.push(routePath);
          }

          routes = routes.concat(getApiRoutes(subDir, routePath));
        }
      }

      return routes;
    }

    const detectedRoutes = getApiRoutes(apiDir);

    return NextResponse.json({
      success: true,
      routes: detectedRoutes,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
