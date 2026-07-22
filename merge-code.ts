import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Fungsi untuk membaca folder sampai ke dalam sub-folder
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    // 🚨 WAJIB ADA: Blokir folder berat agar server tidak crash
    if (
      fullPath.includes('node_modules') || 
      fullPath.includes('.git') || 
      fullPath.includes('.next') // Tambahan penting untuk Next.js!
    ) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

export async function GET(request: Request) {
  // 1. SISTEM KEAMANAN (Jangan dihapus!)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'katasandiku123') {
    return NextResponse.json({ error: "Akses Ditolak! Password salah." }, { status: 401 });
  }

  // 2. KONFIGURASI FOLDER ROOT
  // 👇 Tidak perlu di-set nama foldernya, langsung baca seluruh project!
  const TARGET_FOLDER = process.cwd(); 
  
  // Ekstensi yang diizinkan (File .env otomatis aman karena tidak ada di daftar ini)
  const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

  try {
    const allFiles = getAllFiles(TARGET_FOLDER);
    let combinedContent = '';

    allFiles.forEach(filePath => {
      const ext = path.extname(filePath);
      
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Memotong path asli agar hasilnya lebih rapi dibaca
        const relativePath = filePath.replace(process.cwd(), '');
        
        combinedContent += `\n\n`;
        combinedContent += `/********************************************************\n`;
        combinedContent += ` * FILE: ${relativePath}\n`;
        combinedContent += ` ********************************************************/\n\n`;
        combinedContent += fileContent;
      }
    });

    // 3. KEMBALIKAN SEBAGAI TEKS MURNI
    return new NextResponse(combinedContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gagal membaca direktori target." }, { status: 500 });
  }
}
