import nacl from 'tweetnacl';

export function isValidSnowflake(id?: string): boolean {
  return !!id && /^\d{17,20}$/.test(id);
}

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

    // Handle Rate Limit (Discord HTTP 429)
    if (res.status === 429) {
      const retryData = await res.json().catch(() => ({ retry_after: 1 }));
      console.warn(`⚠️ Rate limited oleh Discord. Menunggu ${retryData.retry_after} detik...`);
      await new Promise((resolve) => setTimeout(resolve, (retryData.retry_after || 1) * 1000));
      return discordAPI(endpoint, method, body); // Coba ulang
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Discord API Error [${res.status}] ${method} ${endpoint}:`, errorText);
      return null;
    }

    if (res.status === 204) return true;
    return await res.json();
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

// 🔒 KODE LAMA TETAP UTUH (Tidak Diubah Sama Sekali)
export function getFooterText(createdAt?: string, updatedAt?: string) {
  const formatTanggal = (dateRaw: string | Date) => {
    const d = new Date(dateRaw);
    
    const dateStr = d.toLocaleDateString("en-GB", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    const timeStr = d.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    return `${dateStr} at ${timeStr} WIB`;
  };

  const waktuBuat = createdAt ? formatTanggal(createdAt) : formatTanggal(new Date());
  
  return updatedAt 
    ? `Registered: ${waktuBuat}\nLast Updated: ${formatTanggal(updatedAt)}` 
    : `Registered: ${waktuBuat}`;
}

// 🟢 FUNGSI BARU LINIER (Khusus Embed Match & Tracker Baru)
export function getEmbedFooterText(updatedAt?: string | Date) {
  const d = updatedAt ? new Date(updatedAt) : new Date();
  
  const dateStr = d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const timeStr = d.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).replace('.', ':');

  return updatedAt
    ? `Team Wars Indonesia | Last Updated: ${dateStr}, ${timeStr} WIB`
    : `Team Wars Indonesia | ${dateStr}, ${timeStr} WIB`;
}

export function hexToDecimal(hexString: string, fallbackColor = 11146056): number {
  if (!hexString) return fallbackColor;
  return parseInt(hexString.replace('#', ''), 16) || fallbackColor;
}
