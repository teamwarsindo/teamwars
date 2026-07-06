import imageCompression from 'browser-image-compression';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

export async function compressAndUpload(file: File, folder: "logo" | "bukti_transfer", teamName: string) {
  try {
    // 1. Bikin nama file (public_id) jadi bersih dari spasi & simbol
    const safeTeamName = teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const public_id = `${safeTeamName}_${folder}`;

    // 2. KOMPRESI KONDISIONAL (Jalur Pintar)
    let fileToUpload = file;
    const isLogo = folder === "logo";
    
    // Safety Net Jaringan: Kalau file lebih dari 2MB, baru kita kompres
    if (file.size > 2 * 1024 * 1024) {
      const compressionOptions = {
        maxSizeMB: 2, 
        maxWidthOrHeight: 2048, // 👈 Resolusi tinggi aman buat poster tim desain!
        useWebWorker: true,
        // Logo biarkan pakai ekstensi asli (PNG/WebP), Bukti paksa JPEG
        fileType: isLogo ? file.type : "image/jpeg", 
        initialQuality: 0.9 // 👈 Pertahankan 90% kualitas aslinya
      };
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (error) {
        console.warn("Kompresi gagal, lanjut pakai file asli...");
      }
    }

    // 3. Minta signature ke backend
    const signRes = await fetch("/api/sign-cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, public_id })
    });
    
    if (!signRes.ok) throw new Error("Gagal mendapatkan otorisasi upload.");
    const signData = await signRes.json();

    // Ambil ekstensi asli dari file (misal dapet "jpg" atau "png")
    const fileExt = file.name.split('.').pop();
    
    // 4. Susun FormData (Parameter harus SAMA PERSIS dengan backend)
    const formData = new FormData();
    
    // 1. Ambil ekstensi asli (Aman dari error)
    const fileExt = file.name.split('.').pop() || "png";
    
    // 2. BUNGKUS ULANG JADI FILE BARU (Ini kunci biar Turbopack mingkem)
    const renamedFile = new File([fileToUpload], `${public_id}.${fileExt}`, {
      type: fileToUpload.type,
    });

    // 3. Masukin ke FormData pake 2 parameter aja. Dijamin lolos build!
    formData.append("file", renamedFile);    
    formData.append("api_key", signData.api_key);
    formData.append("timestamp", signData.timestamp.toString());
    formData.append("signature", signData.signature);
    formData.append("folder", signData.folder);
    formData.append("public_id", signData.public_id);
    formData.append("overwrite", "true");

    // 🚨 INI KUNCINYA: Cuma kirim transformasi kalau folder-nya bukti_transfer!
    if (folder === "bukti_transfer") {
      formData.append("transformation", "c_limit,w_1920,h_1920,q_auto");
    }

    // Eksekusi tembak ke Cloudinary
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Gagal upload ke Cloudinary.");
    
    return data.secure_url; 
  } catch (error: any) {
    throw error;
  }
}
