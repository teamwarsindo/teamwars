const CLOUD_NAME = "dhplw8rsd";
const UPLOAD_PRESET = "preset_twis7";

export async function compressAndUpload(file: File, folder: "logo" | "bukti_transfer", teamName: string) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", folder);
    
    // Bikin nama rapi sesuai nama tim (contoh: evos_esports_logo)
    const safeTeamName = teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    
    // Kirim nama ini ke Cloudinary. Karena unique filename nyala, 
    // Cloudinary bakal jadinya nyimpen: evos_esports_logo_xyz123
    formData.append("public_id", `${safeTeamName}_${folder}`);
    
    // ❌ PASTIKAN BARIS INI TIDAK ADA DI KODE LU:
    // formData.append("invalidate", "true"); 

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
