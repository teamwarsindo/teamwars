import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { folder, public_id } = await request.json();
    const timestamp = Math.round(new Date().getTime() / 1000);

    const isBukti = folder === "bukti_transfer";

    const paramsToSign = {
      timestamp,
      folder,
      public_id,
      overwrite: true,
      // JIKA BUKTI: Paksa jadi JPG & limit 1920px. 
      // JIKA LOGO: Jangan kasih transformasi apa-apa saat disimpan (Biarkan HD).
      ...(isBukti && { 
        transformation: "c_limit,w_1920,h_1920,q_auto", 
        format: "jpg" 
      })
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

    return NextResponse.json({ 
      api_key: process.env.CLOUDINARY_API_KEY, 
      signature, 
      ...paramsToSign 
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat signature" }, { status: 500 });
  }
}
