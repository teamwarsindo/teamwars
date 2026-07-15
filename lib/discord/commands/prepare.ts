import { NextResponse } from 'next/server';
export async function handlePrepare(body: any) {
  return NextResponse.json({ type: 4, data: { content: `Fitur \`/prepare\` masih dalam tahap pengembangan 🚧`, flags: 64 } });
}
