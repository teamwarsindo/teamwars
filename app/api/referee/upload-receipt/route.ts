import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "teamwars",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const refereeName = (formData.get("refereeName") as string) || "unknown";

    if (!file) {
      return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cleanRefName = refereeName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const publicId = `receipt_${cleanRefName}_${Date.now()}`;

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "twi_payroll_receipts",
          public_id: publicId,
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
    });
  } catch (error: any) {
    console.error("Upload receipt error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah gambar" }, { status: 500 });
  }
}
  
