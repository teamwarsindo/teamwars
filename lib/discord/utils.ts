import nacl from 'tweetnacl';

export async function discordAPI(endpoint: string, method: string, body?: any) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("❌ DISCORD_BOT_TOKEN tidak ditemukan di .env");
    return null;
  }

  try {
    const res = await fetch(`https://discord.com/api/v10${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`);
    return (method === 'PATCH' || method === 'DELETE' || method === 'PUT') ? true : await res.json();
  } catch (err) {
    console.error(`❌ Error API Discord [${method} ${endpoint}]:`, err);
    return null;
  }
}

export function verifySignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
  if (!signature || !timestamp || !process.env.DISCORD_PUBLIC_KEY) return false;
  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')
    );
  } catch {
    return false;
  }
}

export const toProperCase = (str: string) => str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.substring(1).toLowerCase());
export const getWIBTime = () => new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long", timeStyle: "medium" });

export function getFooterText(createdAt?: string, updatedAt?: string) {
  const formatTanggal = (dateRaw: string | Date) => new Date(dateRaw).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  }) + " WIB";
  const waktuBuat = createdAt ? formatTanggal(createdAt) : formatTanggal(new Date());
  return updatedAt ? `Tercatat di sistem pada ${waktuBuat}\nDiperbarui pada ${formatTanggal(updatedAt)}` : `Tercatat di sistem pada ${waktuBuat}`;
}
