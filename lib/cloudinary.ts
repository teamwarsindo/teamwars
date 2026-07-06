import imageCompression from 'browser-image-compression';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

export async function compressAndUpload(file: File, folder: "logo" | "bukti_transfer", teamName: string) {
  try {
    // 1. Bikin nama file (public_id) jadi bersih dari spasi & simbol
    const safeTeamName = teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const public_id = `${safeTeamName}_${folder}`;

    // 2. KOMPRESI KONDISIONAL (Jalur Pintar)
    let fileToUpload = file;
    const maxSize = 2 * 1024 * 1024; // Limit 2MB dalam hitungan Byte

    if (file.size > maxSize) {
      console.log(`[Upload] File > 2MB terdeteksi. Mulai kompresi...`);
      const compressionOptions = {
        maxSizeMB: 2, 
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.85 
      };
      try {
        fileToUpload = await imageCompression(file, compressionOptions);
      } catch (error) {
        console.warn("Kompresi gagal, melanjutkan dengan file asli...", error);
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
    formData.append("file", fileToUpload, `${public_id}.${fileExt}`);
    formData.append("api_key", signData.api_key);
    formData.append("timestamp", signData.timestamp.toString());
    formData.append("signature", signData.signature);
    formData.append("folder", signData.folder);
    formData.append("public_id", signData.public_id);
    formData.append("overwrite", "true");
    formData.append("transformation", "c_limit,w_1920,h_1920,q_auto");
    
    // 🚨 Parameter use_filename dan unique_filename SUDAH DIHAPUS 🚨

    // 5. Eksekusi tembak ke Cloudinary
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
