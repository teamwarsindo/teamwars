const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd";

export async function compressAndUpload(file: File, folder: "logo" | "bukti_transfer", teamName: string) {
  try {
    const safeTeamName = teamName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const public_id = `${safeTeamName}_${folder}`;

    // 1. Minta signature dan parameter ke backend API kita
    const signRes = await fetch("/api/sign-cloudinary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder, public_id })
    });
    
    if (!signRes.ok) throw new Error("Gagal mendapatkan otorisasi upload.");
    const signData = await signRes.json();

    // 2. Susun FormData dengan parameter yang sudah disetujui
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!);
    formData.append("timestamp", signData.timestamp.toString());
    formData.append("signature", signData.signature);
    formData.append("folder", signData.folder);
    formData.append("public_id", signData.public_id);
    formData.append("overwrite", "true");
    formData.append("use_filename", "true");
    formData.append("unique_filename", "true");
    formData.append("use_filename_as_display_name", "true");
    formData.append("use_asset_folder_as_public_id_prefix", "false");
    formData.append("transformation", "c_limit,w_1920,h_1920,q_auto");

    // 3. Tembak ke API Cloudinary
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
