import imageCompression from 'browser-image-compression';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

// PERUBAHAN POIN 5: folder sekarang tipe datanya "logo" | "bukti"
export async function compressAndUpload(file: File, folder: "logo" | "bukti", teamName: string) {
  try {
    const safeTeamName = teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const public_id = `${safeTeamName}_${folder}`;
    const isLogo = folder === "logo";

    let fileToUpload = file;
    
    // Safety Net: Kompres kalau lebih dari 2MB
    if (file.size > 2 * 1024 * 1024) {
      const compressionOptions = {
        maxSizeMB: isLogo ? 1.5 : 1.5, // Target aman di bawah 2MB
        maxWidthOrHeight: isLogo ? 2048 : 1920,
        useWebWorker: true,
        // PERUBAHAN POIN 3 & 4: Paksa format kompresi
        fileType: isLogo ? "image/png" : "image/jpeg", 
        initialQuality: 0.9 
      };
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (error) {
        console.warn("Kompresi gagal, lanjut pakai file asli...", error);
      }
    }

    // Minta signature ke backend
    const signRes = await fetch("/api/sign-cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, public_id })
    });
    
    if (!signRes.ok) throw new Error("Gagal mendapatkan otorisasi upload.");
    const signData = await signRes.json();

    const formData = new FormData();
    
    // PERUBAHAN POIN 3 & 4: Tetapkan ekstensi final dengan tegas!
    const finalExt = isLogo ? "png" : "jpg";
    
    const renamedFile = new File([fileToUpload], `${public_id}.${finalExt}`, {
      type: isLogo ? "image/png" : "image/jpeg",
    });

    formData.append("file", renamedFile);
    formData.append("api_key", signData.api_key);
    formData.append("timestamp", signData.timestamp.toString());
    formData.append("signature", signData.signature);
    formData.append("folder", signData.folder);
    formData.append("public_id", signData.public_id);
    formData.append("overwrite", "true");

    // 🚨 TAMBAHIN SATU BARIS INI BIAR SINKRON SAMA BACKEND:
    formData.append("format", isLogo ? "png" : "jpg");

    // Sinkronisasi dengan Backend
    if (folder === "bukti") {
      formData.append("transformation", "c_limit,w_1920,h_1920,q_auto");
    }

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
