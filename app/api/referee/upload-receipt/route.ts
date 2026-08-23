import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhplw8rsd",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const refereeName = (formData.get("refereeName") as string) || "referee";

    if (!file) {
      return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const cleanRefName = refereeName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const fileName = `receipt_${cleanRefName}_${Date.now()}`;

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "twi_payroll_receipts",
          public_id: fileName,
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    // Masking otomatis mengikuti domain
    const origin = req.nextUrl.origin || "https://www.teamwars.web.id";
    const maskedUrl = `${origin}/report/${fileName}.png`;

    return NextResponse.json({
      success: true,
      originalUrl: uploadResult.secure_url,
      maskedUrl: maskedUrl,
      url: maskedUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal upload gambar" }, { status: 500 });
  }
}
