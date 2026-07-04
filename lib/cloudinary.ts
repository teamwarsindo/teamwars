import imageCompression from 'browser-image-compression';

// Konstanta dari setup lu
const CLOUD_NAME = "dhplw8rsd";
const UPLOAD_PRESET = "preset_twis7";

export async function compressAndUpload(file: File, folder: "logo" | "bukti_transfer") {
  try {
    // 1. Proses Kompresi di Browser
    const options = {
      maxSizeMB: 1, // Maksimal 1MB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp", // Paksa jadi WebP biar ukurannya makin kecil
    };
    
    const compressedFile = await imageCompression(file, options);

    // 2. Siapin Data buat Cloudinary
    const formData = new FormData();
    formData.append("file", compressedFile);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder); // Otomatis masuk ke folder yang lu mau

    // 3. Tembak ke API Cloudinary
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Gagal mengunggah gambar ke server.");
    }

    const data = await res.json();
    
    // Kembalikan URL gambar yang udah aman di Cloudinary
    return data.secure_url; 
    
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}
