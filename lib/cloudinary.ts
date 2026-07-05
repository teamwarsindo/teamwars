import imageCompression from 'browser-image-compression';

const CLOUD_NAME = "dhplw8rsd";
const UPLOAD_PRESET = "preset_twis7";

export async function compressAndUpload(file: File, folder: "logo" | "bukti_transfer") {
  try {
    // 1. Proses Kompresi Aman untuk HP
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: false, // MATIKAN web worker biar memori HP nggak nge-crash saat kompres 9MB
      // fileType: "image/webp" -> KITA HAPUS, biarkan format aslinya aja biar proses kompresi lebih ringan dan cepat
    };
    
    // Fallback kalau-kalau file gagal dikompres, kita pakai file aslinya
    let fileToUpload = file;
    try {
      fileToUpload = await imageCompression(file, options);
    } catch (compressErr) {
      console.warn("Kompresi gagal, mencoba upload ukuran asli:", compressErr);
    }

    // 2. Siapin Data buat Cloudinary
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("upload_preset", UPLOAD_PRESET);
    
    // CATATAN PENTING: 
    // Kita hapus formData.append("folder", folder) di sini karena sering bikin error 400.
    // Pastikan lu ngatur foldernya langsung dari setting Dashboard Cloudinary aja.

    // 3. Tembak ke API Cloudinary
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      // Kita lempar error ASLI dari Cloudinary biar ketahuan kalau salah preset
      throw new Error(data.error?.message || "Gagal mengunggah ke Cloudinary.");
    }
    
    return data.secure_url; 
    
  } catch (error: any) {
    console.error("Upload error:", error);
    // Kita lempar pesannya ke atas biar UI lu bisa nangkep dan nampilin alert
    throw error;
  }
}
