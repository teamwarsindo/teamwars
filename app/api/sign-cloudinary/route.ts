import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { folder = "report", public_id } = await request.json();
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const isBukti = folder === "bukti"; 

    const paramsToSign: Record<string, any> = {
      timestamp,
      folder,
      overwrite: true,
      invalidate: true,
      format: isBukti ? "jpg" : "png" 
    };

    if (public_id) {
      paramsToSign.public_id = public_id;
    }

    if (isBukti) {
      paramsToSign.transformation = "c_limit,w_1920,h_1920,q_auto";
    }

    // Helper resmi bawaan Cloudinary SDK
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign, 
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({ 
      api_key: process.env.CLOUDINARY_API_KEY, 
      signature, 
      ...paramsToSign 
    });
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat signature" }, { status: 500 });
  }
}
