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

    // Parameter ketat untuk Cloudinary (VERSI BERSIH)
    const paramsToSign = {
      timestamp,
      folder,
      public_id,
      overwrite: true,
      transformation: "c_limit,w_1920,h_1920,q_auto,f_auto"
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign, 
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({ 
      api_key: process.env.CLOUDINARY_API_KEY, // Ambil dari server
      signature, 
      ...paramsToSign 
    });
    
  } catch (error) {
    return NextResponse.json({ error: "Gagal membuat signature" }, { status: 500 });
  }
}
