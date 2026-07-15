import { NextResponse } from 'next/server';
export async function handleReminder(body: any) {
  return NextResponse.json({ type: 4, data: { content: `Fitur \`/reminder\` masih dalam tahap pengembangan 🚧`, flags: 64 } });
}
