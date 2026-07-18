import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

// Fungsi rekursif untuk mencari file route.ts di dalam folder app/api
function getApiRoutes(dir: string, baseRoute = "/api"): string[] {
  let results: string[] = [];
  
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getApiRoutes(filePath, `${baseRoute}/${file}`));
    } else if (file === "route.ts" || file === "route.js") {
      results.push(baseRoute);
    }
  });
  return results;
}

export async function GET() {
  // 🔒 Ekstra Keamanan: Pastikan hanya admin yang login yang bisa scan API
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Arahkan pembacaan ke folder app/api
    const apiDir = path.join(process.cwd(), "app", "api");
    const routes = getApiRoutes(apiDir);
    
    return NextResponse.json({ success: true, routes });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Gagal memindai API", details: error.message }, 
      { status: 500 }
    );
  }
}
