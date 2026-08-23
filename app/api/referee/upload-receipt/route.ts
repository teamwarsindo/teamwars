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
    const weeksRaw = (formData.get("paidWeeks") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
    }

    // Format nama: aninkz
    const cleanRefName = refereeName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Format pekan: 1, 2, 3 -> 123
    let weeksStr = "all";
    if (weeksRaw) {
      try {
        const parsedWeeks = typeof weeksRaw === "string" ? JSON.parse(weeksRaw) : weeksRaw;
        if (Array.isArray(parsedWeeks) && parsedWeeks.length > 0) {
          weeksStr = parsedWeeks.sort((a: number, b: number) => a - b).join("");
        }
      } catch {
        weeksStr = weeksRaw.replace(/[^0-9]/g, "") || "all";
      }
    }

    const fileName = `${cleanRefName}_week${weeksStr}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "receipts",
          public_id: fileName,
          overwrite: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    const origin = req.nextUrl.origin || "https://www.teamwars.web.id";
    const maskedUrl = `${origin}/receipts/${fileName}.png`;

    return NextResponse.json({
      success: true,
      originalUrl: uploadResult.secure_url,
      maskedUrl: maskedUrl,
      url: maskedUrl,
    });
  } catch (error: any) {
    console.error("Upload receipt error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah gambar" }, { status: 500 });
  }
                                       }
    
